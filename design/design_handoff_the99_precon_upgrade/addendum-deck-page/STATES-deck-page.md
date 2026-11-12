# States · Upgrade precon on the deck page (A2)

| State | Trigger | The band and button | Board |
|---|---|---|---|
| Started at v0 | Deck started from the precon; its only version is v0; no changes since | Band under the header; button pulses twice on the first view; first visit = the arrival receipt with the button for its ✕ | A2c B2, B |
| Linked v0 | A deck linked to the precon; v0 drawn apart; no committed version | Shows | When it shows, row 2 |
| Changes since v0 | Any uncommitted edit, an Apply included | Hidden; comes back on Discard or Undo | When it shows, row 3; A1 |
| Has a v1 | Any version committed after v0 | Hidden for good | D0; When it shows, row 4 |
| Not from a precon | No precon origin | Hidden; Versions keeps the shipped Link a precon | When it shows, row 5 |
| Flow open | Button selected | R2d's sheet (phone) or dialog (desktop) over the deck page | Flow |
| Results | A run finishes | Foot: `Apply these 14 swaps`, `Try another strategy · 2 credits` | R1 |
| From History | A past run opened | Read-only result, same Apply, no credit | H2 |
| Applied | Apply selected | Flow closes; toast with Undo; to-do card's commit step; brass rule on changed rows | A1 |
| Undone | Undo on the toast | The box's list and commander come back, and so does the button | (text) |
| Apply failed | The write fails | Shared toast error; the flow stays on the results | (text) |

**Must-nots**
- Never show the button with a v1, or with changes since v0.
- Never apply over the player's own changes. The gate makes this impossible.
- Never charge for Apply. Only a run costs credits.
- No second confirm dialog, and no copy beyond the band's two lines.
- Never put the button in the header's action row (A2, rejected).
- Don't change the R2d flow's steps or copy, except for the intro's last line and the results button.
