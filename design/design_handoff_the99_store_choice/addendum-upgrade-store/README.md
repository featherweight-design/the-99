# Precon upgrade result · store label (addendum to store choice)

Account 1, 2026-11-23. Status: **approved by Hugh 2026-11-23** (Q1 and Q2 as drawn). Canvas (Design type):
https://claude.ai/artifact/SikA6Pt4gfjpTH4Wd7BML1 (Main, Stores, Adds, Empty).

Upgrade this precon now prices each add at the reader's own store (PR #3231, `src/lib/precons/upgrade/run.ts`). The
result's To buy figure and its buy tags did not say which store, nor that TCGplayer's figures are market averages.

Frames are the shipped `ResultView` rendered from the #3231 branch on the landing demo's Prismari Artistry run (six adds made
unowned so there is something to buy). Store figures are placeholders (TCGplayer about 9% under Mana Pool, Card Kingdom about
18% over). Card art is absent from the demo fixture, so thumbnails draw their dashed placeholder.

## Calls

1. **One line under the four facts names the store** (Stores R1 to R6). The deck Shopping strip's provenance line, word for
   word, in its mono 9.5 `--fg-locked`, 3px in from the facts' edge and 8px under them: `storeCopy.provenance(store)` ·
   `priceCopy.strip.lastChecked(when)` (· `behind` past ten days). It qualifies the To buy figure and every add's buy tag,
   so tags stay bare figures (store choice call 3). The date is `run.pricesAsOf`, the repriced read's newest price, not the
   run's day, which the header keeps.
2. **TCGplayer's note** after the store, only beside a figure: `TCGplayer market prices · averages of recent sales, so a
   listing can differ · last checked …`. Rows carry none.
3. **An add with no price at the reader's store** (Adds E2; Empty E1 to E6). The row keeps the shipped bare `buy` (the
   silence state; `upgradeLines` already sets `price: null` and `addMarkOf` draws it). To buy counts it, its figure leaves
   it out, and the line counts it out: `… · 5 of 6 priced · …` (`priceCopy.strip.pricedClause`). None priced: To buy draws
   the count and no figure (never `$0.00`), and the line reads `no prices from {store} for these · last checked …`.
4. **Switch off, or a failed price read:** no line; the stored figures draw as today. On a failed read `repricedAdds`
   returns null and the panel draws the figures stored at the store the run was pressed at, so the line must go too: it
   follows the reprice, not the preference.
5. **The cart stays Mana Pool's.** The result has no cart link. The line names the reader's store, never the cart's, so a
   TCGplayer or Card Kingdom reader never sees Mana Pool here. A deck started from the run opens on its Shopping list,
   which already draws Buy these at Mana Pool for a Mana Pool reader and Copy the list plus the store's paste page for
   everyone else (store choice call 6).
6. **Nothing to buy** (every add owned): To buy 0, no line.

Phone and desktop are one layout: the line sits under the facts at both widths (2 columns at 390, 4 at 1300).

## Settled with Hugh (2026-11-23)

- **Q1 · An unpriced add's tag:** a bare `buy`, the shipped silence state, so the card still reads as one to buy.
- **Q2 · The $12 cap after a switch:** the figure draws as it is, with no mark.

## Files

| File | What |
|---|---|
| `Main.dc.html` | Calls, the state table, Q1 and Q2 |
| `Stores.dc.html` | 1, 2 · the price area per store at 390 and 1300 |
| `Adds.dc.html` | 1, 3 · the adds' tags per store, and an unpriced add |
| `Empty.dc.html` | 3, 4 · one and none priced, and the switch off |
| `STATES.md`, `copy strings.ts`, `READINESS.md` | |
| `scratch-gen/` | `upgrade-price-line.tsx` (the proposal), `proposal.diff`, the renderer. Reference only; never import. |
