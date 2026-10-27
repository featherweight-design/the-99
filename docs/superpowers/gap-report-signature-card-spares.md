# Gap report: spare asks outside Shopping (PR 4 of `2026-10-27-signature-card.md`)

Table: `docs/superpowers/design-tables/signature-card-spares.md`. Handoff: `design/design_handoff_the99_avatar/Spares.dc.html` (S1–S4, N1–N3, D1, D2).

## Verify pass

- Visual: 19 of 19 property rows match (9 on the tab, 6 on the sheet, 4 on the deep link).
- States: 6 of 7 fully reachable.
- Shopping's and the cart's callers of `SparesSheet` and `SparesSheetHost` render byte-identically (default props).
- The push carries `?spare=` only in the single-card trade-match case.

## Gaps, fixed

1. **S2: in Safari, ✕ did not return focus to the tile.** Safari does not focus a pressed button, and the sheet hands focus back to whatever held it at open. The tile now takes focus before the sheet opens. A test covers it, and it fails when the fix is removed.

## Notes, not gaps

- **When the friend has a No on file for an earlier ask, the caption reads the newest ask that friend answered.** `rowAsk` is the shipped per-friend rule that Shopping's rows use.
- **With the switch off, `?spare=` is ignored and left in the address.** The table allows this; the tab is as shipped.
- **The walk was photographed on a 0.25 CU scratch branch** with a throwaway seed (a friend sharing four spares in a pod, one wanted card, one open ask). The seed was never committed.

VERDICT: 0 gaps remain.
