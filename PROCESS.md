# Process overview

This is the project as it stands at crit 8 (It's alive!), and I'll rewrite this
file at each crit rather than add to it. Almost all of the work happened in one
Claude Code session on 6 and 7 October 2026. The agent did most of the typing:
the code, the tests, `CLAUDE.md`, the README, this overview and my reflection
are its drafts, made at my request from my decisions and my answers to its
questions. Where the agent drafted something, the commit says so.

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
person is a name and a cookie, and the stack is my crit 7 one.

Then I looked at what we had and changed my mind: I wanted the whole original
idea, as an MVP. The agent proposed a limit for each feature, aimed at the
problem it had flagged, and I went ahead with them. I asked for login and a
guest mode first, then took its suggested order for the rest.

Where I steered rather than accepted: the club itself, the Apple look (I
pointed the agent at the apple-design-skill), the venues (I sent it to Table
Tennis ACT's website, then told it the list was missing NSW clubs), bringing the
features back, and putting accounts first.

## Decisions, and what they cost

**Two kinds of person.** A guest is a name and a cookie, so a pod-mate can try
the board in one field, and the board marks them as a guest. A member adds a
username and a password and keeps their games across devices. There's no email
address, so a forgotten password can't be reset. The security details, which I
agreed to before they were built: scrypt password hashes, session tokens stored
only as hashes, logout that deletes the session on the server, and a one-minute
lock after five wrong passwords
([`fb23045...a10bebb`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/fb23045...a10bebb)).

**The stack: Astro's Node server, with SQLite on the Fly volume**
([`140eb0b`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/140eb0b)).
The honest reason is familiarity: my crit 7 repo had already run it on the same
Fly shape, one 256 MB machine and one volume, and the cutoff was hours away. I
didn't seriously compare alternatives. I'm betting that one SQLite file and
server-rendered forms are enough for a club, and that server-sent events from
one machine will carry crit 9.

**Each feature's limit, and what it costs:**

- Profiles are for members only, and a photo is stored only if its own bytes
  say it's an image. A marker has to sign up to see one
  ([`5b62c2a...a61dc5d`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/5b62c2a...a61dc5d)).
- "Near you" means sharing a usual venue, so nobody's location is ever needed,
  and distance to venues is worked out in the browser by a script that a check
  reads line by line. Nearness is only as good as what members fill in
  ([`14b9ebc...45e1bee`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/14b9ebc...45e1bee)).
- A match is recorded after it's played and counts only once the opponent
  confirms it, because the board only takes future games and members play
  without it. The rating is replayed from confirmed matches whenever it's shown,
  never stored, so it can't drift from the record; cheap at club size, it would
  need caching at a bigger one
  ([`8038b02...3389437`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/8038b02...3389437)).
- Reviews come only from the opponent in a confirmed match, one per match by the
  table's key, and the hexagon waits for three different opponents. Comments
  carry the reviewer's name, trading some candour for accountability
  ([`d90ad6a...f023ebf`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/d90ad6a...f023ebf)).
- An invitation is a game with one invitee, so it reuses the guarded accept, and
  each game with two players has a thread only they can read. For now a new
  message needs a reload
  ([`c187611...c4f8c4d`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/c187611...c4f8c4d)).
- Official events are a list copied from Table Tennis ACT's page, with the source
  and date in the code, linking out for entry. It goes stale unless someone
  updates it
  ([`9e956d4...8aab19b`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/9e956d4...8aab19b)).

## How the work was checked

The deploy path came first: the course placeholder went to Fly before any code
existed, so later failures couldn't be the pipeline's. Every feature then
started as a failing check that drives the app through its own forms, and went
green before it was merged; there are 25 checks now. Because they write data,
they stand down against the live site and run in CI's throwaway container. Each
feature was deployed only with the whole suite green, and pages were checked in
screenshots at the marking viewports, which caught a sentence on the matches
page that named the reporter twice
([`534ea43`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/534ea43)).

Mistakes went into the harness rather than being retried:

- pnpm 11 wouldn't run better-sqlite3's install script, so `pnpm-workspace.yaml`
  allows it, with a comment saying why.
- A phone screenshot came out cut off, which looked like broken CSS. Headless
  Chrome can't open a window that narrow; checking inside a true 390-pixel frame
  showed the layout was fine.
- Twice a check was wrong rather than the code, and each fix got its own commit.
  One matched text that runs together across a card's paragraphs
  ([`6aa8f0d`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/6aa8f0d)),
  and the same failure exposed a real problem: no space between a name and its
  "Guest" marker, which a screen reader would read as one word. The other used a
  guest whose own name contained the name it checked for
  ([`1a8e884`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/1a8e884)).
- drizzle-kit couldn't tell a dropped column from a renamed one without asking,
  so that migration became an add and a drop, and `CLAUDE.md` now says to split
  changes that way.

## Next

Crit 9: the board and each game's messages updating live, within a second, and
the README cut back towards 600 words.
