# Deck printings — readiness (R2)

**Green: approved to ship (Hugh, 2026-10-10).** It reuses shipped components and adds two new strings and one new prop (`PrintingRegion` `scope`). There are no new tokens and no new dependencies.

| Area | Rating |
|---|---|
| Picker in deck details (both widths) | Green |
| The fallback chain and removal | Green |
| Deck views, Shopping, commander | Green |
| Import clause, export | Green |
| Versions, switch off | Green |
| About entry P1 | Green |

Build checks:
1. `card-modal.tsx` wasn't read in full. Confirm that every deck surface opens details with the deck context: rows, tiles, the card view and the commander head.
2. Strings go through `/copy-review`.
