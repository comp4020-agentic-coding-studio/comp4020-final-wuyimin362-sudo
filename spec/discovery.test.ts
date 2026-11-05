import { describe, expect, it } from "vitest";
import {
  baseUrl,
  fetchAs,
  formTo,
  formWith,
  gameFields,
  gameWith,
  inviteForm,
  join,
  live,
  member,
  offerForm,
  quickPicks,
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

  it("turns away a game or an invitation at a venue the board doesn't list", async () => {
    const [host, invitee] = [await member("venue_h"), await member("venue_i")];
    const note = `spec unlisted ${crypto.randomUUID().slice(0, 8)}`;
    const offer = offerForm(await visit("/", host.who));
    const posted = await submit(offer, { ...gameFields(offer, note), venue: "my-garage" }, host.who);
    expect(posted.headers.get("location"), "a game was posted at an unlisted venue").toContain("problem=venue");

    const profile =
      (await visit("/profile", invitee.who)).querySelector('a[href^="/players/"]')?.getAttribute("href") ?? "";
    const invite = inviteForm(await visit(profile, host.who));
    const invited = await submit(invite, { ...gameFields(invite, note), venue: "my-garage" }, host.who);
    expect(invited.headers.get("location"), "an invitation was sent to an unlisted venue").toContain("problem=venue");

    expect(gameWith(await visit("/", stranger), note), "a game at an unlisted venue is on the board").toBeUndefined();
    expect(gameWith(await visit("/invites", host.who), note), "an invitation to an unlisted venue went out").toBeUndefined();
  });

  it("sorts venues by distance without any way to send a location, whoever is looking", async () => {
    // a signed-in visitor's page carries more script than a stranger's, so
    // all three are read
    for (const [who, visitor] of [
      ["a stranger", stranger],
      ["a guest", await join("Spec venue guest")],
      ["a member", (await member("venue_m")).who],
    ] as const) {
      const doc = await visit("/venues", visitor);
      const scripts = [...doc.querySelectorAll("script")];
      // everything the page runs is right there to read
      expect(scripts.filter((s) => s.hasAttribute("src"))).toEqual([]);
      const code = scripts.map((s) => s.textContent ?? "").join("\n");
      expect(code).toContain("navigator.geolocation");
      for (const send of ["fetch(", "XMLHttpRequest", "sendBeacon", "WebSocket", "EventSource", ".submit(", "new Image"]) {
        expect(code, `the venues page's script can send data with ${send}, for ${who}`).not.toContain(send);
      }
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

  it("puts the club rating to work in finding someone, closest to your own first", async () => {
    // a pool at a venue no other check plays at, so the order is this check's own;
    // names sort the other way from ratings, so only the rating can set the order
    const [viewer, close, strong, unrated] = [
      await member("rate_me"),
      await member("z_close"),
      await member("a_strong"),
      await member("a_unrated"),
    ];
    for (const m of [viewer, close, strong, unrated]) await setProfile(m.who, { venues: "goulburn" });
    const played = async (winner: typeof viewer, loser: typeof viewer) => {
      const report = formWith(await visit("/matches", winner.who), "opponent");
      const fields = { ...quickPicks(report), opponent: loser.username, playedOn: yesterday(), mine: "3", theirs: "0" };
      expect((await submit(report, fields, winner.who)).status).toBe(303);
      expect((await submit(formTo(await visit("/matches", loser.who), "/confirm"), {}, loser.who)).status).toBe(303);
    };
    // the viewer and the close player play each other once: about 16 points apart
    await played(viewer, close);
    // the strong player wins six against members outside the pool: about 90 up
    for (let i = 0; i < 6; i++) await played(strong, await member(`rate_beaten${i}`));

    const page = await visit("/players?venue=goulburn&style=&order=rating", viewer.who);
    const cards = [...page.querySelectorAll("li.player-card")].map((li) => li.textContent ?? "");
    const at = (name: string) => cards.findIndex((card) => card.includes(name));
    for (const m of [close, strong, unrated]) expect(at(m.name), `${m.name} isn't listed`).toBeGreaterThanOrEqual(0);
    expect(at(close.name), "closest to my rating isn't first").toBeLessThan(at(strong.name));
    // nobody is ranked by a number they never earned: no rating yet, listed after
    expect(at(strong.name), "a member with no rating was ranked among the rated").toBeLessThan(at(unrated.name));
    expect(cards[at(strong.name)], "the card doesn't show the club rating").toMatch(/club rating\D*1[5-9]\d\d/i);
    expect(cards[at(unrated.name)], "an unrated member's card claims a rating").toMatch(/no club rating yet/i);
    expect(page.querySelector('select[name="order"]'), "no way to order players by rating").not.toBeNull();
  });
});

// A day back: in the past wherever this runs, so a match can be recorded on it.
function yesterday(): string {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
