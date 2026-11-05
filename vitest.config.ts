import { defineConfig } from "vitest/config";

// Every test in spec/ runs against the running app, which spec/global-setup.ts
// finds. Only spec/ runs: a test anywhere else needs adding to `include`.
//
// One file at a time: the real-time checks listen on streams everyone shares
// (the board's, the club's), so a change another file's check made at the same
// moment could answer one that's waiting to hear its own.
export default defineConfig({
  test: {
    include: ["spec/**/*.test.ts"],
    globalSetup: ["./spec/global-setup.ts"],
    fileParallelism: false,
  },
});
