import { describe, expect, it } from "vitest";
import {
  cookieFrom,
  formTo,
  formWith,
  gameWith,
  join,
  live,
  postGame,
  stranger,
  submit,
  visit,
  type Visitor,
} from "./helpers.ts";

// Accounts and guest mode, through the forms a person would use. A guest is
// anyone who gives a name; an account adds a username and a password, so the
// same person can sign in from any browser. Logging out ends the session on the
// server, not just in the browser that asked.

async function signUp(username: string, name: string, password: string, who: Visitor = stranger) {
  const form = formWith(await visit("/signup", who), "username");
  return submit(form, { username, name, password }, who);
}

async function logIn(username: string, password: string) {
  const form = formWith(await visit("/login", stranger), "password");
  return submit(form, { username, password }, stranger);
}

const header = async (who: Visitor) => (await visit("/", who)).querySelector("header")?.textContent ?? "";

// Only a game's host is offered the form that withdraws it.
async function hosts(who: Visitor, note: string): Promise<boolean> {
  const game = gameWith(await visit("/", who), note);
  return Boolean(game?.querySelector('form[action$="/withdraw"]'));
}

const fresh = () => crypto.randomUUID().slice(0, 8);

// Whether some element in the game says exactly "Guest". Matching the card's
// whole text instead would trip on paragraphs, whose text runs together.
const markedGuest = (game: Element | undefined) =>
  [...(game?.querySelectorAll("*") ?? [])].some((el) => el.textContent?.trim().toLowerCase() === "guest");

describe.skipIf(live)("accounts and guests", () => {
  it("signs a member up, and knows them again after they log out and back in elsewhere", async () => {
    const id = fresh();
    const [username, name, password] = [`spec_${id}`, `Spec member ${id}`, `correct horse ${id}`];

    const res = await signUp(username, name, password);
    expect(res.status).toBe(303);
    const member: Visitor = { cookie: cookieFrom(res) };
    expect(await header(member)).toContain(name);

    const note = `spec member game ${id}`;
    await postGame(member, note);

    // logging out ends the session itself, so the old cookie stops working
    const out = await submit(formTo(await visit("/", member), "/logout"), {}, member);
    expect(out.status).toBe(303);
    expect(await header(member)).not.toContain(name);

    // another browser, the same person, still the host of their game
    const back = await logIn(username, password);
    expect(back.status).toBe(303);
    const elsewhere: Visitor = { cookie: cookieFrom(back) };
    expect(await header(elsewhere)).toContain(name);
    expect(await hosts(elsewhere, note)).toBe(true);
  });

  it("turns away a taken username and a wrong password", async () => {
    const id = fresh();
    const [username, password] = [`spec_${id}`, `right password ${id}`];
    expect((await signUp(username, `First ${id}`, password)).status).toBe(303);

    const taken = await signUp(username, `Second ${id}`, `other password ${id}`);
    expect(taken.status).not.toBe(303);
    expect(cookieFrom(taken)).toBe("");

    const wrong = await logIn(username, `wrong password ${id}`);
    expect(wrong.status).not.toBe(303);
    expect(cookieFrom(wrong)).toBe("");
  });

  it("locks an account for a while after five wrong passwords", async () => {
    const id = fresh();
    const [username, password] = [`spec_${id}`, `right password ${id}`];
    expect((await signUp(username, `Locked ${id}`, password)).status).toBe(303);
    for (let i = 0; i < 5; i++) await logIn(username, `wrong ${i} ${id}`);

    // even the right password is refused until the lock lifts
    const right = await logIn(username, password);
    expect(right.status).not.toBe(303);
    expect(cookieFrom(right)).toBe("");
  });

  it("marks guests on the board, and lets a guest keep their games by making an account", async () => {
    const id = fresh();
    const name = `Spec visitor ${id}`;
    const visitor = await join(name);
    const note = `spec visitor game ${id}`;
    await postGame(visitor, note);
    expect(markedGuest(gameWith(await visit("/", stranger), note))).toBe(true);

    // the guest makes an account from the same browser
    const [username, password] = [`spec_${id}`, `no longer a guest ${id}`];
    expect((await signUp(username, name, password, visitor)).status).toBe(303);
    expect(markedGuest(gameWith(await visit("/", stranger), note))).toBe(false);

    // and the game is still theirs when they log in from somewhere else
    const back = await logIn(username, password);
    expect(await hosts({ cookie: cookieFrom(back) }, note)).toBe(true);
  });
});
