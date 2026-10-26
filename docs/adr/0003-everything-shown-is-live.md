# 3. Everything a page shows that others change is live

Status: accepted, 26 October 2026, for the final submission. Supersedes the part
of [decision record 2](0002-what-reaches-people-live.md) that left event
interest, reviews and profiles to wait for a reload.

## Context

Decision record 2 made live whatever one member is waiting on another for, and
argued that event interest, reviews and profiles could wait for a reload,
because nobody is waiting on them.

The brief's real-time requirement has no such exception: a change one person
makes appears in every other open session showing it within about a second. The
marker tests it with two sessions on screen at once, and they choose which pages
to open. Two windows on the events page, where one person says they're going and
the other sees nothing, read as an app that isn't real-time, whatever the record
says about who is waiting.

## Options

1. **Keep decision record 2.** Say in the README that these pages wait for a
   reload, and why.
2. **Everything shown is live.** Every page that shows something another person
   can change takes the change within a second.
3. **Everything, through more streams.** As option 2, with a stream of its own
   for each kind of change.

## Decision

Everything shown is live, through the streams pages already hold.

What only members can see of each other (who's going to an event, profiles and
photos, reviews, confirmed matches and the club rating, and who's in the club to
find) changes under one topic, `members`. A member's own stream carries it
alongside their own topic, and every member's page already holds that stream, so
no page opens another connection. Guests and strangers can't see any of it, so
they don't need to hear about it. A profile's games come from the public board,
so a profile page also listens on the board's stream.

Option 1 asks the README to argue against the brief's own definition. Option 3
would add connections to every page for no gain: a topic only names what
changed, and the page fetches what its viewer may see.

## The exception: the venues page stays quiet

The venues page asks the browser where you are, to sort venues by distance, and
`CLAUDE.md` promises a location never leaves the device: that page has no fetch,
beacon or socket. A member's live stream is all three, so the venues page opens
no stream for anyone. It therefore shows nothing other people change: each
venue's count of open games is gone, and the page points to the board instead.
The promise about location outranks the counts.

## What it costs

- Every change to what members share reaches every open member page. Each page
  then fetches itself once. For a club this costs little. For a few hundred
  people at once it would be the first thing to change, to topics per page.
- A member on the venues page sees their header counts (invites, matches to
  confirm) catch up only when they open another page.
- In a game's conversation, the other player's picture and the card behind it
  show what was true when the page loaded. The card is a popover, and swapping
  it would close it under its reader.

## How we know it holds

- `spec/live-everywhere.test.ts` holds a page open as one member, with its own
  scripts running, while another member changes something, and checks that the
  open page itself shows it within a second: a club-mate going to an event, a
  confirmed match and a review on a profile, a profile's own edits, a new member
  on the players page. It also checks that a stranger and a guest can't open the
  stream that carries these, and still see none of it.
- `spec/discovery.test.ts` reads the venues page as a stranger, a guest and a
  member, and finds no way to send anything in any of them.
- `CLAUDE.md` makes every change to what members share publish `members`.
