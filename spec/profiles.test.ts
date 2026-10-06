import { describe, expect, it } from "vitest";
import {
  fetchAs,
  formWith,
  gameWith,
  join,
  live,
  member,
  postGame,
  quickPicks,
  stranger,
  submit,
  upload,
  visit,
  type Visitor,
} from "./helpers.ts";

// Profiles: a member's photo, blade and rubbers, grip, style, home venues and
// Ratings Central link. Members see each other's; strangers and guests see
// none of it, photos included.

// A 1×1 PNG, the smallest real image there is.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

// The profile a game's host links to from the board.
async function profileLink(who: Visitor, note: string): Promise<string> {
  const link = gameWith(await visit("/", who), note)?.querySelector('a[href^="/players/"]');
  const href = link?.getAttribute("href");
  if (!href) throw new Error("the game's host doesn't link to a profile");
  return href;
}

describe.skipIf(live)("profiles", () => {
  it("lets a member describe their game, and shows it to other members only", async () => {
    const host = await member("host");
    const details = formWith(await visit("/profile", host.who), "blade");
    const saved = await submit(
      details,
      {
        ...quickPicks(details),
        blade: "Viscaria",
        forehand: "Tenergy 05",
        backhand: "Dignics 09C",
        venues: "kingston",
        ratingsCentral: "100500",
      },
      host.who,
    );
    expect(saved.status).toBe(303);

    const note = `spec profile game ${crypto.randomUUID().slice(0, 8)}`;
    await postGame(host.who, note);

    // another member follows the host's name from the board
    const other = await member("other");
    const href = await profileLink(other.who, note);
    const page = (await visit(href, other.who)).body.textContent ?? "";
    for (const kit of ["Viscaria", "Tenergy 05", "Dignics 09C", host.name]) expect(page).toContain(kit);
    const rc = (await visit(href, other.who)).querySelector('a[href*="ratingscentral.com/Player.php?PlayerID=100500"]');
    expect(rc, "no link to the member's Ratings Central page").not.toBeNull();

    // a stranger and a guest are turned away, and see none of it
    for (const visitor of [stranger, await join(`Spec onlooker ${note}`)]) {
      const res = await fetchAs(href, visitor);
      expect(res.status).toBe(403);
      expect(await res.text()).not.toContain("Viscaria");
    }
  });

  it("shows a member's photo to members only, and won't take a file that isn't an image", async () => {
    const host = await member("photo");
    const photoForm = formWith(await visit("/profile", host.who), "photo");
    const res = await upload(photoForm, "photo", new Blob([PNG], { type: "image/png" }), "me.png", host.who);
    expect(res.status).toBe(303);

    const note = `spec photo game ${crypto.randomUUID().slice(0, 8)}`;
    await postGame(host.who, note);
    const other = await member("viewer");
    const src = (await visit(await profileLink(other.who, note), other.who))
      .querySelector('img[src^="/avatars/"]')
      ?.getAttribute("src");
    if (!src) throw new Error("the profile shows no photo");

    const seen = await fetchAs(src, other.who);
    expect(seen.status).toBe(200);
    expect(seen.headers.get("content-type")).toBe("image/png");
    expect(Buffer.from(await seen.arrayBuffer()).equals(PNG)).toBe(true);
    expect((await fetchAs(src, stranger)).status).toBe(403);

    // a text file dressed up as a PNG is refused, and the real photo stays
    const fake = new Blob(["not an image at all"], { type: "image/png" });
    await upload(formWith(await visit("/profile", host.who), "photo"), "photo", fake, "fake.png", host.who);
    const still = await fetchAs(src.split("?")[0], other.who);
    expect(Buffer.from(await still.arrayBuffer()).equals(PNG)).toBe(true);
  });
});
