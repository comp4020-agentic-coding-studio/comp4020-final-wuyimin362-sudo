# Process overview

This is the project as it stands at crit 8 (It's alive!). I'll rewrite this
file at each crit rather than add to it. Almost all of the work so far happened
in one Claude Code session on 6 October 2026, and the agent did most of the
typing: the code, the tests, `CLAUDE.md`, the README and this overview are its
drafts, made at my request. The decisions below are mine, and where the agent
drafted something the commit says so.

## From the brief to one interaction, and back

My idea was an app for ACT table tennis club members: profiles with each
player's blade and rubbers, ratings, opponents' reviews of their style, a
six-sided strength chart, private messages, nearby players and venues, and
sign-ups for official tournaments.

When I described it, the agent checked the list against the brief and flagged
four problems. Private messages are close to the "chat room with the nouns
swapped" the brief warns against. "Nearby" needs members' locations. An
unofficial app shouldn't take entries for official competitions. And profiles
and messages are mostly asynchronous, when the brief asks for an app that's
better with people on it at the same time. For the first version I took its
recommendations: the core is posting a game and another member taking it up, a
person is a name plus a browser cookie, and the stack is the one my crit 7 repo
used. The first README put everything else under "What I chose not to build".

Then I looked at what we had and changed my mind. I want the whole original
idea as an MVP, with the agent's safeguards built in: a score counts only when
both players confirm it, reviews come only from real opponents, invitations
carry their own messages instead of a general chat, distance to venues is
worked out in the browser, and official events link to Table Tennis ACT
instead of taking entries. The README now lists those as what's coming and the
lines they won't cross. Accounts came first, because profiles, ratings and
reviews all need to know who someone is across devices.

Where I steered rather than accepted: the club itself, the Apple look (I
pointed the agent at the apple-design-skill), the venues (I sent it to Table
Tennis ACT's website, then told it the list was missing NSW clubs), bringing
the full feature set back, and asking for login and a guest mode before
anything else.

## Decisions, and what they cost

**Post a game, accept a game.** Proof of life needs a stranger to do the core
thing and find their trace when they come back. A board of offers is the
smallest thing that does that, and it's the part that becomes real-time in
crit 9, when a taken game should vanish from every open board at once.

**Two kinds of person.** A guest is a name and a cookie, so a marker or a
pod-mate can try the board in one field, and the board marks them as a guest. A
member adds a username and a password and can sign in anywhere, and a guest who
makes an account keeps their games. There's no email address, so a forgotten
password can't be reset; that's the cost of collecting nothing, and I think a
club can live with it. The security details, which I agreed to before the
agent built them: scrypt password hashes, session tokens stored only as hashes
so a copied database can't sign anyone in, logout that deletes the session on
the server, and a one-minute lock after five wrong passwords
([`a10bebb`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/a10bebb)).

**Public venues only.** The agent built the list from Table Tennis ACT's Clubs
& Venues page. When I asked for NSW clubs too, it added the three near Canberra
that give a venue, not all of NSW, to keep it a board for ACT players
([`7c643a6`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/7c643a6)).

**The stack: Astro's Node server, with SQLite on the Fly volume**
([`140eb0b`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/140eb0b)).
The honest reason is familiarity. My crit 7 repo had already run this stack on
the same Fly shape (one 256 MB machine, one volume), including server-sent events
for live updates, and the cutoff was hours away. I didn't seriously compare
alternatives. I'm betting that one SQLite file and server-rendered forms are
enough for a club-sized board, and that server-sent events from one machine will
carry crit 9. If either fails, I'll switch and write down why.

## How the work was checked

The deploy path came first: the course placeholder went to Fly before any code
existed, so later failures couldn't be the pipeline's.

Each feature started as a failing check that uses the app's own forms the way a
person would. The crit 8 line "a stranger can visit, do the core thing, and find
their trace still there" went red then green
([`cbbaf92...d8c930f`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/cbbaf92...d8c930f)),
and so did accounts and guest mode
([`fb23045...a10bebb`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/fb23045...a10bebb)).
Because these checks write real data, they stand down against the live site and
run in CI's throwaway container instead.

Mistakes went into the harness rather than being retried:

- pnpm 11 wouldn't run better-sqlite3's install script, so
  `pnpm-workspace.yaml` allows it, with a comment saying why
  ([`140eb0b`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/140eb0b)).
- The phone screenshot came out cut off, which looked like broken CSS. The
  cause was headless Chrome refusing to open a window that narrow, so the agent
  re-checked inside a true 390-pixel frame and left the CSS alone.
- The guest check failed for the wrong reason: a card's paragraphs run
  together in its text, so `/\bguest\b/` found no word boundary. The check was
  fixed in its own commit
  ([`6aa8f0d`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/6aa8f0d)),
  and the same failure exposed a real problem: there was no space between a name
  and its "Guest" marker, so a screen reader would read them as one word.
- drizzle-kit couldn't generate the accounts migration without asking whether a
  new column was a renamed old one, so it became two migrations, an add and then
  a drop, and `CLAUDE.md` now says to split changes that way.

The README
([`56888b4`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/56888b4))
was drafted by the agent from my decisions, with every source checked to
resolve, and rewritten when the direction changed. `CLAUDE.md` turns its claims
into rules for the agent, including the safeguards the coming features must
keep.

## Next

Profiles came first
([`5b62c2a...a61dc5d`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/5b62c2a...a61dc5d)),
then venues and players
([`14b9ebc...45e1bee`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/14b9ebc...45e1bee)),
then confirmed scores and the rating
([`8038b02...3389437`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/8038b02...3389437)),
replayed from the record rather than stored, then reviews and the hexagon
([`d90ad6a...f023ebf`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/d90ad6a...f023ebf)),
then invitations and their messages
([`c187611...c4f8c4d`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/c187611...c4f8c4d)).
Next: official events, then crit 9's real-time board and messages.
