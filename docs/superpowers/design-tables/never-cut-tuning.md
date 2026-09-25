# Design Property Table: Locked (never cut), the tuning panel (PR 3)

Source: `design/design_handoff_the99_never_cut/STATES-never-cut.md` (row "Every card but the commander locked"), `README.md` §71 (ruling 6), the handoff's copy file (`tuning.*`), and READINESS-audit F10. The panel's own layout is unchanged; these are the only states Locked adds to it.

## State coverage

| State | Triggering condition | Rendered | Key props |
|---|---|---|---|
| Every card but the commander locked | `TuningState.allLocked` = commander name (every `deck_cards` row live-locked; `NEVER_CUT_ENABLED` on) | the lead is `tuning.allLocked(commander)`; the primary stays drawn and is `aria-disabled`; the note is `tuning.allLockedNote` in place of the credit line | `gateReason` → `allLocked`, ahead of `unchanged` |
| Every suggestion cut a locked card (F10) | `run.status = failed`, `errorClass = 'locked_only'` | `ungrounded`'s frame (tag, heading, kept, note) with the body `tuning.lockedOnlyBody` | refunded like every failure |
| A suggestion whose cut is locked since | `TuningItem.cutLocked` | the no-longer-applies line `tuning.cutLocked(card)` (PR 2) | `applies = false` |

## Verification (2026-09-25, scratch branch, 390 and 1300)

| Row | Result |
|---|---|
| all-locked lead replaces the ready lead | MATCH (both widths) |
| primary disabled, no credit reserved | MATCH: `aria-disabled`, `d.run` never called (`tuning-panel.test.tsx`); server refuses before `startRun` (`tuning-actions.test.ts`) |
| note reads *No credit is used.* | MATCH (both widths) |
| over an existing set the sentence joins the note, and only the credit line gives way | MATCH (`tuning-panel.test.tsx`) |
| F10 body names the lock | MATCH (both widths) |

Gaps: none against the handoff. For /copy-review, not design: the F10 state keeps `ungrounded`'s note ("log another game and there is more to go on"), and the all-locked Ready state keeps the intent ask's "or skip it: the suggestions still run". Both are copy the handoff did not revisit.
