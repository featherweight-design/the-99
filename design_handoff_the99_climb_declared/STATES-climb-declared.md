# The Climb under an answered range — states (addendum F, H34)

Marks: the declared rung uses the full mark at 26 (390) / 36 (1300). Every other rung uses the chip at 22 (390) and the full mark at 26 (1300), at 75% opacity (`NEIGHBOUR_OPACITY`).
Labels: 8.5px (390) / 9px (1300) mono uppercase, 0.1em. On the declared rung they are `--fg`; elsewhere `--fg-faint`. Names: 13 / 13.5 600 `--fg` on the declared rung, 12.5 600 `--fg-body` elsewhere.

## Rung roles

| Role | Fill | Border | Mark | Label | Body |
|---|---|---|---|---|---|
| **declared** (new name for `yours` on an answered range) | `color-mix(in oklab, ink 12%, var(--surface))` | 1px solid bracket ink | full 26 / 36, 100% | `declared` | the allowances; empty if the deck holds none |
| **permitted** (new) | none | 1px solid `color-mix(in oklab, ink 40%, var(--border))` | chip 22 / full 26, 75% | `permitted` | none |
| below (unchanged) | `--surface-sunken` | 1px solid `--border` | chip 22 / full 26, 75% | `To downgrade your deck` | drop sentence + `what would have to go →` |

## The four states

| State | Rung | Role | Fill | Border | Mark | Label | Body |
|---|---|---|---|---|---|---|---|
| F1 · 1/2 declared 1 | 1 Exhibition | declared | 12% `--bracket-1` | solid `--bracket-1` | full, 100% | declared | none (holds no limited rule) |
| | 2 Core | permitted | none | `--bracket-2` 40% | 75% | permitted | none |
| F2 · 1/2 declared 2 | 1 Exhibition | permitted | none | `--bracket-1` 40% | 75% | permitted | none |
| | 2 Core | declared | 12% `--bracket-2` | solid `--bracket-2` | full, 100% | declared | none (holds no limited rule) |
| F3 · 4/5 declared 4 | 3 Upgraded | below | `--surface-sunken` | `--border` | 75% | To downgrade your deck | *Cut **two game changers**, only three allowed at Upgraded.* + path |
| | 4 Optimized | declared | 12% `--bracket-4` | solid `--bracket-4` | full, 100% | declared | Game changers **5** no cap |
| | 5 cEDH | permitted | none | `--bracket-5` 40% | 75% | permitted | none |
| F4 · 4/5 declared 5 | 3 Upgraded | below | `--surface-sunken` | `--border` | 75% | To downgrade your deck | as F3 |
| | 4 Optimized | permitted | none | `--bracket-4` 40% | 75% | permitted | none |
| | 5 cEDH | declared | 12% `--bracket-5` | solid `--bracket-5` | full, 100% | declared | Game changers **5** no cap |

## Today, for contrast (what this replaces)

| State | Rung | Today |
|---|---|---|
| 1/2 declared 2 | 1 | tinted, `where your cards are` |
| | 2 | plain, `already allowed`, *It permits more than this deck uses.* |
| 4/5 declared 5 | 4 | tinted, `where your cards are` |
| | 5 | plain, `already allowed` (since #1164), the same sentence |
| 1/2 declared 1, 4/5 declared 4 | above | plain, `already allowed`, the same sentence (false at 4/5) |

Unchanged: the unanswered range (including the dashed 4/5 declare rung), single brackets, the verdict head, the marks and inks, `see all brackets →`.
