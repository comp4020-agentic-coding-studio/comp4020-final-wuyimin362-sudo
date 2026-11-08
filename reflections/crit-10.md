# Crit 10 reflection

## What was the breakthrough that moved the work forward?

Seeing that the app couldn't answer the question crit 10 asked of it. The
crit's task was to hand two of my pod the URL and narrate who did what from the
server's logs alone, without touching the app myself. But the app logged
nothing except its own start-up line, and I shipped nothing new for crit 10, so
there was nothing to narrate from. The only way to know what someone had done
was to open the app and look, which is exactly what the crit ruled out.

The fix came afterwards: log every action in one place, by player id and
whether the person is a guest or a member, and never a name or anything they
typed. Reading that log back turned the rules I had only described (who may
read a thread, who may confirm a score) into things I could watch being
refused. A server I can't see into is one I can only trust, not check.

## What did this work change about who I want to be as a software developer?

I want to build things I can account for after they've left my hands. Until
crit 10 I checked the app by using it myself, and every check I wrote shared
my assumptions about how it would be used. The logs, and later a reviewer
whose only job was to break the app, showed me what it did when I wasn't the
one using it: double-pressed buttons making duplicate games, connections left
open by the back button. On the next project I'd put the log in place before
the first feature, not after the crit that needed it.
