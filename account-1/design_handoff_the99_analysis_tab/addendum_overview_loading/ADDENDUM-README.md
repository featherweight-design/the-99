# Analysis tab addendum: the overview's own loading (2026-09-25)

This amends `../` (§2, §7) and replaces neither. Canvas: `Overview Loading Addendum.dc.html`, full tab at 1300 and 390. The child DCs are copies of `Analysis Tab 1300` / `390` with the new states added (`ovReQueued`, `ovWriting`, `ovReWriting`, `ovWritten`, `ovFailed`, `ovReFailed`), plus a busy form of the banner button. They also carry the shipped `View full overview`.

## Decided, not reopened
- Opening the tab: 8a's one loader holds the whole tab until the verdict, the overview and the credit lines are all fetched.

## The Overview slot, per state
| Canvas | State | First press | Re-analysis after edits |
|---|---|---|---|
| 1a | analyzing | 2b, unchanged: the ring, *Reading your deck…* | Banner button disabled in place and busy: pulse + *Reading your deck…* (shipped `panel.reading`), no note. The Overview is untouched: no loader until it is actually being written |
| 1b | writing (verdict landed) | Reading painted. Slot: status line *Writing the overview…* only | Banner gone. The label row reads *writing a new one for your changes*; the held overview stays whole |
| 1c | written | Paragraph + *View full overview →* | Same. The new paragraph replaces the held one in place (150ms crossfade) |
| 1d | failed | `synopsisCopy.failed` (`role="alert"`) + **Try again**, no credit note | Same, then a hairline, `synopsisCopy.olderThanList`, and the held paragraph |

- **Status line:** three 5px dots in `--fg-muted` on `at-wave` (1.6s, 0.16s stagger), then sans 13.5 / 13 in `--fg-muted`. The row is 36 / 44px tall and `role="status"`. The bracket marks stay the tab-level loader.
- **No credit note while busy or failed.** The press already drew it, the failed write spent nothing, and Try again finishes that same press.
- **Re-analysis status sits in the label row**, not above the held text, so nothing is inserted above painted content. Emptying the slot first would move the page twice and take away text mid-read.
- **No `--danger`, no tag, in 1d.** *not written* stays the refusal's (7h), which is unchanged and takes this slot when a written overview fails checking.
- **7d (overview already current):** no status line. The press returns the saved overview.
- The same writing line covers **Write one** and Round 0's **Try again**.
- **Re-analysis with no held overview:** the slot shows the status line alone, with *Writing the overview…* after the verdict lands.

## Layout
- No reserved space (§5). The slot is one line tall while it writes.
- When the overview lands it grows in place. The climb moves down once at 1300; at 390 the bracket box moves down too. Focus doesn't move. **For Hugh:** this is the cost of showing the verdict before the overview is written.

## Announcements
- §E's *Analysis ready…* still fires on the verdict.
- New: *Overview ready.* once, when the overview lands.

## Copy (owed to /copy-review)
New:
- `Writing the overview…`
- `writing a new one for your changes` (label row, mono)
- `Overview ready.`

Reused:
- `synopsisCopy.failed`
- `synopsisCopy.olderThanList`
- `synopsisCopy.tryAgain`
- `pressNote` / `credits` (as 7f)
