import { describe, expect, it } from "vitest";
import {
  formWith,
  gameWith,
  join,
  listen,
  live,
  member,
  postGame,
  quickPicks,
  stranger,
  submit,
  threeDaysOut,
  visit,
  type Visitor,
} from "./helpers.ts";

// Crit 9's "real-time": a change one person makes reaches every other open
// session showing it within about a second, with no reload. Open pages listen
// on server-sent event streams, and these checks listen on the same streams:
// the board's, which anyone can open, and each game's, which only its two
// players can. When two people take the same game at once, one gets it.

const SECOND = 1000;

describe.skipIf(live)("real-time", () => {
  it("tells every open board within a second when a game is posted, and when it's taken", async () => {
    const watcher = listen("/live/board", stranger);
    expect(await watcher.status).toBe(200);

    const host = await join(`Spec live host ${crypto.randomUUID().slice(0, 8)}`);
    const note = `spec live game ${crypto.randomUUID().slice(0, 8)}`;
    const posted = watcher.nextChange(SECOND);
    await postGame(host, note);
    expect(await posted, "the open board heard nothing within a second of a post").toBeDefined();

    const taker = await join("Spec live taker");
    const accept = gameWith(await visit("/", taker), note)?.querySelector('form[action$="/accept"]') as
      | HTMLFormElement
      | null;
    if (!accept) throw new Error("no accept form for the game");
    const taken = watcher.nextChange(SECOND);
    await submit(accept, {}, taker);
    expect(await taken, "the open board heard nothing within a second of a game being taken").toBeDefined();
    watcher.close();
  });

  it("gives a game to exactly one of two people who accept it at once", async () => {
    const host = await join(`Spec race host ${crypto.randomUUID().slice(0, 8)}`);
    const note = `spec race ${crypto.randomUUID().slice(0, 8)}`;
    await postGame(host, note);
    const [a, b] = [await join("Spec racer A"), await join("Spec racer B")];
    const formFor = async (who: Visitor) =>
      gameWith(await visit("/", who), note)?.querySelector('form[action$="/accept"]') as HTMLFormElement;
    const [formA, formB] = [await formFor(a), await formFor(b)];

    const [resA, resB] = await Promise.all([submit(formA, {}, a), submit(formB, {}, b)]);
    const outcomes = [resA, resB].map((r) => r.headers.get("location") ?? "");
    expect(outcomes.filter((l) => l.includes("done=accepted"))).toHaveLength(1);
    expect(outcomes.filter((l) => l.includes("problem=gone"))).toHaveLength(1);
  });

  it("tells a game's other player about a new message within a second, and lets nobody else listen", async () => {
    const [host, invitee, outsider] = [await member("live_h"), await member("live_i"), await member("live_o")];
    const profile =
      (await visit("/profile", invitee.who)).querySelector('a[href^="/players/"]')?.getAttribute("href") ?? "";
    const note = `spec live thread ${crypto.randomUUID().slice(0, 8)}`;
    const offer = formWith(await visit(profile, host.who), "startsAt");
    await submit(offer, { ...quickPicks(offer), startsAt: threeDaysOut(), note }, host.who);
    const thread = gameWith(await visit("/invites", host.who), note)
      ?.querySelector('a[href^="/games/"]')
      ?.getAttribute("href");
    if (!thread) throw new Error("no thread link on the invitation");
    const scripts = [...(await visit(thread, host.who)).querySelectorAll("script")].map((s) => s.textContent);
    expect(scripts.join("\n"), "the game's page doesn't listen for messages").toContain(`/live${thread}`);

    for (const visitor of [outsider.who, stranger]) {
      const eavesdrop = listen(`/live${thread}`, visitor);
      expect(await eavesdrop.status).toBe(403);
      eavesdrop.close();
    }

    const ear = listen(`/live${thread}`, invitee.who);
    expect(await ear.status).toBe(200);
    const heard = ear.nextChange(SECOND);
    await submit(formWith(await visit(thread, host.who), "body"), { body: `See you there ${note}` }, host.who);
    expect(await heard, "the other player heard nothing within a second of a message").toBeDefined();
    ear.close();
  });

  it("has the board page actually listening", async () => {
    const board = [...(await visit("/", stranger)).querySelectorAll("script")].map((s) => s.textContent).join("\n");
    expect(board).toContain('new EventSource("/live/board")');
  });
});
