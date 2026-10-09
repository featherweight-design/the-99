# Readiness — collection edit R1

**Approved (LGTM, 2026-10-09). Self-assessed: Amber until the three items below are ruled.** Every surface and state the brief lists is drawn. Three calls need Hugh before the build, and one depends on an unmerged PR.

**Post-audit status (see `READINESS-audit.md` for the live verdict): item 1 is resolved — PR
#1304 merged 2026-10-09T16:32:53Z; item 2 is resolved — Hugh ruled 2026-10-09, the History tab;
item 3 is not a design blocker — it's a copy-review call per the handoff itself. This section is
kept as Design's original self-assessment and is a historical snapshot, not the current status.**

## Blocking
1. **PR #1304 is unmerged.** This handoff was built on `docs/collection-empty-add`. If #1304 changes before it merges, B0 is the section exposed to that.
2. **Phone strip trade (README open 1).** Taking History as a tab moves the phone's upload into the Add sheet.
3. **Rename `Replace collection` → `Upload a file`** under the switch (README open 2).

## Not blocking, flagged
4. **Revert of a Replace that touched hundreds of cards** can warn about many decks. The §E long-list rule covers it, but the check's latency on a 4,000-row delta is unmeasured. Measure it in the write-path plan (#1300).
5. **`edited` tag in the Replace preview** needs `collection_items` rows joined to manual entries since the last upload. That's derivable from the ledger, but it's a new read.
6. **The 80% overlap threshold** for Add's note is a judgement, not a measurement. Revisit it after real uploads.
7. **The `From Shopping` tag** is reserved and ghosted only. Sub-project 4 owns its copy.
8. **Undo on C and D** is a revert, so it can warn. That's honest, but it's one more dialog than a pure undo would be.

## Not read
- `src/lib/collection/import.ts` and `actions.ts` (data path). The brief covers what the UI needs from them.
- `rows-view.tsx` / `grid-view.tsx` internals. Row and tile geometry is taken from `collection_surfaces` R1/R2.
