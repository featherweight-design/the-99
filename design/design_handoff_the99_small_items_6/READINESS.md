# Readiness: small items 6

**Verdict: Green.** Approved by Hugh on 2026-10-30 at R1d ("Please open a PR"), the recommended call on every item. Nothing below blocks the build, and the items are independent. Item 2 needs no build.

## For Hugh

1. **Copy.** New or changed strings for `/copy-review`:
   - *Backup* (the Game plan stage label)
   - *Ask for two and you get three to add and three to cut; pick two of each.* (About, Good to know)
   - *Came back short or empty*, *Short by your price cap* (About credits rows, v2 on)
   - *Nothing will show here. Every kind of news is off.* (What's new)
2. **About.** Item 3 is the About change itself; nothing else adds a feature a reader looks up.

## For engineering, by item

1. **Backup line.** Backup card under Close, above the precon Alternate commander box, only when `plans.backups[0]`; prompt names backup combo cards under Backup. Stage labels mask the timeline line (`bg-[var(--surface-raised)] pr-[8px] relative z-[1]`), including the shipped Early/Mid/Close labels.
2. **Additional notes.** Confirmed as shipped. No change.
3. **About v2 errata.** Pick card as one 250 column of compact rows; credits rows per switch (`!SUGGESTED_CHANGES_V2_ENABLED` keeps *Came back empty-handed*); Try it line per switch.
4. **Critical chip.** New severity, ink `#E07A65`, danger edge 60%, sorted first.
5. **Tag box states.** `TaggedBox` (a)–(f) per README; (e) keeps today's key-only hide.
6. **Every kind off.** `loadHomeFeed` gates the offer on `neverChose`; `Quiet` with no kind on draws the off line; head gets *Choose what shows ›*.
6b. **Offer line.** `Offer`'s closed form: words left, `DismissButton` top right, Pick ▾ bottom right; box as tall as the words. Applies under rows, under the quiet line and alone.

## Errata

- `design_handoff_the99_announcements/ERRATUM-offer-corners.md`: the offer line's Pick ▾ and ✕ move to the bottom and top right corners.
- `design_handoff_the99_overview_stages/ERRATUM-label-mask.md`: the Game plan timeline line stops at each stage label.
