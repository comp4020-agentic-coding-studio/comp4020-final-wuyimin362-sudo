# Harness

Rules for any agent working in this repo. They come from `README.md`, which
says what good means for Find a game: if a change would break one of these
rules, the README changes first, then the rule.

## What the app must never do

- Ask for an email address, or make anyone sign up just to try the board: a
  guest joins with a name.
- Send a visitor's location anywhere. Distance to venues is worked out in the
  browser by an inline script with no fetch, beacon or socket, and no page
  loads an external script. The venues page is quiet for everyone, members
  included: it carries no live stream, so it shows nothing that changes.
- Offer a venue that isn't in `src/lib/venues.ts`, or a free-text address
  field. A venue change cites the page it came from.
- Count a match score that both players haven't confirmed, or present the
  app's rating as official. Ratings Central is the club's rating, and profiles
  link to it.
- Let anyone review a player they haven't played in a confirmed match, or more
  than once per match, or show a member's hexagon or review comments before
  three different opponents have reviewed them.
- Add a general chat. Messages live only inside a game, and only its two
  players can read or write them. A game has two players, never more, without
  a new decision record (`docs/adr/0004-who-may-see-and-change-what.md`, which
  also sets out who may see and change everything else).
- Show a direct invitation on the public board before it's accepted, or let
  anyone but the invitee accept or decline it.
- Present itself as Table Tennis ACT's, or take entries for official
  competitions. Official events link to Table Tennis ACT's own pages, and
  `src/lib/events.ts` cites where its list came from.
- Show who's going to an event, or looking for a partner, to anyone but
  signed-in members.
- Show profiles, photos or match history to anyone who isn't a signed-in member.
- Store an upload that its own first bytes don't show to be a JPEG, PNG or
  WebP, or one over 1 MB, or read an upload's body before checking its size.

## Accounts and sessions

- Passwords are stored only as scrypt hashes (`src/lib/passwords.ts`). They
  are never logged, never echoed back, and never stored anywhere else.
- Every action is logged by `src/middleware.ts`, one line each, naming who by
  player id and kind (guest or member). A log line never holds a name, a
  username, a token, a cookie, an IP address, or anything anyone wrote, and no
  route logs on its own. `spec/logging.test.ts` holds both.
- Session tokens live only in the cookie. The database keeps their SHA-256,
  and logging out deletes the session row.
- A guest who makes an account keeps their player row and their games.

## What every page must hold to

- It works without JavaScript: every action is a form POST answered with a
  303, or a re-rendered form that says what was wrong. JavaScript may only add
  to a page, as sorting venues by distance in the browser does.
- It works at 390×844 and 1920×1080. Check both before calling a UI change
  done.
- Every input has a visible label, text keeps 4.5:1 contrast against its
  background, and focus is always visible.
- The look follows the apple-design-skill tokens kept in `src/styles.css`
  `:root`. No colours, radii or shadows from outside them.

## What a change must not break

- `pnpm check` stays green. `spec/invariants.test.ts` ships with the course
  and is never edited. The other checks in `spec/` drive the app through its
  own forms, using `spec/helpers.ts`.
- Accepting a game stays one guarded update, so two people can't both take a
  game, and the first accept takes it (`docs/adr/0001-first-to-accept-takes-the-game.md`).
  No queue or hold without a new decision record. Confirming or disputing a
  match is the same: only the opponent, only while it's waiting.
- Every change to a game or a message publishes its topic (`src/lib/live.ts`),
  and every page that shows one live subscribes to it. A stream carries only a
  topic's name, never data, and a game's stream is its two players' alone.
- A change that waits on a member or answers one (an invitation, a match report,
  and their answers) also publishes each member's own topic, and every member's
  page listens on their own stream, which the cookie picks and nobody else can
  open (`docs/adr/0002-what-reaches-people-live.md`).
- Every page that shows something another person can change takes the change
  live (`docs/adr/0003-everything-shown-is-live.md`). A change to what only
  members see of each other (event interest, profiles and photos, reviews,
  confirmed matches, new members) publishes `members`, which only a member's own
  stream carries. A new page that shows changing data marks it `data-live-area`
  and gets a check in `spec/live-everywhere.test.ts`. The venues page is the one
  exception, and shows nothing that changes.
- The club rating is replayed from confirmed matches every time it's shown.
  Never store a rating that could drift from the record.
- Schema changes go through `pnpm db:generate` and a committed migration. An
  applied migration is never edited. If drizzle-kit asks whether a column was
  renamed, split the change into an add and a drop.
- Game times stay Canberra wall-clock strings (`src/lib/time.ts`). Never
  convert them to UTC.
- The machine, volume and port settings in `fly.toml` are fixed by the
  course.

## How to work here

- When the agent gets the same thing wrong twice, add a rule here or a check in
  `spec/` rather than re-prompting.
- Commit in small steps whose messages say why. A new check lands red before
  the code that turns it green. If a check was wrong rather than the code, fix
  the check in its own commit and say so.
- `README.md`, `PROCESS.md` and `reflections/` are the student's. The agent
  drafts them only when asked, and the commit says so.
