# Gap report: Deck printings PR 4, the picker in deck scope

Property table: `docs/superpowers/design-tables/deck-printings-picker.md` (enumerated from the
handoff alone). Verified row by row against `printing-region.tsx`, `card-modal.tsx`,
`card-detail-provider.tsx` and the contact sheet (`docs/superpowers/inventories/deck-printings.json`).

## Visual gaps

1. `printing-region.tsx`: save-failed notice. Design: below the tile grid, `margin-top:12`, flex,
   gap 8, `!` glyph in mono 600 `--warning` (aria-hidden), text 12.5px `--fg-body`. Implementation
   had it under the intro, 13px `--fg`, glyph inline. **Fixed.**

## State reachability

Every state in the table is reachable. Nothing picked, open, picked, picked and open, one owned
printing, switch off and E9 are covered by tests and photographed on the contact sheet. Save failed
and overflow are covered by unit tests only, because the probe account has neither. No owned
printing is today's plain Set field.

A pick whose printing left the Collection is ignored rather than cleared (plan: unheld picks are
ignored, not deleted). On screen it is identical to the design's "pick cleared": no `Your pick`
tile, no dormant tile, Shown now on the fallback.

## Copy

Wording is routed to /copy-review, not this report. One change was made there: the announcement
became `{set} number {cn} picked for this deck.`

VERDICT: 1 visual gap, fixed; 0 state gaps.
