import { describe, expect, it } from "vitest";
import { formTo, formWith, live, member, quickPicks, submit, visit, type Visitor } from "./helpers.ts";

// Match results and the club rating. Anyone can record a match they've played
// against another member, but a score only counts, on the rating and in the
// record, once the opponent confirms it. A disputed score never counts, and
// nobody can confirm their own report or a match they weren't in.

type Member = Awaited<ReturnType<typeof member>> & { username: string };

async function namedMember(label: string): Promise<Member> {
  const m = await member(label);
  // the username shows on the member's own profile
  const profile = await visit("/profile", m.who);
  const href = profile.querySelector('a[href^="/players/"]')?.getAttribute("href") ?? "";
  const handle = (await visit(href, m.who)).body.textContent?.match(/@([a-z0-9_]+)/)?.[1];
  if (!handle) throw new Error("couldn't read the member's username off their profile");
  return { ...m, username: handle };
}

function today(): string {
  // a day back, so it's in the past wherever this runs
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function record(by: Member, opponent: Member, mine: string, theirs: string) {
  const form = formWith(await visit("/matches", by.who), "opponent");
  return submit(form, { ...quickPicks(form), opponent: opponent.username, playedOn: today(), mine, theirs }, by.who);
}

// The rating and record on a member's profile, as another member sees it.
async function standing(of: Member, viewer: Visitor) {
  const profile = await visit("/profile", of.who);
  const href = profile.querySelector('a[href^="/players/"]')?.getAttribute("href") ?? "";
  const page = (await visit(href, viewer)).body.textContent ?? "";
  const rating = page.match(/Club rating\D*(\d{3,4})/)?.[1];
  return { page, rating: rating === undefined ? undefined : Number(rating) };
}

describe.skipIf(live)("match results and the club rating", () => {
  it("counts a score only once the opponent confirms it", async () => {
    const [winner, loser] = [await namedMember("win"), await namedMember("lose")];
    expect((await record(winner, loser, "3", "1")).status).toBe(303);

    // reported but not confirmed: nothing on anyone's record yet
    expect((await standing(winner, loser.who)).rating).toBeUndefined();

    const confirm = formTo(await visit("/matches", loser.who), "/confirm");
    expect((await submit(confirm, {}, loser.who)).status).toBe(303);

    const won = await standing(winner, loser.who);
    const lost = await standing(loser, winner.who);
    expect(won.rating).toBeGreaterThan(1500);
    expect(lost.rating).toBeLessThan(1500);
    expect(won.page).toContain(loser.name);
    expect(won.page).toContain("3–1");
  });

  it("never counts a disputed score", async () => {
    const [reporter, opponent] = [await namedMember("claim"), await namedMember("deny")];
    expect((await record(reporter, opponent, "3", "0")).status).toBe(303);
    const dispute = formTo(await visit("/matches", opponent.who), "/dispute");
    expect((await submit(dispute, {}, opponent.who)).status).toBe(303);
    expect((await standing(reporter, opponent.who)).rating).toBeUndefined();
  });

  it("lets nobody confirm their own report, or a match they weren't in", async () => {
    const [reporter, opponent, outsider] = [
      await namedMember("self"),
      await namedMember("other"),
      await namedMember("out"),
    ];
    expect((await record(reporter, opponent, "3", "2")).status).toBe(303);
    const confirm = formTo(await visit("/matches", opponent.who), "/confirm");
    await submit(confirm, {}, reporter.who);
    await submit(confirm, {}, outsider.who);
    expect((await standing(reporter, opponent.who)).rating).toBeUndefined();
  });

  it("turns away a score no match could end on, and a match against yourself", async () => {
    const [a, b] = [await namedMember("bad"), await namedMember("score")];
    expect((await record(a, b, "3", "3")).status).not.toBe(303);
    expect((await record(a, a, "3", "0")).status).not.toBe(303);
    expect((await visit("/matches", b.who)).querySelector('form[action$="/confirm"]')).toBeNull();
  });
});
