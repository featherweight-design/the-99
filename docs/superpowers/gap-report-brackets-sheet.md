# Gap report: all-brackets sheet

Checked against `docs/superpowers/design-tables/brackets-sheet.md` in two passes: verify, then confirm.

**Verify found 8 visual gaps and 0 state gaps.** 3 were in this branch's code. The other 5 are in shared or pre-existing code.

## Fixed

1. `all-brackets-sheet.tsx`, the lead paragraph. It had no `text-wrap: pretty`; it now has `text-pretty`.
2. `all-brackets-sheet.tsx`, a note's reading. It had no `text-wrap: pretty`; it now has `text-pretty`.
3. `all-brackets-sheet.tsx`, a note's quote. It had no `text-wrap: pretty`; it now has `text-pretty`.

To confirm these three, `grep -c text-pretty` reads 3, one on each element named above.

## Not changed: the gap is between the table and shipped shared code

The table calls `ModalChrome` "unchanged, no new props", and the sheet uses it exactly that way. The chrome's values are the shared component's, so they are also what the receipt, the path sheet and the synopsis sheet draw. The same header padding appears in `analysis-tab-sheets.md` and `synopsis-overview.md`. Changing it on this branch would restyle every sheet on the tab from a PR about one of them.

4. `receipt-modal.tsx`, the sheet shadow. The table says none on the phone and `0 24px 60px rgba(0,0,0,.45)` on desktop. The code draws `var(--modal-shadow)` at both widths.
5. `receipt-modal.tsx`, the phone header's padding. The table says `0 6px 0 16px`. The code draws `0 16px`, and the close button's `-mr-[10px]` puts the button 6px from the edge anyway.
6. `receipt-modal.tsx`, the title's line-height. The table says 1.2. The code uses `leading-tight`, which is 1.25.

Two more are climb lines that were already on `main`, which the table marks as "unchanged":

7. `bracket-climb.tsx`, the yours rung's horizontal padding on the phone: 11px, where the table says 12px.
8. `bracket-climb.tsx`, the `N allowed` label on desktop: 10px, where the table says 9.5px.

All five are logged in the board's `found` collection, as a question for the shared chrome rather than for this sheet.
