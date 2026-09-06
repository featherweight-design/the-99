# Gap report — price on the buy tag (#288)

Verified 2026-09-06 against `docs/superpowers/design-tables/price-on-the-buy-tag.md`, at mobile
(320/390px) and desktop, across the buy tag on rows and tiles, the price strip under the Shopping
filter, and the card-art scrim.

**Verdict: 0 visual gaps, 0 state-reachability gaps.**

## Coverage

Every row of the property table was checked against the implementation: §1 the tag (13 shared
properties, four states, the 58px slot, four accessible-name rows), §2 the strip (placement,
condition, plate, both arrangements, both lines), §3 the scrim, §4 the sort rename, §5 the export
copy, §6 the copy rules.

All four tag states are reachable end to end — the type carries the field, the query computes and
threads it, and a component branch renders it. `soldOut` is the one that is easy to make vacuous:
the price query deliberately does **not** filter to live rows, so a stale row survives to reach
`priceState` and trip the liveness comparison.

## Responsive-split duplication

None. The strip is one subtree reordered by `md:flex-row-reverse`, not two width-branched copies,
and a test asserts each fact renders exactly once. The tag renders one span at both widths. The
only `md:hidden` / `hidden md:inline` pair on these paths is the pre-existing EDHREC figure, whose
wording genuinely differs by width.

## Findings resolved during the pass

Three observations were raised. None was a table mismatch; all three are settled.

1. **Foil-only tile lost its qualifier when spoken.** The tag drew `$2.10 foil` but said
   "$2.10 at ManaPool", quoting a foil price as if it were the card's. The qualifier now travels
   into the spoken figure, with a test.
2. **Empty Shopping list shows no strip.** Kept. The design does not draw this case, and a
   provenance line above "Nothing to buy" would date a list with nothing in it. Recorded as row
   2.5a of the property table so a later reviewer does not read it as a gap.
3. **Stale comment in `src/lib/decks/suggest.ts`** still said "cheapest first" after the §4 sort
   rename. Corrected.

## Copy

No copy-content findings. Wording is `/copy-review`'s, not this gate's. The `absent` state
deliberately has no copy key — silence is the state.
