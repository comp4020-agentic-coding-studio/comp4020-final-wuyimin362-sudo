import { describe, expect, it } from "vitest";
import {
  baseUrl,
  fetchAs,
  formWith,
  join,
  live,
  member,
  offerForm,
  stranger,
  submit,
  visit,
  type Visitor,
} from "./helpers.ts";

// Finding places and people. Anyone can see the venues; sorting them by
// distance happens in the browser, so a location never leaves it. Finding
// players is for members, and "near you" means people who usually play where
// you do, worked out from venues rather than anyone's whereabouts.

async function setProfile(who: Visitor, fields: Record<string, string>): Promise<void> {
  const form = formWith(await visit("/profile", who), "blade");
  expect((await submit(form, fields, who)).status).toBe(303);
}

// The players page, filtered through its own form.
async function players(who: Visitor, filters?: Record<string, string>): Promise<string> {
  const doc = await visit("/players", who);
  if (!filters) return doc.body.textContent ?? "";
  const form = formWith(doc, "style");
  const url = new URL(form.getAttribute("action") ?? "/players", baseUrl);
  url.search = new URLSearchParams(filters).toString();
  return (await visit(url.pathname + url.search, who)).body.textContent ?? "";
}

describe.skipIf(live)("finding venues and players", () => {
  it("lists every venue the board offers, for anyone to see", async () => {
    const { who } = await member("venues");
    const offered = [...offerForm(await visit("/", who)).querySelectorAll('select[name="venue"] option')]
      .filter((o) => o.getAttribute("value"))
      .map((o) => (o.textContent ?? "").split(",")[0].trim());
    expect(offered.length).toBeGreaterThan(0);

    const page = (await visit("/venues", stranger)).body.textContent ?? "";
    for (const venue of offered) expect(page).toContain(venue);
  });

  it("sorts venues by distance without any way to send a location", async () => {
    const doc = await visit("/venues", stranger);
    const scripts = [...doc.querySelectorAll("script")];
    // everything the page runs is right there to read
    expect(scripts.filter((s) => s.hasAttribute("src"))).toEqual([]);
    const code = scripts.map((s) => s.textContent ?? "").join("\n");
    expect(code).toContain("navigator.geolocation");
    for (const send of ["fetch(", "XMLHttpRequest", "sendBeacon", "WebSocket", "EventSource", ".submit(", "new Image"]) {
      expect(code, `the venues page's script can send data with ${send}`).not.toContain(send);
    }
  });

  it("finds members who play where you do, filters by style, and shows none of it to non-members", async () => {
    const chopper = await member("chop");
    await setProfile(chopper.who, { venues: "bermagui", style: "defender" });

    const neighbour = await member("near");
    await setProfile(neighbour.who, { venues: "bermagui" });
    expect(await players(neighbour.who)).toContain(chopper.name);

    // someone who plays elsewhere doesn't see them as near...
    const faraway = await member("far");
    await setProfile(faraway.who, { venues: "robertson" });
    expect(await players(faraway.who)).not.toContain(chopper.name);
    // ...but finds them anywhere when looking for a defender to practise against
    expect(await players(faraway.who, { venue: "", style: "defender" })).toContain(chopper.name);

    // (the guest's own name shows in the header, so it mustn't contain the one checked for)
    for (const visitor of [stranger, await join("Spec onlooker")]) {
      const res = await fetchAs("/players", visitor);
      expect(res.status).toBe(403);
      expect(await res.text()).not.toContain(chopper.name);
    }
  });
});
