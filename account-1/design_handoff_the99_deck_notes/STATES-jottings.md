# STATES: Jottings (deck notes, R1)

Every frame is drawn at 900 and 390. `scene` is the prop on `Jottings.dc.html`. The fixtures are the brief's decks. Card names in `‹ ›`, the jotting texts and the unresolvable tag are illustrative. Today is 11 Oct 2026.

## The block (B)

| Id | Scene | What draws |
|---|---|---|
| B1 | every | First block of the `Your deck` panel, under the tab row and above the decklist. On a phone it also sits above the toolbar row. Heading `▾ JOTTINGS` mono 10 `--fg-faint`, note `oldest first` mono 10 `--fg-locked` |
| B2 | (no frame) | Heading pressed: closed. `▸ JOTTINGS · 4` (the open count), with nothing below it. Kept per deck in `localStorage` (`the99:jottings-open:{deckId}`), open by default |
| B3 | (no frame) | Switch off: no block, and the panel starts at the decklist exactly as shipped |
| B4 | (no frame) | Loading: notes arrive with the deck page payload, so there's no skeleton. The block draws with the page |

## Empty and add (E · A)

| Id | Scene | What draws |
|---|---|---|
| E1 | `empty` | Heading note `one line each · dated for you · [[ names a card`. Input, placeholder `Jot something down. Type [[ to name a card.` (phone `Jot something down · [[ names a card`). `Add` disabled. No list, no Done |
| A1 | `adding` | Focus: border `--accent`, counter `n / 140` mono 10 `--fg-locked` on the right. Desktop hint `Enter adds · dated today, 11 Oct`. Phone: keyboard up, deck bar compact (52), return key adds |
| A2 | `added` | New row last in the open list (oldest first), dated today. Field cleared, focus kept. Live region `Jotting added.` |
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
| D5 | (no frame) | Last open jotting marked done: open list empty, the input stays, `Done (N)` stays. No "all done" line |

## Edit and delete (ED · DL)

| Id | Scene | What draws |
|---|---|---|
| ED1 | `edit` | Row becomes the input, `--surface-sunken`, 1px `--accent`. Tags as `[[Name]]` with the brackets mono 12 `--fg-faint`. `Save` (bone `--btn`) · `Cancel` hairline. Desktop hint `Enter saves · Esc cancels · the date stays 6 Oct`. Counter right |
| ED2 | (no frame) | Pending `Saving…`. Refused: `MutationError` `We couldn’t save that change. Your edit is still here.` The edit stays open |
| ED3 | (no frame) | Emptied and saved: refused client-side, `Save` disabled. Deleting is ×'s job |
| ED4 | (no frame) | Phone: `⋯` opens an anchored panel, `Edit` · `Delete`, rows 44 |
| DL1 | `delete` | `DeleteConfirm` under the trigger: `Delete this jotting?` / `It goes for good. The deck and its cards are unchanged.` / `Keep it` · `Delete`. Esc keeps |
| DL2 | (no frame) | Pending `Deleting…`. Refused: in the pane, `We couldn’t delete that jotting. Nothing has changed.` |

## Caps and many (C · M · N)

| Id | Scene | What draws |
|---|---|---|
| C1 | `capNote` | Counter `140 / 140` `--warning` (from 120). The field takes no more. Counted on rendered text, so a tag counts as its name |
| C2 | `capDeck` | 100 jottings (open + done). The input is replaced by a dashed box: `This deck holds 100 jottings, the most it keeps. Delete one to add another.` + mono `done ones count too` |
| M1 | `many` | More than 6 open: first 6, then `Show all 30` mono 11 `--fg-muted` (phone 44 high). Shown all stays shown for the visit |
| M2 | `manyDone` | Done open with more than 6: six newest done, `Show all 40 done` |
| N6 | (no frame) | Add at the cap from a stale tab: the action refuses, `MutationError` `This deck already holds 100 jottings.` |

## The refused write (RF)

| Id | Scene | What draws |
|---|---|---|
| RF1 | `refused` | Shipped `MutationError` under the input: `We couldn’t save that jotting. It’s still in the box, so you can try again.` Text, tag ids and counter kept. Cleared on the next keypress or Add |

## Must-nots
- No due date, reminder, overdue, age (`3 days ago`), streak, progress bar, `3 of 5 done`, or colour that changes with time.
- No success green on done. No strikethrough.
- Never say "tick". The box is selected and unselected; aria `checkbox`, name `Done: {text}`.
- Never call it notes in UI copy (Additional notes, a version's note and a game note already exist).
- No mark on decklist rows for a tagged card (Q7).
- Jottings go to no prompt, fingerprint or Suggested changes run (lock 6).
- No jotting count on the deck tile (lock 7).
