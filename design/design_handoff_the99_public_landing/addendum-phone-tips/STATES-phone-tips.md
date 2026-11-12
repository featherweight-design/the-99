# States · Landing tips on phones (A4)

| State | Width | Trigger | What shows | Board |
|---|---|---|---|---|
| Closed | all | Page load | The five rows, ⓘ in `--fg-faint` | A4 · Phone |
| Open in the flow | below 768 | Press an ⓘ | The tip card under its row, rows below pushed down, ⓘ in accent | A4 · Phone |
| Long tip | below 768 | Press Suggested changes' ⓘ | Same, 267px tall at 390 and 303px at 320 | A4 · Phone |
| Last row | below 768 | Press Which deck's ⓘ | The column grows; the Close band moves down | A4 · Phone |
| Switch | below 768 | Press another ⓘ while one is open | The first closes, the new one opens, the pressed row stays at its screen position | A4 · Behaviour |
| Into view | below 768 | An opened tip ends past the screen | The page scrolls so it ends 16px above the bottom | A4 · Behaviour |
| Closed again | below 768 | The same ⓘ, or Escape | The rows move back up; the page doesn't scroll | (text) |
| Press elsewhere | below 768 | A press or scroll outside the list | Nothing: the tip stays open | (text) |
| Floating | 768 and up | Hover, keyboard focus or press | As shipped | A4 · Desktop |

**Must-nots**
- Never float the tip over another row on a phone.
- Never let a closing tip move the row the reader just pressed.
- Never animate the rows' height; only the card itself eases in.
- Never change the desktop or tablet tip, or any copy.
- No ✕ or extra control on the tip: its ⓘ opens and closes it.
