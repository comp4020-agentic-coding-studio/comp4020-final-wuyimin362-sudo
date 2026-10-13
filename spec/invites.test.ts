import { describe, expect, it } from "vitest";
import {
  fetchAs,
  formTo,
  formWith,
  gameFields,
  gameWith,
  inviteForm,
  live,
  member,
  stranger,
  submit,
  visit,
  type Visitor,
} from "./helpers.ts";

// Inviting a particular member to a game, and talking about it. A direct
// invitation stays off the public board, and only the invitee can accept or
// decline it; once accepted it's a game like any other, agreed in the open.
// Each game between two players has its own short thread, which only those two
// can read or write: messages live inside a game, never in a general chat.

type Member = Awaited<ReturnType<typeof member>> & { profile: string };

async function withProfile(label: string): Promise<Member> {
  const m = await member(label);
  const profile =
    (await visit("/profile", m.who)).querySelector('a[href^="/players/"]')?.getAttribute("href") ?? "";
  return { ...m, profile };
}

// From the invitee's profile, the way a member would find them.
async function invite(host: Member, invitee: Member, note: string) {
  const form = inviteForm(await visit(invitee.profile, host.who));
  return submit(form, gameFields(form, note), host.who);
}

// The invitation as it sits on someone's invites page.
const inviteOn = async (who: Visitor, note: string) => gameWith(await visit("/invites", who), note);

describe.skipIf(live)("invitations and their messages", () => {
  it("keeps a direct invitation off the board until the invitee, and only they, accepts it", async () => {
    const [host, invitee, outsider] = [await withProfile("inv_h"), await withProfile("inv_i"), await withProfile("inv_o")];
    const note = `spec invitation ${crypto.randomUUID().slice(0, 8)}`;
    expect((await invite(host, invitee, note)).status).toBe(303);

    expect(gameWith(await visit("/", stranger), note), "a direct invitation is on the public board").toBeUndefined();
    expect(await inviteOn(outsider.who, note)).toBeUndefined();

    const card = await inviteOn(invitee.who, note);
    const accept = card?.querySelector('form[action$="/accept"]') as HTMLFormElement | null;
    if (!accept) throw new Error("the invitee has no way to accept");

    // someone else sending the invitee's accept form changes nothing
    await submit(accept, {}, outsider.who);
    expect(gameWith(await visit("/", stranger), note)).toBeUndefined();

    expect((await submit(accept, {}, invitee.who)).status).toBe(303);
    const agreed = gameWith(await visit("/", stranger), note)?.textContent ?? "";
    expect(agreed).toContain(host.name);
    expect(agreed).toContain(invitee.name);
  });

  it("lets the invitee decline, and keeps a declined invitation off the board", async () => {
    const [host, invitee] = [await withProfile("dec_h"), await withProfile("dec_i")];
    const note = `spec declined ${crypto.randomUUID().slice(0, 8)}`;
    await invite(host, invitee, note);
    const decline = (await inviteOn(invitee.who, note))?.querySelector('form[action$="/decline"]') as
      | HTMLFormElement
      | null;
    if (!decline) throw new Error("the invitee has no way to decline");
    expect((await submit(decline, {}, invitee.who)).status).toBe(303);
    expect((await inviteOn(host.who, note))?.textContent).toMatch(/declined/i);
    expect(gameWith(await visit("/", stranger), note)).toBeUndefined();
  });

  it("lets the two players talk about their game, and nobody else read it", async () => {
    const [host, invitee, outsider] = [await withProfile("talk_h"), await withProfile("talk_i"), await withProfile("talk_o")];
    const note = `spec talk ${crypto.randomUUID().slice(0, 8)}`;
    await invite(host, invitee, note);

    const thread = (await inviteOn(host.who, note))?.querySelector('a[href^="/games/"]')?.getAttribute("href");
    if (!thread) throw new Error("the invitation doesn't link to its messages");
    const said = `Best of five? ${note}`;
    expect((await submit(formWith(await visit(thread, host.who), "body"), { body: said }, host.who)).status).toBe(303);

    expect((await visit(thread, invitee.who)).body.textContent).toContain(said);
    const reply = `Sounds good ${note}`;
    await submit(formWith(await visit(thread, invitee.who), "body"), { body: reply }, invitee.who);
    expect((await visit(thread, host.who)).body.textContent).toContain(reply);

    for (const visitor of [outsider.who, stranger]) {
      const res = await fetchAs(thread, visitor);
      expect(res.status).toBe(403);
      expect(await res.text()).not.toContain(said);
    }
    // and an outsider sending the form adds nothing
    await submit(formTo(await visit(thread, host.who), "/messages"), { body: "intruding" }, outsider.who);
    expect((await visit(thread, host.who)).body.textContent).not.toContain("intruding");
  });

  it("offers no invitation on your own profile", async () => {
    const me = await withProfile("inv_self");
    expect((await visit(me.profile, me.who)).querySelector('form[action$="/invite"]')).toBeNull();
  });
});
