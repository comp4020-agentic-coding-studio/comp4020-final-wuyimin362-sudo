# 1. The first member to accept a game takes it

Status: accepted, 7 October 2026, for crit 9 ("All at once").

## Context

An open game sits on the board for everyone, and since crit 9 the board is
live: a game appears on every open board within about a second of being
posted, and disappears within a second of being taken. At the crit, or any
club night, several people can be looking at the same open game at once, and
two of them can press Accept within the same second. Something has to decide
who plays.

The README sets the test for any answer. Good here means getting "two club
members onto a table with as little effort as possible, without turning them
into profiles to be judged", and it promises that "once someone takes a game
it's theirs, and two people can't both take it".

## Options

1. **The first accept takes it.** Accepting is one guarded update that only
   lands while the game is still open, so whoever's request reaches the server
   first gets the game, and everyone else is told it isn't open any more.
2. **The host chooses.** Accept becomes "ask to play". The host sees everyone
   who asked and picks one, and the others are told no.
3. **A hold.** The first person to press Accept holds the game for a few
   minutes while they confirm, and it goes back on the board if they don't.

## Decision

The first accept takes it.

It's the least effort for both people, which is the first thing the README asks
for: one press settles the game, and nobody waits for anyone to come back and
decide. It also keeps the host from sorting applicants, which is exactly the
judging of club-mates the README sets out to avoid; with option 2, a host would
naturally pick by rating, photo or name. A host who does want a particular
opponent already has a way that doesn't involve rejecting anyone: invite them
directly from their profile. Option 3 solves a problem the board doesn't have,
since a taken game can be talked about in its thread, and it would add timers
and a game held by someone who has walked away.

## What it costs

- It favours whoever is on the board and quick. Someone slower, or on a bad
  connection, can miss a game they wanted, and there's no queue to fall back on:
  they have to watch for the next one.
- The host can't choose who turns up. If they mind, the answer is a direct
  invitation, not the board.
- Two people really can press Accept at once, and one of them will be told
  "someone took it". The live board makes that rare, because a taken game leaves
  every open board within about a second, but it can't make it impossible.

## How we know it holds

- `spec/realtime.test.ts` sends two accepts for the same game at the same
  moment and checks that exactly one gets it and the other is told it's gone.
- `CLAUDE.md` keeps accepting as one guarded update, so a later change can't
  quietly turn it into read-then-write.
- `src/lib/games.ts` (`acceptGame`) is that update, and the same one serves a
  direct invitation, which only the invitee can accept.
