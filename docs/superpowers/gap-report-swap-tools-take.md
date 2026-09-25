# Gap report: swap tools, PR 4b (Take, the receipt, Undo swap, the stacked stand-in)

Design review ran against `docs/superpowers/design-tables/swap-tools-take.md` (222 property rows,
19 states), enumerated from `design/design_handoff_the99_swap_tools/` with README R2, audit H2, F3,
F4, F8, F10, F11 and F13 applied.

## Deferred to PR 4c, pending a Design ruling

- **The card modal's door** (`See cheaper stand-ins →`, §6). R2 draws it under a buy tag in the
  content column, and R3's Card Details has no buy tag there, so where it sits is undrawn.
- **The sheet opened over the card modal** (§7.1). This includes what a stand-in opened from there
  stacks over.
- **The key line** (§9). Its copy promises that a card's stand-ins are "also in its details", which
  only the door makes true.

## Decided by engineering, each from a ruling

- **The stacked card keeps the shipped CardModal geometry** (824, 322, 180) and its shipped desktop
  Prev/Next. The Take footer takes the Mana Pool link's place in that row, and is pinned at the
  phone's bottom (F3(c)).
- **The phone footer reads `inPlaceOf(cut, deck)`**, never `inPlaceOfShort`, because the phone
  cannot page (F8) and a position with no way to move is a promise.
- **The refused body names its cause only for `cutGone`** (F11). Every other refusal uses the new
  key `refused.bodyPlain`. A thrown take renders `sheet.takeFailed` as MutationError.
- **A receipt lives for the visit.** The swap is stored and Undo swap reads it by id; the receipt
  is the page's note, and a reload shows the deck as it stands.
- **A receipt takes its cut's slot in name order under the name sort, and the section's last slot
  under price or mana.** The cut's own figure has gone with its row.
- **A receipt is filed by the list's own sectioning rules** (`receiptHome`). It goes to the cut's type
  group under `By type`. Under `By role` it goes to the pinned spoken-for group when the cut was spoken
  for, else its targeted role, else `Other`. When the take emptied that section, the receipt heads a
  section of the same name, one per name. An open sheet or a standing receipt holds off the empty
  Shopping state, which would otherwise take Undo swap away.
- **The stand-in's name opens its card; the thumb does not.** §7.2 allows either. One trigger per row
  keeps a single tab stop, and the name is the control the dotted rule marks.
- **The one-copy-fewer receipt draws at both widths.** The canvas calls it unreachable; a basic, or
  a card held in several copies, reaches it.
- **The hover preview on a stand-in is not attached.** The sheet mounts outside the list's
  `HoverPreviewProvider`, and a preview over a modal needs its own stacking decision.

## Verify: 6 visual gaps, 1 state gap

Fixed in this PR, and confirmed by the confirm pass:

- The quiet skin's phone form (radius 8, `0 14px`, 13px) on the taken row's Undo swap, and on the
  refused panel's Close.
- The one-copy-fewer receipt shares its row's grid cell, under it. It had been a separate cell,
  so on desktop it sat beside its row.
- A receipt under the name sort takes its name-order slot.
- The head plate's name opens the original's card.
- **Found by the verify pass, outside the table:** a card stacked over the sheet that is not a
  stand-in (the original, or any card after a take) drew neither Take nor the Mana Pool link. The
  footer is now passed only when the sheet has one for that card.

Not a gap for this PR:

- **The Shopping grid** is `1fr 1fr` with a 4/20 gap, where the canvas has `minmax(0,1fr)` with
  6/10. That grid shipped in #249 and every row sits in it; changing it is not this feature's.
  The 768px overflow it causes is logged in `found` as `swap-decklist-768-overflow`.

## Proof

`probe:swap-sheet` presses through all of it at 390 and 1300 against a built deck:
- a stand-in's card opens stacked with its footer, and desktop pages the sheet's list;
- Take lands the taken row and puts away the other Takes, and the draft holds the add and not the
  cut, each checked by name;
- the receipt draws in the section the cut sat in, and Undo swap brings the row back;
- a take refused after the cut left the draft names its cause, and Take stays live.

Two mutations fail it: the footer suppressed, and the receipt never added.
