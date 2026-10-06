import { JSDOM } from "jsdom";
import { describe, expect, inject, it } from "vitest";

// Crit 8's "it's alive", tried the way a stranger would: through the forms the
// board serves, with nothing but a name. One person posts a game and finds it
// still there when they come back; a second person accepts it, and the first
// sees who.
//
// These tests write to the app they run against, so they stand down against
// the live deploy, where they'd leave test games on the real board. CI runs
// them against a throwaway container; locally, against your own server.
const baseUrl = inject("baseUrl");
const live = new URL(baseUrl).hostname.endsWith(".fly.dev");

// A visitor is whatever cookie their browser holds; a stranger holds none.
type Visitor = { cookie: string };
const stranger: Visitor = { cookie: "" };

const cookieHeader = (who: Visitor): Record<string, string> =>
  who.cookie ? { cookie: who.cookie } : {};

async function visit(path: string, who: Visitor): Promise<Document> {
  const res = await fetch(new URL(path, baseUrl), { headers: cookieHeader(who) });
  expect(res.status).toBe(200);
  return new JSDOM(await res.text()).window.document;
}

// Submits a form as a browser would: urlencoded, from this origin, and without
// following the redirect, so the test sees what the server answered.
function submit(form: HTMLFormElement, fields: Record<string, string>, who: Visitor) {
  return fetch(new URL(form.getAttribute("action") ?? "", baseUrl), {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      origin: new URL(baseUrl).origin,
      ...cookieHeader(who),
    },
    body: new URLSearchParams(fields),
  });
}

function formWith(doc: Document, field: string): HTMLFormElement {
  const form = [...doc.querySelectorAll("form")].find((f) => f.querySelector(`[name="${field}"]`));
  if (!form) throw new Error(`no form on the page has a "${field}" field`);
  return form;
}

// The first real option of every select, as a member picking quickly would.
function quickPicks(form: HTMLFormElement): Record<string, string> {
  const picks: Record<string, string> = {};
  for (const select of form.querySelectorAll("select")) {
    const option = [...select.options].find((o) => o.value !== "");
    if (option) picks[select.name] = option.value;
  }
  return picks;
}

// Each game on the board is its own list item (or article), so a game's
// details and the button that acts on it sit together.
function gameWith(doc: Document, text: string): Element | undefined {
  return [...doc.querySelectorAll("li, article")].find((el) => el.textContent?.includes(text));
}

// Three days out at 7 pm: in the future whatever zone this runs in.
function threeDaysOut(): string {
  const d = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T19:00`;
}

async function join(name: string): Promise<Visitor> {
  const res = await submit(formWith(await visit("/", stranger), "name"), { name }, stranger);
  expect(res.status).toBe(303);
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  expect(cookie, "joining set no cookie, so the app can't know them again").not.toBe("");
  return { cookie };
}

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
