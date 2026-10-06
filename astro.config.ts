import node from "@astrojs/node";
import { defineConfig } from "astro/config";

// Rendered per request by Astro's Node server, so every page reads the
// database as it is now; `astro build` emits the server the Dockerfile runs.
export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  security: {
    // Fly's proxy terminates TLS and forwards plain http, so Astro only accepts
    // a same-origin form POST once it may trust x-forwarded-* for this host.
    allowedDomains: [{ hostname: "**.fly.dev", protocol: "https" }],
  },
});
