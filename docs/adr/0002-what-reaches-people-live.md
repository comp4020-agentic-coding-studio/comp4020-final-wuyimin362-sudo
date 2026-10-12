# 2. What reaches people live, and what waits for a reload

Status: accepted, 13 October 2026, for crit 9 ("All at once").

## Context

Crit 9 made the board and each game's thread live. Everything else a member
can see changed only when they reloaded: an invitation sent to them, a match
report waiting for them to confirm, the answer to an invitation or report they
sent, who's going to an event, reviews and profiles.

The brief counts an app as real-time when a change one person makes appears in
every other open session showing it within about a second. The README asks the
app to get "two club members onto a table with as little effort as possible".

## Options

1. **Only the board and threads.** Keep crit 9's live parts, and say why the
   rest can wait for a reload.
2. **Whatever someone is waiting on.** Also make live the changes where one
   member is waiting on another: an invitation and its answer, a match report
   and its confirmation. Event interest, reviews and profiles wait for a reload.
3. **Everything.** Event interest, reviews and profile changes go live too.

## Decision

Whatever someone is waiting on.

An invitation or a match report is a question to one person, and someone is
waiting for the answer: until it comes, nobody is on a table, or the match
doesn't count. If the question only shows on a reload, waiting turns into
checking back, which is the effort the README asks the app to save. So each
member has a stream of their own, and the header's Invites and Matches counts,
and the invites and matches pages, change as soon as something waits on them or
answers them.

Event interest, reviews and profiles aren't questions to anyone. Nobody waits on
a club-mate saying they're going to an event, and a review or a new photo is
just as true on the next visit. Making them live would add streams, one of them
for members only, to save a reload nobody is waiting on. Option 1 would leave
the slowest part of agreeing a game, the invitation, the one part that isn't
live.

## What it costs

- Someone watching the events page won't see a club-mate say they're going, or
  looking for a partner, until they reload, and a new review or profile change
  shows on the next visit.
- Every page a member has open holds one more connection, their own stream,
  alongside the board's or the game's.

## How we know it holds

- `spec/realtime.test.ts` checks that an invitee hears an invitation within a
  second while another member's stream hears nothing, that the host hears the
  answer, that the opponent hears a match report and the reporter hears the
  confirmation, that a stranger and a guest can't open a member's stream, and
  that the board, invites and matches pages listen on it.
- `CLAUDE.md` makes every change that waits on a member, or answers one, publish
  that member's own topic.
- `src/pages/live/me.ts` picks the stream by the cookie, not the address, so
  there's no asking for anyone else's.
