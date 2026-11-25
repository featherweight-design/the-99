# States

Art: `art/qf-<p|d>-r2-<state>.webp` (phone 390 at 2x, desktop 1300 at 1.5x).

| # | State | Art | What shows |
|---|---|---|---|
| 1 | Full collection | `full` | All seven chips with counts (illustrative counts for about 1,200 cards). |
| 2 | Zero chips hidden | `sparse` | The 17-card sample: four chips. Extra turns, Mass land denial and Foil are not drawn. |
| 3 | Other filters on | `active` | Blue + Instant: live counts, three chips, a hairline, then the active chips. |
| 4 | Combos, own both | `combo-both` | Two-card combos pressed. Pairs, toggle on You own both, a NEW pair, Find a deck. |
| 5 | Combos, own one | `combo-one` | Toggle on You own one. Dashed missing slot, price or draft, Add to wishlist. |

Not drawn (follow the nearest pattern): every count 0 (today's "No filters on"); combos view empty for one side of the
toggle (one line in `--fg-muted`, see `copy strings.ts`); combos view loading (the list's existing loading state).
