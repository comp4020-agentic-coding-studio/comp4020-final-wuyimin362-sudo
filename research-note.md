# Green is not verified: who checks the checks in agentic development

The practitioner literature on agentic coding has settled on one remedy for an
agent's unreliability: automated pressure. Willison's red/green TDD has the
agent write a failing test before the code that passes it; Böckeler's harness
engineering adds "sensors" that feed back to the agent so it corrects itself
before a person looks. I accept the remedy; my final project ended with 55 such
checks. My position is that the literature stops one step short. A check suite
written in the same session as the code it checks is a measure, not a verifier,
and good practice needs a second layer that the author of the checks did not
write.

## What the remedy guarantees

Willison names exactly one way a test can mislead: one that passes before the
code exists, so "it's important to confirm that the tests fail" first. That
rules out a test that cannot fail. It does not rule out a test that fails for
the wrong reason, or that checks the wrong thing. The red step proves a check
is alive, not that it is aimed.

Böckeler is more cautious. She concedes that agent-written tests ask for "a
lot of faith… that's not good enough yet", that no sensor catches the
higher-impact failures (misread instructions, unrequested features) reliably
enough to reduce supervision, and asks the question that matters most here: "If sensors never fire, is that a
sign of high quality or inadequate detection mechanisms?" But her harness
answers it only with more of the same. Its sensors run in the agent's own
correction loop, and the article never takes up the circularity of an author
grading its own work. That is the gap.

## Why the gap is structural

Goodhart's law, in Strathern's phrasing, says a measure that becomes a target
stops being a good measure. An agent working against its own spec turns every
check into a target without any intent to cheat: it writes the checks its
understanding of the task predicts, then code that satisfies them, and both
carry the same blind spots. Storey names the cost for a team: code produced
faster than it is understood accumulates "cognitive debt", the erosion of
shared understanding. A suite that grows with that code is part of the debt,
not a hedge against it.

The evaluation literature, where a misleading score has explicit stakes,
already draws the conclusion harness engineering does not. Anthropic's evals
guide says "you won't know if your graders are working well unless you read the
transcripts", calibrates model graders against human experts, and treats
automated checks as one slice of a "Swiss cheese" defence whose holes other
layers must cover. A grader is trusted not because it is green but because
something else has looked at it.

## The counter-case: another agent is not independent

The obvious objection is that a second agent reviewing the first adds only
another inferential sensor with the same blind spots. Cognition's own
writing shows why this objection is weaker than it looks, and why it is not
empty. In 2025 Yan argued that agents splitting a task must "share context" or
their decisions conflict. In 2026 he keeps that rule for agents that write, but
reports that a reviewer works best when the two "do not share any context
beforehand", because it is "forced to reason backward from the implementation
without the spec". Independence here is not a different model but a different
starting point. That the result surprised its own author is evidence about the
field: good practice is being found empirically, not derived.

My project is one case, not a study, but it fits. With the suite green, a
reviewer started without my session's context and found that three presses of
"Post game" created three games, that pages kept by the browser's back button
held their live connections open, and that a refused stream was never retried.
None of my checks could have caught these: each encoded the same assumptions
as the code. Earlier, the one gap I found myself came the same way, by
stepping outside the suite: re-reading as a member the page whose check read
it only as a stranger, I found the location promise it guarded broken.

The objection still bites in one place. The reviewer also produced a finding
that would not reproduce, and some that did not matter.
Independent review does not remove human judgement; it relocates it, from
writing checks to deciding which findings are real.

## The position

Good agentic practice keeps the author's checks as backpressure and stops
treating them as evidence. Verification is a layer the author did not write: a
clean-context reviewer, a person judging what it found, and each real finding
turned into a check that fails first. Harness engineering should say so as
plainly as the evaluation literature does.

## References

- Böckeler, B. (2026, 2 April). *Harness engineering for coding agent users*. martinfowler.com. https://martinfowler.com/articles/harness-engineering.html
- Grace, M., Hadfield, J., Olivares, R., & De Jonghe, J. (2026, 9 January). *Demystifying evals for AI agents*. Anthropic. https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- Storey, M.-A. (2026). *From technical debt to cognitive and intent debt: Rethinking software health in the age of AI* (arXiv:2603.22106v4). https://doi.org/10.48550/arXiv.2603.22106
- Strathern, M. (1997). 'Improving ratings': Audit in the British university system. *European Review*, 5(3), 305–321. https://doi.org/10.1017/S1062798700002660
- Willison, S. (n.d.). *Red/green TDD*. In *Agentic engineering patterns*. https://simonwillison.net/guides/agentic-engineering-patterns/red-green-tdd/
- Yan, W. (2025, 12 June). *Don't build multi-agents*. Cognition. https://cognition.com/blog/dont-build-multi-agents
- Yan, W. (2026, 22 April). *Multi-agents: What's actually working*. Cognition. https://cognition.com/blog/multi-agents-working
