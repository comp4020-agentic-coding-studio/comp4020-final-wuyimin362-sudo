import { describe, expect, it } from "vitest";
import {
  formTo,
  formWith,
  gameWith,
  join,
  live,
  member,
  postGame,
  quickPicks,
  stranger,
  submit,
  visit,
  type Visitor,
} from "./helpers.ts";

// CLAUDE.md: every input has a visible label. Every field on every page, as a
// stranger, a guest and a member see it, has a label that names it, either
// around it or pointing at it, and the label says something a person can
// see: not only text hidden for screen readers, and not just the options of
// the select it holds. Contrast and focus are judged at both viewports, not
// checked here.

// The words a field's label shows, leaving out the field itself (a select's
// options are inside its label) and anything only a screen reader gets.
function visibleLabel(field: Element): string {
  const doc = field.ownerDocument;
  const label = field.closest("label") ?? (field.id ? doc.querySelector(`label[for="${field.id}"]`) : null);
  if (!label || label.classList.contains("visually-hidden")) return "";
  const copy = label.cloneNode(true) as Element;
  for (const el of copy.querySelectorAll("input, select, textarea, .visually-hidden")) el.remove();
  return copy.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

async function unlabelled(path: string, who: Visitor): Promise<string[]> {
  const doc = await visit(path, who);
  return [...doc.querySelectorAll("input, select, textarea")]
    .filter((f) => !["hidden", "submit", "button"].includes(f.getAttribute("type") ?? ""))
    .filter((f) => visibleLabel(f) === "")
    .map((f) => `${path}: ${f.tagName.toLowerCase()} "${f.getAttribute("name")}"`);
}

const yesterday = () => {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

describe.skipIf(live)("labels", () => {
  it("gives every field on every page a label a person can see", async () => {
    const [me, them] = [await member("lbl_me"), await member("lbl_them")];
    const guest = await join("Spec label guest");
    const theirProfile =
      (await visit("/profile", them.who)).querySelector('a[href^="/players/"]')?.getAttribute("href") ?? "";

    // a game the two members agreed, for its thread
    const note = `spec labels ${crypto.randomUUID().slice(0, 8)}`;
    await postGame(me.who, note);
    const accept = gameWith(await visit("/", them.who), note)?.querySelector('form[action$="/accept"]');
    if (!accept) throw new Error("no accept form for the game");
    await submit(accept as HTMLFormElement, {}, them.who);
    const thread = gameWith(await visit("/", me.who), note)?.querySelector('a[href^="/games/"]')?.getAttribute("href");
    if (!thread) throw new Error("no thread link for the game");

    // a confirmed match, for its review form
    const report = formWith(await visit("/matches", me.who), "opponent");
    const fields = { ...quickPicks(report), opponent: them.username, playedOn: yesterday(), mine: "3", theirs: "1" };
    await submit(report, fields, me.who);
    await submit(formTo(await visit("/matches", them.who), "/confirm"), {}, them.who);
    const review = (await visit("/matches", them.who)).querySelector('a[href$="/review"]')?.getAttribute("href");
    if (!review) throw new Error("no review link for the match");

    const missing = [
      ...(await Promise.all(["/", "/signup", "/login", "/events", "/venues"].map((p) => unlabelled(p, stranger)))),
      ...(await Promise.all(["/", "/signup", "/events"].map((p) => unlabelled(p, guest)))),
      ...(await Promise.all(
        ["/", "/profile", "/matches", "/invites", "/events", "/players", theirProfile, thread].map((p) =>
          unlabelled(p, me.who),
        ),
      )),
      await unlabelled(review, them.who),
    ].flat();
    expect(missing, "fields without a label anyone can see").toEqual([]);
  });
});
