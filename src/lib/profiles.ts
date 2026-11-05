import { and, eq, isNotNull, ne } from "drizzle-orm";
import { db } from "./db";
import { publish } from "./live";
import { RATING_START, ratings } from "./matches";
import type { Player } from "./players";
import { standingOf, strengthsFrom } from "./reviews";
import { avatars, homeVenues, players } from "./schema";
import { venues } from "./venues";

// A member's profile: their kit, how they play, where they usually play and
// their Ratings Central number. Only members have one, and only members can
// see one (src/pages/players/[id].astro).
export const grips = { shakehand: "Shakehand", penhold: "Penhold" } as const;
export const styles = {
  attacker: "Attacker",
  allround: "All-round",
  defender: "Defender (chops)",
  blocker: "Blocker / counter-hitter",
  pips: "Pips-out hitter",
} as const;

export const KIT_MAX = 60;
export const PHOTO_MAX = 1024 * 1024;

export type Profile = Omit<Player, "passwordHash"> & { venues: string[]; photoVersion: string | null };

export function profileOf(id: string): Profile | undefined {
  const player = db.select().from(players).where(eq(players.id, id)).get();
  // guests have no profile
  if (!player || player.username === null) return undefined;
  const { passwordHash: _, ...shown } = player;
  const rows = db.select({ venue: homeVenues.venue }).from(homeVenues).where(eq(homeVenues.playerId, id)).all();
  const photo = db.select({ updatedAt: avatars.updatedAt }).from(avatars).where(eq(avatars.playerId, id)).get();
  // in the venue list's own order, as everywhere else
  const order = (venue: string) => venues.findIndex((v) => v.id === venue);
  const chosen = rows.map((r) => r.venue).sort((a, b) => order(a) - order(b));
  return { ...shown, venues: chosen, photoVersion: photo?.updatedAt ?? null };
}

export type ProfileProblem = "kit" | "grip" | "style" | "venues" | "ratingsCentral";

export function saveProfile(playerId: string, form: FormData): ProfileProblem | undefined {
  const text = (name: string) =>
    String(form.get(name) ?? "")
      .trim()
      .replace(/\s+/g, " ");
  const kit = { blade: text("blade"), forehand: text("forehand"), backhand: text("backhand") };
  if (Object.values(kit).some((v) => v.length > KIT_MAX)) return "kit";
  const grip = text("grip");
  if (grip && !Object.hasOwn(grips, grip)) return "grip";
  const style = text("style");
  if (style && !Object.hasOwn(styles, style)) return "style";
  const chosen = new Set(form.getAll("venues").map(String));
  if ([...chosen].some((id) => !venues.some((v) => v.id === id))) return "venues";
  const ratingsCentral = text("ratingsCentral");
  if (ratingsCentral && !/^\d{1,9}$/.test(ratingsCentral)) return "ratingsCentral";

  db.transaction((tx) => {
    tx.update(players)
      .set({
        blade: kit.blade || null,
        forehand: kit.forehand || null,
        backhand: kit.backhand || null,
        grip: (grip || null) as keyof typeof grips | null,
        style: (style || null) as keyof typeof styles | null,
        ratingsCentralId: ratingsCentral || null,
      })
      .where(eq(players.id, playerId))
      .run();
    tx.delete(homeVenues).where(eq(homeVenues.playerId, playerId)).run();
    for (const venue of chosen) tx.insert(homeVenues).values({ playerId, venue }).run();
  });
  // only members can see a profile
  publish("members");
}

// What a file's first bytes say it is. The file's name and the browser's word
// for its type are ignored, so nothing but a real JPEG, PNG or WebP is stored.
function imageType(bytes: Buffer): string | undefined {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (bytes.toString("latin1", 0, 4) === "RIFF" && bytes.toString("latin1", 8, 12) === "WEBP") {
    return "image/webp";
  }
}

export async function savePhoto(playerId: string, file: FormDataEntryValue | null): Promise<"photo" | undefined> {
  if (!(file instanceof File) || file.size === 0 || file.size > PHOTO_MAX) return "photo";
  const data = Buffer.from(await file.arrayBuffer());
  const type = imageType(data);
  if (!type) return "photo";
  const updatedAt = new Date().toISOString();
  db.insert(avatars)
    .values({ playerId, type, data, updatedAt })
    .onConflictDoUpdate({ target: avatars.playerId, set: { type, data, updatedAt } })
    .run();
  publish("members");
}

export function photoOf(playerId: string) {
  return db.select().from(avatars).where(eq(avatars.playerId, playerId)).get();
}

// Other members, for finding someone to play. "near" means sharing one of the
// viewer's usual venues, so it's worked out from venues, never from anyone's
// location; "" means anywhere. Each comes with their unofficial club rating,
// if they have one, and the strengths their opponents name, which show only
// once three different opponents have reviewed them. "rating" orders them
// closest to the viewer's own rating first, so a member can find an even
// game; anyone without a rating yet comes after, by name, rather than being
// ranked by a number they never earned. A club is small enough to do this in
// memory.
export function findMembers(viewerId: string, where: { venue: string; style: string; order?: string }) {
  const members = db
    .select({
      id: players.id,
      name: players.name,
      username: players.username,
      grip: players.grip,
      style: players.style,
      blade: players.blade,
    })
    .from(players)
    .where(and(isNotNull(players.username), ne(players.id, viewerId)))
    .all();
  const venuesOf = new Map<string, string[]>();
  for (const { playerId, venue } of db.select().from(homeVenues).all()) {
    venuesOf.set(playerId, [...(venuesOf.get(playerId) ?? []), venue]);
  }
  const photos = new Map(
    db
      .select({ playerId: avatars.playerId, updatedAt: avatars.updatedAt })
      .from(avatars)
      .all()
      .map((p) => [p.playerId, p.updatedAt]),
  );
  const wanted =
    where.venue === "near" ? new Set(venuesOf.get(viewerId)) : where.venue ? new Set([where.venue]) : undefined;
  const table = ratings();
  const mine = table.get(viewerId)?.rating ?? RATING_START;
  const found = members
    .map((m) => {
      const opinions = standingOf(m.id);
      return {
        ...m,
        venues: venuesOf.get(m.id) ?? [],
        photoVersion: photos.get(m.id) ?? null,
        rating: table.get(m.id)?.rating,
        strengths: opinions.shown ? strengthsFrom(opinions.averages) : [],
      };
    })
    .filter((m) => !wanted || m.venues.some((v) => wanted.has(v)))
    .filter((m) => !where.style || m.style === where.style)
    .sort((a, b) => a.name.localeCompare(b.name));
  if (where.order !== "rating") return found;
  const gap = (m: (typeof found)[number]) => (m.rating === undefined ? Infinity : Math.abs(m.rating - mine));
  // a stable sort, so players the same distance away stay in name order
  return found.sort((a, b) => gap(a) - gap(b));
}

export const usualVenues = (playerId: string) =>
  db
    .select({ venue: homeVenues.venue })
    .from(homeVenues)
    .where(eq(homeVenues.playerId, playerId))
    .all()
    .map((r) => r.venue);

// "WL" for Wei Liang: what shows where a member has no photo.
export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => [...word][0]?.toUpperCase() ?? "")
    .join("");
}

export const ratingsCentralUrl = (id: string) => `https://www.ratingscentral.com/Player.php?PlayerID=${id}`;
// where a member can look up their own number
export const RATINGS_CENTRAL_ACT_LIST =
  "https://www.ratingscentral.com/PlayerList.php?ClubID=916&MatchNonPrimary=Yes&PlayerSport=1&SortOrder=Rating&MinLastPlayed=20-01-01&Heading=All+Members+of+Table+Tennis+ACT";
