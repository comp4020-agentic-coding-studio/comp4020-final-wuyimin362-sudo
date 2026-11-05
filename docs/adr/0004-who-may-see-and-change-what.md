# 4. Who may see and change what, and why a game stays between two

Status: accepted, 26 October 2026, for the final submission. It writes down
what the server already enforces, and closes the question the process overview
left for crit 10: more players in one game.

## Context

The README says a good version of this app gets two club members onto a table
"without exposing more of anyone than the club already knows". Three kinds of
visitor reach it: a stranger, who has no cookie; a guest, who gave a name and
holds a session cookie; and a member, who has a username and password. What
each may see and change follows from that sentence. Every rule below is checked
on the server, never only by hiding a button.

After crit 9 I asked for a game's thread to take more players, the way a
messenger group does. The agent split that out for this decision, because it
changes what `CLAUDE.md` says a thread is.

## Who may see what

| What | Stranger | Guest | Member |
| --- | --- | --- | --- |
| The board: open and agreed games, and the last two weeks of past ones | yes | yes | yes |
| Venues, and Table Tennis ACT's events | yes | yes | yes |
| Who's going to an event, or looking for a partner | no | no | yes |
| Profiles, photos, records, reviews, finding players | no | no | yes |
| A game's thread | no | its two players | its two players |
| A direct invitation, before it's accepted | no | no | its host and invitee |
| A member's own stream (`/live/me`) | no | no | their own |

The board and venues are public because a game is agreed in the open: anyone
at the club can see who is playing where and when. Everything about a person
beyond their name, and what they've played, is for members, because a member
has an account the club can see, and a stranger is anyone with a browser.

## Who may change what

- **Anyone with a name** (a guest or a member) may post a game, take an open
  game that isn't their own, and withdraw their own game while nobody has taken
  it and its time is still to come.
- **Only a member** may invite someone, record a match, confirm or dispute one,
  review an opponent, say they're going to an event, and edit their profile.
  Each of these touches another member's record, so it needs someone who can
  be held to it.
- **Only the opponent** may confirm or dispute a reported match, and only while
  it's waiting. **Only the invitee** may accept or decline an invitation.
- **Only someone who played you** in a confirmed match may review you, once per
  match.
- **Only a game's two players** may read or write its thread, or listen to it.
- **Once a game's time has passed**, nobody may change it. It's a record.

## Options for more players

1. **A game stays between two.** A thread belongs to its two players. Doubles
   partners are found through Table Tennis ACT's events, where members say
   they're looking for one.
2. **Up to four players.** A game takes a second pair, and its thread is shared
   by all four.
3. **Open threads.** Players invite anyone into a game's thread.

## Decision

A game stays between two.

The README's first promise is that two members get onto a table with as
little effort as possible, and a singles game is agreed by one accept. Four
players would need a game that fills one seat at a time, so the one guarded
accept in [decision record 1](0001-first-to-accept-takes-the-game.md) becomes
a count, and a game can sit half-full on the board. Option 3 turns a thread
into a group chat, which the brief warns against ("a chat room with the nouns
swapped") and which `CLAUDE.md` rules out. Doubles already have a place: the
events page lets members say they're looking for a partner.

## What it costs

- Two pairs who want to play doubles agree it among themselves, or through
  the events page, not in one game.
- A third player who joins on the night can't read the thread.
- A guest can't open profiles. To choose an opponent rather than take whoever
  accepts, they need an account.

## How we know it holds

The server checks each rule; the checks drive the app through its own forms
as each kind of visitor.

- `spec/profiles.test.ts`, `spec/discovery.test.ts` and `spec/events.test.ts`:
  a stranger and a guest are refused profiles, photos, the players page and
  event interest, and see none of it.
- `spec/invites.test.ts` and `spec/conversation.test.ts`: only the invitee can
  accept or decline, and only a game's two players can read, write or open its
  thread.
- `spec/matches.test.ts` and `spec/reviews.test.ts`: only the opponent can
  confirm, and only a confirmed opponent can review, once.
- `spec/realtime.test.ts` and `spec/live-everywhere.test.ts`: nobody can
  listen on another member's stream, or a game they aren't in.
- `spec/history.test.ts`: a game whose time has passed can't be taken or
  withdrawn, even with a form opened before.
- `spec/logging.test.ts`: the server logs who did what, refusals included, so
  a breach of any rule above shows in `flyctl logs`.
