import { describe, expect, it } from "vitest";
import {
  formTo,
  formWith,
  join,
  listen,
  live,
  member,
  openPage,
  quickPicks,
  stranger,
  submit,
  visit,
  type Visitor,
} from "./helpers.ts";

// Everything a page shows that someone else can change reaches it within about
// a second, with no reload: who's going to an event, a member's profile, the
// reviews and confirmed matches behind it, and who's in the club to find
// (docs/adr/0003-everything-shown-is-live.md). Each check holds a page open as
// one member, the way their browser would, while another member makes the
// change, and watches what the open page itself shows.
//
// What members see of each other stays members' only, live or not: the
// stream that carries these changes is a member's own, and nobody else can
// open it.

const SECOND = 1000;

type Member = Awaited<ReturnType<typeof member>> & { profile: string };

async function withProfile(label: string): Promise<Member> {
  const m = await member(label);
  const profile =
    (await visit("/profile", m.who)).querySelector('a[href^="/players/"]')?.getAttribute("href") ?? "";
  return { ...m, profile };
}

const yesterday = () => {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// A match between two members, recorded by one and confirmed by the other.
async function playedMatch(reporter: Member, opponent: Member): Promise<void> {
  const form = formWith(await visit("/matches", reporter.who), "opponent");
  const fields = { ...quickPicks(form), opponent: opponent.username, playedOn: yesterday(), mine: "3", theirs: "1" };
  expect((await submit(form, fields, reporter.who)).status).toBe(303);
  expect((await submit(formTo(await visit("/matches", opponent.who), "/confirm"), {}, opponent.who)).status).toBe(303);
}

// A member's interest button on the first event, by what it says.
async function markFirstEvent(who: Visitor, label: RegExp) {
  const [first] = (await visit("/events", who)).querySelectorAll("li.event");
  const button = [...(first?.querySelectorAll("form button") ?? [])].find((b) => label.test(b.textContent ?? ""));
  const form = button?.closest("form") as HTMLFormElement | null;
  if (!form) throw new Error(`no "${label}" button on the first event`);
  const kind = (form.querySelector('input[name="kind"]') as HTMLInputElement | null)?.value ?? "";
  return submit(form, { kind }, who);
}

describe.skipIf(live)("everything shown is live", () => {
  it("shows an open events page a club-mate saying they're going within a second", async () => {
    const [watcher, keen] = [await member("ev_watch"), await member("ev_keen")];
    const page = await openPage("/events", watcher.who);
    expect(await markFirstEvent(keen.who, /going/i).then((r) => r.status)).toBe(303);
    expect(await page.shows(keen.name, SECOND), "the open events page didn't show who's going").toBeDefined();
    expect(page.errors).toEqual([]);
    page.close();
  });

  it("shows an open profile a new review, and a newly confirmed match, within a second", async () => {
    const [reviewed, opponent, watcher] = [
      await withProfile("lv_rev"),
      await withProfile("lv_opp"),
      await withProfile("lv_watch"),
    ];
    const page = await openPage(reviewed.profile, watcher.who);
    expect(page.text()).toContain("0 so far");

    await playedMatch(reviewed, opponent);
    expect(await page.shows("3–1", SECOND), "the open profile didn't show the confirmed match").toBeDefined();

    const link = (await visit("/matches", opponent.who)).querySelector('a[href$="/review"]')?.getAttribute("href");
    if (!link) throw new Error("no review link for the opponent");
    const form = formWith(await visit(link, opponent.who), "serve");
    const scores = { serve: "4", receive: "3", forehand: "5", backhand: "2", footwork: "4", tactics: "3" };
    expect((await submit(form, { ...quickPicks(form), ...scores }, opponent.who)).status).toBe(303);
    expect(await page.shows("1 so far", SECOND), "the open profile didn't show the new review").toBeDefined();
    expect(page.errors).toEqual([]);
    page.close();
  });

  it("shows an open profile the member's own changes within a second", async () => {
    const [owner, watcher] = [await withProfile("lv_own"), await withProfile("lv_look")];
    const page = await openPage(owner.profile, watcher.who);
    const blade = `Spec blade ${crypto.randomUUID().slice(0, 6)}`;
    const form = formWith(await visit("/profile", owner.who), "blade");
    expect((await submit(form, { ...quickPicks(form), blade }, owner.who)).status).toBe(303);
    expect(await page.shows(blade, SECOND), "the open profile didn't show the new blade").toBeDefined();
    page.close();
  });

  it("shows an open players page a new member within a second", async () => {
    const watcher = await member("lv_find");
    const page = await openPage("/players?venue=&style=", watcher.who);
    const newcomer = await member("lv_new");
    expect(await page.shows(newcomer.name, SECOND), "the open players page didn't show the new member").toBeDefined();
    page.close();
  });

  it("keeps an open players page's filter when it takes a change", async () => {
    const watcher = await member("lv_filter");
    const page = await openPage("/players?venue=&style=defender", watcher.who);

    // an attacker joins first: a change the page takes, but not one it lists
    const attacker = await member("lv_atk");
    const attackerForm = formWith(await visit("/profile", attacker.who), "blade");
    await submit(attackerForm, { ...quickPicks(attackerForm), style: "attacker" }, attacker.who);
    const defender = await member("lv_def");
    const defenderForm = formWith(await visit("/profile", defender.who), "blade");
    await submit(defenderForm, { ...quickPicks(defenderForm), style: "defender" }, defender.who);

    expect(await page.shows(defender.name, SECOND), "the filtered page didn't show the new defender").toBeDefined();
    expect(page.text(), "the filtered page dropped its filter and listed an attacker").not.toContain(attacker.name);
    page.close();
  });

  it("leaves focus where it was when a change doesn't touch what the page shows", async () => {
    const [watcher, other] = [await member("lv_focus"), await withProfile("lv_elsewhere")];
    const page = await openPage("/events", watcher.who);
    const link = page.document.querySelector("#event-list a") as HTMLAnchorElement | null;
    if (!link) throw new Error("no link on the events list to focus");
    link.focus();

    // a change to someone's profile reaches every member's page, but not this list
    const blade = `Spec unseen ${crypto.randomUUID().slice(0, 6)}`;
    const form = formWith(await visit("/profile", other.who), "blade");
    await submit(form, { ...quickPicks(form), blade }, other.who);
    // a second's grace, as long as a change takes to arrive
    await new Promise((resolve) => setTimeout(resolve, SECOND));
    expect(page.document.activeElement, "an unchanged list was swapped, and focus went with it").toBe(link);
    page.close();
  });

  it("carries what members share only on a member's own stream", async () => {
    const [ear, keen] = [listen("/live/me", (await member("lv_ear")).who), await member("lv_mark")];
    expect(await ear.status).toBe(200);
    const heard = ear.nextChange(SECOND);
    await markFirstEvent(keen.who, /partner/i);
    expect(await heard, "a member's stream heard nothing of a club-mate's event interest").toBeDefined();
    ear.close();

    // a stranger and a guest can't listen, and their pages still show none of it
    for (const visitor of [stranger, await join("Spec live onlooker")]) {
      const shut = listen("/live/me", visitor);
      expect(await shut.status).toBe(403);
      shut.close();
      expect((await visit("/events", visitor)).body.textContent).not.toContain(keen.name);
    }
  });
});
