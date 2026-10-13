// Games happen in Canberra, so their times are Canberra wall-clock times
// whatever zone the server (UTC on Fly) or a browser is in. They're kept as the
// "YYYY-MM-DDTHH:mm" a datetime-local input sends, which also sorts as text.
const ZONE = "Australia/Sydney"; // Canberra keeps Sydney's time, daylight saving included

const WALL_CLOCK = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function canberraNow(): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

// Wall-clock arithmetic in UTC, where no clock ever jumps.
const asUtc = (wallClock: string): Date => new Date(`${wallClock}:00Z`);

export function isWallClock(s: string): boolean {
  return WALL_CLOCK.test(s) && !Number.isNaN(asUtc(s).getTime());
}

export function addDays(wallClock: string, days: number): string {
  return new Date(asUtc(wallClock).getTime() + days * 86_400_000).toISOString().slice(0, 16);
}

// "Tue 6 Oct, 11:58 pm" in Canberra, from a UTC timestamp as SQLite writes it
// ("YYYY-MM-DD HH:MM:SS").
export function formatMoment(utc: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(`${utc.replace(" ", "T")}Z`));
}

// "Mon 5 Oct", from a YYYY-MM-DD date.
export function formatDay(date: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T00:00:00Z`));
}

// The days a game can be posted for, today first, as YYYY-MM-DD, for a day
// picker that reads the same in every browser's language.
export function daysAhead(count: number): string[] {
  const today = canberraNow().slice(0, 10);
  return Array.from({ length: count + 1 }, (_, i) => addDays(`${today}T00:00`, i).slice(0, 10));
}

// The days a match can be recorded for, today first, going back.
export function daysBack(count: number): string[] {
  const today = canberraNow().slice(0, 10);
  return Array.from({ length: count + 1 }, (_, i) => addDays(`${today}T00:00`, -i).slice(0, 10));
}

// Every quarter of an hour, as HH:mm, for a time picker.
export const quarterHours = Array.from({ length: 96 }, (_, i) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(i / 4))}:${pad((i % 4) * 15)}`;
});

// "7:30 pm", from HH:mm.
export function formatClock(time: string): string {
  return new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", hour: "numeric", minute: "2-digit" }).format(
    new Date(`2000-01-01T${time}:00Z`),
  );
}

// A game's time from the form: one wall-clock field when a script sends it,
// otherwise the day and time pickers the page shows. Either way it stays a
// Canberra wall-clock string, never converted.
export function wallClockFrom(field: (name: string) => string): string {
  return field("startsAt") || `${field("startsDay")}T${field("startsTime")}`;
}

// "Thu 8 Oct, 7:00 pm", read straight off the wall clock.
export function formatWhen(wallClock: string): string {
  const at = asUtc(wallClock);
  const day = new Intl.DateTimeFormat("en-AU", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(at);
  const time = new Intl.DateTimeFormat("en-AU", {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
  }).format(at);
  return `${day}, ${time}`;
}
