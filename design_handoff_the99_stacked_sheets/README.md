# The 99 — Stacked sheets on the phone (design handoff, R1)

Canvas: `The 99 - Stacked Sheets.dc.html`. Frame: `StackFrame.dc.html` (prop `f`; modes `card`, `today`, `list`; `crop` for the back-control strips).
Also in this package: `STATES-stacked-sheets.md`, `READINESS.md`, `stacked-sheets · copy strings.ts` (placeholders, owed to `/copy-review`) and `brand/`.
Repo path: `design/design_handoff_the99_stacked_sheets/`.

Read with it: `design_handoff_the99_card_carousel/` (R2 phone: teaser/full, grabber, swipe model), `design_handoff_the99_verdict_addendum/HANDOFF.md` ruling 1,
`design_handoff_the99_analysis_tab/STATES-analysis-tab.md` §D, `design_handoff_the99_swap_tools/addendum_staples_door_stacking/` §3,
`design_handoff_the99_pull_source/`. Read at `main`: `src/components/cards/card-modal.tsx` (`STACKED_SHEET`, `PHONE_TOP`, `cramped`, `backLabel`, `footer`, `covered`), `card-detail-provider.tsx` (stacked/covered mounts).

**One line:** *on the phone a card replaces the sheet it came from; the ✕ becomes a pill that names that sheet.*

**Scope: below `md` only.** Desktop stacking (side by side, `← {sheet}` pill) is unchanged.

## Why

Hugh, 2026-10-04: the stacked UI shrinks the card. Card width is `min(320, (H − 85 − teaser) × 0.7159)`, and H is the dialog's height, so every offset comes straight out of the card. At 390×812:

| Path | Dialog top | Teaser | Card |
|---|---|---|---|
| Unstacked | 0 | 280 | **320** × 447 |
| Receipt → card (today) | 96 | 280 | 251 × 351 |
| Card → stand-ins → stand-in (today) | 140 | 280 + 84 Take | 160 × 224 |
| Any stacked card (R1) | 0 | 280 | **320** × 447 |

## The calls

| # | Open item | Called |
|---|---|---|
| 1 | Replace vs stack | **Replace.** A card sheet opened from a sheet starts at 0, the same geometry as any card. The sheet underneath stays mounted, `inert`, with its scroll kept, and isn't drawn behind (opacity 0 once the card settles). No peek. **This supersedes verdict addendum ruling 1's phone drawing** (the 96 offset and the step down to `--surface-sunken`), but not its rule: the card still stacks, the receipt still doesn't close, and two dismissals still give two landings. |
| 2 | Where the way back lives | **In the ✕'s slot, top-right at y 22–54.** The desktop's back pill already sits there, and the phone's ✕ already went back one layer (`Back to {sheet}`). The counter keeps its left plate. There's no second ✕ beside it: one control, one layer. |
| 3 | What it says | `← {sheet}`, the sheet's short name (copy file). Not the sheet's heading: `Core, two things would have to go` runs past the slot. Max width 266 with the counter, 354 without, then an ellipsis. The accessible name is the full `Back to {sheet}`. |
| 4 | Paging in a stacked card | **Yes, unchanged.** It pages its own list (carousel call 9). Teaser/full, the grabber, the 10px / 1.5× lock and the 16px system edges are all as shipped. Paging is still withheld in full. The plates don't move with the band. |
| 5 | Escape / Back | **One press, one layer.** Escape and hardware Back: full → teaser → the sheet underneath. **The pill skips the teaser rung**: it names a place, so it goes there. Focus lands on the opener inside the sheet (the tile, candidate, row or name). |
| 6 | Transitions | Open: the card rises 812 → 0 over 240ms `cubic-bezier(.2,.7,.2,1)` (the sheet-snap curve), while the sheet underneath fades to 0 onto its scrim. Back: the card drops in 200ms and the sheet fades back. **Never sideways**, because sideways is paging. Reduced motion: a swap, with drags still tracking the finger. |
| 7 | List sheets | **Keep the shipped geometry.** Stand-ins rise from 52 over a card. **The card no longer drops to 52 beneath it** (`PHONE_TOP[52]` retires for the card). It stays at full size under the 72% scrim. The sheet's ✕ becomes `← {card}`, in the sheet's own head. |
| 8 | Three deep | **Allowed on one path only, as shipped:** page · card · stand-ins · stand-in. Each card layer is full size now, so depth no longer costs the card. Nothing in a stacked card opens a further layer: no door, no Find a deck, and the combo partner replaces (`onSelectCard`). |
| 9 | Take on a stacked stand-in | The 84px footer was half of T2's shrink. **Take shares the teaser's 44px foot row** with All details (1 : 1.35), and `in place of {card}` takes one of the oracle's three lines. The teaser stays 280. In full, Take pins to the sheet's foot. The footer's `3 of 4` goes, because the counter already says it. |

## What changes from shipped (phone only)

- `STACKED_SHEET` (96) and `PHONE_TOP` 96 / 140 retire for **card** sheets. A stacked card draws as unstacked.
- `PHONE_TOP[52]` no longer moves a card that a sheet opens over.
- The phone's stacked ✕ becomes the `← {backLabel}` pill. Today it's `md:` only, so it now draws at both widths.
- The `footer` render prop's phone layout moves into the teaser's foot row. `teaserHeight` no longer adds `footerHeight` on the phone.
- The sheet underneath a card gets `opacity: 0` after the open transition, plus `inert` and `aria-hidden`. It stays mounted.
- The `cramped` guard stays. At 390 it never trips for a stacked card any more, but it still protects short screens exactly as it does an unstacked card.

## Engineering

1. **Back label source.** The `backLabel` prop is already plumbed through the provider. Each opener passes its short name (copy file). The Pull it list is a new opener: its head's card name becomes a `CardDetailTrigger`.
2. **History.** Each layer keeps its own history entry, as shipped, so hardware Back pops one.
3. **Focus.** On open, focus goes to the pill (the ✕ took it before). On back, focus goes to the opener inside the sheet, which was kept mounted for this.
4. **Live region.** No new announcement. The card's arrival is the provider's, as shipped. The underlying sheet is `aria-hidden` while covered, so the reader isn't offered two dialogs.
5. **Two card modals at once** (card → stand-ins → stand-in): the `covered` one keeps `card-modal-title-held`, as shipped.

## Ledger

1. **The pill's contrast** sits on the art wash at 55% `--bg`, the counter's plate. The same measurement as the counter applies; check it in build across the six themes.
2. **`What would have to go` on the pill vs `← {target}` on desktop** (Analysis tab §D). The phone uses the sheet's name because the bracket name alone (`← Core`) reads as a place in the climb. **Flag for Hugh:** desktop could follow, but it's out of scope here.
3. **`Which deck to pull from`** is new. The sheet's title (`Pull {card} from`) reads as an unfinished sentence on a pill, and `Pull it` reads as an action. It's owed to `/copy-review`.
4. **About:** not drawn. This is a refinement of how card details open, so no version bump.
