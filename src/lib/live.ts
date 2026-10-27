import { EventEmitter } from "node:events";

// How a change reaches every open page. The app is one process on one machine,
// so an in-memory bus is enough: a change publishes a topic, and each open page
// holds a server-sent event stream subscribed to the topics it shows, and
// fetches itself again when one fires. A stream carries only the topic's name,
// so nothing private travels on it; the page refetches only what its viewer was
// allowed to see anyway.
const bus = new EventEmitter();
bus.setMaxListeners(0);

// The board, one game, one member, or what members share. A member's own topic
// carries what waits on them or answers them: an invitation, a match report.
// "members" carries what only members can see of each other (who's going to
// an event, profiles, reviews, confirmed matches, who's in the club), so it's
// heard only on a member's own stream (src/pages/live/me.ts).
export type Topic = "board" | "members" | `game:${number}` | `player:${string}`;

export function publish(...topics: Topic[]): void {
  for (const topic of topics) bus.emit(topic);
}

// A comment every 25 seconds keeps proxies, Fly's included, from closing a
// quiet stream.
const HEARTBEAT_MS = 25_000;

export function stream(topics: Topic[], signal: AbortSignal): Response {
  const encoder = new TextEncoder();
  let stop = () => {};
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (text: string) => {
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          stop();
        }
      };
      const listeners = topics.map((topic) => {
        const listener = () => send(`event: change\ndata: ${topic}\n\n`);
        bus.on(topic, listener);
        return [topic, listener] as const;
      });
      const heartbeat = setInterval(() => send(": still here\n\n"), HEARTBEAT_MS);
      stop = () => {
        clearInterval(heartbeat);
        for (const [topic, listener] of listeners) bus.off(topic, listener);
      };
      signal.addEventListener("abort", () => {
        stop();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
      // sent at once, so the headers go out and the page knows it's connected;
      // a dropped stream is retried after two seconds
      send("retry: 2000\n: connected\n\n");
    },
    cancel() {
      stop();
    },
  });
  return new Response(body, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
