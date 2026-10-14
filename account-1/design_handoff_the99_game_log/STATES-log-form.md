# The log form — states matrix (§6, §8.3)

The form has three fields and two of them cannot be wrong. What makes it worth a matrix is the
third: **eight axes × two columns, sharing one vocabulary**, where the interesting states are not
"filled in" and "not filled in" but *nothing selected*, *partially selected*, and *the same axis
wanted on both sides*.

| | Field | Control | Default | Can it be invalid |
|---|---|---|---|---|
| **A** | Result | 3 segments, radio | **none** | no — one of three, or unset |
| **B** | Pod size | 7 squares 2–8, radio | **4** | no — the control *is* the `check` range |
| **C** | Played at | `played tonight`, opens a date field | **today** | yes — a future date, see state 9 |
| **D** | What worked | 8 checkboxes, `fieldset` | none | no |
| **E** | What let me down | 8 checkboxes, same 8 labels | none | no |

**Save is enabled by A alone.** D and E are optional per §3 — a game with no axis marks is valid,
and the line beside the button says so.

---

## The matrix

| # | State | Form | Save | What the player sees |
|---|---|---|---|---|
| 1 | **Collapsed** (resting state) | not rendered | — | A 44px `Log a game` row: brass outline, `1px --accent`. Above the aggregate, below the record line. |
| 2 | **Just opened — nothing selected** | A unset · B = 4 · D,E empty | **disabled** | Every axis row at rest, both `{n} marked` counters absent, no error, no red. Glosses at `--fg-faint` — legible at rest, because rest is the state the player reads while deciding which column to tick. The only thing asking for input is the Result group, which has focus. |
| 3 | **Result only** | A set · B = 4 · D,E empty | **enabled** | `marks are optional — a result on its own is a game` beside the button. This is the fifteen-second log and it is fully legitimate. |
| 4 | **Partial — one column** | A set · D = 2 · E empty | **enabled** | Left legend reads `2 marked`; right legend has no counter. An empty column is a normal answer, never a prompt. |
| 5 | **Partial — both columns** | A set · D = 2 · E = 1 | **enabled** | Both counters present. The expected shape: two to four marks total. |
| 6 | **The conflict** — an axis ticked on one side is tapped on the other | the axis **moves** | enabled | The vacated row unticks, takes `1px dashed --border-strong` for one beat, and its gloss becomes `moved to what let me down`. The tapped row ticks normally. **No dialog, no error, no undo prompt.** Announced once: `Mana moved to what let me down`. |
| 7 | **All eight marked, one column** | D = 8 | enabled | Allowed. Counter reads `8 marked`. Not capped — see gap 5 in the README. |
| 8 | **Marks with no result** | A unset · D = 3 | **disabled** | The save button is disabled and unexplained until Result is touched — then it enables. No inline error text for an untouched required field. |
| 9 | **Future `playedAt`** | C ahead of today | **disabled** | The date field itself refuses forward dates; the form never submits one. §4's server rule stays as the backstop. |
| 10 | **Saving** | all fields disabled | in flight | Button reads `Saving…`, disabled; Cancel disabled; the axis rows go non-interactive but **stay in place and stay legible** — nothing unmounts mid-write. |
| 11 | **Saved** | collapses to state 1 | — | The record line, aggregate and history above/below update together. Focus returns to the collapsed row. Announced: `Game logged. 2–1 across 3 games.` **No toast, no confetti** — the updated panel is the receipt. |
| 12 | **Refused** | form intact, every value preserved | enabled | Shipped `MutationError` under the save button. Nothing is cleared: a rejected write must not cost the player the thing they typed. |
| 13 | **Cancelled** | collapses to state 1 | — | Values discarded with **no confirm**. Three fields and a handful of checkboxes is not work worth guarding, and a confirm on cancel trains people to ignore confirms. |
| 14 | **Reopened after cancel or save** | back to state 2 | disabled | **The form does not remember.** Pod returns to 4, result unset, marks empty. A form pre-filled from the last game invites logging the last game twice. |

## The rules the matrix is generated from

1. **Nothing is required except the result**, and the one required field is the one the player is
   guaranteed to know. Everything else either defaults (pod, date) or is honestly optional (marks).
2. **A disabled save is never accompanied by an error.** Nothing has gone wrong in state 2 or 8 —
   the player has simply not answered yet, and colouring that as a failure is a form scolding
   someone for opening it.
3. **The conflict is a move, not a validation.** The composite primary key makes both-at-once
   unrepresentable in the data; the form makes it unreachable by the same logic and not by a
   validator. Ticking on one side unticks on the other.
4. **Nothing unmounts mid-write.** During a save the rows go non-interactive in place. Hiding or
   collapsing anything moves the cursor's target under it, which is the failure the shipped
   suggestion tile keeps its slot to avoid.
5. **A refusal preserves everything.** The form is the player's typing; a server rejection is not
   permission to discard it.
6. **The form never pre-fills from history.** Defaults are constants (pod 4, today), never
   last-values.
7. **Empty is a normal answer, never a prompt.** No "add at least one" hint, no pulsing empty
   column, no required-field asterisk on D or E.

## Copy, per state

| State | String |
|---|---|
| Collapsed | `Log a game` |
| Column headings | `What worked` · `What let me down` |
| Counter | `{n} marked` (absent at 0) |
| Optional-marks note | `marks are optional — a result on its own is a game` |
| Date | `played tonight` → `played {date}` |
| Save · rest | `Save this game` |
| Save · in flight | `Saving…` |
| Cancel | `Cancel` |
| Moved | `moved to what let me down` / `moved to what worked` — replaces the gloss, same `--fg-faint` |
| Refused | `We couldn't save that game. Nothing has been logged.` |

## Announcements

One live-region message per settle, on the existing region — never one per tick.

| Event | Message |
|---|---|
| Axis moved between columns | `Mana moved to what let me down` |
| Game saved | `Game logged. 2–1 across 3 games.` |
| Game deleted | `Game deleted. 1–1 across 2 games.` |
| Save refused | the refusal string, once |

Twelve fast ticks is silence — individual checkbox state is already spoken by the checkbox. Only
the **move** is announced, because there two rows changed and the player touched one.
