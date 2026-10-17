# Gap report — Friends on Home (Social R3 addendum)

Design: `design/design_handoff_the99_social_r3/addendum-friends-home`. Property table:
`docs/superpowers/design-tables/social-r3-friends-home.md` (183 rows, 18 states). Contact sheet:
`docs/superpowers/inventories/social-r3-friends-home.json`, at 390 and 1300.

## Verify pass: 4 visual gaps, 1 state gap, all fixed

1. Phone placement, margin-top: design 6px (18px from the All commanders line) → was none. Now `mt-[6px]`.
2. The count in the head: design a span at `.08em` inside the `.14em` label → was one string. Now
   `socialCopy.home.head` plus a span holding `headCount(n)`. The heading's accessible name is still `Friends · N`.
3. and the state gap (Commitments absent, G7): desktop margin-top 0 when the section leads the column → was 4px
   always. Now `min-[1180px]:mt-0` without Commitments and `min-[1180px]:mt-[4px]` under it. Pinned in `dashboard.test.tsx`
   and mutation-checked.
4. The section's base color: design `--fg-body` → was inherited `--fg`. Now set on the section.

## Notes acted on

- The seat sizes, the name width and the Add a friend button switched at `sm:` (640px), while the rest of the
  section switched at 1180. Between those widths it mixed the two specs. Every switch is now `min-[1180px]:`,
  the breakpoint the design draws.
- The open-link line's time left is the soonest-expiring link, sorted by expiry rather than taken as the first row.

## Confirm

All five rechecked against the code after the fixes: 0 remain. Copy wording went through `/copy-review` before
the build. `check:copy-drift`, `check:tokens` and `check:border-collision` pass.
