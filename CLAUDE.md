# Harness

Rules for any agent working in this repo. They come from `README.md`, which
says what good means for Find a game: if a change would break one of these
rules, the README changes first, then the rule.

## What the app must never do

- Ask for a password, an email address or a location. Joining is one field: a
  name.
- Offer a venue that isn't in `src/lib/venues.ts`, or a free-text address
  field. A venue change cites the page it came from.
- Rate, score or review players: no points, rankings, skill charts or
  opponent reviews. Ratings Central is the club's rating.
- Add private messages or a chat.
- Present itself as Table Tennis ACT's, or take entries for official
  competitions.
- Store more about a person than their name, their games, and the token that
  lets their browser back in.

## What every page must hold to

- It works without JavaScript: every action is a form POST answered with a
  303 back to the page.
- It works at 390×844 and 1920×1080. Check both before calling a UI change
  done.
- Every input has a visible label, text keeps 4.5:1 contrast against its
  background, and focus is always visible.
- The look follows the apple-design-skill tokens kept in `src/styles.css`
  `:root`. No colours, radii or shadows from outside them.

## What a change must not break

- `pnpm check` stays green. `spec/invariants.test.ts` ships with the course
  and is never edited; `spec/alive.test.ts` is crit 8's "it's alive".
- Accepting a game stays one guarded update, so two people can't both take a
  game.
- Schema changes go through `pnpm db:generate` and a committed migration. An
  applied migration is never edited.
- Game times stay Canberra wall-clock strings (`src/lib/time.ts`). Never
  convert them to UTC.
- The machine, volume and port settings in `fly.toml` are fixed by the
  course.

## How to work here

- When the agent gets the same thing wrong twice, add a rule here or a check in
  `spec/` rather than re-prompting.
- Commit in small steps whose messages say why. A new check lands red before
  the code that turns it green.
- `README.md`, `PROCESS.md` and `reflections/` are the student's. The agent
  drafts them only when asked, and the commit says so.
