# Process overview

This is the project as it stands at crit 8 (It's alive!). I'll rewrite this
file at each crit rather than add to it. Almost all of the work so far happened
in one Claude Code session on 6 October 2026, and the agent did most of the
typing: the code, the tests, `CLAUDE.md`, the README and this overview are its
drafts, made at my request. The decisions below are mine, and where the agent drafted
something the commit says so.

## From the brief to one interaction

The brief asks for a multi-user, real-time app that's good, and leaves what to
build open. My idea was an app for ACT table tennis club members: profiles with
each player's blade and rubbers, ratings, opponents' reviews of their style, a
six-sided strength chart, private messages, nearby players and venues, and
sign-ups for official tournaments.

When I described it, the agent checked the list against the brief and flagged
four problems. Private messages are close to the "chat room with the nouns
swapped" the brief warns against. "Nearby" needs members' locations. An
unofficial public app shouldn't take entries for official competitions. And
profiles and messages are mostly asynchronous, when the brief asks for an app
that's better with people on it at the same time. It laid out options for crit
8, and I took its recommendation on each: the core is posting a game and another
member taking it up; a person is a name plus a browser cookie; the stack is the
one my crit 7 repo used. The features I cut became the README's "What I chose
not to build", each with a reason, instead of a backlog.

Where I steered rather than accepted: the club itself, the Apple look (I pointed
the agent at the apple-design-skill), and the venues (I sent it to Table Tennis
ACT's website, then told it the list was missing NSW clubs).

## Decisions, and what they cost

**Post a game, accept a game.** Proof of life needs a stranger to do the core
thing and find their trace when they come back. A board of offers is the
smallest thing that does that: two tables, players and games. It's also the part
that becomes real-time in crit 9, when a taken game should vanish from every open
board at once.

**A person is a name plus a cookie.** No passwords, so a marker or a new member
joins in one field. The cost is that anyone can type someone else's name, and
clearing cookies means joining again. That's acceptable while nothing on the
board is worth faking, and it stops being acceptable if results are ever
recorded. The cookie holds a random token rather than the player's id, so a
player's id can appear in a URL without letting anyone act as them
([`d8c930f`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/d8c930f)).

**Public venues only.** The agent built the list from Table Tennis ACT's Clubs &
Venues page. When I asked for NSW clubs too, it added the three near Canberra
that give a venue, not all of NSW, to keep it a board for ACT players
([`7c643a6`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/7c643a6)).
That scope is a call I can still reverse.

**The stack: Astro's Node server, with SQLite on the Fly volume**
([`140eb0b`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/140eb0b)).
The honest reason is familiarity. My crit 7 repo had already run this stack on
the same Fly shape (one 256 MB machine, one volume), including server-sent events
for live updates, and the cutoff was twelve hours away. The trade-off is that I
didn't seriously compare alternatives. I'm betting that one SQLite file and
server-rendered forms are enough for a club-sized board, and that server-sent
events from one machine will carry crit 9's real-time requirement. If either
fails, I'll switch and write down why.

## How the work was checked

The deploy path came first: the course placeholder went to Fly before any code
existed, so later failures couldn't be the pipeline's.

The crit 8 line "a stranger can visit, do the core thing, and find their trace
still there" became a check before the feature did.
[`cbbaf92`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/cbbaf92)
adds `spec/alive.test.ts`, red, and
[`d8c930f`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/d8c930f)
turns it green
([`cbbaf92...d8c930f`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/cbbaf92...d8c930f)).
The test uses the board's own forms the way a stranger would. Because it writes
real games, it stands down against the live site and runs in CI's throwaway
container instead, so test games never land on the real board.

Two problems went into the harness instead of being retried. pnpm 11 wouldn't
run better-sqlite3's install script, so `pnpm-workspace.yaml` allows it, with a
comment saying why
([`140eb0b`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/140eb0b)).
And the phone screenshot came out cut off on the right, which looked like
broken CSS. The cause was headless Chrome refusing to open a window that narrow,
so the agent re-checked inside a true 390-pixel frame, found the layout fine, and
left the CSS alone.

The README
([`56888b4`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/56888b4))
was drafted by the agent from the decisions above, with every source checked to
resolve. `CLAUDE.md` turns its claims into rules for the agent: never ask for a
password, email or location; no ratings or reviews; only listed venues; every
action works without JavaScript; every UI change is checked at both marking
viewports.

## Next

Crit 9 makes the board real-time: when a game is posted or taken, every open
board should show it within a second. The plan is server-sent events from the
one machine, and a check that two sessions see each other's changes.
