import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

// The app's whole persistent state is this one SQLite file. The Dockerfile
// points DATABASE_PATH at the Fly volume (/data), the only storage that
// survives a restart or a redeploy; locally it's an untracked file in .data/.
const path = process.env.DATABASE_PATH ?? "./.data/app.db";
mkdirSync(dirname(path), { recursive: true });

const sqlite = new Database(path);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite);

// Migrations run at boot, on the machine that holds the volume. To change the
// schema: edit src/lib/schema.ts, run `pnpm db:generate`, commit drizzle/.
migrate(db, { migrationsFolder: "./drizzle" });
