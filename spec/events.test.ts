import { describe, expect, it } from "vitest";
import { live, member, stranger, submit, visit, type Visitor } from "./helpers.ts";

// Table Tennis ACT's own events. The app lists them and sends anyone who wants
// to enter to Table Tennis ACT's page for the event: it takes no entries, so it
// never asks for the details an entry would need. Members can say they're
// going, or that they're looking for a doubles partner, and only members see
// who has.

const eventCards = async (who: Visitor) => [...(await visit("/events", who)).querySelectorAll("li.event")];

// One of a member's interest buttons on the first event, by what it says.
async function mark(who: Visitor, label: RegExp) {
  const [first] = await eventCards(who);
  const button = [...(first?.querySelectorAll("form button") ?? [])].find((b) => label.test(b.textContent ?? ""));
  const form = button?.closest("form") as HTMLFormElement | null;
  if (!form) throw new Error(`no "${label}" button on the first event`);
  const fields: Record<string, string> = {};
  for (const input of form.querySelectorAll("input[type=hidden], button[name]")) {
    const el = input as HTMLInputElement;
    fields[el.name] = el.value;
  }
  return submit(form, fields, who);
}

describe.skipIf(live)("official events", () => {
  it("lists Table Tennis ACT's events, each sending entries to Table Tennis ACT, and takes none itself", async () => {
    const cards = await eventCards(stranger);
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(card.querySelector('a[href^="https://www.tabletennisact.org.au/events/"]')).not.toBeNull();
    }
    const page = await visit("/events", stranger);
    for (const field of ["email", "phone", "dob", "address", "entry"]) {
      expect(page.querySelector(`[name*="${field}" i]`), `the events page asks for ${field}`).toBeNull();
    }
  });

  it("lets members say they're going or want a partner, and shows that to members only", async () => {
    const [keen, other] = [await member("keen"), await member("look")];
    expect((await mark(keen.who, /partner/i)).status).toBe(303);

    const seen = (await eventCards(other.who))[0]?.textContent ?? "";
    expect(seen).toContain(keen.name);
    expect((await eventCards(stranger))[0]?.textContent ?? "").not.toContain(keen.name);

    // changing their mind moves them, rather than listing them twice
    expect((await mark(keen.who, /going/i)).status).toBe(303);
    const after = (await eventCards(other.who))[0];
    const partnerLine = [...(after?.querySelectorAll("p") ?? [])].find((p) => /partner/i.test(p.textContent ?? ""));
    expect(partnerLine?.textContent ?? "").not.toContain(keen.name);
    expect(after?.textContent ?? "").toContain(keen.name);
  });
});
