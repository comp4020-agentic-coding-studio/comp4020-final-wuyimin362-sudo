import { describe, expect, it } from "vitest";
import {
  formTo,
  formWith,
  gameWith,
  join,
  live,
  member,
  offerForm,
  postGame,
  quickPicks,
  stranger,
  submit,
  threeDaysOut,
  visit,
  type Visitor,
} from "./helpers.ts";

// A game's conversation as its two players meet it: a button on the game that
// opens a page of its own, replies they can send in one press, and, for a
// member, a card behind the other player's picture with what the profile
// shows. The card holds to the profile's own limits: members only, and the
// opponents' view only after three different opponents. Everything here is in
// English whatever the visitor's browser speaks, so no field is left to the
// browser's own date picker or file chooser, and pickers send the same time a
// typed one would.

async function profileOf(who: Visitor): Promise<string> {
  return (await visit("/profile", who)).querySelector('a[href^="/players/"]')?.getAttribute("href") ?? "";
}

// A game between two members, agreed on the board, and its thread's address.
async function agreedGame(label: string) {
  const [host, guest] = [await member(`${label}_h`), await member(`${label}_g`)];
  const note = `spec conversation ${crypto.randomUUID().slice(0, 8)}`;
  await postGame(host.who, note);
  const accept = gameWith(await visit("/", guest.who), note)?.querySelector('form[action$="/accept"]') as
    | HTMLFormElement
    | null;
  if (!accept) throw new Error("no accept form for the game");
  expect((await submit(accept, {}, guest.who)).status).toBe(303);
  const thread = gameWith(await visit("/", host.who), note)
    ?.querySelector('a[href^="/games/"]')
    ?.getAttribute("href");
  if (!thread) throw new Error("no link to the game's conversation");
  return { host, guest, note, thread };
}

describe.skipIf(live)("a game's conversation", () => {
  it("opens from a button on the game, for its two players only", async () => {
    const { host, note } = await agreedGame("btn");
    const link = gameWith(await visit("/", host.who), note)?.querySelector('a[href^="/games/"]');
    expect(link?.classList.contains("button"), "the way into the conversation isn't a button").toBe(true);
    expect(link?.textContent?.trim()).toBe("Messages");
    const onlooker = gameWith(await visit("/", stranger), note)?.querySelector('a[href^="/games/"]');
    expect(onlooker, "someone outside the game can see the way into its conversation").toBeNull();
  });

  it("sends a quick reply in one press, and only for the game's two players", async () => {
    const { host, guest, thread } = await agreedGame("quick");
    const page = await visit(thread, guest.who);
    const quick = [...page.querySelectorAll('form[action$="/messages"] button[name="body"]')] as HTMLButtonElement[];
    expect(quick.length, "no quick replies on the conversation").toBeGreaterThan(0);
    const reply = quick[0];
    const form = reply.closest("form") as HTMLFormElement;

    expect((await submit(form, { body: reply.value }, guest.who)).status).toBe(303);
    const seen = [...(await visit(thread, host.who)).querySelectorAll("#thread-area li")].map((li) => li.textContent);
    expect(seen.some((text) => text?.includes(reply.value)), "the quick reply didn't arrive").toBe(true);

    const outsider = await member("quick_out");
    expect((await submit(form, { body: reply.value }, outsider.who)).status).toBe(403);
  });

  it("shows a member the other player's card, and a guest no card at all", async () => {
    const { host, guest, thread } = await agreedGame("card");
    const page = await visit(thread, host.who);
    const card = page.querySelector("[data-player-card]");
    if (!card) throw new Error("no card for the other player");
    const text = card.textContent ?? "";
    expect(text).toContain(guest.name);
    expect(text).toContain("Club rating");
    expect(card.querySelector(`a[href="${await profileOf(guest.who)}"]`), "the card doesn't link to the profile").not.toBeNull();
    // the opponents' view waits for three different opponents, here as on the profile
    expect(card.querySelector(".hexagon"), "the card shows a hexagon before three opponents").toBeNull();

    const visitor = await join("Spec card guest");
    const note = `spec guest thread ${crypto.randomUUID().slice(0, 8)}`;
    await postGame(visitor, note);
    const accept = gameWith(await visit("/", host.who), note)?.querySelector('form[action$="/accept"]') as HTMLFormElement;
    await submit(accept, {}, host.who);
    const guestThread = gameWith(await visit("/", visitor), note)
      ?.querySelector('a[href^="/games/"]')
      ?.getAttribute("href");
    if (!guestThread) throw new Error("no conversation for the guest's game");
    expect((await visit(guestThread, visitor)).querySelector("[data-player-card]"), "a guest sees a member's card").toBeNull();
  });

  it("takes a game's time from English pickers as well as typed, and still only in the next eight weeks", async () => {
    const who = await join("Spec pickers");
    const offer = offerForm(await visit("/", who));
    expect(offer.querySelector('[name="startsTime"]'), "no time picker beside the day").not.toBeNull();

    const note = `spec picked ${crypto.randomUUID().slice(0, 8)}`;
    const [day] = threeDaysOut().split("T");
    const picked = await submit(offer, { ...quickPicks(offer), startsDay: day, startsTime: "19:30", note }, who);
    expect(picked.status).toBe(303);
    expect(picked.headers.get("location")).toContain("done=posted");
    const posted = gameWith(await visit("/", stranger), note)?.querySelector("time")?.getAttribute("datetime");
    expect(posted).toBe(`${day}T19:30`);

    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const tooEarly = await submit(offer, { ...quickPicks(offer), startsDay: yesterday, startsTime: "19:30" }, who);
    expect(tooEarly.headers.get("location")).toContain("problem=time");
    const tooLate = new Date(Date.now() + 70 * 86_400_000).toISOString().slice(0, 10);
    const farOff = await submit(offer, { ...quickPicks(offer), startsDay: tooLate, startsTime: "19:30" }, who);
    expect(farOff.headers.get("location")).toContain("problem=time");
  });

  it("leaves no field to the browser's own language", async () => {
    const { who } = await member("english");
    const other = await member("english_other");
    for (const path of ["/", "/matches", "/profile", await profileOf(other.who)]) {
      const page = await visit(path, who);
      const native = page.querySelector('input[type="date"], input[type="datetime-local"], input[type="time"]');
      expect(native, `${path} leaves a date or time to the browser's own picker`).toBeNull();
      const chooser = page.querySelector('input[type="file"]');
      if (chooser) {
        expect(chooser.classList.contains("visually-hidden"), `${path} shows the browser's own file chooser`).toBe(true);
        expect(page.querySelector(`label[for="${chooser.id}"]`), `${path}'s file chooser has no English label`).not.toBeNull();
      }
    }
  });

  it("records a match from an English day picker", async () => {
    const [reporter, opponent] = [await member("day_r"), await member("day_o")];
    const report = formWith(await visit("/matches", reporter.who), "opponent");
    const days = [...report.querySelectorAll('select[name="playedOn"] option')].map((o) => o.getAttribute("value"));
    expect(days.length, "no day picker on the match form").toBeGreaterThan(1);
    const yesterday = days[1] ?? "";
    expect(
      (await submit(report, { ...quickPicks(report), opponent: opponent.username, playedOn: yesterday, mine: "3", theirs: "0" }, reporter.who)).status,
    ).toBe(303);
    expect(formTo(await visit("/matches", opponent.who), "/confirm")).toBeDefined();
  });
});
