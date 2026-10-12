# READINESS audit: /collection sort by price (R1)

Audited 2026-10-11 against the rebased tree (origin/main 9b9824cf1). **Verdict: GREEN.** Every "Yours" question is answered and the frames exist. The eight findings are engineering calls, resolved below; none needs a Design round and none changes a drawn pixel. Where a finding disagrees with the README or READINESS gap report, **this audit wins for the build.** No About entry: agreed (a sort option on a known surface).

## "Yours" answered
| # | Question | Answer | Where |
|---|---|---|---|
| 1 | Only while sorted, or always | Only while sorted by price | README call 1, N1, N2 |
| 2 | Placement | Leads the type line (rows) and the `SET · rarity` sub-line (tiles) | L1, G1; table rows "Row: figure", "Tile: figure" |
| 3 | No price | `no stock` in `--fg-muted` when the store said no; nothing when no answer reached us | C5, C6 |
| 4 | Mixed printings | Most valuable copy, suffix `max`; finish spoken only when both apply | C3, C4 |
| 5 | Sort control | One row, `Highest first` / `Lowest first`, no new control | S1 |

Frames at 900 and 390: list and grid in both directions (L1, L2, G1, G2), a non-price sort (N1, N2), the panel (S1), and cases C1 to C6. Nothing is missing.

## Spot-checks of the table against the .dc.html
Matches: row grid `52 1fr 90 150 92 18` and `38 1fr 76 auto`; desktop figure mono 11.5 / line 18; tile sub-line 9.5 / 12 at 900 and 9 / 11 at 390; caption min-height 65 (900) and 70 (390); tile track `minmax(178px,1fr)`; panel row heights; `$38.50 foil` leaving about 70px of type text (11 mono glyphs at 11.5px is about 76px, plus the 8px gap, out of 150). Shipped files agree (`rows-view.tsx:105`, `grid-view.tsx:90`).
Heights are unchanged. The figure takes a slot inside lines that already exist.

## Findings
1. **Medium. The sort is client state, so "populate `price` only when sort=price" cannot work.** `browser.tsx:284,464` holds `sort` in `useState` and re-sorts the payload in the browser; picking Price never reaches the server. A reader on the default `/collection` would select Price over cards that carry no figure. README F2 ("never fetched late") and READINESS R2 are therefore not buildable as written. **Resolved:** ship the price as a sort-read column on every card in the list wire, always. The draw rule is unchanged (the figure renders only when sort=price). It must not be a `COLLECTION_DRAW_KEYS` member, or it is withheld outside the first window and the sort goes wrong (`window.ts:firstWindowIds` and the browser both sort over every card). Add it to `cutCollectionWindow`'s kept columns.
2. **Medium. Payload.** Today's wire is 0.959MB against the 1,050,000 budget (`probe-payload-size.mts:63`), 91KB of headroom. Design's object shape `{cents, finish, printings} | {none}` is about 50 bytes a card: roughly 160KB on staging's 3,235 rows, over the cap. **Resolved:** one compact integer per card, `p = cents * 4 + finishCode` (0 non-foil, 1 foil, 2 etched), omitted when unpriced; a second small field only for the rare mixed case (`n`, the count of priced copies, present when above 1); the none states as `-1` (store said no) and absent (silent). About 12 to 14 bytes a card: roughly 40KB raw, inside the cap with about 50KB spare. `probe:payload` must assert the new total and keep failing at the cap.
3. **Medium. "The printing owned" and the finish.** `priceOf(fact, state)` takes no finish: it returns `fact.cents` for `priced`, so a foil copy would show the non-foil figure. Build a finish-aware read: foil copy uses `foilCents`, etched copy `etchedCents`, non-foil `cents`, each through `priceState`'s liveness test (a sold-out printing reads `no stock`, not its frozen figure). A copy whose requested column is null falls to the `foilOnly` rule `priceOf` already has, and then the suffix is the finish word, so the label never claims a finish the figure is not. Identity goes through `priceFor` (`price-lookup.ts`), which already holds the no-fallback rule: id, then set plus collector number, then silence; never the representative printing.
4. **Medium. `priceFor` is per-card, quadratic in a list.** It calls `prices.catalogIds.includes(...)` on arrays. Fine for one card's printings, wrong over 3,235 cards. The list needs the join in one batched query (printings left-joined to `printing_prices` for the user's holdings) and Set-based indexes, or `indexPriceRows` run per oracle id. This also adds a read to `loadBrowseCards`, the heaviest cached read (`payload.ts`, key `browse-5`); the cache key already rolls with the catalog generation, and prices ride that stamp, so a refresh retires it. Bump the key.
5. **Low. "Printings" counts the wrong thing.** The spoken clause says "the most valuable of N printings", and the table says "two finishes of one printing count as different printings". `BrowsePrinting` collapses finishes into one entry (`browse.ts:648`). Count priced copy groups (printing plus finish) and name them "copies" in the aria: `the most valuable of 3 copies`. Copy goes to `/copy-review`.
6. **Low. Mixed no-stock and silent copies.** The key ignores unpriced copies, but the draw state for a card with one `no stock` copy and one silent copy is not drawn. **Resolved:** any copy the store answered no on, with no priced copy, draws `no stock`; silent only when every copy is silent. Sorting treats both as null.
7. **Low. Contrast, measured across all six themes** (`--accent` on `--surface`): Amonkhet 5.94, Kamigawa 5.72, Ixalan 8.53, Eldraine 6.22, **Kaldheim 4.46, Phyrexia 4.25**. Two fail 4.5 for 9 to 11.5px text, and the hover surface is lower. It matches the shipped `×N` and the card-detail picker figure, so it is parity, not a regression. **Resolved:** the figure takes `--fg` for the number and keeps `--accent` out of it; the suffix stays `--fg-muted` (6.07 to 6.65 everywhere). Revisit only if Hugh wants the accent echo.
8. **Low. Silent cards are not in the L1/G1 frames.** The canvas filters them out of the order frames (`lists = all.filter(price !== "silent")`); C6 shows them alone. The STATES rows say they trail with no-stock, A to Z. The table wins; build to the STATES row. Frame mismatch: the table wins.

## Engineering feasibility
- **Sort parity.** `sortCards` is the single comparator the server window (`window.ts`) and the browser both call. Add `price` to `SORT_COMPARATORS`, but a null-last-in-both-directions rule cannot sit in `sign * primary(a,b)`: handle nulls before the sign is applied, then tiebreak on `printedFaceName` A to Z (`browse.ts:950`). Add a `sortCards` test that reverses and asserts the null tail is unmoved, and a `window.test.ts` case that `firstWindowIds` for `sort=price` matches the browser.
- `parseBrowseParams` reads `SORT_KEYS`, so `?sort=price&dir=` works once `SORT_KEYS` appends it; `DEFAULT_SORT_DIRECTION.price = "desc"` makes `dir=desc` absent.
- **F1 (read failed).** `price` absent on every card, order falls to A to Z; the single line under Showing needs a flag on the wire, not inferred from absence (silence is also the normal state for an unnamed printing).
- Trigger width: `Sort: Price · Highest first` ties `Sort: Rarity · Mythic first` by character count; measure it against the 518px budget at build.

## Copy
US English throughout. No select/unselect strings arise. No em dashes in the copy file. `ManaPool` (spoken, `copy/price.ts:74`) against `Mana Pool` (`collection-browse.ts:40`): both ship today; to `/copy-review`. `Prices didn't load, so this is A–Z.` uses an en dash, as the shipped `A–Z`.

## Questions for Hugh (product phrasing)
1. A card whose copies are in different printings shows `$27.00 max`. Is `max` the right word for a reader, or would "top copy" or "from"-style read better? (Placeholder; `/copy-review` can resolve it.)
2. On the 3-up phone tile the rarity drops while the price shows, which reverses your 2026-09-23 ruling that the phone tile shows rarity. Design drew it that way to keep one line; do you accept losing rarity on that one sort?

## Build notes
Commit the design table to `docs/superpowers/design-tables/collection-price.md` (done in this PR). Mutation-test the null-last comparator and the finish column (a foil copy must not draw the non-foil figure).
