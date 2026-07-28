# Gap report — printing identity through upload (plan phases 4 + 5)

design-review skill, verify pass against `docs/superpowers/design-tables/collection.md` and
`2026-07-20-issue-inspector.md`. Two additive UI changes were in scope.

**VERDICT: 0 visual gaps.** Mobile and desktop both checked.

## 1. `review-screen.tsx` — "N token and emblem rows skipped"

Desktop tally row matches its two sibling rows and the table row-for-row: `flex items-center
gap-[10px]`, 9×9 `rounded-full flex-none` dot, `font-mono text-[16px]` count, `text-[13px]`
`var(--fg-muted)` label.

Mobile: the three original `MiniStat`s keep `flex gap-[8px]` and `mt-[14px]` inside a new
`flex-col` wrapper, so they render exactly as before; `MiniStat` itself is untouched.

Not in the table, resolved against the nearest implementation sibling rather than invented:

- Count/dot in `var(--fg-faint)`. §Tally Count Colors names only unmatched (`#E0913C`) and parse
  errors (`#C6533F`). The panel's own §Skipped Rows Footnote is `#8E8269` = `--fg-faint`, so a
  skipped-by-design tally reads in the panel's existing de-emphasis colour.
- The 8px vertical gap between the stat row and the new line reuses the block's inter-cell gap.
- The 11px footnote matches the mini-stat label it sits under. Note the table's §Mini Stat Label
  is 10.5px — the shipped 11px is a pre-existing #33 deviation, not introduced here, and the new
  line follows the implementation so the two labels stay consistent.

## 2. `card-modal.tsx` — Set value becomes `printingCaption(card)`

No CSS changed; the only risk is overflow from the longer string (`"C21 · 263 +1 more"`).
§Meta Value sets no `white-space`, `overflow`, `text-overflow` or width bound, and neither
`MetaCell` nor `MetaField` adds one, so there is no clipping rule to break. At 360px the cell is
~160px and the caption ~110px at 13px — one line, and longer captions wrap with both `1fr` grid
cells growing together. Every join in the caption contains a space, so there is no unbreakable
token. Desktop's four fields total ~440px inside a 760px row: no wrap. §Copy already gives the
Set value as `Return to Ravnica · RTR`, longer than the new caption.
