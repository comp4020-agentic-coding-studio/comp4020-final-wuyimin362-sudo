import { sql } from "drizzle-orm";
import { blob, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Someone the app knows. A guest is just a name; a member also has a username
// and a password hash (src/lib/passwords.ts) to sign in with from anywhere, and
// can describe their game (src/lib/profiles.ts). The id is public enough to sit
// in a URL.
export const players = sqliteTable("players", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").unique(),
  passwordHash: text("password_hash"),
  blade: text("blade"),
  forehand: text("forehand_rubber"),
  backhand: text("backhand_rubber"),
  grip: text("grip", { enum: ["shakehand", "penhold"] }),
  style: text("style", { enum: ["attacker", "allround", "defender", "blocker", "pips"] }),
  ratingsCentralId: text("ratings_central_id"),
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

// A member's photo, kept in the database with everything else so the volume
// stays the one place state lives: JPEG, PNG or WebP, at most 1 MB.
export const avatars = sqliteTable("avatars", {
  playerId: text("player_id")
    .primaryKey()
    .references(() => players.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  data: blob("data", { mode: "buffer" }).notNull(),
  // ISO 8601, UTC; also busts the browser's cache when the photo changes
  updatedAt: text("updated_at").notNull(),
});

// The venues a member usually plays at. "Players near you" comes from these,
// so nobody's location is ever needed.
export const homeVenues = sqliteTable(
  "home_venues",
  {
    playerId: text("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    venue: text("venue").notNull(),
  },
  (t) => [primaryKey({ columns: [t.playerId, t.venue] })],
);

// A match two members played, as one of them reported it. It counts, on the
// club rating and in anyone's record, only once the other confirms it.
export const matches = sqliteTable("matches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reporterId: text("reporter_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  opponentId: text("opponent_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  // YYYY-MM-DD, the Canberra date
  playedOn: text("played_on").notNull(),
  venue: text("venue").notNull(),
  // games each side won: a 3–1 win for the reporter is 3 and 1
  reporterGames: integer("reporter_games").notNull(),
  opponentGames: integer("opponent_games").notNull(),
  status: text("status", { enum: ["reported", "confirmed", "disputed"] })
    .notNull()
    .default("reported"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  // ISO 8601, UTC; the rating replays confirmed matches in this order
  confirmedAt: text("confirmed_at"),
});

// One opponent's view of a member's game, from a confirmed match they played:
// six scores from 1 to 5 and an optional line. The key allows one review per
// match per reviewer, however many times a form is sent.
export const reviews = sqliteTable(
  "reviews",
  {
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    reviewerId: text("reviewer_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    revieweeId: text("reviewee_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    serve: integer("serve").notNull(),
    receive: integer("receive").notNull(),
    forehand: integer("forehand").notNull(),
    backhand: integer("backhand").notNull(),
    footwork: integer("footwork").notNull(),
    tactics: integer("tactics").notNull(),
    comment: text("comment").notNull().default(""),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [primaryKey({ columns: [t.matchId, t.reviewerId] })],
);

// A game one member offers and another takes up. It stays open until someone
// accepts it, and until then its host can withdraw it; a direct invitation can
// also be declined.
export const games = sqliteTable("games", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  hostId: text("host_id")
    .notNull()
    .references(() => players.id),
  guestId: text("guest_id").references(() => players.id),
  // set when the host invited one member directly: then only they can take it,
  // and it stays off the public board until they do
  invitedId: text("invited_id").references(() => players.id),
  // Canberra wall-clock time, YYYY-MM-DDTHH:mm (see src/lib/time.ts)
  startsAt: text("starts_at").notNull(),
  venue: text("venue").notNull(),
  kind: text("kind", { enum: ["match", "practice"] }).notNull(),
  note: text("note").notNull().default(""),
  status: text("status", { enum: ["open", "accepted", "withdrawn", "declined"] })
    .notNull()
    .default("open"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// A short thread inside one game, between its two players only: messages live
// in a game, never in a general chat.
export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gameId: integer("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  authorId: text("author_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});
