// Where a game can be: public club venues only, so nobody has to post a home
// address to find a game. The ACT venues are Table Tennis ACT's "Clubs &
// Venues" page (https://www.tabletennisact.org.au/venues-and-times), less Table
// Tennis Canberra North, which it lists without an address. The NSW ones are
// the clubs within reach of Canberra on the NSW Country Table Tennis League's
// list (https://www.nswcountrytabletennis.org.au/associationsclubs) that give a
// venue. Both read 6 October 2026.
export const venues = [
  { id: "kingston", name: "Kingston Table Tennis Centre", suburb: "Griffith", state: "ACT" },
  { id: "collective", name: "Table Tennis Collective", suburb: "Fyshwick", state: "ACT" },
  { id: "shirley-smith", name: "Shirley Smith High School", suburb: "Kenny", state: "ACT" },
  { id: "alfred-deakin", name: "Alfred Deakin High School", suburb: "Deakin", state: "ACT" },
  { id: "tuggeranong", name: "Tuggeranong Indoor Archery Centre", suburb: "Greenway", state: "ACT" },
  { id: "goulburn", name: "John Lees Table Tennis Centre", suburb: "Goulburn", state: "NSW" },
  { id: "robertson", name: "Robertson Bowling Club", suburb: "Robertson", state: "NSW" },
  { id: "bermagui", name: "Bermagui Table Tennis Club", suburb: "Bermagui", state: "NSW" },
] as const;

export const states = ["ACT", "NSW"] as const;

export function venueLabel(id: string): string {
  const venue = venues.find((v) => v.id === id);
  // a venue dropped from the list still names itself on the games booked there
  if (!venue) return id;
  // the board is for ACT players, so only the NSW venues name their state
  return venue.state === "ACT"
    ? `${venue.name}, ${venue.suburb}`
    : `${venue.name}, ${venue.suburb} ${venue.state}`;
}
