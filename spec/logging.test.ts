import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fetchAs, formWith, gameWith, live, member, postGame, submit, visit, type Visitor } from "./helpers.ts";

// Who did what, as the server logs it: one line per action, naming who by
// their player id and whether they're a guest or a member, so whoever runs the
// app can tell two people apart from the log alone, and refusals logged too.
// It never logs anything that would expose more of anyone than the club
// already knows: no name, username, password, session token, or anything
// anyone wrote.
//
// A check over HTTP can't see what the server prints, so this one reads the
// app's own output: the container CI starts, which is named app, or for a
// local run, the file the app's output goes to, named in APP_LOG_FILE. With
// neither, it stands down.

function appOutput(): string | undefined {
  try {
    const file = process.env.APP_LOG_FILE;
    if (file) return readFileSync(file, "utf8");
    return execFileSync("docker", ["logs", "app"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    return undefined;
  }
}

// A member's player id, from the link to their profile.
const idOf = async (who: Visitor) =>
  (await visit("/profile", who)).querySelector('a[href^="/players/"]')?.getAttribute("href")?.split("/").pop() ?? "";

describe.skipIf(live || appOutput() === undefined)("who did what, in the server's log", () => {
  it("logs each action by who did it, tells two people apart, logs a refusal, and keeps out what they typed", async () => {
    const from = appOutput()?.length ?? 0;
    const [host, guest, outsider] = [await member("log_h"), await member("log_g"), await member("log_o")];
    const [hostId, guestId, outsiderId] = [await idOf(host.who), await idOf(guest.who), await idOf(outsider.who)];

    const note = `spec log ${crypto.randomUUID().slice(0, 8)}`;
    await postGame(host.who, note);
    const accept = gameWith(await visit("/", guest.who), note)?.querySelector('form[action$="/accept"]');
    const gameId = accept?.getAttribute("action")?.match(/\/games\/(\d+)\//)?.[1];
    if (!accept || !gameId) throw new Error("no accept form for the game");
    expect((await submit(accept as HTMLFormElement, {}, guest.who)).status).toBe(303);
    const said = `Meet at the door ${crypto.randomUUID().slice(0, 8)}`;
    const thread = `/games/${gameId}`;
    expect((await submit(formWith(await visit(thread, guest.who), "body"), { body: said }, guest.who)).status).toBe(303);
    expect((await fetchAs(thread, outsider.who)).status).toBe(403);

    // the lines this run added, once the last of them is there
    const refused = (line: string) => line.includes(`who=member:${outsiderId}`) && line.includes(`GET ${thread} 403`);
    let lines: string[] = [];
    for (let waited = 0; waited <= 2000; waited += 100) {
      lines = (appOutput() ?? "").slice(from).split("\n");
      if (lines.some(refused)) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const logged = (...parts: string[]) => lines.some((line) => parts.every((part) => line.includes(part)));

    expect(logged(`who=member:${hostId}`, "POST /games 303", "to=/?done=posted"), "the post isn't logged").toBe(true);
    expect(logged(`who=member:${guestId}`, `POST ${thread}/accept 303`, "done=accepted"), "the accept isn't logged").toBe(
      true,
    );
    expect(logged(`who=member:${guestId}`, `POST ${thread}/messages 303`), "the message isn't logged").toBe(true);
    expect(lines.some(refused), "the refused read isn't logged").toBe(true);

    // nothing anyone typed, or holds: what was written, names, usernames and
    // passwords (all three carry the member's spec id), or session tokens
    const text = lines.join("\n");
    expect(text, "the log holds what someone wrote").not.toContain(said);
    for (const m of [host, guest, outsider]) {
      const specId = m.name.split(" ").pop() ?? "";
      expect(specId).not.toBe("");
      expect(text, "the log holds a name, username or password").not.toContain(specId);
      expect(text, "the log holds a session token").not.toContain(m.who.cookie.split("=")[1]);
    }
  });
});
