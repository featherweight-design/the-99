# Gap report: Tuning hub PR 2 (History, H1 to H4b)

2026-10-11. Design-review verify pass against the History frames of
`design/design_handoff_the99_tuning_hub/The 99 - Tuning Hub (R2) · C Proposed cuts and History.dc.html`
and the `HistoryRow`, `PastRun` and Failure mark rows of `docs/superpowers/design-tables/tuning-hub.md`.
Where the canvas and the table disagree on the History row (desktop grid, the phone's tier line,
the failed outcome's plate), the canvas governs, as the table's own header says.

## Gaps found

1. **A Proposed cuts deeper look, opened, had no chips.** The canvas's H3 note says each named line
   opens to its reason and its chips as they read that day. Fixed: the chips are quoted from the
   figures the run stored with its report (`pastCutChips`).
2. **The active desktop tab's mark is `--accent`; the canvas draws it `--fg`.** Not changed: the
   design table's `TuningToolMark` ink-by-state row says `--accent`, and the table was ruled to
   govern in PR 1's gap report. An errata item for Design's next round.

## Engineering departures (plan "As built")

- A past run states no version and no "changed by N cards" figure: no run stores the list it read.
- The desktop date column is 114px rather than 110, so a two-digit day and hour fit.
- No Mana Balance chip until Mana Balance ships (PR 3); History lists only the tools drawn.

## State reachability

H1, H2, H2b, H3 (Suggested changes and a Proposed cuts deeper look, both read-only) and H4 (failed,
with Try again) are reachable. H4 has no contact-sheet cell, since a browser cannot make the read
fail; `tuning-history.test.tsx` covers it.

VERDICT: 0 gaps remain open in code; 1 canvas/table conflict recorded for Design.
