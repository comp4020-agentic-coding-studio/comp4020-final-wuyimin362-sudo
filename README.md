# Find a game

Find a game is a board for people who play table tennis at ACT clubs. You post a time and a venue, another member takes you up on it, and you both turn up. It's unofficial: Table Tennis ACT doesn't run it, and it doesn't replace anything Table Tennis ACT runs.

## What good means here

A good version of this app gets two club members onto a table with as little effort as possible, and helps them find the right opponent, without exposing more of anyone than the club already knows. For me that comes down to four things.

**Trying it takes one field.** A guest gives the name people call them at the club, and the board marks them as a guest. Making an account adds a username and a password, so you can sign in from any device and keep what you've posted. There's no email address, which also means there's no password reset by email.

**Games are agreed in the open.** Every offer goes on the one board, where anyone can see who's playing where and when. Once someone takes a game it's theirs, and two people can't both take it.

**You only meet at public venues.** The venue list is the venues Table Tennis ACT lists, plus a few NSW clubs within reach of Canberra. Nobody has to post a home address, and the app never stores where you are.

**It sits beside the club, not on top of it.** Table Tennis ACT already rates players through Ratings Central, runs Pennant, and takes entries for its events. The board fills the gaps between those: who's free for a hit on Thursday night, and who plays the style you want to practise against?

The look borrows Apple's web style (system type, white cards, one blue for anything you can press) because the board gets checked on a phone between sessions, and it should be calm and quick to read.

## What I read

- Clay Shirky, [Situated Software](https://gwern.net/doc/technology/2004-03-30-shirky-situatedsoftware) (2004): software built for one group can lean on the trust that group already has. That's why a name is enough to try the board: club members already know each other.
- Robin Sloan, [An app can be a home-cooked meal](https://www.robinsloan.com/notes/home-cooked-app/) (2020): an app made for his family of four only had to be good for them. Email verification, password resets and discovery are what general-purpose apps need, and a club-sized board can leave them out.
- Maggie Appleton, [Home-Cooked Software and Barefoot Developers](https://maggieappleton.com/home-cooked-software) (2024): the case for people inside a community building small tools for it. I play, and this is for the people I play with.
- Aral Balkan, [What is the Small Web?](https://ar.al/2020/08/07/what-is-the-small-web/) (2020): small, personal, and tracking no one. The board stores a name and the games; members add a username, a hashed password and whatever they choose to put on their profile, and nothing else.
- Yancey Strickler, [The Dark Forest Theory of the Internet](https://www.ystrickler.com/the-dark-forest-theory-of-the-internet/) (2019): people leave big public platforms for smaller spaces where they know each other. A club board is one of those, and should stay that way.
- Table Tennis ACT's pages on [Ratings Central](https://www.tabletennisact.org.au/about/ratingscentral), [etiquette](https://www.tabletennisact.org.au/information-for-new-players-and-non-members/table-tennis-etiquette) and [clubs and venues](https://www.tabletennisact.org.au/venues-and-times) told me what the club already does, and so what to leave alone.

## Coming next, and the lines it won't cross

The first version cut my original idea down to the board. Profiles are back: a member can show their photo, blade and rubbers, grip, style and the venues they usually play at, and link their Ratings Central rating, and only other signed-in members can see any of it. Finding is back too: anyone can browse the venues and sort them by distance, worked out in their own browser so their location never reaches the server, and members can find players who share their usual venues or play the style they want to practise against. The rest is coming, within these limits:

- **A friendly-match rating**, marked unofficial. A score only counts once both players confirm it, and your profile links to your Ratings Central rating for the official number.
- **Opponents' views of your style**, scored on six things (serve, receive, forehand, backhand, footwork, tactics) and drawn as a hexagon. Only someone you've played in a confirmed match can give one, and the chart appears only after three, so no single opinion stands for anyone. The club's etiquette asks players to respect their opponents, and this is how the app holds to it.
- **Direct invitations**: ask a particular member for a game, with a short thread of messages attached to that invitation, not a general chat.
- **Official events**, each linking to Table Tennis ACT's own entry page, with a way to say you're going or looking for a doubles partner. The app won't take entries.

Still not building: email collection, location tracking, a general chat, or entries to official competitions.

## Enforced and judged

Checked by `spec/` on every push:

- a stranger can join with just a name, post a game, and find it when they come back; another member can take it, and the host sees who (`spec/alive.test.ts`)
- a member who signs up, logs out and logs in from another browser is the same person, and logging out ends the session on the server; a taken username and a wrong password are turned away; five wrong passwords lock an account for a minute; a guest who makes an account keeps their games (`spec/accounts.test.ts`)
- a member's profile, photo included, shows to other members and to no one else, and a file that isn't a real image is refused (`spec/profiles.test.ts`)
- every venue the board offers is listed for anyone; the venues page's script has no way to send a location anywhere; members find members who share their venues or play a given style, and non-members see none of it (`spec/discovery.test.ts`)
- this README is published at `/readme/` (`spec/invariants.test.ts`)

Enforced in the code, with checks still to write: two people can't take the same game, and games can only be posted at listed venues, up to eight weeks ahead.

Judged rather than tested: whether posting really takes under a minute on a phone, and whether the board feels like the club's own noticeboard rather than a social network. I'll judge those by watching club-mates use it, and by asking my pod at the crit.
