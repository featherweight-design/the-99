# Analysis tab addendum: the method notice and the free rewrite (2026-10-10)

This amends `../` and `../addendum_overview_loading/`, and replaces neither. It implements `docs/superpowers/plans/2026-10-10-overview-accuracy.md` §7.4 (PR 5) with Hugh's override: **this is its own notice, not the stale state.**

The canvas is `Method Notice Addendum.dc.html`, with the full tab at 1300 and 390. The child DCs are copies of the overview-loading addendum's `Analysis Tab 1300` / `390` with one block added inside the Overview section (`methodNotice`) and six states: `mEligible`, `mWriting`, `mDone`, `mFailedOne`, `mFailedSpent`, `mWithStale`.

## Locked (brief), not reopened
- The press rewrites the **Overview only**. The bracket reading and the stats are untouched.
- It's free once per deck per method version, with at most 2 attempts.
- It runs only on the owner's press. Nothing is automatic.
- It's a distinct notice. There's no tag and no Notices-sheet entry (§7.4 rejects the `rules` kind).

## Design calls
1. **Where it sits:** inside the Overview section, under the label row and above the held paragraph. It isn't a tab-level banner, so its position tells the reader what the press touches.
2. **How it's told apart from the stale banner:** dashed `--border-dashed` on `--surface-sunken` (radius 9), against the stale banner's solid `--border-strong` on `--surface-rail`. It uses the Overview's outlined button (36 / 44px), not the tab's filled one. The line starts with "We've changed", never "Your deck".
3. **Ranking when both apply (1f):** the stale banner leads and keeps its place at the top of the tab. The notice keeps its line but **loses its button**, and its note points to Re-analyze. Re-analyze's credit note becomes the free line, and its overview write is the free system run. One press, one overview write.
4. **Not dismissible.** It's a caption on the text below it (like ruling D's `olderThanList`). It goes when any successful write makes the shown row version 8.
5. **The free note never carries the credits standing,** so 1a reads the same at full credits, at 0 and while paused. `read.ts` must show the press in all three (§7.4 "The read side").
6. **The attempt cap is shown only after a failure** (1d). Stating it up front would make a free rewrite sound like it might not work.

## States
| Canvas | State | Notice | Press | Note |
|---|---|---|---|---|
| 1a | eligible | line A | **Write a new overview** (outlined) | free note |
| 1b | writing | gone | n/a | The label row shows the pulse and `writing a new one with the new method`. The held paragraph stays and crossfades on landing (as in the overview-loading addendum's 1b) |
| 1c | done | gone | n/a | Shipped written state. `Overview ready.` is announced once |
| 1d | failed, 1 left | line B, `role="alert"` | **Try again** | `1 free try left. No credit used.` |
| 1e | both used | line C, `role="alert"` | shipped **Write a new overview** | shipped `Uses a credit. {standing}.` From here, the normal used-up, paused and owner-share rules apply, the same as **Write one** |
| 1f | with stale | line A | none | `Re-analyze above writes it the new way, free.` The banner note is the stale free line |

The bracket box, climb and findings never go busy, and `analyzed …` never changes, through 1a to 1e.

## Layout
- Mark: the stats InfoTip ring (18px, 1px `--fg-faint`, mono 10.5 `--fg-muted`), static and `aria-hidden`. It shows `i` while eligible and in 1f, and `!` in 1d / 1e. It doesn't change color; `role="alert"` carries the error.
- 1300: the mark, then a left-aligned stack (the line at 13.5 over the note in mono 11 `--fg-faint`, gap 4), then the button, centered vertically. Padding 13/14, margin 2px 0 8px.
- 390: the mark and the line in a row, a full-width button (44px), then the note (mono 9.5, centered, like the shipped credit notes). Padding 13/14.
- "Free" is said once, in the note. The buttons use the shipped labels (`writeNew`, `Try again`).
- Removing the notice on press moves the paragraph up once. That happens on the reader's own press, and focus goes to the label-row status.

## Open
1. **Eng (1f):** the overview half of Re-analyze runs as `origin = 'system'` and counts against the 2 attempts. If that can't be split cleanly from the bracket read, the fallback is for the notice to keep its own free press in 1f and for Re-analyze to keep its paid note. Design accepts the fallback, but would rather have one press.
2. **Copy review:** every string below.

## Copy (owed to /copy-review)
New (`synopsisCopy.method`):
- A `We've changed how we write overviews. This one was written the old way.`
- `Free, no credit used. Only the overview is rewritten; your bracket and stats stay as they are.`
- `writing a new one with the new method` (label row, mono)
- B `We couldn't write the new overview. Nothing about your deck changed.`
- `1 free try left. No credit used.`
- C `We couldn't write the new overview with the free tries. You can still write one with a credit.`
- `Re-analyze above writes it the new way, free.`
- `pressNote.free`: `Also writes the overview, free this once because we changed how overviews are written.`

Reused: `synopsisCopy.writeNew`, `pressNote` / `credits` (1e), `Overview ready.`, the stale `bannerLine` / `Re-analyze`.

Hugh's starting line, *The way we analyze decks has changed. Re-analyze your deck.*, was reworded because "analyze" and "Re-analyze" already mean the bracket on this tab, and §11.3 rules that this press doesn't touch it.
