# Gap report: Admin R3 PII masking, PR 4 (the exact-email lookup)

Design: `design/design_handoff_the99_admin/` R3, rulings D10 to D13; STATES rows A3, A4, A5, A7 and A8; board
`R3/AdminR3.dc.html` scenes `hit`, `miss` and `searchFailed` at 900 and 390.

Implementation: `src/components/admin/accounts-list.tsx` (the field, its line, hit, miss and failure),
`src/components/admin/show-button.tsx` (`FailedToast`, shared with the failed Show), `src/lib/admin/lookup.ts`,
`src/app/admin/accounts/actions.ts` (`lookUpAccount`), `src/lib/copy/admin.ts` (`adminMaskCopy.accounts`).

## Agent 2 (verify)

Pass 2, state reachability: 0 gaps. A7 filters masked names as you type; A8 leaves the list whole with
`Press Enter to look up this exact email.`; Enter looks up once; a hit narrows to its one masked row with Show (A3);
a miss draws no rows and no column head (A4); a failure keeps the field, the line and the whole list and raises the
toast with Try again (A5).

Pass 1, visual: 3 gaps, all **fixed**:

1. The field's padding: the board draws `0 6px 0 12px`; it was 12px both sides. Now `pl-[12px] pr-[6px]`.
2. The field's inner gap: the board draws 9px; the shared `SearchField` draws 10px. Overridden to `gap-[9px]` here.
3. The pinned bar's rhythm: the board spaces the sub, the field, the line and the card 12px apart. It was 14/18 above
   the field and 10 between field and line. Now 12px throughout, at both widths.

Kept, not counted: the field holds its accent border while it holds an `@` (focused or not), as the board's `hit`,
`miss` and `searchFailed` scenes all draw it; the shared focus ring is the app's one field focus (Hugh, 2026-10-12).

## Agent 3 (confirm)

Items 1 to 3: FIXED. 0 gaps remain.
