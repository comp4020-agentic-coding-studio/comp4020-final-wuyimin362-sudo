// Where a game can be: public club venues only, so nobody has to post a home
// address to find a game. From Table Tennis ACT's "Clubs & Venues" page
// (https://www.tabletennisact.org.au/venues-and-times), 6 October 2026.
// Table Tennis Canberra North is listed there without an address, so it isn't
// here yet.
export const venues = [
  { id: "kingston", name: "Kingston Table Tennis Centre", suburb: "Griffith" },
  { id: "collective", name: "Table Tennis Collective", suburb: "Fyshwick" },
  { id: "shirley-smith", name: "Shirley Smith High School", suburb: "Kenny" },
  { id: "alfred-deakin", name: "Alfred Deakin High School", suburb: "Deakin" },
  { id: "tuggeranong", name: "Tuggeranong Indoor Archery Centre", suburb: "Greenway" },
];

export function venueLabel(id: string): string {
  const venue = venues.find((v) => v.id === id);
  // a venue dropped from the list still names itself on the games booked there
  return venue ? `${venue.name}, ${venue.suburb}` : id;
}
