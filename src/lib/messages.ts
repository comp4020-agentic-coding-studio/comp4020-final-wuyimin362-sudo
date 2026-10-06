import { asc, eq } from "drizzle-orm";
import { db } from "./db";
import { gameById } from "./games";
import { publish } from "./live";
import type { Player } from "./players";
import { messages, players } from "./schema";

// The short thread inside a game. It belongs to the game's two players, its
// host and whoever was invited to it or has taken it, and nobody else can read
// or write it. An open game on the board has no second player yet, so no
// thread.
export const MESSAGE_MAX = 500;

export function threadFor(gameId: number, player: Pick<Player, "id">) {
  const game = gameById(gameId);
  if (!game) return undefined;
  const other = game.invitedId ?? game.guestId;
  if (!other) return undefined;
  if (player.id !== game.hostId && player.id !== other) return undefined;
  return game;
}

export function messagesOf(gameId: number) {
  return db
    .select({ id: messages.id, body: messages.body, createdAt: messages.createdAt, authorId: players.id, authorName: players.name })
    .from(messages)
    .innerJoin(players, eq(messages.authorId, players.id))
    .where(eq(messages.gameId, gameId))
    .orderBy(asc(messages.createdAt), asc(messages.id))
    .all();
}

export type MessageProblem = "body" | "gone";

export function postMessage(gameId: number, player: Player, raw: string): MessageProblem | undefined {
  if (!threadFor(gameId, player)) return "gone";
  const body = raw.trim();
  if (body === "" || body.length > MESSAGE_MAX) return "body";
  db.insert(messages).values({ gameId, authorId: player.id, body }).run();
  publish(`game:${gameId}`);
}
