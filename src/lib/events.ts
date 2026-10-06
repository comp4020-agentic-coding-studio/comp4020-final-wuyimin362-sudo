import { and, eq, inArray } from "drizzle-orm";
import { db } from "./db";
import type { Player } from "./players";
import { eventInterest, players } from "./schema";
import { canberraNow } from "./time";

// Table Tennis ACT's own events, as its events page lists them
// (https://www.tabletennisact.org.au/events), read 7 October 2026. The app
// links to each event's page for details and entry, and takes no entries
// itself. Times are Canberra wall-clock, like games (src/lib/time.ts).
export const events = [
  {
    id: "385017",
    title: "Term 3 Spring School Holiday Camp",
    starts: "2026-10-06T15:00",
    ends: "2026-10-10T19:30",
  },
  { id: "381842", title: "P4 Spring Pennant 2026", starts: "2026-10-13T18:15", ends: "2026-12-03T23:00" },
  { id: "384965", title: "Table Tennis Collective League", starts: "2026-10-14T18:00", ends: "2026-12-16T21:00" },
  {
    id: "350209",
    title: "2026 State Team Availability Form (Veterans)",
    starts: "2026-10-17T09:00",
    ends: "2026-10-24T09:00",
  },
  {
    id: "382918",
    title: "EOI: Junior Pennant Competition 2026/2027",
    starts: "2026-10-17T16:30",
    ends: "2026-12-12T18:30",
  },
] as const;

export const eventUrl = (id: string) => `https://www.tabletennisact.org.au/events/${id}`;

// Events that haven't finished, soonest first.
export const currentEvents = () => events.filter((e) => e.ends > canberraNow());

export type Interest = "going" | "partner";

export function setInterest(eventId: string, player: Player, kind: string): boolean {
  if (!events.some((e) => e.id === eventId)) return false;
  if (kind === "none") {
    db.delete(eventInterest)
      .where(and(eq(eventInterest.eventId, eventId), eq(eventInterest.playerId, player.id)))
      .run();
    return true;
  }
  if (kind !== "going" && kind !== "partner") return false;
  db.insert(eventInterest)
    .values({ eventId, playerId: player.id, kind })
    .onConflictDoUpdate({ target: [eventInterest.eventId, eventInterest.playerId], set: { kind } })
    .run();
  return true;
}

// Who's going to each event and who's looking for a partner, for members.
export function interestIn(eventIds: string[]) {
  const rows = eventIds.length
    ? db
        .select({ eventId: eventInterest.eventId, kind: eventInterest.kind, id: players.id, name: players.name })
        .from(eventInterest)
        .innerJoin(players, eq(eventInterest.playerId, players.id))
        .where(inArray(eventInterest.eventId, eventIds))
        .all()
    : [];
  const byEvent = new Map<string, Record<Interest, { id: string; name: string }[]>>();
  for (const row of rows) {
    const entry = byEvent.get(row.eventId) ?? { going: [], partner: [] };
    entry[row.kind].push({ id: row.id, name: row.name });
    byEvent.set(row.eventId, entry);
  }
  return byEvent;
}
