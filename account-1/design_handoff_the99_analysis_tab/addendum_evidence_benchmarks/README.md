# Analysis tab addendum: evidence benchmarks (2026-10-10, priority 4c) · R2, Dependencies

This amends `../` and the two later addenda, and replaces neither. It follows
`docs/superpowers/design-briefs/2026-10-10-evidence-benchmarks.md`, including "Dependencies: one benchmark, a row per dependency". The "What eng locks" section isn't reopened.

R2 replaces R1's graveyard-only slot:
- **Dependencies is general:** six rows, each Heavy or Light, each with its hate.
- **Labels are gone from every surface:** there's no unlabeled line, group or state.

Files:
- **Canvas:** `Evidence Benchmarks Addendum.dc.html`.
- **Child DCs:**
  - `Analysis Tab 1300` / `390`: states `bGishath`, `bElves`, `bSultai`, `bCounter`, `bScrappy`, `bThorin`, `bSoldiers`, `bWizards`, `bStale`, `bEmpty`.
  - `Benchmarks Block`: `deck`, `phone`, `stale`.
  - `Benchmark Ledger`: `deck`, `bench`, `dep`, `phone`.
- **Data:** `benchmark-fixtures.js`. Rows per deck are the brief's draft-cut results. Grade cut points and card lists are illustrative.
- **States:** `STATES-evidence-benchmarks.md`. **Copy:** `evidence-benchmarks · copy strings.ts`. Every string is a PLACEHOLDER.

## Design calls (What Design owns)

1. **Placement:** last in the tab, under *What is in this deck*, full width at both widths.
   - Verdict, climb and findings stay together as the bracket story, so nothing reads as a bracket input.
   - *Recommended mix* sits above the tabs, under the commander art, as shipped. The frames draw it there.
2. **A grade:** a step word over a five-segment meter in one hue, `--fact` blue (h 250), with each segment more saturated (`STEP_INK`).
   - There's no success or warning colour.
   - One figure line under the meter gives what decided the grade.
   - The headline is never a count.
3. **A dependency row:** its own full-width box under the grades, on `--surface-sunken`, headed *Dependencies*. Its meaning sits in an **i tooltip** beside the name (the stats InfoTip ring). There's no chip and no sub-line (R3).
   - **Each row has:** a **Heavy / Light tag first** (a fixed 50px width, so the names align), then the name, the deciding figure, *Broken by* with the fixed hate list, and the ledger link. The tag is a word, not a meter, so nothing is shared with the grades.
   - **Order:** heavy first, then the brief's row order.
   - There's no total and no row count.
4. **The ledger:** `ModalChrome` at 760, unchanged. It opens from the findings' own opener, which is each tile's or row's only control.
   - **The body is a list of rows.** A ledger line carries the card, why it counts and what it adds, and a receipt tile has room for a name only.
   - Every name is a `CardDetailTrigger`. Win speed reuses `ReceiptTile` plates.
   - Dependency ledgers drop the scale and show *Broken by* in the summary.
5. **States:**
   - **No combo:** the meter is dropped and the tile becomes a dashed panel, the same treatment as no dependencies. It keeps the full height of a graded tile at both widths (the 390 row no longer collapses), and *No combo line* is stated in plain sans.
   - **No dependencies:** a dashed panel that says it isn't protection and lists the six things checked, so an empty list can't read as a clean bill of health.
   - **Combat Heavy:** no ledger link, because no card wins outside combat.
   - **Tiny list:** grades wait below a floor.
   - **All lowest:** drawn as is.
6. **Links to Stats:** yes, from the ledger summary only. Velocity links to Curve, and flow and interaction link to Jobs. Velocity's ledger also shows the commander's `expectedCastTurn`.
7. **About entry:** drawn (4a) in chapter 03, after `deck-analysis`. It ships in the evidence-line bump with the Overview tap-through. The block gets no About link until then.

## R3 (Hugh's review)
- **Tag position:** Heavy/Light sits left of the row name, and left of the ledger title.
- **Ledger opening:** canvas §2 shows the ledger opening in context at both widths: the opener, then the sheet over the tab, then a name opening the card.
- **Tooltip:** the *Risks, not scores* chip is removed, and the sub-line moves into the tooltip (§2t).
- **No combo at 390:** a dashed panel inside the row, at least 104px tall, so the row matches its graded neighbours.

## R4 (ready): ledger lines are the app's card row
- Every ledger line uses the shared card row (`ui/row-shell.ts` `ROW_SHELL`, with `DecklistRow`'s padding):
  - a 7px radius, `--surface-rail` ground, `--elevated-hover` on hover, gap 9/10, 34px tall (52px with the meta line at 390);
  - then the availability marker, the name, the view tag (the *why*), `CostTrack` (72px), and the points.
- **Only the tag and the points are this view's.** Costs are drawn from `mana_cost` via `CostPips`; the canvas fetches them live from Scryfall.
- **Hover** is the shipped `HoverPreview`. The ledger mounts inside `HoverPreviewProvider`, as the builder does.
- **Press:** each row is a `CardDetailTrigger` with the ledger's rows as siblings, so Prev/Next walks the ledger.
- **Exception:** win speed's combo plates stay `ReceiptTile`.

## For engineering
- **Tooltip:** reuse the Deck stats InfoTip. At 390 the 18px ring needs a 44px hit area (a `::before` band).
- **E1:** add a `layout="rows"` prop on the block, so the About specimen can mount the phone layout in the 760 column.
- **Stale banner note:** the 1300 banner stacks its line over its credit note, left-aligned, with the button at the right. That's the method notice's form, and it replaces the shipped right-aligned note.
- **Ledger link:** the link switches to Deck stats and closes the sheet. Stats then scrolls to the named card.
- **Floor:** the tiny-list floor (60 drawn here) is a plan constant.
- **Artifacts ledger:** lists each card once, under its first group: payoffs, then with abilities, then other.

## Open
1. **Graveyard lands:** the brief leaves open whether lands that use the graveyard count. The ledger note names them while they're left out.
2. **Stand-in commanders:** the brief doesn't name the commanders for Elves (Lathril), Soldiers (Myrel) or Wizards (Inalla). Counter Intelligence uses Inspirit, the precon's face commander.
3. **Copy review:** every string, including the hate lists, which are fixed in code.
