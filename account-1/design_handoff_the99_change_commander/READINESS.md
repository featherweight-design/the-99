# Readiness — change commander R3 (approved 2026-09-25)

## Settled in review

- Door: **R3-E**, one joined plate on the art. The action row is unchanged.
- Mana value: `CostPips` + `(n less/more than {commander})`, on the row and in the confirm. Not a sort.
- Card details: the existing `CardModal`, `stacked`, `backLabel="Change commander"`.
- Errors: the list failure uses the Analysis 2c composition; the swap failure line sits below the buttons.
- Pending banner: both shipped densities, with one commander entry each.

## For Hugh (still open, drawn as proposed)

1. **A mixed pair sorts in To buy**, even above a Yours row's figure. A held half stays in Yours.
2. **`free` is drawn as a word** on owned rows, per ruling 4. Everywhere else the free state draws nothing.
3. **No search**: 8 at a time in To buy.
4. **Known bias** (§6): a heavily indexed commander reaches higher figures.

## For engineering

1. **The joined plate** wraps `FullCardTrigger`'s button and the new door in one plate: desktop bottom-left,
   26 tall, hairline `--border-strong` divider; phone bottom-right, 26 wide × 53, **bottom inset 23** so each
   half keeps a 44px target. It renders without a crop (⛶ half absent). Icon: an inline SVG path, `currentColor`, centred.
2. `ModalChrome` at 700 (exists). New body `change-commander-sheet.tsx`. It registers as the sheet under
   `CardModal` exactly as `ReceiptModal` does; siblings are the list in drawn order.
3. **`changeCount` counts a commander change as one**; `hasChanges` is true on a swap alone. In counts mode the
   banner adds `banner.replaces` above `moneyLine`; in inline mode it's a `NameLine` variant (⇄).
4. **A trade is three entries**: the commander change plus two `deck_cards` rows, with command-zone hints in
   place of `removeHint` / `bucketWord`.
5. **Back in the pool**: an old commander that leaves releases its copy on commit (`releasedCopies`).
6. **Candidate availability** is read with this deck excluded. A candidate in the 99 bypasses the read.
7. **`DECK_MIX_KEY`** (`changes/page.tsx`) assumes commanders never change; the swap must drop that entry.
8. Mana value: `CostPips` size 13, uncapped, no track; a pair draws two runs joined by `+` and sums them.
9. Show more: focus the first new row. Confirm pair names use `shortName`; the pair's price is the sum of the halves to buy.

## For copy-review

`Change pair`, the figure (`are in its/their decks`), the counted note, `manaValueRel`, the none heads, the
three confirm sentences, the brew line, `trades places`, `banner.replaces`. All in `change-commander - copy strings.ts`.

## Fixtures

Figures, prices, held decks and candidate lists are invented. The pairs are real legal partner pairings in the
Thrasios + Tymna identity; the Naya singles and their costs are real.
