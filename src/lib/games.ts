import { and, asc, eq, gt, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "./db";
import type { Player } from "./players";
import { games, players } from "./schema";
import { addDays, canberraNow, isWallClock } from "./time";
import { venues } from "./venues";

export const kinds = { match: "Match", practice: "Practice" } as const;
type Kind = keyof typeof kinds;

export const NOTE_MAX = 200;
// how far ahead a game can be posted: about two months of club nights
export const HORIZON_DAYS = 56;

// What can go wrong with a request, as the board explains it (src/pages/index.astro).
export type Problem = "time" | "venue" | "kind" | "note" | "gone";

const host = alias(players, "host");
const guest = alias(players, "guest");

// Every game still to come that hasn't been withdrawn, soonest first: open ones
// waiting for someone, and accepted ones that are on.
export function upcomingGames() {
  return db
    .select({
      id: games.id,
      startsAt: games.startsAt,
      venue: games.venue,
      kind: games.kind,
      note: games.note,
      status: games.status,
      hostId: host.id,
      hostName: host.name,
      guestName: guest.name,
    })
    .from(games)
    .innerJoin(host, eq(games.hostId, host.id))
    .leftJoin(guest, eq(games.guestId, guest.id))
    .where(and(ne(games.status, "withdrawn"), gt(games.startsAt, canberraNow())))
    .orderBy(asc(games.startsAt), asc(games.id))
    .all();
}

export function postGame(
  player: Player,
  offer: { startsAt: string; venue: string; kind: string; note: string },
): Problem | undefined {
  const now = canberraNow();
  const note = offer.note.trim();
  if (!isWallClock(offer.startsAt) || offer.startsAt <= now) return "time";
  if (offer.startsAt > addDays(now, HORIZON_DAYS)) return "time";
  if (!venues.some((v) => v.id === offer.venue)) return "venue";
  if (!Object.hasOwn(kinds, offer.kind)) return "kind";
  if (note.length > NOTE_MAX) return "note";
  db.insert(games)
    .values({
      hostId: player.id,
      startsAt: offer.startsAt,
      venue: offer.venue,
      kind: offer.kind as Kind,
      note,
    })
    .run();
}

// Taking a game is one guarded update: it only lands while the game is still
// open, still ahead, and not the guest's own. Two people pressing Accept at
// once can't both get it, because SQLite applies the updates one at a time and
// the second no longer finds the game open.
export function acceptGame(id: number, player: Player): Problem | undefined {
  const { changes } = db
    .update(games)
    .set({ guestId: player.id, status: "accepted" })
    .where(
      and(
        eq(games.id, id),
        eq(games.status, "open"),
        ne(games.hostId, player.id),
        gt(games.startsAt, canberraNow()),
      ),
    )
    .run();
  return changes === 1 ? undefined : "gone";
}

// Only the host can withdraw, and only while nobody has taken the game.
export function withdrawGame(id: number, player: Player): Problem | undefined {
  const { changes } = db
    .update(games)
    .set({ status: "withdrawn" })
    .where(and(eq(games.id, id), eq(games.hostId, player.id), eq(games.status, "open")))
    .run();
  return changes === 1 ? undefined : "gone";
}
