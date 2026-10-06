import { randomBytes } from "node:crypto";
import type { AstroCookies } from "astro";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { players } from "./schema";

export type Player = typeof players.$inferSelect;

export const NAME_MAX = 40;
const COOKIE = "player";
const YEAR = 60 * 60 * 24 * 365;

// Who counts as a person here: a name, and the browser it was given in. No
// password and no email, so joining is one field; the cost is that clearing
// cookies, or picking up another device, means joining again. The cookie holds
// a random token, never the player's id, which is public enough for a URL.
export function join(rawName: string, cookies: AstroCookies): Player | undefined {
  const name = rawName.trim().replace(/\s+/g, " ");
  if (name === "" || name.length > NAME_MAX) return undefined;
  const player = db
    .insert(players)
    .values({
      id: randomBytes(6).toString("base64url"),
      token: randomBytes(24).toString("base64url"),
      name,
    })
    .returning()
    .get();
  cookies.set(COOKIE, player.token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: import.meta.env.PROD,
    maxAge: YEAR,
  });
  return player;
}

export function currentPlayer(cookies: AstroCookies): Player | undefined {
  const token = cookies.get(COOKIE)?.value;
  if (!token) return undefined;
  return db.select().from(players).where(eq(players.token, token)).get();
}
