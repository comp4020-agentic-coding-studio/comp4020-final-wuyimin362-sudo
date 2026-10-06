# syntax = docker/dockerfile:1

# The app's image: install, build the Astro server, then keep only the built
# server and its production dependencies. It serves HTTP on 0.0.0.0:$PORT
# (fly.toml sets PORT) and publishes README.md at /readme/ (spec/README.md
# says what's checked).

# the versions mise.toml pins for local work
ARG NODE_VERSION=24.21.0
ARG PNPM_VERSION=11.9.0

FROM docker.io/library/node:${NODE_VERSION}-slim AS base
ARG PNPM_VERSION
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm@${PNPM_VERSION}

# --- build: install everything, build, then prune to production deps --------
FROM base AS build
# a toolchain for better-sqlite3, in case no prebuilt binding matches the image
RUN apt-get update -qq \
    && apt-get install --no-install-recommends -y build-essential python3 \
    && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod=false
COPY . .
RUN pnpm run build && pnpm prune --prod

# --- runtime: the built server and what it needs at run time ----------------
FROM base
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
# the committed migrations, applied at boot (src/lib/db.ts)
COPY --from=build /app/drizzle /app/drizzle
ENV HOST=0.0.0.0
ENV PORT=8080
# the SQLite file lives on the volume fly.toml mounts at /data, the only storage
# that survives a restart or a redeploy
ENV DATABASE_PATH=/data/app.db
CMD ["node", "./dist/server/entry.mjs"]
