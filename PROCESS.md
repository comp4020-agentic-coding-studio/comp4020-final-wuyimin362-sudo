# Process overview

This is the project as submitted, rewritten rather than added to. The work ran
in Claude Code sessions on 6–7, 12–13 and 26–27 October. The agent did nearly
all of the typing: code, checks, `CLAUDE.md`, decision records, and drafts of
this file, the README and my reflections. Every commit it drafted from my
answers says so. My part was the calls: what the app is for, what to cut,
which option to take when the agent laid them out, and when to overrule it.

## From the brief to one claim

My first idea was everything a table tennis club app could have: profiles with
kit, ratings, opponents' reviews, a strength chart, messages, nearby players,
tournament sign-ups. The agent checked that list against the brief and flagged
it as the median answer, so the first version was only posting a game and
someone taking it
([`cbbaf92...d8c930f`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/cbbaf92...d8c930f)).
The rest came back one feature at a time, each with a limit
([`fb23045...8aab19b`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/fb23045...8aab19b)).

A review two weeks before the deadline said the README still read as that
wishlist, with multi-user and real-time as requirements met rather than the
idea. I agreed. The rewrite
([`93219ae`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/93219ae))
argues one thing: the club already asks "anyone free Thursday?" in a group
chat, where the question scrolls away and three people answer. On the board an
offer is taken once, by the first to accept, in front of everyone. That made
[decision record 1](docs/adr/0001-first-to-accept-takes-the-game.md)'s race the
point of the app rather than its cost.

My reading, where it changed something: Shirky's situated software is why a
name is enough to join, and also where I stop trusting the club. A disputed
score isn't settled by trust, so a result waits for the opponent. Sloan's
home-cooked app is why there is no email or password reset. I dropped two
sources the README cited but no decision came from.

## The stack, and what it cost

Astro's Node server rendering every page, SQLite on the Fly volume through
Drizzle
([`140eb0b`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/140eb0b)).
The honest first reason was familiarity: my crit 7 repo ran the same shape. I
kept it because the brief's constraints suit it. One 256 MB machine and one
volume favour one process and one file; every action is a form post answered
with a 303, so the app works without JavaScript; and live updates are
server-sent events from an in-memory bus, where a stream names what changed and
the page fetches itself again
([`247f3a3...edc850a`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/247f3a3...edc850a)).
WebSockets would add a second protocol for traffic that only flows one way.

The cost is that two machines would need a shared bus, and that each change
makes every open page refetch. For a club that's cheap; it would be the first
thing to change at scale.

## Decisions about several people at once

- **Who gets a game:** the first accept, as one guarded update, so two
  people pressing at once can't both get it
  ([decision record 1](docs/adr/0001-first-to-accept-takes-the-game.md)).
- **What goes live:** at crit 9 I argued only what someone waits on should be
  live, and said in my reflection that I'd defend it
  ([`7be49ce`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/7be49ce)).
  I changed my mind. The brief's definition has no exception, and a marker
  chooses which two pages to open, so everything shown is now live
  ([`e959cb1...eafb2e3`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/e959cb1...eafb2e3),
  [decision record 3](docs/adr/0003-everything-shown-is-live.md)). "Who is
  waiting on whom" still decides what each member's own stream carries.
- **Who may see and change what**, and why a game has two players: I had asked
  for a WeChat-style thread others could be invited into; I decided against it,
  because a group thread is the chat the brief warns about
  ([decision record 4](docs/adr/0004-who-may-see-and-change-what.md)).

## How I knew it was right

Every feature began as a failing check that drives the app through its own
forms, then went green; there are 55. They write data, so they run in CI's
throwaway container. Checks can't see a page drawn, so every interface change
was also checked in headless Chrome at both marking viewports.

Before the deadline I had two reviews run separately from the work: one read
the repo as a marker would, one tried to break the app. The second found what
my checks had missed, and each finding went into the harness as a red check
first: three presses of Post game made three games, pages kept for the back
button held their streams open, and a stream the server refused was never
retried
([`6cff876...44655c2`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/6cff876...44655c2)).
A guest named only in zero-width spaces showed as no one
([`a990b48...4c376bb`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/a990b48...4c376bb)).
The first review's point that the rating and reviews never helped anyone find
an opponent made the players page order by closeness of rating
([`eb86198...e2e8ed2`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/eb86198...e2e8ed2)).
Where a reviewer's finding didn't reproduce, as with focus hidden under the
header on desktop, the commit says so rather than claiming a fix
([`d794d30`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/d794d30)).

## Mistakes that went into the harness

- **A check too narrow.** The venues page promises to send no location, but
  its check read the page only as a stranger; a member's page carried the live
  stream's script. The check now reads it as all three kinds of visitor
  ([`521861a...c929d05`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/521861a...c929d05)).
- **Checks wrong, not the code**, each fixed in its own commit: a guest marker
  matched by text
  ([`6aa8f0d`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/6aa8f0d)),
  forms found by a field's name, which broke sixteen checks when the pickers
  changed
  ([`ee0a8d3`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/ee0a8d3)),
  listening checked by the text of the code rather than a stream opened
  ([`e46748c`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/e46748c)),
  and a rating check whose setup gave the "closest" player no rating at all
  ([`7d3d022`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/7d3d022)).
- **Checks that could pass for another file's reason.** Real-time checks share
  streams, so the spec runs one file at a time
  ([`bc0997c`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/bc0997c)).
- **Rules that already held.** Where a check covered a rule the code kept, it
  couldn't land red, so I broke the rule once on purpose to see it fail
  ([`b29333a`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/b29333a),
  [`41f1e1b`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/41f1e1b)).

## What the logs are for

Crit 10 asked me to narrate two classmates' use from the server's logs, and
the app logged nothing then. It now logs every action and refusal by player id,
never a name or anything typed
([`ded6304...e9c4bae`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/ded6304...e9c4bae)).
