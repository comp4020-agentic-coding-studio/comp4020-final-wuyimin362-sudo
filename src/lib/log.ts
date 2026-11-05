// Who did what, one line per action, for whoever runs the app to read with
// `flyctl logs`: when, who (a player id, and whether a guest or a member), what
// they asked for, what the server said, and where it sent them. It's what tells
// two people apart when something goes wrong.
//
// It holds nothing that would expose more of anyone than the club already
// knows: no name, username or password, no session token or cookie, no IP
// address, and nothing anyone wrote. A player id is the same one that sits in
// a profile's address, and a game's id the one in its thread's.
import type { Player } from "./players";

export type Who = Pick<Player, "id" | "username"> | undefined;

const whoIs = (who: Who) => (who ? `${who.username === null ? "guest" : "member"}:${who.id}` : "nobody");

// Only the path of a redirect, with the notice it names (done=posted,
// problem=time). Nothing else from its query string: a refused form comes back
// with what was typed in it, a note included, and that never reaches the log.
const NOTICES = ["done", "problem"];
const target = (location: string | null) => {
  if (!location) return "";
  const url = new URL(location, "http://app");
  const kept = new URLSearchParams();
  for (const key of NOTICES) {
    const value = url.searchParams.get(key);
    if (value !== null) kept.set(key, value);
  }
  const query = kept.toString();
  return ` to=${url.pathname}${query ? `?${query}` : ""}`;
};

export function logAction(who: Who, method: string, path: string, status: number, location: string | null): void {
  console.log(`${new Date().toISOString()} who=${whoIs(who)} ${method} ${path} ${status}${target(location)}`);
}
