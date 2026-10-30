# The 99: Deck notes (design handoff, R4, approved)

`design/design_handoff_the99_deck_notes/` · 2026-10-11 · mirrors `design_handoff_the99_precons/`

**Status: R4, approved (Hugh, 2026-10-11). Build from the R4 files.** R1–R3 are kept for history only.

## Build from
| File | Holds |
|---|---|
| `The 99 - Deck Notes (R4).dc.html` | The canvas. C0 the calls, then N0 the segment · E1 empty · E2 the ⓘ · E3 `[[ ]]` inserts · A1 adding · A2 added · K1 / K2 picker · W1 with notes · W2 Done open · MD · ED · DL · C1 / C2 caps · M1 / M2 many · RF refused · AB About. Every frame at 900 and 390. |
| `Notes R4.dc.html` | The frame component (`scene`, `phone`, `theme`), drawn in the shipped deck page. |
| `STATES-deck-notes.md` | Every state. Read the **R4 deltas** first, then R3, R2 and R1 where R4 is silent. |
| `design-tables/deck-notes.md` | **Commit to `docs/superpowers/design-tables/deck-notes.md`.** R3's panel, empty and help tables, plus the R4 rows. |
| `notes-copy.ts` | Proposed `src/lib/copy/deck-notes.ts` (`deckNotesCopy`). Goes to `/copy-review`. |
| `about-notes.ts` | The About entry (chapter 03, after Deck stats) and the `DECK_NOTES_ENABLED` AboutSwitch. |
| `READINESS.md` | Gaps for engineering. |
| `brand/` | Locked brand sheet, copied. |

## What R4 is, in one pass
- **Where:** a fourth cell in Your deck's segment, `All · Shopping | Stats · Notes` (`DeckPanel` gains `"notes"`). The count is open notes, in neutral mono, and absent at zero. While Notes is open the list tools step aside, as they do for Stats.
- **Layout, top to bottom:** the input (or the 100-note cap line), the open notes newest first (six, then `Show all N`), then `Done (N)`, closed by default.
- **Input:**
  - The shipped `InfoTip` ⓘ sits inside the field and explains tags.
  - `[[ ]]` inserts `[[]]` with the caret between and opens the picker.
  - `Add`.
  - On a phone the input is full width, with the counter on the left of the line below and `[[ ]]` + `Add` on the right.
- **Tags:** the card's name, with a solid underline if the deck holds it and dashed if it doesn't. A tag that can't resolve is plain text. A tag opens card details.
- **Rows:** the select box (never "tick"), the text, an absolute mono date, then ✎ and × (on a phone, ⋯). Delete uses `DeleteConfirm`. Done rows have no fill and no strikethrough.
- **Empty:** the Games empty shape, with the two-slip mark, `The swap you meant to try.`, one paragraph, and the input with a bone `Add`.
- **Limits:** 140 rendered characters (counter turns `--warning` at 120); 100 notes per deck, done included.
- **Not:** no reminders, due dates, ageing, progress or sharing; no mark on decklist rows; nothing reads notes.

## Open for Hugh
- **Ruling 5** said "under the description". R3/R4 read it as "lives in Your deck" and put Notes beside Stats. Confirm before build.

---

# History (R1–R3, superseded)

*R4 change list:*
- a new mark of two stacked note slips, with no card and no brackets;
- the empty state's tag paragraph is removed;
- the shipped InfoTip ⓘ inside the field;
- `[[ ]]` now inserts `[[]]` and opens the picker;
- Done is closed by default;
- on a phone, the buttons move to their own line under the input, with `[[ ]]` next to `Add`;
- the cap line sits at the top;
- the input is at the top, with the list newest first.

*R3 status:* **R3, for audit.** R3 makes Notes a panel of its own in the Your deck segment, `All · Shopping | Stats · Notes`, the way Stats is built. The R2 strip is gone, so the All view is untouched. R3 also adds an empty state in the Games tab's shape with its own mark, and explains `[[ ]]` three times: in the placeholder, in a `[[ ]]` help button with a tooltip beside the input, and in the empty state. Files: `The 99 - Deck Notes (R3).dc.html`, `Notes R3.dc.html`. `STATES-deck-notes.md` and `design-tables/deck-notes.md` lead with R3 deltas. `notes-copy.ts` has the R3 strings (`legacyHead` holds R1/R2 strings that are still used). R1 and R2 files are kept unchanged.

*R2 status:* **R2, for audit. Build from the R2 files.** R2 applies Hugh's two R1 notes (2026-10-11). (1) Every frame is drawn in the shipped deck page: hero, version line, Recommended mix, tabs, the All · Shopping · Stats row, the card grid, the sticky add-card bar, and on a phone the top bar and tab bar. Because the page is already dense, Notes defaults to **one closed strip** (42 / 48px) above the All · Shopping · Stats row, with the open count, the oldest note as a preview, and `+ Add a note`. (2) The feature is called **Notes**. The R2 files are `The 99 - Deck Notes (R2).dc.html`, `Notes.dc.html`, `STATES-deck-notes.md`, `design-tables/deck-notes.md`, `notes-copy.ts` and `about-notes.ts`. The R1 files (`Jottings`) are kept beside them, unchanged, and the R1 text below is superseded where it differs.

*R1 status:* R1, for audit. Source of truth: `docs/superpowers/design-briefs/2026-10-11-deck-notes.md` (main). Hugh's seven rulings and engineering's eight locks are taken as closed. This round answers "What Design owns" and the eight open questions. The fixtures are the brief's five decks: Wizards, Gishath, Avatar Aang, Omnath and Kratos. Jotting texts, `‹ ›` commanders, the two taglines and the unresolvable tag are illustrative. Counts are consistent across frames.

**No new tokens, no new motion, no new dependencies.** Open the canvases with `support.js` beside them.

| File | Holds |
|---|---|
| `The 99 - Deck Notes (R1).dc.html` | C0, the calls. E1 empty · A1 adding · A2 added · K1 picker, deck first · K2 picker, any card · W1 three kinds of tag · W2 under a tagline, Done open · MD marking done · ED edit · DL delete · C1 one at the cap · C2 the deck at the cap · M1 many · M2 many done · RF refused · AB the About entry. Every frame at 900 and 390. |
| `Jottings.dc.html` | The frame component (`scene`, `phone`, `theme`), imported by the canvas. |
| `STATES-jottings.md` | Every state, drawn or not, plus the Must-nots. |
| `design-tables/jottings.md` | **Commit to `docs/superpowers/design-tables/jottings.md`.** |
| `jottings · copy strings.ts` | Proposed `src/lib/copy/jottings.ts`. |
| `about · jottings.ts` | The About entry. |
| `READINESS.md` | Gaps. |
| `brand/` | Locked brand sheet, copied. |

## The name
**Jottings**: one item is a jotting. It can't be read as `Additional notes` (Suggested changes), a version's note (a commit message) or a game's note, and no UI string calls them notes. Internally the table stays `deck_notes` (lock 1). The fallback, if copy-review turns it down, is `Things to try` (G1).

## Design's calls
1. **Where (Q1).** First block of the `Your deck` panel, under the tab row and above the decklist. On a phone it also sits above the toolbar row. Open by default. The heading is a disclosure, kept per deck in this browser.
2. **Empty.** The heading, the line `one line each · dated for you · [[ names a card`, and the input. There's no pitch, and the block doesn't disappear.
3. **Add.** An input and an `Add` button. Enter or Add writes, clears the field and keeps focus. On a phone the return key adds.
4. **`[[`.** A listbox under the field: `In this deck` first (local, from the first letter), then `Any card` (from two letters, with deck matches removed). On a phone the field scrolls up under the deck bar, so the list fits above the keyboard.
5. **Tags.** Inline name, 500 weight, underlined solid if the deck holds the card and dashed if it doesn't (never held and since removed draw the same). A tag that can't resolve is plain text. Press opens card details. There are no chips and no colour.
6. **Length (Q2).** 140 rendered characters; a tag counts as its name. The counter turns `--warning` at 120.
7. **Order and dates (Q3).** Open: oldest first, dated `2 Oct`. Done: newest done first, dated `done 9 Oct`. Dates are absolute and never relative.
8. **Editing (Q4).** In place. The date stays the creation date, and no `edited` mark is drawn.
9. **Done.** Select the box to mark a jotting done, unselect to reopen it. `Done (N)` is closed by default. There's no strikethrough and no green.
10. **Delete.** The shipped `DeleteConfirm`, as every delete in the app is (Hugh, 2026-09-27). Phone rows have one `⋯` that opens Edit and Delete.
11. **Bulk delete (Q5).** None.
12. **Cap per deck (Q6).** 100, open and done together. At the cap a dashed line replaces the input.
13. **A mark on the card (Q7).** None.
14. **Any card (Q8).** Yes, including cards not legal in Commander. The picker says `not legal in Commander` as a fact. This needs the picker mode on `searchCards`.
15. **Many.** Six rows, then `Show all N`, for both open and done.
16. **Refused.** The shipped `MutationError`, and nothing typed is lost.

## Not drawn this round
- Card details opened from a tag is the shipped sheet, so it isn't redrawn (STATES R2/R3).
- The closed block (B2), the `[[` empty and pending states (K3–K7), the phone `⋯` menu (ED4) and the refused done/edit/delete states are in STATES only.
