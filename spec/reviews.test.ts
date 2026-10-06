import { describe, expect, it } from "vitest";
import { fetchAs, formTo, formWith, live, member, quickPicks, submit, visit, type Visitor } from "./helpers.ts";

// Opponents' views of a member's style. Only someone who played you in a
// confirmed match can review you, once per match, scoring six things from 1 to
// 5. The hexagon that sums them up appears only after three different
// opponents, so no single opinion stands for anyone.

type Member = Awaited<ReturnType<typeof member>> & { username: string; profile: string };

async function namedMember(label: string): Promise<Member> {
  const m = await member(label);
  const profile =
    (await visit("/profile", m.who)).querySelector('a[href^="/players/"]')?.getAttribute("href") ?? "";
  const username = (await visit(profile, m.who)).body.textContent?.match(/@([a-z0-9_]+)/)?.[1] ?? "";
  return { ...m, username, profile };
}

const yesterday = () => {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

async function recordMatch(a: Member, b: Member): Promise<void> {
  const form = formWith(await visit("/matches", a.who), "opponent");
  const fields = { ...quickPicks(form), opponent: b.username, playedOn: yesterday(), mine: "3", theirs: "1" };
  expect((await submit(form, fields, a.who)).status).toBe(303);
}

async function confirm(b: Member): Promise<void> {
  expect((await submit(formTo(await visit("/matches", b.who), "/confirm"), {}, b.who)).status).toBe(303);
}

const SCORES = { serve: "4", receive: "3", forehand: "5", backhand: "2", footwork: "4", tactics: "3" };

// The review link for a member's most recent confirmed match, and its form.
async function reviewForm(by: Visitor) {
  const link = (await visit("/matches", by)).querySelector('a[href$="/review"]')?.getAttribute("href");
  if (!link) throw new Error("no review link on the matches page");
  const form = formWith(await visit(link, by), "serve");
  const send = (scores: Record<string, string>, as: Visitor = by) =>
    submit(form, { ...quickPicks(form), ...scores }, as);
  return { link, send };
}

const profileText = async (m: Member, viewer: Visitor) => (await visit(m.profile, viewer)).body.textContent ?? "";

describe.skipIf(live)("opponents' reviews and the hexagon", () => {
  it("lets an opponent review you after a confirmed match, and nobody else", async () => {
    const [a, b, outsider] = [await namedMember("rev_a"), await namedMember("rev_b"), await namedMember("rev_x")];

    // before the match is confirmed there's nothing to review
    await recordMatch(a, b);
    expect((await visit("/matches", b.who)).querySelector('a[href$="/review"]')).toBeNull();

    await confirm(b);
    const { link, send } = await reviewForm(b.who);
    expect((await send(SCORES)).status).toBe(303);
    expect(await profileText(a, outsider.who)).toContain("1 so far");

    // someone who wasn't in the match can't open the form, or post to it
    expect((await fetchAs(link, outsider.who)).status).toBe(403);
    await send(SCORES, outsider.who);
    expect(await profileText(a, outsider.who)).toContain("1 so far");
  });

  it("draws the hexagon only once three different opponents have reviewed", async () => {
    const reviewed = await namedMember("hex");
    const opponents = [await namedMember("hex_1"), await namedMember("hex_2"), await namedMember("hex_3")];
    for (const [i, opponent] of opponents.entries()) {
      await recordMatch(opponent, reviewed);
      await confirm(reviewed);
      expect((await (await reviewForm(opponent.who)).send(SCORES)).status).toBe(303);
      const drawn = (await visit(reviewed.profile, opponent.who)).querySelector('svg[role="img"]');
      if (i < 2) expect(drawn, `a hexagon after only ${i + 1} reviews`).toBeNull();
      else expect(drawn, "no hexagon after three reviews").not.toBeNull();
    }
    // the numbers behind it are there as text, for anyone who can't see it
    expect(await profileText(reviewed, opponents[0].who)).toMatch(/Forehand\D*5\.0/);
  });

  it("takes one review per match, with every score from 1 to 5", async () => {
    const [a, b] = [await namedMember("once_a"), await namedMember("once_b")];
    await recordMatch(a, b);
    await confirm(b);
    const { link, send } = await reviewForm(b.who);
    expect((await send({ ...SCORES, serve: "9" })).status).not.toBe(303);
    expect((await send(SCORES)).status).toBe(303);

    // sending the same form again, as a double click or the back button would,
    // changes nothing, and the link to review that match is gone
    await send({ ...SCORES, serve: "1" });
    expect(await profileText(a, b.who)).toContain("1 so far");
    expect((await visit("/matches", b.who)).querySelector(`a[href="${link}"]`)).toBeNull();
  });
});
