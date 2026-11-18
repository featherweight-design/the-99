# READINESS · addendum A5b, a Precon Upgrade step in the landing demo

**Verdict: Yellow** (A5b, before Hugh's review). One gap needs a step outside code (the fixture run) and the step builds after Upgrade R2.

| Gap | What | Owner |
|---|---|---|
| G1 | One real upgrade on the fixture account on staging (Prismari Artistry, Muddle, bracket 3, Spells; 2 credits), exported into `Projected.upgrade` | Engineering |
| G2 | `demo` prop on `SuggestedChangesRun` (no You asked, no Apply place, no apply line) and passed through R2's `ResultView` | Engineering, small |
| G3 | Steps after 6 renumber: `StepBody`, `cardStepsOf`, rings, card-details chunk, tests counting eight | Engineering, small |
| G4 | Ships after the Upgrade fresh-start R2 build (`design_handoff_the99_precon_upgrade/addendum-fresh-start/`) | Engineering, order |

Retired from R1: the `ResultView` `limit` prop. Copy: drafts in README, owed to /copy-review; one open copy question for Hugh (the uneven warning). No new token, component or flag (the demo already ships behind its own). Mobile and desktop ship in one PR.
