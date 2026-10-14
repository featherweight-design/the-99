# Readiness: evidence benchmarks addendum (R4)

## Read on `main` (2026-10-10)
- `docs/superpowers/design-briefs/2026-10-10-evidence-benchmarks.md`, revised with Dependencies.
- `src/components/decks/receipt-modal.tsx`: `ModalChrome`, `ReceiptTile` and `ComboBody`.
- `src/components/decks/findings-block.tsx`: the opener and the zero rule.
- `src/components/ui/row-shell.ts` and `src/components/ui/cost-pips.tsx`: `ROW_SHELL`, `CostTrack` and `CostPips`.
- `src/components/decks/decklist-row.tsx`: the row padding and heights. Searched for these; not read in full.
- `src/lib/copy/about.ts`: the entry ids and chapters.

## Ready
- **Block:** at 1300 and 390 for all ten fixtures in the brief, plus the thin states.
- **Ledgers:** one per graded benchmark, plus three dependency ledgers (graveyard, artifacts, combat light). The other three dependency rows use the same body (STATES §D).
- **Opening and tooltip:** the in-context opening flow at both widths (§2), and the Dependencies tooltip (§2t).
- **About entry:** frame and copy (4a).
- **Docs:** STATES, the placeholder copy file, and the README design calls.

## Owed by engineering
1. **E1:** `layout="rows"` on the block, for the About specimen.
2. **Tooltip:** a 44px hit area on the 390 tooltip ring.
3. **Constants:** the plan's cut points: the grade steps, the dependency light and heavy cuts, and the tiny-list floor.
4. **Graveyard lands:** the scope call (README open 1).
5. **Copy review:** every string goes to `/copy-review`.

## Not drawn, by design
- **Card modal stacked over a ledger:** it's identical to the receipt's (`STATES-analysis-tab.md` §D).
- **The other three dependency ledgers:** enchantments, creatures and activated abilities. Their groups are listed in STATES §D.
