import { describe, expect, it } from "vitest";
import { formWith, gameWith, join, live, quickPicks, stranger, submit, threeDaysOut, visit } from "./helpers.ts";

// Crit 8's "it's alive", tried the way a stranger would: through the forms the
// board serves, with nothing but a name. One person posts a game and finds it
// still there when they come back; a second person accepts it, and the first
// sees who.
describe.skipIf(live)("it's alive", () => {
  it("lets a stranger post a game, find it when they come back, and see who took it", async () => {
    const id = crypto.randomUUID().slice(0, 8);
    const note = `spec game ${id}`;

    const host = await join(`Spec host ${id}`);
    const offer = formWith(await visit("/", host), "startsAt");
    const posted = await submit(offer, { ...quickPicks(offer), startsAt: threeDaysOut(), note }, host);
    expect(posted.status).toBe(303);

    // their trace is there when they come back, and it's shared: anyone sees it
    expect(gameWith(await visit("/", host), note), "the host can't find their game").toBeDefined();
    expect(gameWith(await visit("/", stranger), note), "a stranger can't see the game").toBeDefined();

    // a second member takes it up, from the game's own form
    const guestName = `Spec guest ${id}`;
    const guest = await join(guestName);
    const accept = gameWith(await visit("/", guest), note)?.querySelector("form");
    if (!accept) throw new Error("the guest has no form to accept the game with");
    expect((await submit(accept, {}, guest)).status).toBe(303);

    // and the host, coming back, sees who they're playing
    expect(gameWith(await visit("/", host), note)?.textContent).toContain(guestName);
  });
});
