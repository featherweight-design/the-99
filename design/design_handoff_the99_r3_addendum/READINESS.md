# READINESS — R3 addendum

Audited 2026-10-21 against `origin/main` at 5c6a88ebb. A verdict per item. "Build" items are Green: drawn, no open
question, and the delta from the tree is named.

| # | Verdict | Tree today | Action |
|---|---|---|---|
| 1 | Green, shipped | `pack-offers.tsx` carries `aria-label={c.pack.buyAria(...)}`; button reads `Buy pack` | none |
| 2 | Green, shipped | `.offer-numeral` (#2017) | none |
| 3 | Green, shipped | `balance.tsx`: `added && cell.value > added` | none |
| 4 | Green | `SupportLink` draws `--accent` (page) / `--accent-hover` (raised) and `support-link-contrast.test.ts` holds 4.5 on both grounds. The board draws `--fg` underlined in `--accent` | **Build**: match the board |
| 5 | Green, shipped | pill is the press in the sheet | none |
| 6 | Green, shipped | `chip-rule.ts` / `credit-chip.tsx` cover the cases | none |
| 7 | Green, shipped | clock clause arrives on hydration | none |
| 8 | Green, shipped | chip count in `--fg`; `credit-chip-contrast.test.ts` | none |
| 9 | Green, shipped | #2066 | none |
| 10 | Green | `Get more credits →` sits in the 390 dock | **Build** |
| 11 | Green, no change | confirmation only | none |
| 12 | Green | no one-shot full-sheet open from the deferred landing | **Build** |
| 13 | Green, shipped | R3·2 | none |
| 14 | Green, shipped | `first-run-tour.tsx` docks at 86 open / 100 locked | none |

## Errata for the next design round

- Credits-Balance §4 labels the band's `--accent` link "shipped" at 4.25:1 (Oil Haze) and 4.46:1 (First Frost). The tree
  already draws bands in `--accent-hover` (`ground="raised"`), which `support-link-contrast.test.ts` measures at 4.5 or
  better. The `--fg` + accent underline redraw stands as the ruling; the "shipped" figure is stale.
