# Readiness — deck page messages

**Verdict: Green.** Approved by Hugh 2026-10-22. Nothing below blocks the build; the open items have a drawn default.

## For Hugh

1. **Ran out (A8's plate) gains a press**, `Consider`, so the row is not a dead end. Today the plate has none. If it
   should stay a statement, the row draws no press and cannot be the next step's filled press.
2. **Commit and Discard leave the card** for Review (one press per row). Review already has both. If one press is too
   far, Commit can return as a second outlined press on the pending row only.
3. **About entry.** This reworks shipped surfaces rather than adding a feature; Hugh decides whether it owes an entry
   or is an ordinary edit to the deck page's entry.

## For engineering

1. **One card, one owner.** The card replaces `RollupBands`, `PendingBanner` CARD, `LastSlotsStrip`,
   `ExhaustedLine`, `FillFailedBanner`, `UnresolvedBanner`, `GuidedBanner` and the spines' A3/A4 lines as
   containers; their copy and actions move into rows. The precedence is one pure function with a test per pair.
2. **The pass sheet renders `DecklistRow`**, All view, inside the deck page's providers; add
   `docs/superpowers/inventories/pass-sheet.json` with `shares.module: DecklistRow` so `pnpm check:shared` holds it.
   Card detail stacks through `registerSheet` with the pass's label.
3. **Receipts on the visit** (R1 G1): strip `?from=precon`, `?imported=1`, `?updated=` after the first read; check
   nothing else reads them later (History links, the review page).
4. **A11's ✕ on the account:** new `user_prefs` field, append-only, per deck and precon; purge covers it with the row.
5. **M3** registers once, on the over row's press (today both spines register it).
6. **Accessible names:** each short press label carries the full shipped string as its name (table in README).
7. `--danger` mark ink on its tint and `--avail-over-fg` titles: run the contrast gate in all six themes.

## For copy-review

The card's head (`Before {deck} is …`, `{n} to do`), `Next step`, the short verbs (`Choose`, `Shopping`, `Review`,
`Cuts`, `Look`, `Try again`, `Consider`), the rows' shortened bodies, `{n} lines unresolved`, the ran-out title, the
shorter precon receipt, the pass sheet's title (`{n} cards`), and the R1 items still open (unresolved's "either tab
below", the guided banner and `mixSourceLine` into `src/lib/copy`).

## Fixtures

Thopter Works (Sai), Big Stompy (Ghalta) and Quandrix Lab (Zimone, so the opened card is a real card image) stand in
for Hugh's decks. Prices, counts and draft names are invented.
