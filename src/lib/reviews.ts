import { and, desc, eq } from "drizzle-orm";
import { db } from "./db";
import type { Player } from "./players";
import { matches, players, reviews } from "./schema";

// Opponents' views of a member's game. Only someone who played you in a
// confirmed match can review you, once per match. The hexagon and the comments
// show only once three different opponents have reviewed, so no single opinion
// stands for anyone.
export const aspects = {
  serve: "Serve",
  receive: "Receive",
  forehand: "Forehand",
  backhand: "Backhand",
  footwork: "Footwork",
  tactics: "Tactics",
} as const;
export type Aspect = keyof typeof aspects;
export const COMMENT_MAX = 140;
export const HEXAGON_AFTER = 3;

// What opponents rate highly, as words: an aspect averaging this or more out of
// 5 becomes a tag. Only strengths are named, never weaknesses, and only once
// the hexagon shows, so the club's etiquette of respecting opponents holds.
export const STRENGTH_FROM = 4;
const strengthLabels: Record<Aspect, string> = {
  serve: "Strong serve",
  receive: "Sharp receive",
  forehand: "Big forehand",
  backhand: "Solid backhand",
  footwork: "Quick feet",
  tactics: "Smart tactics",
};

export function strengthsFrom(averages: Record<Aspect, number>): string[] {
  return (Object.keys(aspects) as Aspect[])
    .filter((a) => averages[a] >= STRENGTH_FROM)
    .sort((a, b) => averages[b] - averages[a])
    .map((a) => strengthLabels[a]);
}

// What a reviewer may do with a match: review the other player in it, if it's
// confirmed and they were one of the two. `done` says they already have.
export function reviewable(matchId: number, reviewer: Pick<Player, "id">) {
  const match = db.select().from(matches).where(eq(matches.id, matchId)).get();
  if (!match || match.status !== "confirmed") return undefined;
  const revieweeId =
    match.reporterId === reviewer.id ? match.opponentId : match.opponentId === reviewer.id ? match.reporterId : null;
  if (!revieweeId) return undefined;
  const reviewee = db.select({ name: players.name }).from(players).where(eq(players.id, revieweeId)).get();
  const done = db
    .select({ matchId: reviews.matchId })
    .from(reviews)
    .where(and(eq(reviews.matchId, matchId), eq(reviews.reviewerId, reviewer.id)))
    .get();
  return { match, revieweeId, revieweeName: reviewee?.name ?? "", done: done !== undefined };
}

export type ReviewProblem = "score" | "comment" | "gone";

const isDuplicate = (err: unknown) =>
  err instanceof Error && "code" in err && err.code === "SQLITE_CONSTRAINT_PRIMARYKEY";

export function saveReview(matchId: number, reviewer: Player, form: FormData): ReviewProblem | undefined {
  const target = reviewable(matchId, reviewer);
  if (!target || target.done) return "gone";
  const scores = {} as Record<Aspect, number>;
  for (const aspect of Object.keys(aspects) as Aspect[]) {
    const score = Number(form.get(aspect));
    if (!Number.isInteger(score) || score < 1 || score > 5) return "score";
    scores[aspect] = score;
  }
  const comment = String(form.get("comment") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (comment.length > COMMENT_MAX) return "comment";
  try {
    db.insert(reviews)
      .values({ matchId, reviewerId: reviewer.id, revieweeId: target.revieweeId, ...scores, comment })
      .run();
  } catch (err) {
    // the same form sent twice at once: the key lets only one in
    if (isDuplicate(err)) return "gone";
    throw err;
  }
}

// The match ids this player has already reviewed.
export const reviewedBy = (playerId: string) =>
  new Set(
    db
      .select({ matchId: reviews.matchId })
      .from(reviews)
      .where(eq(reviews.reviewerId, playerId))
      .all()
      .map((r) => r.matchId),
  );

// What a member's opponents think, summed up: averages per aspect and the
// latest comments, but only once enough different opponents have reviewed.
export function standingOf(playerId: string) {
  const received = db
    .select({
      reviewerId: reviews.reviewerId,
      reviewerName: players.name,
      serve: reviews.serve,
      receive: reviews.receive,
      forehand: reviews.forehand,
      backhand: reviews.backhand,
      footwork: reviews.footwork,
      tactics: reviews.tactics,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .innerJoin(players, eq(reviews.reviewerId, players.id))
    .where(eq(reviews.revieweeId, playerId))
    .orderBy(desc(reviews.createdAt))
    .all();
  const reviewers = new Set(received.map((r) => r.reviewerId)).size;
  if (reviewers < HEXAGON_AFTER) return { reviewers, reviews: received.length, shown: false as const };
  const averages = Object.fromEntries(
    (Object.keys(aspects) as Aspect[]).map((a) => [a, received.reduce((sum, r) => sum + r[a], 0) / received.length]),
  ) as Record<Aspect, number>;
  const comments = received.filter((r) => r.comment).slice(0, 3);
  return { reviewers, reviews: received.length, shown: true as const, averages, comments };
}
