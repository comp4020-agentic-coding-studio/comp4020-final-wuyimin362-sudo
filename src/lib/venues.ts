// Where a game can be: public club venues only, so nobody has to post a home
// address to find a game. The ACT venues are Table Tennis ACT's "Clubs &
// Venues" page (https://www.tabletennisact.org.au/venues-and-times), less Table
// Tennis Canberra North, which it lists without an address. The NSW ones are
// the clubs within reach of Canberra on the NSW Country Table Tennis League's
// list (https://www.nswcountrytabletennis.org.au/associationsclubs) that give a
// venue. Addresses and sessions are as those pages put them, and the
// coordinates come from OpenStreetMap's geocoder; all read 6 October 2026.
export const venues = [
  {
    id: "kingston",
    name: "Kingston Table Tennis Centre",
    suburb: "Griffith",
    state: "ACT",
    address: "Corner of Canberra Avenue and Dawes Street, Griffith ACT",
    sessions: "Open 24/7 for members.",
    lat: -35.3206,
    lng: 149.1417,
  },
  {
    id: "collective",
    name: "Table Tennis Collective",
    suburb: "Fyshwick",
    state: "ACT",
    address: "Tenancy 2, Building 3, 1 Dairy Road, Fyshwick ACT, from car park 4 behind Capital Brewing Co.",
    sessions: "9 am to 9 pm every day. Walk-ins welcome.",
    lat: -35.3224,
    lng: 149.1644,
  },
  {
    id: "shirley-smith",
    name: "Shirley Smith High School",
    suburb: "Kenny",
    state: "ACT",
    address: "2 Rhodanthe Way, Kenny ACT",
    sessions: "Wednesday and Friday, 6 to 9 pm. Walk-ins welcome.",
    lat: -35.2103,
    lng: 149.1537,
  },
  {
    id: "alfred-deakin",
    name: "Alfred Deakin High School",
    suburb: "Deakin",
    state: "ACT",
    address: "111 Denison Street, Deakin ACT",
    sessions: "Pennant competition on Tuesday and Thursday nights.",
    lat: -35.3236,
    lng: 149.0953,
  },
  {
    id: "tuggeranong",
    name: "Tuggeranong Indoor Archery Centre",
    suburb: "Greenway",
    state: "ACT",
    address: "299 Soward Way, Greenway ACT",
    sessions: "Sunday, 1 to 4 pm. Free for TTACT members, $6 otherwise. Walk-ins welcome.",
    lat: -35.4162,
    lng: 149.073,
  },
  {
    id: "goulburn",
    name: "John Lees Table Tennis Centre",
    suburb: "Goulburn",
    state: "NSW",
    address: "Sports Way, off Finlay Road, Goulburn NSW",
    sessions: "Monday, Wednesday, Thursday and Friday from 7 pm.",
    lat: -34.7711,
    lng: 149.6991,
  },
  {
    id: "robertson",
    name: "Robertson Bowling Club",
    suburb: "Robertson",
    state: "NSW",
    address: "1 Yarranga Street, Robertson NSW",
    sessions: "Monday, 12:30 to 3:15 pm. Adults only.",
    lat: -34.5895,
    lng: 150.5938,
  },
  {
    id: "bermagui",
    name: "Bermagui Table Tennis Club",
    suburb: "Bermagui",
    state: "NSW",
    address: "20 Bunga Street, Bermagui NSW",
    sessions: "Wednesday, 6 to 8 pm.",
    lat: -36.4298,
    lng: 150.0759,
  },
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

// OpenStreetMap rather than a map that tracks whoever opens it
export const mapUrl = (venue: { lat: number; lng: number }) =>
  `https://www.openstreetmap.org/?mlat=${venue.lat}&mlon=${venue.lng}#map=17/${venue.lat}/${venue.lng}`;
