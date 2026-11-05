import { describe, expect, it } from "vitest";
import { formWith, gameWith, join, live, offerForm, quickPicks, stranger, submit, visit } from "./helpers.ts";

// What's left once a game's time has passed. The board keeps it for two weeks,
// below the games still to come, saying whether anyone took it, so whoever
// comes back the next day finds what they did; its two players can still open
// their messages from it. It's a record now: nobody can take it or withdraw
// it, even with a form they opened before its time.
//
// The server only takes a game in the future, to the minute, so this check
// posts games for the coming minute and waits for it to pass. That makes it
// the slowest check here, at up to about a minute and a quarter.

const ZONE = "Australia/Sydney"; // Canberra's clock, as the server reads it

// Canberra's wall clock now, as "YYYY-MM-DDTHH:mm", and how far into the
// minute it is.
function canberraNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return {
    minute: `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`,
    second: Number(parts.second),
  };
}

// The wall-clock minute after this one, counted in UTC, where no clock jumps.
const nextMinute = (minute: string) => new Date(Date.parse(`${minute}:00Z`) + 60_000).toISOString().slice(0, 16);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe.skipIf(live)("after a game's time", () => {
  it("keeps a game on the board once its time has passed, says whether anyone took it, and keeps its messages", async () => {
    // late in a minute, wait for the next one, so both posts land before their time
    if (canberraNow().second >= 45) await sleep((61 - canberraNow().second) * 1000);
    const startsAt = nextMinute(canberraNow().minute);

    const id = crypto.randomUUID().slice(0, 8);
    const host = await join(`Spec past host ${id}`);
    const [agreed, untaken] = [`spec past agreed ${id}`, `spec past untaken ${id}`];
    for (const note of [agreed, untaken]) {
      const offer = offerForm(await visit("/", host));
      const { startsDay: _day, startsTime: _time, ...picks } = quickPicks(offer);
      const posted = await submit(offer, { ...picks, startsAt, note }, host);
      expect(posted.headers.get("location"), "posting a game for the coming minute").toContain("done=posted");
    }

    const takerName = `Spec past taker ${id}`;
    const taker = await join(takerName);
    const accept = gameWith(await visit("/", taker), agreed)?.querySelector('form[action$="/accept"]') as
      | HTMLFormElement
      | null;
    if (!accept) throw new Error("no accept form for the game");
    expect((await submit(accept, {}, taker)).status).toBe(303);
    const thread = gameWith(await visit("/", taker), agreed)
      ?.querySelector('a[href^="/games/"]')
      ?.getAttribute("href");
    if (!thread) throw new Error("the agreed game doesn't link to its messages");
    const said = `Good game? ${id}`;
    expect((await submit(formWith(await visit(thread, taker), "body"), { body: said }, taker)).status).toBe(303);

    // forms opened while the untaken game was still to come, sent after its time
    const formOn = async (who: typeof host, action: string) => {
      const form = gameWith(await visit("/", who), untaken)?.querySelector(`form[action$="${action}"]`);
      if (!form) throw new Error(`no ${action} form for the untaken game`);
      return form as HTMLFormElement;
    };
    const lateAccept = await formOn(taker, "/accept");
    const lateWithdraw = await formOn(host, "/withdraw");

    // the game's minute comes, with a second's grace for the server's clock
    while (canberraNow().minute < startsAt) await sleep(500);
    await sleep(1000);

    const board = await visit("/", stranger);
    const past = gameWith(board, agreed);
    expect(past, "an agreed game left the board once its time passed").toBeDefined();
    expect(past?.textContent).toContain(takerName);
    expect(gameWith(board, untaken), "a game nobody took left the board once its time passed").toBeDefined();
    expect(gameWith(board, untaken)?.textContent).toMatch(/nobody took it/i);

    // nobody is offered a way to take or withdraw it any more...
    expect(gameWith(await visit("/", taker), untaken)?.querySelector('form[action$="/accept"]')).toBeNull();
    expect(gameWith(await visit("/", host), untaken)?.querySelector('form[action$="/withdraw"]')).toBeNull();
    // ...and the server turns away the forms opened before its time
    await submit(lateAccept, {}, taker);
    await submit(lateWithdraw, {}, host);
    expect(gameWith(await visit("/", stranger), untaken)?.textContent, "a past game was taken or withdrawn").toMatch(
      /nobody took it/i,
    );

    // the host, coming back, can still open the messages from the board
    const link = gameWith(await visit("/", host), agreed)
      ?.querySelector('a[href^="/games/"]')
      ?.getAttribute("href");
    expect(link, "the past game no longer links to its messages").toBe(thread);
    expect((await visit(thread, host)).body.textContent).toContain(said);
  }, 120_000);
});
