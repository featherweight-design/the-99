# Deck page messages — element by element

Numbering is the brief's (§1 and its appendix, which cites every file and line).

| # | Element | Where it goes | What changes | Code |
|---|---|---|---|---|
| A1 | Remove failure | Deck toast | Leaves the column. Title `DECK_REMOVE_FALLBACK_MESSAGE`, detail the card name, `role="alert"`, no press; a newer replaces it | `MutationError` in `builder-shell.tsx` → `ToastFrame placement="deck"` |
| A2 | Notice tag | Header | Unchanged | — |
| A3 | Proxy line | Card foot | A plain segment of the status line | `spine-desktop.tsx`, `spine-mobile.tsx` → foot |
| A4 | Over line + Proposed cuts → | Card row (warning) | `+N` mark, `{Word} over the ninety-nine`, `Cut {n} and it is legal.`, press `Cuts`. M3 anchors to it | spines → card |
| A5 | Commit as v1 | Header | Unchanged | — |
| A6 over | Spoken for twice | Card row (warning) | Mark ◆◆, title, body, press `Shopping`. Never the next step | `RollupBands` over band → card |
| A6 soft | In other drafts too | Card foot | `N in other drafts too` opens the pass sheet grouped by draft. The dashed band goes | `RollupBands` soft band → foot + sheet |
| A7 | Provenance ledger | Card foot, opens inside the card | `Where these N cards came from ▾` opens the shipped ledger lines under the foot; its ⓘ shell and accent rule go. `Show these N` opens the pass sheet | `ProvenanceLedger` |
| A8 | The last N | Card row (action) | Title `Choose the last {n}`, the caption shortened to the body, press `Choose`. M1 anchors to it | `LastSlotsStrip` |
| A8 plate | Ran out | Card row (action) | Title and body say why; press `Consider` (open, READINESS) | `ExhaustedLine` |
| A9 | Fill failed | Card row (action) | Shipped heading and body, press `Try again`. `--warning` rule and ⚠ go | `FillFailedBanner` |
| A10 | Precon arrival | Receipt band | Shorter: precon, `You own {n} of its 99`, History. Lasts the visit | `PreconArrivalBand`; `arrivalDismissKey` retires |
| A11 | Precon suggestion | Receipt band | Same band, no ✓, `Link it`; ✕ on the account; only when no other receipt shows | `PreconSuggestion` |
| A12 | Import arrival | Receipt band | Unchanged; the phone takes the desktop sentence. Lasts the visit | `ArrivalStrip` |
| A13 | Update arrival | Receipt band | Drawn on `ArrivalBandShell`; lasts the visit | `UpdateStrip` |
| A14 card | Pending changes | Card row (action) | `{n} changes since v{k}` with `+a / −b`, body, press `Review`. Commit and Discard in Review | `PendingBanner` CARD |
| A14 strip | vN · committed | Card foot / quiet strip | The foot's first segment; alone when there is nothing to do | `PendingBanner` STRIP |
| A15 | Unresolved | Card row (action) | Title `{n} lines unresolved` (new), shipped sentence, press `Look` | `UnresolvedBanner` |
| A16 | Recommended mix | Under the card | Unchanged; phone label row gains the source line and draft note | `role-counter-strip.tsx` |
| A17 | Build your first deck | The card | Head `Step 3 of 3 · Build your first deck` + crumbs; row `Choose the last 99` | `GuidedBanner` + `LastSlotsStrip` on `firstRun` |
| A18 | Moments | Over the page | Unchanged; each anchors to its press where it now sits | — |
| PassMark | Show these highlight | Retired | Replaced by the pass sheet | `pass-mark.tsx` |
| B1–B7 | Inside Your deck | — | Out of scope; unchanged | — |

## The next step

The first present of: fill failed › unresolved › over the 99 › the last N › pending changes. Spoken for twice never.
The next step is the first row; then warnings; then actions in that order.

## Foot segment order

version (nothing while pending shows) · proxies · provenance ▾ · other drafts. One disclosure open at a time, closed
on each visit.

## Pass sheet

Rows: `DecklistRow`, All view, unchanged. Press: card detail stacked via `registerSheet("1st top-off")`. Foot:
`Undo these N` (pass sheet only) and `Done`.
