# Harness

Rules for any agent working in this repo. They come from `README.md`, which
says what good means for Find a game: if a change would break one of these
rules, the README changes first, then the rule.

## What the app must never do

- Ask for an email address or a location, or make anyone sign up just to try
  the board: a guest joins with a name.
- Offer a venue that isn't in `src/lib/venues.ts`, or a free-text address
  field. A venue change cites the page it came from.
- Count a match score that both players haven't confirmed, or present the
  app's rating as official. Ratings Central is the club's rating, and profiles
  link to it.
- Let anyone review a player they haven't played in a confirmed match, or show
  a style chart built from fewer than three reviews.
- Add a general chat. Messages live only inside an invitation between two
  players.
- Present itself as Table Tennis ACT's, or take entries for official
  competitions. Official events link to Table Tennis ACT's own pages.
- Show profiles or match history to anyone who isn't a signed-in member.

## Accounts and sessions

- Passwords are stored only as scrypt hashes (`src/lib/passwords.ts`). They
  are never logged, never echoed back, and never stored anywhere else.
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
  game.
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
