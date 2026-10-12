import { JSDOM } from "jsdom";
import { expect, inject } from "vitest";

// What the checks in spec/ share: a browser reduced to the cookie it holds, and
// forms submitted the way a browser submits them.
export const baseUrl = inject("baseUrl");

// These checks write to the app they run against, so they stand down against
// the live deploy, where they'd leave test data on the real board. CI runs them
// against a throwaway container; locally, against your own server.
export const live = new URL(baseUrl).hostname.endsWith(".fly.dev");

// A visitor is whatever cookie their browser holds; a stranger holds none.
export type Visitor = { cookie: string };
export const stranger: Visitor = { cookie: "" };

const cookieHeader = (who: Visitor): Record<string, string> =>
  who.cookie ? { cookie: who.cookie } : {};

export async function visit(path: string, who: Visitor): Promise<Document> {
  const res = await fetch(new URL(path, baseUrl), { headers: cookieHeader(who) });
  expect(res.status, `GET ${path}`).toBe(200);
  return new JSDOM(await res.text()).window.document;
}

// Submits a form as a browser would: urlencoded, from this origin, and without
// following the redirect, so the check sees what the server answered.
export function submit(form: HTMLFormElement, fields: Record<string, string>, who: Visitor) {
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

// Uploads a file through a form, as a browser sends a file input: multipart,
// from this origin, without following the redirect.
export function upload(form: HTMLFormElement, field: string, file: Blob, filename: string, who: Visitor) {
  const body = new FormData();
  body.append(field, file, filename);
  return fetch(new URL(form.getAttribute("action") ?? "", baseUrl), {
    method: "POST",
    redirect: "manual",
    headers: { origin: new URL(baseUrl).origin, ...cookieHeader(who) },
    body,
  });
}

// Listens to a server-sent event stream the way an open page does, and counts
// the "change" events that arrive. `nextChange` resolves with how many
// milliseconds the next one took, or undefined if none came in time.
export function listen(path: string, who: Visitor) {
  const controller = new AbortController();
  let changes = 0;
  let wake: (() => void) | undefined;
  const status = fetch(new URL(path, baseUrl), {
    headers: { accept: "text/event-stream", ...cookieHeader(who) },
    signal: controller.signal,
  }).then((res) => {
    if (res.status === 200 && res.body) {
      void (async () => {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        try {
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            for (let end = buffer.indexOf("\n\n"); end >= 0; end = buffer.indexOf("\n\n")) {
              if (/^event: change$/m.test(buffer.slice(0, end))) {
                changes += 1;
                wake?.();
              }
              buffer = buffer.slice(end + 2);
            }
          }
        } catch {
          // closed by close()
        }
      })();
    }
    return res.status;
  });
  return {
    status,
    nextChange(withinMs: number): Promise<number | undefined> {
      const seen = changes;
      const started = Date.now();
      return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(undefined), withinMs);
        wake = () => {
          if (changes > seen) {
            clearTimeout(timer);
            resolve(Date.now() - started);
          }
        };
      });
    },
    close: () => controller.abort(),
  };
}

// A GET that reports whatever the server says, for pages a visitor may be
// refused.
export function fetchAs(path: string, who: Visitor) {
  return fetch(new URL(path, baseUrl), { headers: cookieHeader(who), redirect: "manual" });
}

// The cookies a response sets, as the next request would send them. A cookie
// being deleted isn't one.
export function cookieFrom(res: Response): string {
  return res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .filter((c) => !c.endsWith("=") && !c.endsWith("=deleted"))
    .join("; ");
}

export function formWith(doc: Document, field: string): HTMLFormElement {
  const form = [...doc.querySelectorAll("form")].find((f) => f.querySelector(`[name="${field}"]`));
  if (!form) throw new Error(`no form on the page has a "${field}" field`);
  return form;
}

export function formTo(doc: Document, action: string): HTMLFormElement {
  const form = [...doc.querySelectorAll("form")].find((f) => f.getAttribute("action")?.endsWith(action));
  if (!form) throw new Error(`no form on the page posts to "${action}"`);
  return form;
}

// The first real option of every select, as a member picking quickly would.
export function quickPicks(form: HTMLFormElement): Record<string, string> {
  const picks: Record<string, string> = {};
  for (const select of form.querySelectorAll("select")) {
    const option = [...select.options].find((o) => o.value !== "");
    if (option) picks[select.name] = option.value;
  }
  return picks;
}

// Each game on the board is its own list item (or article), so a game's
// details and the button that acts on it sit together.
export function gameWith(doc: Document, text: string): Element | undefined {
  return [...doc.querySelectorAll("li, article")].find((el) => el.textContent?.includes(text));
}

// Three days out at 7 pm: in the future whatever zone this runs in.
export function threeDaysOut(): string {
  const d = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T19:00`;
}

// Joins as a guest: a name, and nothing else.
export async function join(name: string): Promise<Visitor> {
  const res = await submit(formWith(await visit("/", stranger), "name"), { name }, stranger);
  expect(res.status).toBe(303);
  const cookie = cookieFrom(res);
  expect(cookie, "joining set no cookie, so the app can't know them again").not.toBe("");
  return { cookie };
}

// Signs up a new member and returns their browser, with the name and username
// they signed up with.
export async function member(label: string): Promise<{ who: Visitor; name: string; username: string }> {
  const id = crypto.randomUUID().slice(0, 8);
  const name = `Spec ${label} ${id}`;
  const username = `spec_${label}_${id}`.slice(0, 20);
  const form = formWith(await visit("/signup", stranger), "username");
  const res = await submit(form, { username, name, password: `password ${id}` }, stranger);
  expect(res.status, "signing up a member").toBe(303);
  return { who: { cookie: cookieFrom(res) }, name, username };
}

export async function postGame(who: Visitor, note: string): Promise<void> {
  const offer = formWith(await visit("/", who), "startsAt");
  const res = await submit(offer, { ...quickPicks(offer), startsAt: threeDaysOut(), note }, who);
  expect(res.status).toBe(303);
}
