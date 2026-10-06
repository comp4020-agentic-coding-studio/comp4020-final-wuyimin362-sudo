import { defineConfig } from "drizzle-kit";

// `pnpm db:generate` diffs src/lib/schema.ts against the migrations already in
// drizzle/ and writes the next one; src/lib/db.ts applies them at boot.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/lib/schema.ts",
  out: "./drizzle",
});
