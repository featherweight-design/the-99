# Gap report: Commander precons

Design review (enumerate, verify, confirm) per PR, against `docs/superpowers/design-tables/precons.md`
(Design's R2 table, committed with the build errata) and `STATES-precons.md`.

## PR 2: the list, `/decks/precons`

Verify pass: 3 visual gaps, 1 state gap. Every other row in "Route: /decks/precons" and
"Component: PreconRow" matched at 390 and 900, and L1, L1n, L1o, L1f, L2, L3, L4 and R1 to R6 were
reachable.

| # | Gap | Resolution |
|---|---|---|
| 1 | `ColourPips` drawn at 22, the table says 30 (390) and 26 (900) | Kept at the shipped `ColourPips` size. The component has no 30 or 26 form, and `/decks` draws the same 22; a new pip size for one route would make two surfaces disagree. |
| 2 | Sort trigger 44 at 900, the table says 36 | Partly. `OrderMenu` (the deck sort menu, generalised) takes `wideFrom="md"`, so from `md` the trigger draws its labelled form, as the table asks. Its height is the shipped 32, matching `/decks`' labelled trigger, not the table's 36: one sort control drawn at two heights across sibling routes would be the larger drift. |
| 3 | Commander thumb 44 × 62, the table says 34 × 48 | Fixed. `CommanderThumb` gains a `list` size, 34 × 48. |
| 4 | L5 (loading skeleton) not reachable | Not built as drawn. `route-loading.test.ts` admits no new `loading.tsx`; the route's pending state is the `/decks` overlay (`pending-routes.ts`), which every list route under `/decks` shares. |

Confirm pass: gaps 2 and 3 checked on the contact sheet (`docs/superpowers/inventories/precons.json`)
at both widths.

## PR 3: an open precon, `/decks/precons/[fileName]`

Verify pass against "Route: /decks/precons/[fileName]", "Change: DecklistRow `readOnly`" and
"Component: BasicsLine", with O1 to O6 and V1, V2: 4 visual gaps, 2 state gaps.

| # | Gap | Resolution |
|---|---|---|
| 1 | Commander thumbs 44 × 62 at both widths; the table says 46 × 64 (390) and 56 × 78 (900) | Fixed. `CommanderThumb` gains `open` and `openWide`; the header draws one below `md` and the other from `md`, because the box is inline. |
| 2 | 32 / 40 between groups; the table says 16 / 20 | Fixed. The groups' own bottom margin is the spacing; the container's gap is gone. |
| 3 | The basics line 24 to 28 below the Lands rows; the table says 4 | Fixed. `DecklistGroup` takes a `footer`, drawn under its rows inside its own spacing. |
| 4 | Lands' figure left the basics out; O2 reads them in | Fixed. `footerCount` adds the basics line's copies to the group's figure without making them rows. |
| 5 | O5: no empty-collection band above the own box | Fixed. `EmptyCollectionBand`, shared with the list's L2. |
| 6 | O6: card details open on the reader's copy, not the precon's printing, and offer the printing picker | Partly. The page passes the precon's printings as `deckPrintingPicks` with no deck, so the picker is gone and a precon printing the reader holds opens as that printing. One they do not hold still opens on their own copy: the modal draws held printings only (`resolvedPrinting`), and drawing an unheld one is a change to the shared card details, not to this page. |

Also from the pre-open pass: the back link named the list when the list had been opened from New
deck (`open.backNew` was never drawn). Fixed.

Confirm pass: 1 to 6 checked on the contact sheet (rows o2, v2, o6) at both widths.
