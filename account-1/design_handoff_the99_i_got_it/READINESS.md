# Readiness — I got it R2

**Approved to ship (Hugh, 2026-10-09, LGTM).** Every surface and state in the brief's §A–§E is drawn at 390 and at desktop width. The About entry is on its artboard (`about-entry/`). Ruled in review:
- the buy tag is the control, and no element is added to the row
- the two-item key: a row on desktop, a two-column grid on the phone
- the normal modal on desktop
- `Bought this card?` as the title
- no price or own-count lines in the confirm
- larger printing tiles
- `buy` over `over $X` in the phone stack

## Open, build-time rulings (README "Open")
1. **The fallback printing.** The brief and the approved 1+2 handoff disagree about whether Add cards has a default printing. This handoff follows the 1+2 handoff: there's no default, so the player has to pick.
2. **The source deck left out of the undo warning.** It needs a parameter on the §E check.

## Flagged
3. **Changes to shipped surfaces:** the ⇄ key copy is shortened, and the phone stack order is flipped. Both are in `decklist-row.tsx` / the Shopping head, and the copy goes through `/copy-review`.
4. **The printing behind the price** isn't on the price fact today (brief §What exists). Engineering has to expose it so the confirm can choose the preset. It isn't drawn.
5. **The toast's 8s for the claimed sentence (open 3).**
6. **The cap of 20 (open 4)** is a judgement.
7. **About: two switches, one key** (About addendum, open 1).
8. **The claimed toast names one deck.** With several older decks short, the plural form counts them (`claimedMany`), and the card modal's allocation receipt names them all.

## Not read
- `src/lib/collection/write.ts` and the write-path plan. The brief describes `planEdit` / `staleEdits` well enough for the UI.
- `price-query.ts` internals. The preset rule is taken from the brief.
