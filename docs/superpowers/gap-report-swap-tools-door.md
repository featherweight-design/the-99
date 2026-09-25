# Gap report: swap tools, PR 4c (the card modal's door, card → sheet → card, the key line)

Design review ran against `docs/superpowers/design-tables/swap-tools-door.md` (64 property rows, 13 states),
enumerated from `design/design_handoff_the99_swap_tools/addendum_staples_door_stacking/` with the audit's
F16, F17, F20 and F22 applied. The staple read (F18, F19, H4) is PR 6, not this one.

## Decided by engineering, each from a ruling

- **The card under the sheet is the same card, not a copy.** The provider holds it in the slot and key it
  was open under while a sheet registered `overCard` is up, so its scroll and expanded state are where
  the reader left them. A card opened from that sheet renders in a second slot, over both.
- **The covered card is `inert` and deaf to Escape**, rather than passing `inert` to the dialog hook. The
  hook's focus return runs on that option's change and would have sent focus to the Shopping row the
  moment the sheet opened.
- **Focus lands on the door when the sheet goes**, from the door itself: at the sheet's unmount the card
  is still `inert`, so the sheet's own focus return has nowhere to land. After a take the door has no
  control, and closing the card lands on the take's receipt, where Undo swap lives.
- **The door renders only for a card opened from a Shopping row** (F17): the row's press and its name
  trigger pass `{ door: true }`, kept across Prev/Next and dropped on close. The card view's tiles do not
  pass it; the addendum draws the door from a row.
- **Desktop steps each layer 40px down** from the card's own top (the sheet at +40, a stand-in at +80), and
  keeps the shipped 820×620 modal.

## Verify: 10 visual gaps, 2 state gaps

Fixed in this PR:

- The stand-in layer over a sheet over its card draws its own 60% scrim.
- On the phone a card opened from a Shopping row starts at 52 (F16), so the sheet over it steps down from
  there. Every other opener keeps the full-height card.
- Escape from a swapped-out card lands focus on the receipt's Undo swap, not on the page.

Not this PR's, recorded:

- **Shipped chrome the drawing redraws:** the desktop art column (322 against 320, padding), the modal box
  (824×625 and its shadow against 820×620 and `--modal-shadow`), the phone art header's close box (its label now names the sheet when stacked, as the desktop pill's does), the
  stacked card's back pill, ModalChrome's phone head padding and title size. Each predates the swap tools
  and belongs to the card modal and ModalChrome everywhere, not to this path.
- **The covered sheet's ground and shadow.** It takes the shipped stacking treatment (`--surface-sunken`,
  header at 0.55, `--modal-shadow`) that the Shopping path and the Analysis tab's receipt already use, so
  one stack looks like the other.
- **The stacked stand-in's phone footer** (4b's ruling: no position without Prev/Next, F8).

## Proof

`probe:swap-door` presses the whole path at 390, 1300 and a short 1280x720 window against a built deck, 53 checks:
- no door from All; the door over the limit in `--warning` and under it in `--fg-faint`, a 44px strip
  and target on the phone;
- the sheet over the card, the card the same node, inert, at 52 with the sheet at 96 on the phone, and
  the way back naming the card;
- a stand-in at 140 on the phone and 80px below its original on desktop (or as far as a short window
  allows), with its own 60% scrim and the Take footer, and the sheet and the stand-in both ending above
  the fold;
- Escape to the stand-in's name, then to the same card, live, with focus on the door;
- a Take, the door saying what came in with no control, Escape to the receipt with focus on its Undo
  swap, and the Undo putting the cut back in the draft.

Ten mutations fail it: the door flag off, the covered card not inert, the third depth at 96, the door's
focus call removed, the sheet not lifting the card, no scrim on the stand-in layer, the Shopping card at
full height, no focus handoff to the receipt, the sheet over the card left at 85vh, and the stand-in
always dropped a full 80px.

`stand-in-door.test.tsx` covers the door's three states, F17, a flagged card the list does not hold, the
held card handed back as the same node, and a stacked stand-in's way back named at both widths.
