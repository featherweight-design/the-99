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

Confirm pass: 1 to 4 and 6 checked on the contact sheet (rows o2, v2, o6) at both widths. 5 (O5) is
confirmed by `open-precon-view.test.tsx` only: the sheet's account holds a collection. O4 (an unmapped
card) has no row because no precon on any branch has one today; its sentence is tested.

## PR 4: starting a deck from a precon

Verify pass against "Component: StartPreconDialog", "Change: arrival strip (`?from=precon`)" and
the start rows of the open precon, with S1 to S2c: 3 visual gaps, 1 state gap, all in the arrival
strip. The start button, the phone dock and the dialog matched on every row, and S1 to S1e were
reachable.

| # | Gap | Resolution |
|---|---|---|
| 1 | The strip drew one sentence per width; the table asks for a head (13.5 / 600), a body (12.5 / 1.55) and a meta line (mono 10.5) | Fixed. `ArrivalBand` takes three `lines`, drawn at both widths; `PreconArrivalBand` fills them. The shell and lifetime stay as G12 resolved them. |
| 2 | The body had no owned or to-buy figure | Fixed. `readPreconArrival` counts the precon's distinct non-basic cards and how many the reader owns, as the list counts them; every card not owned is in the deck's Shopping. |
| 3 | No meta line with the printings clause | Fixed. `arrival.meta(set)`. |
| 4 | S2b (`bodyAll`) unreachable | Fixed. Owning every card draws `bodyAll`, with no Shopping clause. |

Confirm pass: the figures were checked against the scratch database (74 of 85 on Eldrazi Unbound,
the same as its open page), and both bodies are tested and mutation-checked.

The card a precon holds that Commander bans (Dockside Extortionist in Mystic Intellect, Trade
Secrets in Political Puppets) is named in the dialog and kept. The deck's own notices read the same
column (`cards.commander_legal`, `notices/rules-violations.ts`), so the two cannot disagree.

## Follow-up, logged 2026-10-12

- **Card details on an open precon show the precon's printing only when the reader holds it** (PR 3,
  gap 6). The provider's `open` already takes an `atPrinting` that views one printing without picking
  it (the set grid uses it), so the row's trigger can pass the precon's printing as `atPrinting` rather
  than relying on held picks. Not built in PR 3 or PR 4.

## PR 5: the ways in, and the About entry

Verify pass against "R2 change: /decks head on a phone", "Change: /decks head" and "Component:
PreconDoor", with P1 to P4 and N1 to N4, and the About entry's structure: 2 visual gaps, 1 state gap.
The door, the phone cells and the About entry matched.

| # | Gap | Resolution |
|---|---|---|
| 1 | The cart cell's chevron 18 at 390; the table says 16 | Fixed, on the paired cell. |
| 2 | The head row's top padding 16 at 900; the table says 0 | Fixed, with the precons line on. |
| 3 | P4: with the precons switch off, the cart line dropped to a half cell at 900 and took the short phone form | Fixed. `CartEntry` takes `paired`; unpaired, the cart's own row draws exactly as it shipped. |

The MTGJSON credit is the entry's fourth key line with its notice verbatim: the About page has no
credits block for it to join (R1/R2 finding 5).

Confirm pass: rows p1, n1 and ab on the contact sheet at both widths, and the P1/P4 head row in
`decks-view.test.tsx`.
