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
