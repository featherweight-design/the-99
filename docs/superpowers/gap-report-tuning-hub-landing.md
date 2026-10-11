# Gap report: Tuning hub PR 1 (landing, tool switch, trim-line shortcut)

2026-10-11. Design-review verify pass against `docs/superpowers/design-tables/tuning-hub.md`
(`TuningToolMark`, `TuningHub — section`, `ToolTile` and its running and inert states, `Tool
switch`, `Trim line link`) and the Hub rows of `STATES-tuning-hub.md`. Out of scope here: the land
cell, Mana Balance and History (later PRs of `plans/2026-10-11-tuning-hub-build.md`).

## Approved deviations (plan, approved by the orchestrator as Hugh's proxy)

- The hub also mounts for a deck over 100 with no reading; Suggested changes is then inert and
  says why (the canvas mounts the hub "with the reading" only).
- A tile draws only for a tool whose switch is on and whose UI is built: two of four this PR.
- The A1 offer figure is `--fg-muted`, never `--warning` (R2 audit decision 1; the table row now
  says so).

## Gaps found and fixed

1. Section gap at `md` was 14 on the landing; the table and canvas say 12, with 14 only once a
   tool is open (A4). Now 12, and 14 with a tool open.
2. Rest tab marks inherited the label's `--fg-muted`; the table's ink-by-state row says rest
   `--fg-body`, inert `--fg-locked`, active `--accent`. The table governs; the canvas's A4 inks
   the mark like its label, an errata item for Design's next round.
3. Arrow, Home and End keys could land on an inert tool's disabled tab and open it. They now step
   over it (`tuning-hub.test.tsx`, mutation-checked).

## State reachability

Landing over 100, landing at or under 100, a run in flight, a tool open and the reset are all
reachable. A run in flight is covered by `tuning-hub.test.tsx` rather than the contact sheet,
which would need a pending paid run.

VERDICT: 0 gaps remain.
