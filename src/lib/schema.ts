import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Someone the app knows. A guest is just a name; a member also has a username
// and a password hash (src/lib/passwords.ts) to sign in with from anywhere. The
// id is public enough to sit in a URL.
export const players = sqliteTable("players", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").unique(),
  passwordHash: text("password_hash"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// One signed-in browser. Its cookie carries a random token, and only the
// token's SHA-256 is kept here, so a copy of the database can't sign anyone in.
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  playerId: text("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  // ISO 8601, UTC
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// A game one member offers and another takes up. It stays open until someone
// accepts it, and until then its host can withdraw it.
export const games = sqliteTable("games", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  hostId: text("host_id")
    .notNull()
    .references(() => players.id),
  guestId: text("guest_id").references(() => players.id),
  // Canberra wall-clock time, YYYY-MM-DDTHH:mm (see src/lib/time.ts)
  startsAt: text("starts_at").notNull(),
  venue: text("venue").notNull(),
  kind: text("kind", { enum: ["match", "practice"] }).notNull(),
  note: text("note").notNull().default(""),
  status: text("status", { enum: ["open", "accepted", "withdrawn"] })
    .notNull()
    .default("open"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});
