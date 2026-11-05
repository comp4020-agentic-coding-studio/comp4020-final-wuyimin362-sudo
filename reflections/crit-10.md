# Crit 10 reflection

<!-- Drafted by Claude from the repo's record, which shows what changed but not
     what happened in the crit room. The two bracketed sentences are yours to
     write; the rest is yours to keep, cut or rewrite. Delete this comment. -->

## What was the breakthrough that moved the work forward?

Being asked to narrate from the logs and finding there was nothing to read.
Crit 10 had two of my pod use the app from its URL while I told the room who
did what, using only the server's output. Up to then the app logged nothing
but its own start-up line, so the only way to know what someone had done was
to open the app and look, which is exactly what the crit ruled out.
[What happened in the room when you tried: what you could and couldn't say.]

The fix was to log every action in one place, by player id and whether the
person is a guest or a member, and never a name or anything they typed. Once I
could read the log back, the decisions I'd only described (who may see a
thread, who may confirm a score) became things I could watch being refused.

## What did this work change about who I want to be as a software developer?

I want to build things I can account for after they've left my hands. Until
crit 10 I checked the app by using it myself; the logs, and later a reviewer
whose only job was to break the app, showed me what it did when I wasn't the
one using it. [Something you'd do differently on the next project because of
this.]
