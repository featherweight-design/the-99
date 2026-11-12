# STATES · addendum: the credits path

The fixture is R2d's: Prismari Artistry, Muddle at bracket 3, Spells. "Short" means `runFunding(allowance, 2)` is `short`, or it is `spent` with `creditLineKind` = `spent` (G20).

| ID | When | Intro (`2 credits a run.` line) | Intro foot | Strategy press | Strategy line |
|---|---|---|---|---|---|
| C1a / C2a | 1 free credit, nothing held, payments on | + `A free credit covers 1, so you'll need more credits to run one.` (`--warning`), then `Get more credits →` | Presses only, with no standing line | `Upgrade toward Spells`, off | `An upgrade uses 2 credits, and a free credit covers 1.` then `Get more credits →` |
| C1b / C2b | 1 free credit, payments off | + `A free credit covers 1, so an upgrade can't run on free credits alone.` | Presses only | Off | The shipped `freeOnly` line, with no link |
| C1c / C2c | 0 credits, no lot, payments on | As C1a | As C1a | Off | As C2a (replaces the shipped spent line) |
| C1d / C2d | 0 credits, payments off | As C1b | As C1b | Off | As C2b |
| C3 | Back from `/credits` with a lot that holds 2 or more | As shipped | The shipped standing line | On, with the picks kept | Shipped `uses 2 · 1 of 1 free · 40 paid` |
| — | Paid limit reached (L5), owner share, paused | As shipped | As shipped | Off | The shipped line for each |
| — | Funded (free, welcome or paid) | As shipped | As shipped | As shipped | As shipped |

## Landing, "With credits"

| ID | When | Change |
|---|---|---|
| L1 | `PRECON_UPGRADE_ENABLED` is on app-wide | The last row is `Upgrade this precon`, then ⓘ, then `2 credits`. The chip reads `1–2 per run`. The three-times picture becomes the cost strip `What one run costs` (◆ per credit, ◇ for only some runs), and the sentence is `twice` / `twiceV2` (R1b) |
| L2 | Its ⓘ is open | The tip and the What you get example, as the other rows draw them |
| L3 | Welcome credits and payments are off | No value block (as shipped). The row and its cost still show |
| — | `PRECON_UPGRADE_ENABLED` is off | Everything as shipped, byte for byte |

## Must-nots
- Never turn `Next · Commander` off for a shortfall: the player may look through the picks and buy part-way through.
- Never show a reset time as the answer to a shortfall: the free credit alone never covers a run.
- Never show `Get more credits` while payments are off.
- Never say the shortfall twice on one screen (on the intro, the standing line steps aside).
- Never drop the picks when the player leaves for Credits (G19).
- Never claim "three times" while Upgrade is listed. The twice sentence shows only when the grant covers every tool twice at its low cost.
