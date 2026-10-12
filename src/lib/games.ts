import { and, asc, eq, gt, inArray, isNotNull, isNull, ne, notInArray, or } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "./db";
import { publish, type Topic } from "./live";
import { isGuest, type Player } from "./players";
import { games, players } from "./schema";
import { addDays, canberraNow, isWallClock } from "./time";
import { venues } from "./venues";

export const kinds = { match: "Match", practice: "Practice" } as const;
type Kind = keyof typeof kinds;

export const NOTE_MAX = 200;
// how far ahead a game can be posted: about two months of club nights
export const HORIZON_DAYS = 56;

// What can go wrong with a request, as the board explains it (src/pages/index.astro).
export type Problem = "time" | "venue" | "kind" | "note" | "gone" | "invitee";

type Offer = { startsAt: string; venue: string; kind: string; note: string };

const host = alias(players, "host");
const guest = alias(players, "guest");
const invited = alias(players, "invited");

function gamesWhere(condition: ReturnType<typeof and>) {
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
      // null for a guest
      hostUsername: host.username,
      guestId: guest.id,
      guestName: guest.name,
      guestUsername: guest.username,
      invitedId: invited.id,
      invitedName: invited.name,
    })
    .from(games)
    .innerJoin(host, eq(games.hostId, host.id))
    .leftJoin(guest, eq(games.guestId, guest.id))
    .leftJoin(invited, eq(games.invitedId, invited.id))
    .where(condition)
    .orderBy(asc(games.startsAt), asc(games.id))
    .all();
}

// Every game on the public board that's still to come, soonest first: open
// ones waiting for anyone, and agreed ones. A direct invitation stays off it
// until it's accepted.
export const upcomingGames = () =>
  gamesWhere(
    and(
      notInArray(games.status, ["withdrawn", "declined"]),
      gt(games.startsAt, canberraNow()),
      or(isNull(games.invitedId), eq(games.status, "accepted")),
    ),
  );

// Invitations still waiting for this player to answer.
export const invitationsFor = (playerId: string) =>
  gamesWhere(and(eq(games.invitedId, playerId), eq(games.status, "open"), gt(games.startsAt, canberraNow())));

// Invitations this player has sent that are still to come, however they stand.
export const invitationsFrom = (playerId: string) =>
  gamesWhere(
    and(
      eq(games.hostId, playerId),
      isNotNull(games.invitedId),
      ne(games.status, "withdrawn"),
      gt(games.startsAt, canberraNow()),
    ),
  );

export const gameById = (id: number) => gamesWhere(eq(games.id, id))[0];

// An invitation waits on its invitee and answers to its host, so a change to
// one reaches both their own streams as well as the game's.
function invitationTopics(id: number): Topic[] {
  const game = gameById(id);
  return game?.invitedId ? [`player:${game.hostId}`, `player:${game.invitedId}`] : [];
}

function checkOffer(offer: Offer): Problem | undefined {
  const now = canberraNow();
  if (!isWallClock(offer.startsAt) || offer.startsAt <= now) return "time";
  if (offer.startsAt > addDays(now, HORIZON_DAYS)) return "time";
  if (!venues.some((v) => v.id === offer.venue)) return "venue";
  if (!Object.hasOwn(kinds, offer.kind)) return "kind";
  if (offer.note.trim().length > NOTE_MAX) return "note";
}

export function postGame(player: Player, offer: Offer): Problem | undefined {
  const problem = checkOffer(offer);
  if (problem) return problem;
  db.insert(games)
    .values({
      hostId: player.id,
      startsAt: offer.startsAt,
      venue: offer.venue,
      kind: offer.kind as Kind,
      note: offer.note.trim(),
    })
    .run();
  publish("board");
}

// A game offered to one member, who has to be a member and not the host.
export function inviteTo(player: Player, inviteeId: string, offer: Offer): Problem | undefined {
  const invitee = db.select().from(players).where(eq(players.id, inviteeId)).get();
  if (!invitee || isGuest(invitee) || invitee.id === player.id) return "invitee";
  const problem = checkOffer(offer);
  if (problem) return problem;
  db.insert(games)
    .values({
      hostId: player.id,
      invitedId: invitee.id,
      startsAt: offer.startsAt,
      venue: offer.venue,
      kind: offer.kind as Kind,
      note: offer.note.trim(),
    })
    .run();
  publish(`player:${invitee.id}`, `player:${player.id}`);
}

// Taking a game is one guarded update: it only lands while the game is still
// open, still ahead, not the taker's own, and either open to anyone or offered
// to them. Two people pressing Accept at once can't both get it, because
// SQLite applies the updates one at a time and the second no longer finds the
// game open.
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
        or(isNull(games.invitedId), eq(games.invitedId, player.id)),
      ),
    )
    .run();
  if (changes !== 1) return "gone";
  publish("board", `game:${id}`, ...invitationTopics(id));
}

// Only the member invited can decline, and only while it's waiting.
export function declineInvitation(id: number, player: Player): Problem | undefined {
  const { changes } = db
    .update(games)
    .set({ status: "declined" })
    .where(and(eq(games.id, id), eq(games.invitedId, player.id), eq(games.status, "open")))
    .run();
  if (changes !== 1) return "gone";
  publish(`game:${id}`, ...invitationTopics(id));
}

// Only the host can withdraw, and only while nobody has taken the game.
export function withdrawGame(id: number, player: Player): Problem | undefined {
  const { changes } = db
    .update(games)
    .set({ status: "withdrawn" })
    .where(and(eq(games.id, id), eq(games.hostId, player.id), inArray(games.status, ["open"])))
    .run();
  if (changes !== 1) return "gone";
  publish("board", `game:${id}`, ...invitationTopics(id));
}
