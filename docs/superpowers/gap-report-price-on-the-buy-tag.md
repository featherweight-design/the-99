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

## Browser pass — 2026-09-06

`scripts/probe-price-ui.mjs`, driven at 320×700, 390×844 and 1280×900 against the local-dev
branch, whose `printing_prices` table holds 96,194 rows from a real ingest.

- **The strip renders once at every width.** One provenance line, never two. Plate measured as
  9px radius, 1px `--border`, sunken background.
- **The two arrangements are real, and they differ in paint rather than in DOM.** Phone reports
  `flex-direction: column` with the figure painted above the provenance; desktop reports
  `row-reverse` + `space-between` with the *painted* order reversed — provenance left, figure
  right — while the DOM order stays figure-then-provenance at both widths. That is exactly the
  single-subtree claim, measured rather than asserted.
- **Tails reach the screen.** `buy · $14.58`, `buy · $29.28`, `buy · $0.15`, `buy · $5.46`, and a
  bare `buy` for a card the feed has never carried, all in one list. The strip totalled
  `$61.25 · 7 of 9 priced` against a `Shopping 9` pill — the denominator and the pill agree.
- **No horizontal overflow at 320px**, including a row whose card name is 56 characters
  (`Tamiyo, Inquisitive Student // Tamiyo, Seasoned Scholar`).
- Row tags measure 100px at phone widths and 102px at desktop — the 58px figure slot holding a
  column of unequal figures to one right edge.

**Two states the local data cannot reach**, held by unit tests instead:

- `soldOut` needs a row whose `as_of` is behind the newest. One ingest run has ever executed
  locally, so every row is live.
- The **tile** variant, and with it the 92% scrim composited over real art. Tiles live on the
  Consider tab, which on a fixture deck this size renders the fill panel rather than a tile grid.
  The scrim's contrast is computed per theme in spec §7 and its markup is covered at both variants
  in `buy-tag.test.tsx`.
