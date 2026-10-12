# READINESS: /collection sort by price (R1)

**Build from:** `The 99 - Collection Price Sort (R1).dc.html`. Hugh approved R1 on 2026-10-11. There is no About entry, because this is a sort option on a known surface.

## Files
| File | Role |
|---|---|
| `The 99 - Collection Price Sort (R1).dc.html` | canvas: L1–L2, G1–G2, N1–N2, S1 at 900 and 390; cases C1–C6 as rows and tiles; STATES and the design table rendered in-canvas |
| `README.md` | the five calls, engineering notes, open items |
| `STATES-collection-price.md` | state rows: L, G, N, S, C, T, F, plus must-nots |
| `design-tables/collection-price.md` | measurements; commit to `docs/superpowers/design-tables/collection-price.md` |
| `collection-price · copy strings.ts` | `collectionPriceCopy`, placeholder wording for /copy-review |

## Touches
| File | Change |
|---|---|
| `src/lib/collection/browse.ts` | `SortKey` gains `"price"`; `DEFAULT_SORT_DIRECTION.price = "desc"`; the comparator puts null keys last in both directions; name tiebreak A–Z |
| `src/lib/collection/sort-options.ts` | `SORT_KEYS` appends `price`; `SORT_LABELS.price`; `DIRECTION_LABELS.price = { asc: "Lowest first", desc: "Highest first" }` |
| `src/components/collection/rows-view.tsx` | when sort=price, the figure leads the type line (desktop `typeLine` span in `SetRarityColumn`; the mobile type line) and the price clause goes last in the `aria-label` |
| `src/components/collection/grid-view.tsx` | when sort=price, the figure leads `nameSub`; the phone tile drops the rarity; the price clause goes last in `nameSpoken` |
| list payload | `BrowseListCard.price`, populated only when sort=price |

## Readiness
| Area | Ready | Note |
|---|---|---|
| Sort option (S1–S4) | high | Pure additions to `sort-options.ts`, already tested by shape |
| Row figure (L1, L2) | high | Rides an existing line; no grid or height change |
| Tile figure (G1, G2) | high | Rides `nameSub`; caption 70/65 unchanged |
| Sort key (C1–C4) | medium | Needs a per-copy price join on printing + finish (R1) |
| No price (C5, C6) | high | Reuses `priceState` and card detail's gap 1 ruling verbatim |
| Read failure (F1) | medium | One new line; R3 |
| Copy | low | All placeholders until /copy-review |

## Gap report
- **R1 · Per-copy price.** The key is the max over owned copies of `priceOf` for each copy's printing and finish. Foil and etched copies take their own column. Copies with no priced row are ignored. If every copy is unpriced, the key is null. Never fall back to the card-level price or another printing's figure.
- **R2 · Payload.** Populate `price` only when sort=price, so the default payload and the measured first screen are unaffected. With sort=price, the figure ships with the row and is never inserted late.
- **R3 · Read failure.** If the price read fails, every key is null, the order is A–Z, and `collectionPriceCopy.readFailed` draws one line under Showing.
- **R4 · Trigger width.** `Sort: Price · Highest first` has the same character count as `Sort: Rarity · Mythic first`. Measure it against collection surfaces R2 §B3's 518px one-row budget.
- **R5 · Contrast.** `--accent` on `--surface` measures ~4.4:1 in Kaldheim for the 11.5px row figure. Check all six themes. If any fail, the figure takes `--fg`.
- **R6 · Spelling.** The shipped spoken strings use `ManaPool`; the brief uses `Mana Pool`. This goes to /copy-review.
- **R7 · Fixtures.** Every figure, card and copy breakdown on the canvas is illustrative.
