# Deck description and tailored Suggested changes: states (H35, R2)

Frames are in `The 99 - Deck Description.dc.html`, each at 1300 and 390. Strings are in `deck-description · copy strings.ts`.

## 1 · The description field, in AnalysisEmpty

| # | State | When | Draws | Frame |
|---|---|---|---|---|
| 1 | Idle, empty | no reading, no description | Label `Describe your deck`, field (`--surface`, `1px --border-strong`, example placeholder), help text under it with `0 / 240` at its end. **The counter is always drawn**, in a fixed column, so the help text never reflows | 1b |
| 2 | Focused / typing | focus | `1px --accent` border, with the counter `n / 240` on the help line (`--warning` from 220, hard stop at 240) | 1c |
| 3 | Saved | blur, or Analyze pressed | **No indicator.** The line appears under the deck name | 1c |
| 4 | Save refused | write fails | Value kept, with the shipped `MutationError` under the field | — |
| 5 | Loading | Analyze in flight | **The shipped loading state, unchanged.** Field, help text and credit note are not drawn | 1d |

Placement: under the second paragraph (now Hugh's "When you make changes…"), above Analyze, in the 540 column.

## 2 · The tagline

| # | State | Draws | Frame |
|---|---|---|---|
| 1 | Set | Sentence only. No dashed rule, edit, disc or chip. **At 390 it clamps to two lines** with an ellipsis; desktop never clamps | 1e |
| 2 | None | No row | 1f |
| 3 | Editing | Name and description fields at **one width** (560 / cover width). Save and Cancel replace Update and Export **at both widths**, and the corner buttons hide. No hint line | 1g |
| 4 | Saving / refused | As §F today, for both fields | — |

Keys: Enter in name → description. Enter in description → save both. Esc → cancel both. Blur commits only when focus leaves the pair.

## 3 · Suggested changes

| # | State | Body | Below the body | Frame |
|---|---|---|---|---|
| 1 | Never run, no description | Lead + checklist. Description is an absent row: `none yet · Describe your deck →` | Limits box; Additional notes; shipped action row | 1h |
| 2 | Describing in place | The row opens: label, field (focused), help text, Save / Cancel. Save → present row + header line + announcement. Cancel / Esc → dashed row | as 1 | 1h2 |
| 3 | Limits set, notes typed | Description is a present row | Set lit (count pill + chips); notes text area grows, `n / 500` | 1i |
| 4 | Run · pressed (0 ms) | Fan + lead. **Limits and notes become rows.** No secondary text on any run row at either width, except Your games’ `none logged`. All reads unticked; the writing row waits at the bottom | Reading… + Stop · `0 of 5 read` | 1j1 |
| 5 | Run · ticking | Reads tick **~350 ms apart from 350 ms**: ✓ in, label `--fg-faint` → `--fg-body` | `n of 5 read` | 1j2 |
| 6 | Run · writing | All reads ticked; the writing row is active (accent pulse, `--fg`) until the model returns | `5 of 5 read · writing` | 1j3 |
| 7 | Run · long wait | Past 20 s, one mono line under the writing row: still working, Stop uses no credit | as 6 | 1j4 |
| 8 | Results | Read-from gains `your description · your limits · your notes`. Notes field cleared | Limits; empty notes; `Suggest again` | 1k |
| 9 | Refusal | AnalysisBanner's frame (11 radius, `--border-strong` on `--surface-rail`, one sentence, no button), above the set | — | 1k |
| 10 | Stopped / failed | As today, with the notes kept in the field | — | — |

**The stagger (Hugh, 2026-10-03)** replaces "never on a timer". It is presentational and starts on the press, showing the page's own figures. A result that lands before the stagger finishes ticks the rest at once and draws immediately. Absent rows (Your games) never tick.

**Stop** ships today (`stop()`, `panel.stop`) and is unchanged.

**Notes are untrusted input.** Pass them to the model as quoted data, never as instructions. Guard against prompt injection and query-string injection.
