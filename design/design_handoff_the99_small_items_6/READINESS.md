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

## Audit against the rebased tree (2026-10-30)

Audited on `origin/main` at the rebase point; every claim below was read in code. **Verdict stays Green:** no item needs a Design round. Two notes widen item scope for engineering.

- **1 Backup line.** `plans.backups` is requested by the prompt and held in `response-schema.ts`, but `stages.ts` (lines 151, 174) reads only `plans.primary`; backups are never stored, so the build must persist them into the stored content (type, validator, stub) before the card has anything to draw. Plumbing, not design. Stage labels sit in `synopsis-stages.tsx:122` (`md:absolute`), so the mask classes apply as the erratum says.
- **2 Additional notes.** Confirmed: `labelRow` exists in `tuning-notes-field.tsx`. No build.
- **3 About errata.** `about-pages.ts:929` holds the shipped *Came back empty-handed* row; the switch name matches the code.
- **4 Critical chip.** The tier already exists (`WEAKNESS_TIERS`, `TIER_WORD`, ordered critical first in `validate-v8.ts`), but `splitSeverity` (`stages-view.ts:49`) and `WeaknessLine` know only Moderate and Minor, so a Critical line draws no chip today. Widen the regex, the return type and the chip classes; sorting needs no change.
- **5 Tag box.** `[data-lock-hide]{visibility:hidden}` (`globals.css:1683`) hides only the key, as (e) says.
- **6 / 6b What's new.** `loadHomeFeed` returns the offer whenever `on` is empty (`home.ts:337`), as the README states; `neverChose` exists in `prefs.ts`. `Quiet` and `DismissButton` are in `whats-new.tsx`.

No copy conflicts found beyond the drafts already listed for `/copy-review`; no undrawn surfaces.
