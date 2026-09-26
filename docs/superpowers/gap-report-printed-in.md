# Gap report — Printed in ▾ on the commander lanes

design-review for PR 2 of `docs/superpowers/plans/2026-09-27-printed-in.md`, against filter-chassis
decision 9 and the chassis rules it lands in (`README.md`, `STATES-filter-chassis.md`, the copy
strings' `printedIn` block, and `docs/superpowers/readiness-filter-chassis.md`, whose errata win).

Enumerate and verify ran as one agent over 21 rows. It returned 6 gaps. Three are fixed, and three
follow the shipped `/collection` `Set ▾` precedent on purpose.

## Fixed

1. **Owned-lane order.** STATES:75 reads `search · colour · printed-in · score-against`. The rack drew
   Printed in after Build from. It now sits before it in the rack (`filter-rack.tsx`), the chip line
   (`chip-line.tsx`; chips follow dimension order, STATES §3) and the sheet (`filter-sheet.tsx`).
   `printed-in-control.test.tsx` pins the sheet's order and the chip order.
2. **Sheet order rule 4.** Build from draws its explainer as a hint line, so it now goes last in
   the sheet. Printed in's hint lives in its own layer's head, not on its sheet row. This is the
   same move as 1.
3. **Panel rows 44px** (STATES §4; audit §2: "the target is 44"). `desktopRowMinPx={44}`, the
   value every other chassis panel passes.
4. **Set code on the phone list.** The wide panel drew the code after each set's name and the phone
   layer did not. `SetListOption` and `SheetChip` gain an optional `hint`, drawn in mono after the
   label. Because the panel is shared, `/collection`'s phone Set list gains its codes too, which
   the Set panel's own ruling ("rows carry the set abbreviation") already asks for.

## Kept, following the shipped Set precedent

5. **The trigger counts rather than naming the value** (decision 6 asks for `Printed in · <value>`).
   `FilterPanel` names a single selection by the option's LABEL, which here is the set's full
   name, and the reason `/collection`'s `Set ▾` counts applies unchanged: set names are long and
   varied, and a named trigger pushes every control after it along the row. The chip line carries
   the codes.
6. **Width 340px, not 280** (decision 4). The audit calls the width a call-site argument. Set
   passes 340 because it lists the same kind of row: a long set name, a code and a count.
7. **The phone layer is a second dialog over an inert sheet.** The audit deferred this to
   `/collection` and asked for "a nested-list mode on the panel rather than a second dialog".
   `/collection` shipped the second dialog, with the sheet made `inert` and focus handed back to
   the row. This PR reuses that shipped component rather than building a second answer. The
   sheet's own Escape handler is kept from closing both layers by stopping the layer's keys
   (`printed-in-control.test.tsx` pins it, and a mutation dropping the stop fails it).

## Confirmed matching

Mounted on both lanes; one control at both widths; a 34px trigger (`desktopTriggerHeightPx`,
because the panel's own padding draws about 38); anchored panel; searchable, and the search matches
name and code; the hint once, in the panel head; per-row counts from the other controls, a 0-count
set dimmed and untickable unless chosen; footer count and Clear; one chip using one / many /
manyShort; counted once by the badge; Clear all leaves the order alone; the compact form a 44px
row opening a second layer, and never a chip group in the sheet.

VERDICT: 0 open gaps (4 fixed, 3 kept with reasons).
