# Process overview

This is the project as it stands at crit 9 (All at once), rewritten rather than
added to. Two Claude Code sessions did the work, on 6–7 and 12–13 October. The agent did most of the typing: the code, the tests,
`CLAUDE.md`, the decision records, the README, this overview and my crit 8
reflection are its drafts, made at my request from my decisions, and the
commits say so.

## From the brief to one interaction, and back

My idea was an app for ACT table tennis club members: profiles with each
player's blade and rubbers, ratings, opponents' reviews, a six-sided strength
chart, private messages, nearby players and venues, and sign-ups for official
tournaments.

The agent checked it against the brief and flagged four problems: private
messages are close to the "chat room with the nouns swapped" the brief warns
against, "nearby" needs members' locations, an unofficial app shouldn't take
entries for official competitions, and most of it is asynchronous. I took its
advice to cut the first version to posting a game and someone taking it, then
brought the whole idea back, each feature limited against the problem it had
flagged.

Where I steered rather than accepted: the club itself, the Apple look (I pointed
the agent at the apple-design-skill), the venues (I sent it to Table Tennis
ACT's website, then told it NSW clubs were missing), bringing the features back,
and putting accounts first.

## Decisions, and what they cost

**Two kinds of person.** A guest is a name and a cookie, so a pod-mate can try
the board in one field; a member adds a username and password and keeps their
games across devices, but with no email address can't reset a forgotten
password. Passwords are scrypt hashes, sessions are stored only as hashes, and
five wrong passwords lock an account for a minute
([`fb23045...a10bebb`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/fb23045...a10bebb)).

**The stack: Astro's Node server, with SQLite on the Fly volume**
([`140eb0b`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/140eb0b)).
The honest reason is familiarity: my crit 7 repo already ran it on the same Fly
shape, one 256 MB machine and one volume, and the cutoff was hours away, so I
didn't seriously compare alternatives. I bet that server-sent events from one
machine would carry crit 9, and so far they have: every change is already a form
post, so a stream only names what changed and the open page fetches itself
again, and one process makes an in-memory bus enough. The cost is that two
machines would need a shared bus instead.

**Each feature's limit, and what it costs:**

- Profiles are members-only, and a photo is kept only if its own bytes say it's
  an image; a marker has to sign up to see one
  ([`5b62c2a...a61dc5d`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/5b62c2a...a61dc5d)).
- "Near you" means sharing a usual venue, so nobody's location is needed; it's
  only as good as what members fill in
  ([`14b9ebc...45e1bee`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/14b9ebc...45e1bee)).
- A match counts only once the opponent confirms it, and the rating is replayed
  from confirmed matches, never stored; a bigger club would need it cached
  ([`8038b02...3389437`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/8038b02...3389437)).
- Reviews come only from a confirmed opponent, and the hexagon waits for three;
  comments carry the reviewer's name, trading candour for accountability
  ([`d90ad6a...f023ebf`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/d90ad6a...f023ebf)).
- An invitation is a game with one invitee, reusing the guarded accept, and each
  game with two players has a thread only they can read
  ([`c187611...c4f8c4d`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/c187611...c4f8c4d)).
- Official events link out to Table Tennis ACT and take no entries; the list
  goes stale unless updated
  ([`9e956d4...8aab19b`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/9e956d4...8aab19b)).

**Several people at once.** Crit 9 asked for one decision about several people
using the app at once; two records answer it. Both times the agent laid out
options and recommended one, and I took it.

- [Decision record 1](docs/adr/0001-first-to-accept-takes-the-game.md): the
  first accept takes a game. It's one guarded update, so two people pressing
  Accept at once can't both get it; a host who wants a particular opponent
  invites them instead. It favours whoever is quick, and choosing takes an
  account. This week the agent found its second reason quoting a README line
  that
  [`716139b`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/716139b)
  had replaced before the record was written; I picked a new reason from the
  current README, and the agent rewrote the record around it
  ([`b46aaee`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/b46aaee)).
- [Decision record 2](docs/adr/0002-what-reaches-people-live.md): what reaches
  people live. The board and each game's thread went live first
  ([`247f3a3...edc850a`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/247f3a3...edc850a)),
  then whatever one member is waiting on another for: an invitation and its
  answer, a match report and its confirmation, each on a stream only that
  member can open
  ([`0045e74...2902da7`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/compare/0045e74...2902da7)).
  Event interest, reviews and profiles wait for a reload, because nobody is
  waiting on them
  ([`7be49ce`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/7be49ce)).

## How the work was checked

The deploy path came first: the course placeholder went to Fly before any code
existed. Every feature then started as a failing check that drives the app
through its own forms, and went green before merging; there are 32 now.
Because they write data, they run in CI's throwaway container, not against the
live site.

The checks never run a page's scripts, so live updates were also checked in
headless Chrome on a local build: a posted game reached an open board in 64 ms,
an invitation an open invites page in 11 ms, and a match report an open matches
page in 21 ms, with no reload. Pages are checked at both marking viewports,
which once caught a sentence naming the reporter twice
([`534ea43`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/534ea43)).

This crit's session also found the live board never deployed: `main` and the
live site were still at crit 8. It went in through a pull request, so CI
ran the whole suite first, then `main` was fast-forwarded to keep the cited
commits' SHAs. Claude Code's permission check stopped the agent's first push to
`main`, which deploys, until I said to go ahead. Live, the board's stream then
answered within 52 ms, and a stranger was refused a game's stream.

## Mistakes that went into the harness

- Twice a check was wrong rather than the code, and each fix got its own commit
  ([`6aa8f0d`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/6aa8f0d),
  [`1a8e884`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/1a8e884));
  the first also exposed a missing space between a name and its "Guest" marker.
- drizzle-kit couldn't tell a dropped column from a renamed one, so `CLAUDE.md`
  says to split such changes into an add and a drop.
- Writing the first-accept rule into `CLAUDE.md`, the agent stranded a sentence
  about confirming matches under the rule about publishing topics; it went back
  in
  [`7be49ce`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wuyimin362-sudo/commit/7be49ce).

## Next

The README has to come down towards 600 words, and crit 10 needs logging of who
did what and a decision about who may see and change what.
