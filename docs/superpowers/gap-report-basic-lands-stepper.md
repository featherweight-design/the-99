# Gap report: basic lands stepper (PR 2)

2026-10-14. The design-review pass (verify, then confirm) against
`design/design_handoff_the99_basic_lands_stepper/design-tables/basic-lands-stepper.md` (R2), README §R2 changes and
`STATES-stepper.md` §A. README's R1 component notes and S6's "box border" are superseded by R2 (READINESS item 1).

## Verify: 2 visual gaps, 1 state gap, 1 minor

| # | Gap | Fix | Confirmed |
|---|---|---|---|
| 1 | Desktop row grew to about 36px: the count field was 22px tall in a 20px content box | `md:h-[20px]` on the field (`count-stepper.tsx`) | Fixed |
| 2 | Desktop focus lifted only the focused glyph; the tile's ✕ at 1 never lifted (S7: "focus lifts glyphs as hover does") | `md:group-focus-within:` lift on both glyphs and the tile's ✕ | Fixed |
| 3 | S5: a ✕ pressed inside the 600ms settle still sent the burst's save, which could land after the removal (leaving a copy) or return a stale refusal under the undo row | `takeOver()` cancels the burst; the ✕ then removes by an absolute `setBasicQuantity(…, 0)` | Fixed, pinned by `basic-stepper.test.tsx` and mutation-checked |
| 4 | The row's ✕ at 1 read its label off `card.quantity`, not the stepper's count | Reads `basic.count` on a stepper row | Fixed |

All other rows matched: phone 44×44 buttons, 15px `--fg-faint` glyphs, 24px 16px-mono field (112px in all); desktop
22×20 buttons in `--border-dashed` lifting to `--fg-body`, 24px 12px field (68px), 7px row padding kept; the tile band at
44/32px on a 70% `--bg` scrim with no border; `from N` mono 11px `--fg-faint` after the name and `--accent` in the tile
caption; the 2px `--accent` button ring and field underline; `MutationError` under the row and tile; hidden on non-basic,
commander and read-only rows and in Lock cards mode. States S1 to S10 are reachable.

## Deviations, approved

- A typed 0, or a figure above 99, restores the saved count (README call 2 drew a typed 0 as a removal). The receipt's
  Undo restores one copy, so a typed 0 on a stack would remove it with no way back; removal stays the ✕ at 1. d9 as
  Hugh's proxy, 2026-10-14.
- The tile band's field is 32px wide; the table names no width for it.
