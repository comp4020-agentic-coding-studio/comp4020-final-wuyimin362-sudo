# Find a game

Find a game is a board for people who play table tennis at ACT clubs. You post a time and a venue, another member takes you up on it, and you both turn up. It's unofficial: Table Tennis ACT doesn't run it.

## What good means here

A club already has somewhere to ask "anyone free for a hit Thursday?": the group chat. There the question scrolls away, three people answer it, and nobody is sure who's playing. A good board fixes exactly that. An offer is one thing on the board, the first to accept it gets it, and every open board shows it taken within a second. That's why the app is multi-user and live: an offer has to be claimed once, in front of everyone who might want it.

Everything else serves getting two people onto a table:

- **Trying it takes one field.** A guest gives the name people call them at the club. An account adds a username and a password, never an email.
- **Choosing an opponent is possible, not required.** The board is for whoever's free; a member can instead find players by venue, style or a club rating close to their own, and invite one directly.
- **Nothing about you leaves the club's pages.** Your location stays in your browser, profiles are for members, and the server's log records who did what by an id, never a name or anything you wrote.

## What I read

- Clay Shirky, [Situated Software](https://gwern.net/doc/technology/2004-03-30-shirky-situatedsoftware) (2004): software for one group can lean on the trust that group already has. So a name is enough to take a game. Trust doesn't settle a disputed score, though, which is why a result counts only once the opponent confirms it.
- Robin Sloan, [An app can be a home-cooked meal](https://www.robinsloan.com/notes/home-cooked-app/) (2020): an app for a few people only has to be good for them, so a club board can skip email, password resets and feeds.
- Table Tennis ACT's pages on [Ratings Central](https://www.tabletennisact.org.au/about/ratingscentral) and [clubs and venues](https://www.tabletennisact.org.au/venues-and-times) told me what the club already runs, so the board lists only its venues, links to its official rating, and takes no entries.

## What it won't do

No general chat: a game's two players get a thread, nobody else. No more than two players a game, no location tracking, no official entries. A game whose time has passed stays on the board for two weeks, then drops off the list. The app's club rating is unofficial and says so.

## Enforced and judged

Checked by `spec/` on every push, with the file that holds each:

- one field to join, and a guest's games survive making an account (`accounts`)
- an offer is taken once: two accepts at the same moment, one winner (`realtime`)
- every open page shows another person's change within a second, and reconnects if the server drops it (`realtime`, `live-everywhere`, `robustness`)
- a game is still there the next day, and for two weeks after its time (`alive`, `history`)
- profiles, reviews and event interest only for members; a game's thread only for its two players (`profiles`, `invites`, `events`)
- a score counts only once confirmed; reviews only from a real opponent, shown after three (`matches`, `reviews`)
- the venues page can't send a location, and no log line holds a name or what anyone wrote (`discovery`, `logging`)

Judged, not tested: whether posting takes under a minute on a phone, and whether the board reads as the club's noticeboard rather than a social network. I'll judge both by watching club-mates use it.
