import { JSDOM, VirtualConsole } from "jsdom";
import { expect, inject } from "vitest";

// What the checks in spec/ share: a browser reduced to the cookie it holds, and
// forms submitted the way a browser submits them.
export const baseUrl = inject("baseUrl");

// These checks write to the app they run against, so they stand down against
// the live deploy, where they'd leave test data on the real board. CI runs them
// against a throwaway container; locally, against your own server.
export const live = new URL(baseUrl).hostname.endsWith(".fly.dev");

// A visitor is whatever cookie their browser holds; a stranger holds none.
export type Visitor = { cookie: string };
export const stranger: Visitor = { cookie: "" };

const cookieHeader = (who: Visitor): Record<string, string> =>
  who.cookie ? { cookie: who.cookie } : {};

export async function visit(path: string, who: Visitor): Promise<Document> {
  const res = await fetch(new URL(path, baseUrl), { headers: cookieHeader(who) });
  expect(res.status, `GET ${path}`).toBe(200);
  return new JSDOM(await res.text()).window.document;
}

// Submits a form as a browser would: urlencoded, from this origin, and without
// following the redirect, so the check sees what the server answered.
export function submit(form: HTMLFormElement, fields: Record<string, string>, who: Visitor) {
  return fetch(new URL(form.getAttribute("action") ?? "", baseUrl), {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      origin: new URL(baseUrl).origin,
      ...cookieHeader(who),
    },
    body: new URLSearchParams(fields),
  });
}

// Uploads a file through a form, as a browser sends a file input: multipart,
// from this origin, without following the redirect.
export function upload(form: HTMLFormElement, field: string, file: Blob, filename: string, who: Visitor) {
  const body = new FormData();
  body.append(field, file, filename);
  return fetch(new URL(form.getAttribute("action") ?? "", baseUrl), {
    method: "POST",
    redirect: "manual",
    headers: { origin: new URL(baseUrl).origin, ...cookieHeader(who) },
    body,
  });
}

// Listens to a server-sent event stream the way an open page does, and counts
// the "change" events that arrive. `nextChange` resolves with how many
// milliseconds the next one took, or undefined if none came in time.
export function listen(path: string, who: Visitor) {
  const controller = new AbortController();
  let changes = 0;
  let wake: (() => void) | undefined;
  const status = fetch(new URL(path, baseUrl), {
    headers: { accept: "text/event-stream", ...cookieHeader(who) },
    signal: controller.signal,
  }).then((res) => {
    if (res.status === 200 && res.body) {
      void (async () => {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        try {
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            for (let end = buffer.indexOf("\n\n"); end >= 0; end = buffer.indexOf("\n\n")) {
              if (/^event: change$/m.test(buffer.slice(0, end))) {
                changes += 1;
                wake?.();
              }
              buffer = buffer.slice(end + 2);
            }
          }
        } catch {
          // closed by close()
        }
      })();
    }
    return res.status;
  });
  return {
    status,
    nextChange(withinMs: number): Promise<number | undefined> {
      const seen = changes;
      const started = Date.now();
      return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(undefined), withinMs);
        wake = () => {
          if (changes > seen) {
            clearTimeout(timer);
            resolve(Date.now() - started);
          }
        };
      });
    },
    close: () => controller.abort(),
  };
}

// Opens a page the way a visitor's browser holds it open: its own scripts run,
// with this visitor's cookie on every request they make and on the live
// streams they open, so a check can watch what the page itself shows when
// someone else changes something. It hands the page over once every stream the
// page opened is connected, so the clock a check starts after it is fair.
// `shows` resolves with how many milliseconds the text took to appear, or
// undefined if it didn't in time.
//
// Its EventSource behaves as Chrome's does where the pages depend on it: a
// stream that ends is reopened after two seconds, the server's retry delay,
// but one the server refuses (anything but a 200, as a proxy gives while a
// machine restarts) fires "error" and is closed for good, so only the page's
// own code can bring it back. `dropStreams` ends every open stream, and
// `refuseReconnects` makes that many reopenings fail first.
export async function openPage(path: string, who: Visitor, options: { refuseReconnects?: number } = {}) {
  const url = new URL(path, baseUrl);
  const res = await fetch(url, { headers: cookieHeader(who) });
  expect(res.status, `GET ${path}`).toBe(200);
  const errors: string[] = [];
  type Stream = { readyState: number; drop(): void; close(): void };
  const streams: Stream[] = [];
  let refusals = options.refuseReconnects ?? 0;
  // one promise per stream the page opens, settled when it's connected or refused
  const connecting: Promise<void>[] = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (e) => errors.push(e.message));
  const dom = new JSDOM(await res.text(), {
    url: url.href,
    runScripts: "dangerously",
    virtualConsole,
    beforeParse(window) {
      // the page's requests go out as this visitor
      window.fetch = (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(new URL(String(input), url), { ...init, headers: { ...init?.headers, ...cookieHeader(who) } });
      window.EventSource = class {
        static CONNECTING = 0;
        static OPEN = 1;
        static CLOSED = 2;
        readyState = 0;
        onerror: ((e: Event) => void) | null = null;
        #handlers: Record<string, ((e: Event) => void)[]> = {};
        #controller = new AbortController();
        #url: URL;
        constructor(stream: string) {
          this.#url = new URL(stream, url);
          streams.push(this);
          let connected = () => {};
          connecting.push(new Promise<void>((resolve) => (connected = resolve)));
          void this.#connect(connected, false);
        }
        async #connect(connected: () => void, reopening: boolean) {
          this.#controller = new AbortController();
          try {
            const refused = reopening && refusals > 0;
            if (refused) refusals -= 1;
            const r = refused
              ? new Response("Bad gateway", { status: 502 })
              : await fetch(this.#url, {
                  headers: { accept: "text/event-stream", ...cookieHeader(who) },
                  signal: this.#controller.signal,
                });
            connected();
            if (this.readyState === 2) return;
            if (r.status !== 200 || !r.body) {
              // refused: Chrome gives up on this stream for good
              this.readyState = 2;
              this.#emit("error");
              return;
            }
            this.readyState = 1;
            this.#emit("open");
            const reader = r.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            for (;;) {
              const { value, done } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              for (let end = buffer.indexOf("\n\n"); end >= 0; end = buffer.indexOf("\n\n")) {
                if (/^event: change$/m.test(buffer.slice(0, end))) this.#emit("change");
                buffer = buffer.slice(end + 2);
              }
            }
          } catch {
            connected();
          }
          // the stream ended without being closed: Chrome reports it and reopens it
          if (this.readyState === 2) return;
          this.readyState = 0;
          this.#emit("error");
          setTimeout(() => {
            if (this.readyState !== 2) void this.#connect(() => {}, true);
          }, 2000);
        }
        #emit(type: string) {
          const event = new window.Event(type);
          if (type === "error") this.onerror?.(event);
          for (const handler of this.#handlers[type] ?? []) handler(event);
        }
        addEventListener(type: string, handler: (e: Event) => void) {
          (this.#handlers[type] ??= []).push(handler);
        }
        drop() {
          this.#controller.abort();
        }
        close() {
          this.readyState = 2;
          this.#controller.abort();
        }
      } as unknown as typeof window.EventSource;
    },
  });
  // the page's scripts have run; wait for the streams they opened, but not forever
  await Promise.race([Promise.all(connecting), new Promise((resolve) => setTimeout(resolve, 5000))]);
  const text = () => dom.window.document.body.textContent ?? "";
  return {
    document: dom.window.document,
    errors,
    text,
    async shows(wanted: string, withinMs: number): Promise<number | undefined> {
      const started = Date.now();
      while (Date.now() - started <= withinMs) {
        if (text().includes(wanted)) return Date.now() - started;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    },
    openStreams: () => streams.filter((s) => s.readyState !== 2).length,
    dropStreams() {
      for (const stream of streams) if (stream.readyState !== 2) stream.drop();
    },
    close() {
      for (const stream of streams) stream.close();
      dom.window.close();
    },
  };
}

// A GET that reports whatever the server says, for pages a visitor may be
// refused.
export function fetchAs(path: string, who: Visitor) {
  return fetch(new URL(path, baseUrl), { headers: cookieHeader(who), redirect: "manual" });
}

// The cookies a response sets, as the next request would send them. A cookie
// being deleted isn't one.
export function cookieFrom(res: Response): string {
  return res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .filter((c) => !c.endsWith("=") && !c.endsWith("=deleted"))
    .join("; ");
}

export function formWith(doc: Document, field: string): HTMLFormElement {
  const form = [...doc.querySelectorAll("form")].find((f) => f.querySelector(`[name="${field}"]`));
  if (!form) throw new Error(`no form on the page has a "${field}" field`);
  return form;
}

export function formTo(doc: Document, action: string): HTMLFormElement {
  const form = [...doc.querySelectorAll("form")].find((f) => f.getAttribute("action")?.endsWith(action));
  if (!form) throw new Error(`no form on the page posts to "${action}"`);
  return form;
}

// The first real option of every select, as a member picking quickly would.
export function quickPicks(form: HTMLFormElement): Record<string, string> {
  const picks: Record<string, string> = {};
  for (const select of form.querySelectorAll("select")) {
    const option = [...select.options].find((o) => o.value !== "");
    if (option) picks[select.name] = option.value;
  }
  return picks;
}

// Each game on the board is its own list item (or article), so a game's
// details and the button that acts on it sit together.
export function gameWith(doc: Document, text: string): Element | undefined {
  return [...doc.querySelectorAll("li, article")].find((el) => el.textContent?.includes(text));
}

// Three days out at 7 pm: in the future whatever zone this runs in.
export function threeDaysOut(): string {
  const d = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T19:00`;
}

// Joins as a guest: a name, and nothing else.
export async function join(name: string): Promise<Visitor> {
  const res = await submit(formWith(await visit("/", stranger), "name"), { name }, stranger);
  expect(res.status).toBe(303);
  const cookie = cookieFrom(res);
  expect(cookie, "joining set no cookie, so the app can't know them again").not.toBe("");
  return { cookie };
}

// Signs up a new member and returns their browser, with the name and username
// they signed up with.
export async function member(label: string): Promise<{ who: Visitor; name: string; username: string }> {
  const id = crypto.randomUUID().slice(0, 8);
  const name = `Spec ${label} ${id}`;
  const username = `spec_${label}_${id}`.slice(0, 20);
  const form = formWith(await visit("/signup", stranger), "username");
  const res = await submit(form, { username, name, password: `password ${id}` }, stranger);
  expect(res.status, "signing up a member").toBe(303);
  return { who: { cookie: cookieFrom(res) }, name, username };
}

// A game's details as a script sends them: the venue and kind picked as a
// member picking quickly would, and the time as one wall-clock field, which
// the server takes in place of the page's day and time pickers.
export function gameFields(form: HTMLFormElement, note: string): Record<string, string> {
  const { startsDay: _day, startsTime: _time, ...picks } = quickPicks(form);
  return { ...picks, startsAt: threeDaysOut(), note };
}

// The form that posts a game on the board, or invites someone from their
// profile, found by where it posts rather than by what its fields are called.
export const offerForm = (doc: Document) => formTo(doc, "/games");
export const inviteForm = (doc: Document) => formTo(doc, "/invite");

export async function postGame(who: Visitor, note: string): Promise<void> {
  const offer = offerForm(await visit("/", who));
  const res = await submit(offer, gameFields(offer, note), who);
  expect(res.status).toBe(303);
}
