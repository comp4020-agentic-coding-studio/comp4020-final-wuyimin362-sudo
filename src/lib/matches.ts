import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "./db";
import { publish } from "./live";
import { isGuest, type Player } from "./players";
import { matches, players } from "./schema";
import { canberraNow } from "./time";
import { venues } from "./venues";

// Match results and the club rating. A member records a match they played
// against another member; it reaches anyone's record, and the rating, only
// once the opponent confirms it. The rating is the app's own and unofficial:
// Ratings Central keeps the official one.
export const RATING_START = 1500;
const K = 32;
// how far back a match can be recorded
export const RECORD_DAYS = 30;

export type MatchProblem = "opponent" | "self" | "date" | "venue" | "score" | "gone";

// A match ends when one side has won 2 of 3, 3 of 5 or 4 of 7 games.
export function endsAMatch(a: number, b: number): boolean {
  const [won, lost] = a > b ? [a, b] : [b, a];
  return Number.isInteger(a) && Number.isInteger(b) && [2, 3, 4].includes(won) && lost >= 0 && lost < won;
}

const daysBefore = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10);

export function recordMatch(
  reporter: Player,
  input: { opponent: string; playedOn: string; venue: string; mine: string; theirs: string },
): MatchProblem | undefined {
  const opponent = db
    .select()
    .from(players)
    .where(eq(players.username, input.opponent.trim().toLowerCase()))
    .get();
  if (!opponent || isGuest(opponent)) return "opponent";
  if (opponent.id === reporter.id) return "self";
  const today = canberraNow().slice(0, 10);
  const date = input.playedOn;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return "date";
  if (date > today || date < daysBefore(today, RECORD_DAYS)) return "date";
  if (!venues.some((v) => v.id === input.venue)) return "venue";
  const [mine, theirs] = [Number(input.mine), Number(input.theirs)];
  if (!endsAMatch(mine, theirs)) return "score";
  db.insert(matches)
    .values({
      reporterId: reporter.id,
      opponentId: opponent.id,
      playedOn: date,
      venue: input.venue,
      reporterGames: mine,
      opponentGames: theirs,
    })
    .run();
  // the opponent has a report waiting for them
  publish(`player:${opponent.id}`, `player:${reporter.id}`);
}

// Only the opponent can answer a report, and only while it's waiting. The
// reporter is waiting for the answer, so it reaches their own stream.
function answer(id: number, player: Player, status: "confirmed" | "disputed"): MatchProblem | undefined {
  const [answered] = db
    .update(matches)
    .set({ status, confirmedAt: status === "confirmed" ? new Date().toISOString() : null })
    .where(and(eq(matches.id, id), eq(matches.opponentId, player.id), eq(matches.status, "reported")))
    .returning({ reporterId: matches.reporterId })
    .all();
  if (!answered) return "gone";
  publish(`player:${answered.reporterId}`, `player:${player.id}`);
}

export const confirmMatch = (id: number, player: Player) => answer(id, player, "confirmed");
export const disputeMatch = (id: number, player: Player) => answer(id, player, "disputed");

const reporter = alias(players, "reporter");
const opponent = alias(players, "opponent");

function matchesWhere(condition: ReturnType<typeof and>) {
  return db
    .select({
      id: matches.id,
      playedOn: matches.playedOn,
      venue: matches.venue,
      reporterId: matches.reporterId,
      reporterName: reporter.name,
      reporterGames: matches.reporterGames,
      opponentId: matches.opponentId,
      opponentName: opponent.name,
      opponentGames: matches.opponentGames,
      status: matches.status,
    })
    .from(matches)
    .innerJoin(reporter, eq(matches.reporterId, reporter.id))
    .innerJoin(opponent, eq(matches.opponentId, opponent.id))
    .where(condition)
    .orderBy(desc(matches.playedOn), desc(matches.id))
    .all();
}

// Reports waiting for this player to confirm or dispute.
export const waitingFor = (playerId: string) =>
  matchesWhere(and(eq(matches.opponentId, playerId), eq(matches.status, "reported")));

// This player's own reports that haven't been confirmed.
export const waitingOn = (playerId: string) =>
  matchesWhere(and(eq(matches.reporterId, playerId), inArray(matches.status, ["reported", "disputed"])));

// Confirmed matches, from this player's side of the table.
export function recordOf(playerId: string, limit = 10) {
  return matchesWhere(
    and(eq(matches.status, "confirmed"), or(eq(matches.reporterId, playerId), eq(matches.opponentId, playerId))),
  )
    .slice(0, limit)
    .map((m) => {
      const mine = m.reporterId === playerId;
      return {
        id: m.id,
        playedOn: m.playedOn,
        venue: m.venue,
        opponentId: mine ? m.opponentId : m.reporterId,
        opponentName: mine ? m.opponentName : m.reporterName,
        games: mine ? m.reporterGames : m.opponentGames,
        against: mine ? m.opponentGames : m.reporterGames,
      };
    });
}

// The club rating, replayed from every confirmed match in the order they were
// confirmed. Nothing is stored, so the rating can't drift from the record.
export function ratings(): Map<string, { rating: number; played: number; won: number }> {
  const table = new Map<string, { rating: number; played: number; won: number }>();
  const of = (id: string) => {
    if (!table.has(id)) table.set(id, { rating: RATING_START, played: 0, won: 0 });
    return table.get(id)!;
  };
  const confirmed = db
    .select()
    .from(matches)
    .where(eq(matches.status, "confirmed"))
    .orderBy(asc(matches.confirmedAt), asc(matches.id))
    .all();
  for (const m of confirmed) {
    const [a, b] = [of(m.reporterId), of(m.opponentId)];
    const expected = 1 / (1 + 10 ** ((b.rating - a.rating) / 400));
    const aWon = m.reporterGames > m.opponentGames;
    const shift = K * ((aWon ? 1 : 0) - expected);
    a.rating += shift;
    b.rating -= shift;
    a.played += 1;
    b.played += 1;
    if (aWon) a.won += 1;
    else b.won += 1;
  }
  return table;
}

export const recordWindow = () => {
  const today = canberraNow().slice(0, 10);
  return { min: daysBefore(today, RECORD_DAYS), max: today };
};
