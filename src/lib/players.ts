import { createHash, randomBytes } from "node:crypto";
import type { AstroCookies } from "astro";
import { and, eq, gt } from "drizzle-orm";
import { db } from "./db";
import { publish } from "./live";
import { hashPassword, verifyPassword } from "./passwords";
import { players, sessions } from "./schema";

export type Player = typeof players.$inferSelect;

// Who counts as a person here comes in two kinds. A guest is a name and the
// browser it was given in: one field, nothing to remember, and gone if the
// cookie goes. A member adds a username and a password, so they can sign in
// from any browser. Neither ever gives an email address.
export const isGuest = (player: Pick<Player, "username">): boolean => player.username === null;

export const NAME_MAX = 40;
export const PASSWORD_MIN = 8;
const PASSWORD_MAX = 200;
// what the form accepts; usernames are stored lowercased
export const USERNAME_PATTERN = "[A-Za-z0-9_]{3,20}";

const COOKIE = "session";
const SESSION_DAYS = 30;

const cleanName = (raw: string) => raw.trim().replace(/\s+/g, " ");
const validName = (name: string) => name !== "" && name.length <= NAME_MAX;
const cleanUsername = (raw: string) => raw.trim().toLowerCase();
const validUsername = (username: string) => /^[a-z0-9_]{3,20}$/.test(username);
const newId = () => randomBytes(6).toString("base64url");
const digest = (token: string) => createHash("sha256").update(token).digest("hex");

function startSession(playerId: string, cookies: AstroCookies): void {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  db.insert(sessions)
    .values({ id: digest(token), playerId, expiresAt: expires.toISOString() })
    .run();
  cookies.set(COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: import.meta.env.PROD,
    expires,
  });
}

function endSession(cookies: AstroCookies): void {
  const token = cookies.get(COOKIE)?.value;
  if (token) db.delete(sessions).where(eq(sessions.id, digest(token))).run();
}

export function currentPlayer(cookies: AstroCookies): Player | undefined {
  const token = cookies.get(COOKIE)?.value;
  if (!token) return undefined;
  return db
    .select({ player: players })
    .from(sessions)
    .innerJoin(players, eq(sessions.playerId, players.id))
    .where(and(eq(sessions.id, digest(token)), gt(sessions.expiresAt, new Date().toISOString())))
    .get()?.player;
}

// Logging out deletes the session itself, so the cookie is worthless even if
// it was copied somewhere first.
export function logOut(cookies: AstroCookies): void {
  endSession(cookies);
  cookies.delete(COOKIE, { path: "/" });
}

export function joinAsGuest(rawName: string, cookies: AstroCookies): Player | undefined {
  const name = cleanName(rawName);
  if (!validName(name)) return undefined;
  const player = db.insert(players).values({ id: newId(), name }).returning().get();
  startSession(player.id, cookies);
  return player;
}

const isTaken = (err: unknown) => err instanceof Error && "code" in err && err.code === "SQLITE_CONSTRAINT_UNIQUE";

export type SignUpProblem = "username" | "taken" | "name" | "password";

// Makes an account. From a guest's browser it turns that guest into a member
// in place, so the games they posted stay theirs.
export async function signUp(
  input: { username: string; name: string; password: string },
  cookies: AstroCookies,
): Promise<SignUpProblem | undefined> {
  const username = cleanUsername(input.username);
  const name = cleanName(input.name);
  if (!validUsername(username)) return "username";
  if (!validName(name)) return "name";
  if (input.password.length < PASSWORD_MIN || input.password.length > PASSWORD_MAX) return "password";
  if (db.select({ id: players.id }).from(players).where(eq(players.username, username)).get()) {
    return "taken";
  }
  const passwordHash = await hashPassword(input.password);
  const guest = currentPlayer(cookies);
  try {
    if (guest && isGuest(guest)) {
      db.update(players).set({ username, name, passwordHash }).where(eq(players.id, guest.id)).run();
    } else {
      const player = db
        .insert(players)
        .values({ id: newId(), name, username, passwordHash })
        .returning()
        .get();
      startSession(player.id, cookies);
    }
  } catch (err) {
    // someone took the username while the password was hashing
    if (isTaken(err)) return "taken";
    throw err;
  }
  // a new member is someone to find; a guest becoming one also loses their
  // Guest mark on the board, which anyone can see
  publish("members", "board");
}

// Five wrong passwords lock a username for a minute. The count lives in memory:
// the app runs on one machine, and a restart forgetting it does no harm.
const LOCK_AFTER = 5;
const LOCK_MS = 60_000;
const failures = new Map<string, { count: number; lockedUntil: number }>();
// checked against when the username doesn't exist, so a miss takes as long as
// a wrong password and doesn't reveal which usernames are real
const decoy = hashPassword(randomBytes(16).toString("hex"));

export type LogInProblem = "wrong" | "locked";

export async function logIn(
  input: { username: string; password: string },
  cookies: AstroCookies,
): Promise<LogInProblem | undefined> {
  const username = cleanUsername(input.username);
  const record = failures.get(username);
  if (record && record.lockedUntil > Date.now()) return "locked";

  const player = db.select().from(players).where(eq(players.username, username)).get();
  const ok = await verifyPassword(input.password, player?.passwordHash ?? (await decoy));
  if (!player || !ok) {
    // after a lock lifts, the count starts again
    const count = ((record?.count ?? 0) % LOCK_AFTER) + 1;
    failures.set(username, { count, lockedUntil: count === LOCK_AFTER ? Date.now() + LOCK_MS : 0 });
    return "wrong";
  }
  failures.delete(username);
  endSession(cookies);
  startSession(player.id, cookies);
}
