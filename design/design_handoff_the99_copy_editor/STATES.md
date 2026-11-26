# States

Art: `art/ce-<p|d>-<state>.webp` (phone 390 at 2x, desktop 1300 at 1.5x).

| # | State | Art | What shows |
|---|---|---|---|
| 1 | Mode off | `off` | The door only: desktop pill bottom right, phone pencil in the header. |
| 2 | Mode on | `on` | Dashed outlines on editable text, dotted on read-only; the bar. |
| 3 | Text targeted | `target` | Solid outline and the file · key tag. |
| 4 | Editor, plain | `ed-plain` | Now / New, word count against the cap. |
| 5 | Editor, fill-ins | `ed-fill` | `{names}` chip, fill-in note, preview. |
| 5a | Fill-in removed, offered back | `ed-fill-removed` | Chip taken out (✕ or Backspace); `Insert at cursor` row offers it back with its value. ADDENDUM-insert-fill.md. |
| 5b | Insert open, placing | `ed-fill-insert` | Caret placed; insert button hovered or pressed; the chip lands at the caret. |
| 5c | None left to insert | `ed-fill-none` | Chip back with its ✕; no insert row; the value note. |
| 6 | Editor, variations | `ed-var` | Two labelled fields, one preview. Phone target is the History list. |
| 7 | Editor, rule error | `ed-err` | Em dash, exclamation mark, 9 of 8 words; Add disabled. |
| 8 | Editor, read-only | `ed-ro` | Lock, reason, Copy key / Close. |
| 9 | Tray with edits | `tray` | Three rows, Clear all, Open pull request. |
| 10 | Submitting | `submitting` | Rows locked, spinner. |
| 11 | Submitted | `submitted` | PR number, branch, Open on GitHub; bar shows PR open. |
| 12 | Failed | `failed` | Banner, stale row flagged with Redo, Try again. |

## Addendum

- `ADDENDUM-insert-fill.md` (2026-11-25, approved): a fill-in can be removed (chip ✕, Backspace) and inserted (Insert at cursor row). States 5a to 5c. Overrides row 4 and the chip line "Moves, never deletes".
