# Deck page messages R1 — element by element

Numbering is the brief's (§1, appendix). "Code" names where the change lands; the brief's appendix has every file:line.

| # | Element | Level | What changes | Code |
|---|---|---|---|---|
| A1 | Remove failure | Toast | Leaves the column (it sat above the header). Deck toast: title `DECK_REMOVE_FALLBACK_MESSAGE`, detail the card name, `role="alert"`, no press. One at a time; a newer replaces it. | `MutationError` mount in `builder-shell.tsx` → a `ToastFrame placement="deck"` like `TokenRefusalToast` |
| A2 | Notice tag | Header | Unchanged chip. | — |
| A3 | Proxy line | Status | Leaves the header; a status segment after the version. | `spine-desktop.tsx`, `spine-mobile.tsx` → status line |
| A4 | Over line + Proposed cuts → | Warning | Leaves the header; a warning row led by the `+N` in `--danger`, heading `trim.lead`, body `trim.body`, press `Proposed cuts →` (absent with the switch off). Over the 99 sits first when both warnings show. M3 anchors here, once. | spines → warning block |
| A5 | Commit as v1 | Header | Unchanged (Hugh's call 1). | — |
| A6 over | Spoken for twice | Warning | Same skin as today's phone band; at 1300 the shipped rounded card. Shares the block with A4. | `RollupBands` becomes the warning block |
| A6 soft | In other drafts too | Status | A disclosure segment ("N cards here are in other drafts too ▾"); open shows the hollow glyph and `softBody`. No dashed rule. | `RollupBands` soft band → status line |
| A7 | Provenance ledger | Status | A disclosure segment with the ledger's header as its words; open shows the shipped ledger lines (Show these, Undo these, the seed's reversal note; desktop meta in the open header). The shell's accent rule and ⓘ shell go; the ⓘ disc stays on the open header. | `ProvenanceLedger` renders inside the status line |
| A8 | The last N | Action | The action card: eyebrow "The last N", the caption as its sentence, `Choose the last N ↓` as the `--fg` primary, the door note under it. M1 anchors to the primary. | `LastSlotsStrip` → action card |
| A8 plate | Ran out | Action | The same card with the ran-out sentence and no press; the hand-drawn "i" goes. | `ExhaustedLine` |
| A9 | Fill failed | Action | The action card: heading, body, `Try filling again`. `--warning` rule and ⚠ go. | `FillFailedBanner` |
| A10 | Precon arrival | Receipt | Unchanged band; lasts the visit (flag stripped on read, ✕ for the visit). | `PreconArrivalBand`, `arrivalDismissKey` retired |
| A11 | Precon suggestion | Receipt | Same band, no ✓, `Link it` outlined, ✕ remembered on the account (call 2). Shows only when no other receipt does. | `PreconSuggestion` |
| A12 | Import arrival | Receipt | Unchanged band (plain and owned); the phone takes the desktop sentence. Lasts the visit. | `ArrivalStrip` |
| A13 | Update arrival | Receipt | Drawn on `ArrivalBandShell`; lasts the visit (already its rule). | `UpdateStrip` |
| A14 card | Pending changes | Action | Unchanged card. As an "also" row: label, `+N / −N`, "N changes since vN", then Review, Commit, Discard as links. | `PendingBanner` |
| A14 strip | vN · committed | Status | Unchanged; it is the status line's first segment. | `PendingBanner` STRIP |
| A15 | Unresolved | Action | The action card: eyebrow "N lines unresolved" (new label, /copy-review), the shipped sentence, `Take a look →` as the primary. `--warning` rule and ⚠ go. Leads the card over the last N and pending. | `UnresolvedBanner` |
| A16 | Recommended mix | Mix | Unchanged; at 390 the source line and draft note join the label row. | `role-counter-strip.tsx:73-92` lose `hidden md:inline` |
| A17 | Build your first deck | Action | Moves above the mix. On first run the action card is: eyebrow "Step 3 of 3" + crumbs, title, body, the top-off door as its primary, the door's caption as the note. Desktop keeps the card fan and 0/99 in the card's right column. Copy into `src/lib/copy`. | `GuidedBanner` + `LastSlotsStrip` on `firstRun` |
| A18 | Moments | Moments | Unchanged; each anchors to its press wherever it now sits (M1 the action primary, M3 the warning row, M4 the Land cell). | — |
| B1 | Toolbar notes | — | Unchanged; phone parity covered by B4. | — |
| B2–B7 | Inside Your deck | — | Out of scope; unchanged. | — |

## Action precedence

fill failed › unresolved › the last N › pending changes. The first present leads the card; each other present one is an
"also" row in that order. Commit as v1 cannot co-occur with any of them.

## Status segment order

version (or nothing while pending shows) · proxies · provenance ▾ · other drafts ▾. One disclosure open at a time;
closed on each visit.
