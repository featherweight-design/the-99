# READINESS · addendum A5, a Precon Upgrade step in the landing demo

**Verdict: Yellow** (R1, before Hugh's audit). One gap needs a step outside code: the fixture run.

| Gap | What | Owner |
|---|---|---|
| G1 | One real upgrade on the fixture account on staging (Prismari Artistry, Muddle, bracket 3, Spells; 2 credits), exported into `Projected.upgrade` | Engineering |
| G2 | `ResultView` `limit` prop: title, facts and group counts stay whole-run | Engineering, small |
| G3 | Steps after 6 renumber: `StepBody`, `cardStepsOf`, rings, card-details chunk, tests counting eight | Engineering, small |

Copy: drafts in README, owed to /copy-review. No new token, component or flag (the demo already ships behind its own). Mobile and desktop ship in one PR.
