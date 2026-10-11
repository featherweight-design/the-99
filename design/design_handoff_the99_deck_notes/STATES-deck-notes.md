# STATES: Deck notes (R4)

## R4 deltas (apply over R3, R2 and R1 below)
| Id | Change |
|---|---|
| Order | **Newest first**, open and done alike. The view is: cap line or input → open notes → Show all → `Done (N)`, **closed by default** (open in W2 and M2 only). Provenance `{n} open · newest first` |
| E1 | Mark: two note slips, the back one `--elevated` / `--border-strong` offset +16/+16, the front one accent-tinted with three lines (one selected, one with an accent tag bar). No card, no brackets, no rotation. The tag paragraph is removed; one body paragraph |
| E2 | `info`: shipped `InfoTip` (`ui/info-tip.tsx`) inside the field's right edge (field pad-right 40, 44 on a phone). Lines `deckNotesCopy.help.lines`. It's the field's `aria-describedby`. The R3 tooltip-on-`[[ ]]` is withdrawn |
| E3 | `insert`: `[[ ]]` writes `[[]]` at the caret, places the caret between, and opens the picker with `Type a card name. This deck’s cards come first.` The button is lit (`--elevated`, `--fg`) while the caret is inside an open tag. aria `Insert a card tag`. Also usable in edit |
| Phone row | Input full width. Under it, one line: the counter on the left (when focused), then `[[ ]]` 56×48 and `Add` min-w 104 together on the right (`justify-content: flex-end`, gap 8) |
| C2 | The cap line takes the input's place at the top of the view |
| A2 | A new note lands directly under the input |

---

# R3 (superseded where R4 differs)

## R3 deltas (apply over R2 and R1 below; supersede them where they differ)
| Id | Change |
|---|---|
| Place | **A panel of its own.** The Your deck segment becomes `All · Shopping` \| `Stats · Notes`. `DeckPanel` = `"list" \| "stats" \| "notes"`, stored in `the99:deck-panel` as Stats is. The R2 strip and the R2 B1/B2 rows are withdrawn. All gets nothing new |
| N0 | `segment`: the Notes cell after Stats, `SEGMENT_BASE`. The count is open notes only, mono 11.5 `--fg-faint`, and absent at zero (the Games tab's rule). Selected: 600 `--fg` on `--elevated`. 390: cells `flex: 1 1 auto`, pad 6 10, so the four fit in 358 |
| N1 | Notes open: the list tools step aside (as `statsOpen`), and the right of the row (390: its own line) reads mono 10.5 `--fg-faint` `{n} open · oldest first`, or empty `yours only · on this deck, not a version` |
| N2 | The view: pad 10 28 28, max-width 820 (390: 16 16 24). Open list, Show all, the input, then Done (N). The sticky add-card bar stays (it hides on a phone while a note has focus) |
| E1 | `empty`: the Games empty state's shape. NotesMark 150 (96), then h3 display 700 26 (21) `The swap you meant to try.`, body 14.5 / 1.65 (13.5 / 1.6), a second paragraph teaching `[[` with a drawn dashed tag, then the input + `[[ ]]` + `Add` in bone `PRIMARY` (the screen's one fill). 390: stacked, centred |
| E2 | `tip`: the `[[ ]]` button (40 × 40, 390: 48), mono 11.5, hairline. Hover or focus opens the tooltip at 900; press toggles it at 390 (toggletip), and Esc, blur or a tap outside closes it. Panel 320 wide (390: full width), `ANCHORED_PANEL_CLASS`: title, body, a solid/dashed key, mono footnote. The input's `aria-describedby` includes it |
| E3 | Empty → first note: the empty state stays until the first save succeeds, then the list replaces it (no flash back to empty on revalidate: hold until the row arrives, as the first game does) |
| Placeholder | `Add a note. Type [[ to tag a card.` (390: `Add a note · [[ tags a card`) |
| Must-not | A notes strip or count anywhere in the All or Shopping views; Shopping's amber on the Notes count; a Notes count of 0 |

---

# R2 (superseded where R3 differs)

## R2 deltas (apply over the R1 tables below)
| Id | Change |
|---|---|
| Name | **Notes** everywhere in the UI (Hugh). Code: `deck_notes`, `deckNotesCopy`, `DECK_NOTES_ENABLED` |
| Context | Drawn in the shipped page: rail / phone top bar + tab bar, hero (name, commander, pills, 99 / 99, Update from a list · Export), version line, Recommended mix, tabs, All · Shopping · Stats + list controls, card grid, sticky add-card bar |
| B1 | Mount: first child of the `deck` panel, **above the All · Shopping · Stats row**, so it shows on every view. Shell: radius 10, 1px `--border`, `--surface-sunken` (the Recommended mix ground) |
| B2 | **Closed is the default** (scene `closed`, W0). Strip min-h 42 (phone 48): `▸` · `NOTES` mono 10 `--fg-body` · open count mono 11 `--fg-muted` · the oldest open note, 13 `--fg-body`, one line, ellipsis, tags drawn as in the row · `+ Add a note` 30 high (phone `+` 44×44). The whole strip toggles; `+` opens with the input focused. Kept per deck: `the99:deck-notes-open:{deckId}` |
| E1 | Empty is the closed strip with `none yet · one line each, dated for you · [[ names a card` (phone `one line each, dated for you`) and `+ Add a note`. 42px |
| Open head | `▾ NOTES` + `oldest first`; the count is drawn only when `Show all N` hides some |
| Phone focus | While a note input has focus, the sticky add-card bar and the bottom tab bar hide (one input on screen, not two over the keyboard) |
| Phone frames | W0, E1 and W2 draw the full page; the rest start scrolled to the tab row |
| Desktop | The sticky add-card bar stays; the picker opens down from the notes input and is drawn over the grid, never over the bar |
| Must-not | Opening Notes by default; moving anything above the tab row; drawing the strip inside one of All / Shopping / Stats |

---


Every frame is drawn at 900 and 390. `scene` is the prop on `Notes.dc.html`. The fixtures are the brief's decks. Card names in `‹ ›`, the note texts and the unresolvable tag are illustrative. Today is 11 Oct 2026.

## The block (B)

| Id | Scene | What draws |
|---|---|---|
| B1 | every | First block of the `Your deck` panel, under the tab row and above the decklist. On a phone it also sits above the toolbar row. Heading `▾ JOTTINGS` mono 10 `--fg-faint`, note `oldest first` mono 10 `--fg-locked` |
| B2 | (no frame) | Heading pressed: closed. `▸ JOTTINGS · 4` (the open count), with nothing below it. Kept per deck in `localStorage` (`the99:deck-notes-open:{deckId}`), open by default |
| B3 | (no frame) | Switch off: no block, and the panel starts at the decklist exactly as shipped |
| B4 | (no frame) | Loading: notes arrive with the deck page payload, so there's no skeleton. The block draws with the page |

## Empty and add (E · A)

| Id | Scene | What draws |
|---|---|---|
| E1 | `empty` | Heading note `one line each · dated for you · [[ names a card`. Input, placeholder `Add a note. Type [[ to name a card.` (phone `Add a note · [[ names a card`). `Add` disabled. No list, no Done |
| A1 | `adding` | Focus: border `--accent`, counter `n / 140` mono 10 `--fg-locked` on the right. Desktop hint `Enter adds · dated today, 11 Oct`. Phone: keyboard up, deck bar compact (52), return key adds |
| A2 | `added` | New row last in the open list (oldest first), dated today. Field cleared, focus kept. Live region `Note added.` |
| A3 | (no frame) | Pending: `Add` reads `Adding…`, field disabled, `inFlight` guard. No optimistic row |
| A4 | (no frame) | Whitespace only: `Add` disabled, Enter does nothing. Trimmed on save |
| A5 | (no frame) | Paste with a newline: newlines become spaces. Then the 140 cap applies |

## The picker (K)

| Id | Scene | What draws |
|---|---|---|
| K1 | `pickDeck` | `[[` + letters after it. Listbox under the input (desktop 440 wide), `In this deck` (count) first, then `Any card`. Top row active (`--elevated`). Row: 24×34 thumb, name with the matched prefix in 600, mono 10 type line. `Any card` rows add `· not in this deck` |
| K2 | `pickAny` | No deck match: `Nothing in this deck by that name` mono 10.5, and the section stays. Any card follows |
| K3 | (no frame) | `[[` with no letters: one line `Type a card name. This deck’s cards come first.` No rows |
| K4 | (no frame) | One letter: In this deck only (local). Any card starts at two letters, debounced 150ms |
| K5 | (no frame) | Search pending: Any card shows `Searching…` mono 10 under its head. In this deck is already drawn |
| K6 | (no frame) | Not legal in Commander (Q8): meta `Instant · not in this deck · not legal in Commander`, `--fg-faint`, no colour |
| K7 | (no frame) | Search refused: Any card reads `Couldn’t search just now.` In this deck still works |
| K8 | (no frame) | Pick (Enter, Tab or press): writes `[[Name]]` with the id, adds a trailing space, closes. Esc: closes, keeps the typed `[[text` as plain text. `]]` typed by hand: closes, and the name stays plain unless it was picked |
| K9 | phone | `[[` scrolls the input to the top of the visible area, under the compact deck bar. The picker drops down to the keyboard, up to 4 rows visible. Rows 48 high |

## A row (R)

| Id | Case | What draws |
|---|---|---|
| R1 | open | Box 18 (phone 22), radius 5, 1px `--border-strong`. Text 13.5 / 1.5 `--fg`, wraps, never clipped. Date mono 10.5 `--fg-locked` right (phone: under the text, mono 10). Desktop ✎ and × 28px `--fg-locked`; phone one `⋯` 44px |
| R2 | tag, held | Name 500 `--fg`, 1px solid `--fg-faint` underline. Press opens card details through the deck's provider. Desktop hover shows the shipped preview |
| R3 | tag, not held | Same, dashed underline. Card details open with the deck's Add control, as from Consider |
| R4 | tag, left the deck | Same as R3. The tag keeps its id. There's no "removed" mark, because nothing records that the deck once held it |
| R5 | tag, can't resolve | Stored name as plain `--fg-body` text, no underline, no press |
| R6 | at 140 | Wraps to 3 lines at 390, 2 at 900. Nothing clipped |
| R7 | name changed in the catalog | Draws the current catalog name (lock 2). No mark |

## Done (D)

| Id | Scene | What draws |
|---|---|---|
| D1 | `notes` | `▸ Done (2)` mono 11 `--fg-muted`, 32 high (phone 44), under the add input. Closed by default on every visit |
| D2 | `doneOpen` | `▾ Done (2)`. Rows have no fill, 1px `--border`, box selected (`--elevated`, ✓ `--fg-muted`), text `--fg-faint`, tags `--fg-muted` with a `--fg-locked` underline, still pressable. Date `done 10 Oct`. Newest done first |
| D3 | `markDone` | Select: box fills, text `--fg-faint` for 600ms, then the row moves under Done, and the count updates at once. Live region `Marked done.` Refused: box unselects, `MutationError` `We couldn’t mark that done. Nothing has changed.` under the row |
| D4 | (no frame) | Unselect a done row: back to the open list at its creation-date place. Live region `Back on the list.` |
| D5 | (no frame) | Last open note marked done: open list empty, the input stays, `Done (N)` stays. No "all done" line |

## Edit and delete (ED · DL)

| Id | Scene | What draws |
|---|---|---|
| ED1 | `edit` | Row becomes the input, `--surface-sunken`, 1px `--accent`. Tags as `[[Name]]` with the brackets mono 12 `--fg-faint`. `Save` (bone `--btn`) · `Cancel` hairline. Desktop hint `Enter saves · Esc cancels · the date stays 6 Oct`. Counter right |
| ED2 | (no frame) | Pending `Saving…`. Refused: `MutationError` `We couldn’t save that change. Your edit is still here.` The edit stays open |
| ED3 | (no frame) | Emptied and saved: refused client-side, `Save` disabled. Deleting is ×'s job |
| ED4 | (no frame) | Phone: `⋯` opens an anchored panel, `Edit` · `Delete`, rows 44 |
| DL1 | `delete` | `DeleteConfirm` under the trigger: `Delete this note?` / `It goes for good. The deck and its cards are unchanged.` / `Keep it` · `Delete`. Esc keeps |
| DL2 | (no frame) | Pending `Deleting…`. Refused: in the pane, `We couldn’t delete that note. Nothing has changed.` |

## Caps and many (C · M · N)

| Id | Scene | What draws |
|---|---|---|
| C1 | `capNote` | Counter `140 / 140` `--warning` (from 120). The field takes no more. Counted on rendered text, so a tag counts as its name |
| C2 | `capDeck` | 100 notes (open + done). The input is replaced by a dashed box: `This deck holds 100 notes, the most it keeps. Delete one to add another.` + mono `done ones count too` |
| M1 | `many` | More than 6 open: first 6, then `Show all 30` mono 11 `--fg-muted` (phone 44 high). Shown all stays shown for the visit |
| M2 | `manyDone` | Done open with more than 6: six newest done, `Show all 40 done` |
| N6 | (no frame) | Add at the cap from a stale tab: the action refuses, `MutationError` `This deck already holds 100 notes.` |

## The refused write (RF)

| Id | Scene | What draws |
|---|---|---|
| RF1 | `refused` | Shipped `MutationError` under the input: `We couldn’t save that note. It’s still in the box, so you can try again.` Text, tag ids and counter kept. Cleared on the next keypress or Add |

## Must-nots
- No due date, reminder, overdue, age (`3 days ago`), streak, progress bar, `3 of 5 done`, or colour that changes with time.
- No success green on done. No strikethrough.
- Never say "tick". The box is selected and unselected; aria `checkbox`, name `Done: {text}`.
- No mark on decklist rows for a tagged card (Q7).
- Notes go to no prompt, fingerprint or Suggested changes run (lock 6).
- No note count on the deck tile (lock 7).
