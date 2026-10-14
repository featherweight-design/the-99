# The 99 — Mana Pool link-out (#330) · handoff package

`design/design_handoff_the99_linkout/` · repackaged 2026-09-06

**Current round: R4 — 🟡 Yellow, two facts to confirm, no design carried.** Open
`The 99 - Decks · Shopping Strip Link-Out (R4).dc.html` and read `LINKOUT-R4-READINESS.md` first.

**R4 amends where the deck-level link lives, not what it looks like:** the buy action moves onto the
Shopping filter surface as the price strip's last line — Export keeps its link, retargeted to the
same list. **R3 remains the spec** for the primitive, the export footer and the card modal. R1 and
R2 are the record, not specs — five of their claims are superseded, ledgered in R3's item 6.

Self-contained: each canvas opens directly in a browser against the `support.js` in this folder.

## What ships

**One primitive, `<StoreLink>`**, placed twice under one structural rule — *the link-out lives in
its container's pinned bottom row, below the hairline that row already has.* It is the app's first
outbound link (`grep -r 'target="_blank"' src/` → zero hits), so it is drawn as a convention rather
than as two one-offs. **It adds no dividers to this app:** both rules it sits under are shipped.

| | |
|---|---|
| Export dialog · Shopping tab | `Buy these at Mana Pool ↗` → `/add-deck?deck=<base64>`. Second footer row, **left-aligned**, quieter than `Copy shopping list` and `.txt`. Both louder weights drawn and rejected (canvas item 2). |
| Shared card modal | `Buy any printing at Mana Pool ↗` → `/cards?q=<name>`, keyed by the **oracle card**, never the printing on screen. Desktop: the leading edge of the shipped `‹ Prev · N of M · Next ›` row, nav keeping the trailing edge. Mobile: its own row below the meta grid. **One state** — every card, owned or not, priced or not, all three routes identical. |
| States | Rest `--accent-hover` · hover `--fg` · active `--fg` with the underline 1px→2px · focus `outline: 2px solid var(--accent); outline-offset: 2px` · **`:visited` identical to rest**. `--accent` is *not* the rest ink: it fails AA at 14px on phyrexia (4.3) and kaldheim (4.5). |
| Metrics | 14px / `line-height: 1.45` / `letter-spacing: 0` / `display: inline` / no padding, no box. **The 44px target is on the row**, below `md:`. |
| Never renders | Empty Shopping list (absent, not disabled — the hairline goes too) · the buy tag (*a link-out goes only where its focus ring fits*) · the Decklist tab (rejected, not deferred, no slot held). |

## Files

| File | What it is |
|---|---|
| `The 99 - Decks · Shopping Strip Link-Out (R4).dc.html` | **The current canvas.** The strip with the action: three placements with two rejected, both widths in place, the four price variants, the four states on the strip's own ground, the basket ledger. |
| `LINKOUT-R4-README.md` / `LINKOUT-R4-READINESS.md` | R4's decisions and its verdict. |
| `shopping-strip-linkout · copy strings.ts` | R4's contract: one new provenance string, one new call site for `linkOut.deck`, the shared `href` and the `shoppingList` definition. |
| `The 99 - Decks · Mana Pool Link-Out (R3).dc.html` | **The primitive's canvas.** Primitive + five states, three weights with two rejected, the desktop modal with its pinned row, the 390px sheets, the empty state, the six-theme ink ledger, the corrections ledger. |
| `LINKOUT-R3-README.md` | The R3 decisions and their reasons. |
| `LINKOUT-R3-READINESS.md` | **The verdict** and the three open non-blocking items. |
| `manapool-linkout · copy strings.ts` | The eng contract: three strings, both URLs, the `<a>` shape, the `rel` note. R1/R2's stale labels are recorded there. |
| R2's canvas + its two docs | The record. Superseded on desktop placement, mobile alignment, and two token values. |
| `brand/The 99 - Brand Sheet.dc.html` | Type, ink and spacing the canvases resolve against. |
| `PARITY-lightbox-to-modal.md` | From `design_handoff_the99_full_card/` — the card modal's anatomy. |

## Two things to read before implementing

1. **Relayed, not read.** `docs/superpowers/specs/2026-09-05-manapool-checkout-design.md` and
   `src/components/cards/card-modal.tsx` are not in this project. Every shipped fact R3 corrects
   against — the pinned nav row and its rule, the two-button footer, the 590px sheet, the `md:`
   split, both URLs — came through review. **Check the drawings against the files once**; the nav
   row's padding is matched to the shipped footer's rather than measured.
2. **One decision is deliberately left to eng:** the link precedes Prev/Next in DOM order, matching
   its leading position. **If the shipped nav is focus-trapped first for keyboard deck-walking,
   keep the nav first and leave the visual order alone.**

## Depends on, and does not modify

The shipped Decks handoff and the price addendum's R1–R3 in `design_handoff_the99_decks/`. This
package **modifies nothing shipped**: the export dialog's tabs, list, both local buttons,
`export.pricingNote`, the est. total row and the info callout are byte-identical, as is every
element of the card modal — including the pinned nav row and all `useDialogA11y` behaviour. The buy
tag, the price strip and the 92% scrim are inherited and not reopened.
