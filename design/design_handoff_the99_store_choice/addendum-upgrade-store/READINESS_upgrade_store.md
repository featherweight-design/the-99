# Readiness audit · Precon upgrade result, store label (engineering)

**Verdict:** 🟡 Yellow. Every gap is eng-side; none returns to Design.
**Audited:** 2026-11-23 by the orchestrator, against the merged handoff (#3246). This is the decisions record the build follows. The design-side self-assessment stays in `READINESS.md` beside it.

## Decisions

- **G1 · Which store priced the panel.** Add `priceStore: Store | null` to `UpgradePanel` (`src/lib/precons/upgrade/run.ts`, type near line 67, set in `panelFor` near line 365). It is non-null only when `repricedAdds` returned figures. The line reads this field, never the reader's preference. A read failure, or the switch off, draws the stored figures and no line.
- **G2 · Priced count.** Add `toBuy.priced` (the count of adds to buy with `addCents > 0`) in `panelFor`, so the client counts nothing. Zero means unpriced.
- **G3 · TCGplayer with some adds unpriced.** The string is composed from the pieces the copy file already draws, in the order of `copy strings.ts`. It gets a test; it does not go back to Design.
- **G4 · Scratch-gen is reference only.** `scratch-gen/proposal.diff` and `upgrade-price-line.tsx` are never imported. Replace `globalThis.__STORE` and `globalThis.__NOW` with `panel.priceStore` and a server-built `provenanceForm` result. Do not copy the `CardSearchContext` or `HelpContext` exports. No `-mt-[8px]` hack: use flex spacing. The `STORE_INFO` lookup is client-safe; `useStoreInfo` does not apply, because the result view sits outside `StoreProvider`.
- **G5 · Contrast.** Measure `--fg-locked` on `--surface-sunken` before the build (the 9.5px strip pattern). A signal the owner cannot read is not a signal.
- **G6 · Landing demo.** The `demo` prop on `ResultView` draws no line (`priceStore` is null): its figures are the fixture's, from no reader's store.
- **G7 · Copy review owed.** Every string already ships: `storeCopy.provenance`, `provenanceUnpriced`, `marketNote`, `priceCopy.strip.pricedClause`, `lastChecked`, `behind` in `src/lib/copy/store.ts` and `price.ts`. The pass checks wording in place; it writes none.
- **G8 · Probe.** At 390 and 1300: the two-column phone facts, and the one-line wrap.

## Settled

- An unpriced add keeps its bare buy tag.
- The $12 cap is not marked after a switch.
- The To buy figure drops when `toBuy.priced` is 0 and a store priced the panel.
- The cart stays Mana Pool only. The line names the reader's store, never the cart's.

## Build shape

About 6 to 8 files, one PR, low risk (a read-only panel field, no database). Claude review, design-review table with no red X, feature-acceptance contact sheet at 390 and 1300, a probe that presses and fails on main, and the pre-open pass.
