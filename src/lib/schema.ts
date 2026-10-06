import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Someone the app knows: the name they gave, and the token their browser keeps
// in a cookie. The id is public (it can sit in a URL); the token is what proves
// a request is theirs, so it never leaves the cookie.
export const players = sqliteTable("players", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  name: text("name").notNull(),
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
