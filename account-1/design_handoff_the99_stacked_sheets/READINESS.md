# Stacked sheets on the phone — readiness (R1)

**Status: awaiting Hugh's review.** Phone only (below `md`); desktop stacking unchanged.

| Part | Readiness | Note |
|---|---|---|
| Card over a sheet goes full screen | **Ready** | Drop `STACKED_SHEET` (96) and `PHONE_TOP` 96 / 140 for card sheets. A stacked card uses the unstacked geometry, so its card is 320 at 390×812. |
| Sheet underneath | **Ready** | Stays mounted with its scroll kept. While covered it is `inert`, `aria-hidden` and at opacity 0. |
| Back pill on the phone | **Ready, small change** | `backLabel` is already plumbed. The pill drops its `md:`-only class and replaces the phone ✕ in the same slot. Width cap 266 with the counter, 354 without. Hit target 44 tall. |
| Back labels per opener | **Needs openers** | Each opener passes its short name (copy file). Pull it is a new opener: the card name in its head becomes a `CardDetailTrigger`. |
| Escape / Back / pill | **Ready** | Escape and Back: full → teaser → pop. The pill pops from any state. Each layer keeps its own history entry. |
| Focus | **Ready** | On open, focus goes to the pill. On pop, it goes to the opener inside the sheet. |
| List sheet over a card | **Ready** | Stand-ins still rise from 52. The card underneath no longer moves to `PHONE_TOP[52]`. The sheet's ✕ becomes `← {card}`. |
| Take in the teaser | **Ready, layout change** | The `footer` phone layout moves into the teaser's foot row, and `teaserHeight` no longer adds `footerHeight` on the phone. In the full state, Take pins to the foot. |
| Motion | **Ready** | Open: the card rises over 240ms `cubic-bezier(.2,.7,.2,1)` and the sheet beneath fades out. Pop: 200ms. Never sideways. Reduced motion: swap. |
| Copy | **To /copy-review** | `stacked-sheets · copy strings.ts`. `Which deck to pull from` is new. |

## Gap report

1. **Rulings reopened:** the verdict addendum's ruling 1 phone drawing (the 96 offset and the step down to `--surface-sunken`). Its rule stands: the card stacks, the receipt doesn't close, two dismissals give two landings.
2. **The swap tools addendum §3's phone offsets** (52 / 96 / 140) are superseded for card layers. The list sheet keeps 52.
3. **Desktop label mismatch:** the phone's `← What would have to go` vs desktop's `← {target}`. Flagged for Hugh, not changed.
4. **Pill contrast** on the art wash: measure it in build across all six themes, as for the counter plate.
5. **`cramped` guard** stays as is. At 390 it no longer trips for a stacked card.

## What a green looks like

- At 390×812, a card opened from the receipt, from What would have to go, from stand-ins or from the Pull it list measures 320 × 447 at y 64. The teaser top is 532.
- The top-right control reads `← {sheet}`, and its accessible name is `Back to {sheet}`. No ✕ is drawn beside it.
- A horizontal drag on the band pages the stacked card's own list. The pill and the counter stay fixed.
- From full: Escape goes to the teaser, then to the sheet. The pill goes straight to the sheet. Focus lands on the opener.
- Stand-ins over a card: the card stays at full size under the scrim. Opening a stand-in gives a 320 card with Take in the teaser's foot row.
- Hardware Back pops exactly one layer every time.
- Reduced motion: no rise and no fade. Drags still track the finger.
- Desktop is unchanged.
