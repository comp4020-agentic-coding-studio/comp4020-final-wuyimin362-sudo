# Find a game

Find a game is a board for people who play table tennis at ACT clubs. You post a time and a venue, another member takes you up on it, and you both turn up. That's the whole app, on purpose. It's unofficial: Table Tennis ACT doesn't run it, and it doesn't replace anything Table Tennis ACT runs.

## What good means here

A good version of this app gets two club members onto a table with as little effort as possible, without turning them into profiles to be judged. For me that comes down to four things.

**Joining takes one field.** You give the name people call you at the club. There's no password and no email. Someone trying it for the first time should have a game posted within a minute.

**Games are agreed in the open.** Every offer goes on the one board, where anyone can see who's playing where and when. Once someone takes a game it's theirs, and two people can't both take it.

**You only meet at public venues.** The venue list is the venues Table Tennis ACT lists, plus a few NSW clubs within reach of Canberra. Nobody has to post a home address, and the app never asks where you are.

**It sits beside the club, not on top of it.** Table Tennis ACT already rates players through Ratings Central, runs Pennant, and keeps the venue list. The board fills the gap between those: who's free for a hit on Thursday night?

The look borrows Apple's web style (system type, white cards, one blue for anything you can press) because the board gets checked on a phone between sessions, and it should be calm and quick to read.

## What I read

- Clay Shirky, [Situated Software](https://gwern.net/doc/technology/2004-03-30-shirky-situatedsoftware) (2004): software built for one group can lean on the trust that group already has. That's why a name is enough here: club members already know each other.
- Robin Sloan, [An app can be a home-cooked meal](https://www.robinsloan.com/notes/home-cooked-app/) (2020): an app made for his family of four only had to be good for them. Accounts, password resets and discovery are what general-purpose apps need, and this one doesn't.
- Maggie Appleton, [Home-Cooked Software and Barefoot Developers](https://maggieappleton.com/home-cooked-software) (2024): the case for people inside a community building small tools for it. I play, and this is for the people I play with.
- Aral Balkan, [What is the Small Web?](https://ar.al/2020/08/07/what-is-the-small-web/) (2020): small, personal, and tracking no one. The board stores a name, the games, and a random token that lets your browser back in, and nothing else.
- Yancey Strickler, [The Dark Forest Theory of the Internet](https://www.ystrickler.com/the-dark-forest-theory-of-the-internet/) (2019): people leave big public platforms for smaller spaces where they know each other. A club board is one of those, and should stay that way.
- Table Tennis ACT's pages on [Ratings Central](https://www.tabletennisact.org.au/about/ratingscentral), [etiquette](https://www.tabletennisact.org.au/information-for-new-players-and-non-members/table-tennis-etiquette) and [clubs and venues](https://www.tabletennisact.org.au/venues-and-times) told me what the club already does, and so what to leave alone.

## What I chose not to build

- **Ratings or points.** Ratings Central already gives members an official rating from Pennant and tournaments. A second number would only compete with it.
- **Opponent reviews or skill charts.** My first idea was a six-sided chart of each player's strengths, scored by their opponents. The club's etiquette asks players to respect their opponents, and grading club-mates in public works against that.
- **Private messages.** A chat inbox would turn the board into a chat app, and once a game is agreed you can talk at the table.
- **"Players near you."** Locations are private, and the venue list is short enough to pick from.
- **Entries to official competitions.** Those belong with Table Tennis ACT.

## Enforced and judged

Checked by `spec/` on every push:

- a stranger can join with just a name, post a game, and find it when they come back; another member can take it, and the host sees who (`spec/alive.test.ts`)
- this README is published at `/readme/` (`spec/invariants.test.ts`)

Enforced in the code, with checks still to write: two people can't take the same game, and games can only be posted at listed venues, up to eight weeks ahead.

Judged rather than tested: whether posting really takes under a minute on a phone, and whether the board feels like the club's own noticeboard rather than a social network. I'll judge those by watching club-mates use it, and by asking my pod at the crit.
