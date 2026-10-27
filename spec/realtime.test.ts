import { describe, expect, it } from "vitest";
import {
  formTo,
  formWith,
  gameFields,
  gameWith,
  inviteForm,
  join,
  listen,
  live,
  member,
  openPage,
  postGame,
  quickPicks,
  stranger,
  submit,
  visit,
  type Visitor,
} from "./helpers.ts";

// Crit 9's "real-time": a change one person makes reaches every other open
// session showing it within about a second, with no reload. Open pages listen
// on server-sent event streams, and these checks listen on the same streams:
// the board's, which anyone can open, and each game's, which only its two
// players can. When two people take the same game at once, one gets it.
//
// A member also has a stream of their own, which nobody else can open, for
// what waits on them or answers them: an invitation and its answer, a match
// report and its confirmation.

const SECOND = 1000;

// A day back: in the past wherever this runs, so a match can be recorded on it.
function yesterday(): string {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

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
    const offer = inviteForm(await visit(profile, host.who));
    await submit(offer, gameFields(offer, note), host.who);
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
    const board = await openPage("/", stranger);
    expect(board.streamsTo("/live/board"), "the board opened no stream to /live/board").toBe(1);
    board.close();
  });

  it("tells a member within a second when they're invited, the host when they answer, and nobody else", async () => {
    const [host, invitee, outsider] = [await member("me_h"), await member("me_i"), await member("me_o")];
    for (const visitor of [stranger, await join("Spec live guest")]) {
      const shut = listen("/live/me", visitor);
      expect(await shut.status, "a stream of your own is for signed-in members").toBe(403);
      shut.close();
    }
    const hostEar = listen("/live/me", host.who);
    const inviteeEar = listen("/live/me", invitee.who);
    const outsiderEar = listen("/live/me", outsider.who);
    for (const ear of [hostEar, inviteeEar, outsiderEar]) expect(await ear.status).toBe(200);

    const note = `spec live invite ${crypto.randomUUID().slice(0, 8)}`;
    const profile =
      (await visit("/profile", invitee.who)).querySelector('a[href^="/players/"]')?.getAttribute("href") ?? "";
    const offer = inviteForm(await visit(profile, host.who));
    const invited = inviteeEar.nextChange(SECOND);
    const overheard = outsiderEar.nextChange(SECOND);
    expect((await submit(offer, gameFields(offer, note), host.who)).status).toBe(303);
    expect(await invited, "the invitee heard nothing within a second of being invited").toBeDefined();
    expect(await overheard, "another member's stream heard about the invitation").toBeUndefined();

    const decline = gameWith(await visit("/invites", invitee.who), note)?.querySelector('form[action$="/decline"]') as
      | HTMLFormElement
      | null;
    if (!decline) throw new Error("no decline form for the invitation");
    const answered = hostEar.nextChange(SECOND);
    await submit(decline, {}, invitee.who);
    expect(await answered, "the host heard nothing within a second of the answer").toBeDefined();
    for (const ear of [hostEar, inviteeEar, outsiderEar]) ear.close();
  });

  it("tells the opponent within a second when a match is reported, and the reporter when it's confirmed", async () => {
    const [reporter, opponent] = [await member("me_rep"), await member("me_opp")];
    const reporterEar = listen("/live/me", reporter.who);
    const opponentEar = listen("/live/me", opponent.who);
    for (const ear of [reporterEar, opponentEar]) expect(await ear.status).toBe(200);

    const report = formWith(await visit("/matches", reporter.who), "opponent");
    const reported = opponentEar.nextChange(SECOND);
    const fields = { ...quickPicks(report), opponent: opponent.username, playedOn: yesterday(), mine: "3", theirs: "1" };
    expect((await submit(report, fields, reporter.who)).status, "recording the match").toBe(303);
    expect(await reported, "the opponent heard nothing within a second of the report").toBeDefined();

    const confirm = formTo(await visit("/matches", opponent.who), "/confirm");
    const confirmed = reporterEar.nextChange(SECOND);
    await submit(confirm, {}, opponent.who);
    expect(await confirmed, "the reporter heard nothing within a second of the confirmation").toBeDefined();
    reporterEar.close();
    opponentEar.close();
  });

  it("has a member's pages listening for their own invitations and matches", async () => {
    const { who } = await member("me_page");
    for (const path of ["/", "/invites", "/matches"]) {
      const page = await openPage(path, who);
      expect(page.streamsTo("/live/me"), `${path} doesn't listen for the member's own changes`).toBe(1);
      page.close();
    }
  });
});
