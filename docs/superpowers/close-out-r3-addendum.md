# Close-out: R3 addendum (buying credits and discovery onboarding)

Handoff: `design/design_handoff_the99_r3_addendum/` (#2123). Verdicts per item are in its `READINESS.md`: eleven items
confirm what shipped, three were Design's calls and are built. No Orange or Red item, so no Design prompt owed.

| Item | PR | What shipped |
|---|---|---|
| 4 support link | #2124 | `SupportLink` words in `--fg`, underline in `--accent`, one ink on every ground (the `ground` prop is gone). `support-link-contrast.test.ts` measures `--fg` on `--surface-raised`, `--surface` and `--bg` in every theme. |
| 10 390 dock | #2126 | `Get more credits →` leaves the phone dock and sits under the `Anything else?` box's caption. `CreditsText` now builds on `splitGetMore` and `GetMoreLink`. Desktop unchanged. |
| 12 landing opens full | #2127 | A deferred landing posts a one-shot ask (`askFull`) on the targets provider; the phone's next card with a Fits door opens at the full sheet and spends it (`takeFull`). Withdrawn when the door draws or the landing ends; a carried minimized sheet does not block it. |

## Browser walk

`pnpm probe:r3-addendum` (`scripts/probe-r3-addendum.ts`), a per-run Clerk dev-instance user on `local-dev` with 60 spent
`model_calls`, three owned cards and one deck, all deleted in a `finally` (`0 rows left`). The headless account is not touched.
Served from a worktree on `next dev` with `PAYMENTS_ENABLED`, `HELP_ME_CHOOSE_ENABLED` and `SWAP_TOOLS_ENABLED` on. 0 FAIL.

| Case | 390 | 1300 |
|---|---|---|
| Support link, Refunds line | colour `rgb(237, 230, 216)` = `--fg`; underline `rgb(207, 135, 69)` = `--accent` | same |
| Help me choose dock, spent with payments on | dock 92px (was 138), 0 `Get more credits` links in it; the link is 44px tall, 11px under the caption, left edge 18px = the field's; Sets field 612-656 clears the dock top at 678 | two links in the DOM, one displayed, on the press's row (link top 665.8, press 650.9-694.9); the phone-only copy is not displayed |
| Find a deck landing | first card opens `data-sheet="full"`; door at 20,575 (147x44) inside the 390x844 viewport; halo held 2322ms; the second card opens `teaser` with 0 haloed | door visible at 593,708; halo held 2338ms; snap stays `teaser`; second card no halo |

The slow-return band's link was not walked separately: it is the same component, and its contrast is held by the test above.

## Acceptance notes

- Item 10 and 12 each passed a component test first, and a mutation check per fix; the walk above is the proof the placement shipped.
- `purgeAccount` fails on `local-dev` (`rule_zero_tables` missing there), so the probe deletes by walking every table with a `user_id` column.
- Item 12 round 1 found that a carried minimized sheet kept the eligible card at `min`; fixed in the same PR and covered.
- No About entry: cosmetic and placement changes to surfaces an existing entry covers.
