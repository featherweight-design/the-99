# Readiness Review · Precon upgrade result, store label

**Verdict:** 🟢 Green
**Audited:** 2026-11-23, self-assessed by account 1 against PR #3231 head 8b61d05
**Related:** store choice (`design_handoff_the99_store_choice/`), PR #3231 (`run.ts` reprice), `price-strip.tsx`

## Data contract
- 🟡 **G1 · Which store priced the panel.** `UpgradePanel` gains `priceStore: Store | null`: the reader's store when
  `repricedAdds` returned figures, null when it returned null (switch off, no adds, or the read failed). The line draws from
  this, never from the preference alone, so stored figures are never labelled with the reader's store.
- ✅ `run.pricesAsOf` (#3231) is the line's date. `toBuy` already counts unpriced adds and sums 0 for them.
- 🟡 **G2 · Priced count.** The line needs the count of adds to buy with a figure: `toBuy.priced` beside `cards` and
  `cents` in `panelFor`, so the client does no counting.

## Codebase fit
- ✅ One small component (`UpgradePriceLine`, scratch-gen) under the facts in `result-view.tsx`; shipped copy only;
  no new tokens. The To buy fact hides its figure when `toBuy.priced` is 0 and a store priced the panel.
- ✅ The landing demo (`demo`) draws no line: its figures are the fixture's, from no reader's store.

## Cross-cutting
- ✅ Plain text, read in order after the facts. The tags' spoken names already come from `BuyTag`.

## Non-blocking questions
- None. Q1 and Q2 settled as drawn (README).
