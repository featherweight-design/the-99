# Design table: Deck notes (R4)

**Commit to `docs/superpowers/design-tables/deck-notes.md`.** Mobile = 390, desktop = 900, from `md` up (as `builder-tabs.tsx` and `games-panel.tsx`). Values not listed are as shipped.

## R4 changes (over R3)

| Property | Mobile | Desktop |
|---|---|---|
| view order | NotesMark + heading + pitch (always, as the empty state draws them; Hugh 2026-10-12) → cap line or input → open (newest first) → Show all → `Done (N)` closed | same: mark left, the rest in the right column |
| add row | column, gap 8: field full width; then a row, `justify-content: flex-end`, gap 8: counter mono 10 (`order:-1; margin-right:auto`) · `[[ ]]` 56×48 · `Add` min-w 104 × 48 | row, gap 8: field (flex 1) · `[[ ]]` 44×40 · `Add` h 40 |
| field | `position:relative`, pad 11 44 11 13 (room for the ⓘ) | pad 9 40 9 12 |
| ⓘ | shipped `InfoTip`, right 13, vertically centred; `lines = deckNotesCopy.help.lines`; tooltip spans the field | right 11; tooltip 340 wide, aligned right |
| `[[ ]]` | inserts `[[]]` at the caret, caret between, opens the picker (`help.insertAria` names it for a screen reader); lit `--elevated` / `--fg` while the caret is in an open tag | same |
| NotesMark | two slips 64×48, back `--elevated` / 1.5px `--border-strong` at +10/+10, front accent-tinted / 1.5px `--accent`; three lines (box 6 + bar 2); no rotation | slips 100×74 at +16/+16; box 9 + bar 3 |
| pitch | one paragraph (`deckNotesCopy.empty.body`), drawn above the input with notes or without; the tag paragraph is removed | same |
| count and hint | the count (`n / 140`) is always drawn, at a fixed 68 wide on desktop so it never resizes the field; the `Enter adds` line is always drawn (desktop) | same |
| phone add bar | the sticky add-card bar is not drawn while Your deck is on Shopping, Notes or Stats | the bar stays |

---

# R3 (superseded where R4 differs)

## R3 change: Notes is a panel beside Stats (supersedes the R2 strip)

| Property | Mobile | Desktop |
|---|---|---|
| where | `GroupToggle`'s segment group, after Stats: `All · Shopping` \| `Stats · Notes` | same |
| type | `DeckPanel` = `"list" \| "stats" \| "notes"`; held for one visit to one deck and never stored (`deck-panel.ts`); gate `DECK_NOTES_ENABLED` | same |
| cell | `SEGMENT_BASE` with `flex: 1 1 auto` and pad 6 10 (all four cells), min-h 44 | `SEGMENT_BASE`, flex none, pad 6 14 |
| label + count | `Notes` + mono 11.5 `--fg-faint` open count; no count at zero; aria `deckNotesCopy.head.segmentAria(n)` / `.segmentAriaNone` | same |
| selected | 600 `--fg` on `--elevated` | same |
| tools | step aside while open (the `statsOpen` rule) | same |
| provenance slot | own line (`basis-full`), mono 10.5 `--fg-faint` | `ml-auto`, same ink |
| view | pad 16 16 24, gap 8 | pad 10 28 28, gap 6, max-width 820 |
| order | open (oldest first) → Show all → input → Done (N) | same |

## Component: DeckNotesEmpty

| Property | Mobile | Desktop |
|---|---|---|
| layout | column, centred, pad 18 4 14 | row, gap 30, pad 18 0 |
| mark | `NotesMark` 96 box, centred | 150 box |
| heading | display 700 21 / 1.25, mt 18 | 26, mt 6 |
| body | 13.5 / 1.6 `--fg-body`, max-w 560, two paragraphs, gap 9 | 14.5 / 1.65, gap 10 |
| tag example | 500 `--fg`, 1px dashed `--fg-faint` underline (not pressable) | same |
| Add | bone `PRIMARY`, h 48, pad 0 18; 50% until a character is typed | h 40 |

## Component: NotesMark (decoration, `aria-hidden`)

| Part | Mobile (96) | Desktop (150) |
|---|---|---|
| card behind | 38 × 58, radius 6, 1.5px `--border-strong`, `--elevated`, rotate -12° | 56 × 84, radius 8 |
| slip | 62 × 46, radius 6, 1.5px `--accent`, `color-mix(accent 14%, --surface)`, rotate 5° | 96 × 70, radius 8 |
| lines | three rows: box 5 + bar 2 high (`--fg-locked` / `--fg-faint`); row 1 box filled; row 2 carries a 34% `--accent` bar (the tag) | box 8, bar 3 |
| brackets | `[[ ]]` display 12 `--accent`, bottom-right, rotate 5° | 18 |
| rule | CSS boxes only, as `CardFanMark`; no SVG, no hexes | same |

## Component: TagHelp (`[[ ]]`)

| Property | Mobile | Desktop |
|---|---|---|
| button | 48 × 48, radius 8, hairline, mono 11.5 `--fg-muted`; open: `--accent` border, `--elevated` | 40 × 40 |
| behaviour | toggletip: press opens and closes; tap outside or Esc closes | tooltip: hover or focus opens; blur, leave or Esc closes |
| panel | full width, top 56, `ANCHORED_PANEL_CLASS`, pad 13 14 12, gap 6 | 320 wide, under the button |
| content | title 13 / 600; body 12.5 / 1.55; key box `--surface-sunken` with one solid and one dashed tag; foot mono 10 `--fg-locked` | same |
| a11y | `role=tooltip`; the input's `aria-describedby` includes it; button `aria-expanded` | same |

---

# R2 (superseded where R3 differs)

## R2 change: placement and the closed strip

| Property | Mobile | Desktop |
|---|---|---|
| mount | first child of the `deck` panel, before the All · Shopping · Stats segment row | same |
| panel pad | 14 16 20, gap 14 | 16 28 20, gap 16 |
| shell | radius 10, 1px `--border`, `--surface-sunken` | same |
| strip | min-h 48, pad 0 4 0 12, gap 10, whole strip is the toggle button | min-h 42, pad 0 6 0 14 |
| chevron | `▸` / `▾` mono 9 `--fg-faint` | same |
| label | `h2` mono 10 uppercase .14em `--fg-body` | same |
| count | mono 11 `--fg-muted`, open notes only; absent at zero | same |
| preview | oldest open note, 13 `--fg-body`, nowrap, ellipsis, tags as DeckNoteTag (not pressable inside the strip) | same |
| add | `+` 44×44 18 `--fg-muted` | `+ Add a note` h 30, pad 0 10, 12.5 `--fg-muted` |
| body (open) | pad 0 12 12, gap 8 | pad 0 14 12, gap 6 |
| rows | `--surface` on the sunken shell, radius 8 | same |
| input | `--bg` ground on the sunken shell | same, min-h 38 |
| phone focus | hide the sticky add-card bar and bottom nav while focused | — |

## R1 placement (superseded where it differs)

| Property | Mobile | Desktop |
|---|---|---|
| mount | first child of the `deck` panel (`builder-shell.tsx`), before the phone toolbar row and the decklist | first child of the `deck` panel, before the decklist |
| panel pad | 14 16 (as the panel) | 18 30 |
| gap to the decklist | 16, then 1px `--border` rule, then 16 | 18 · rule · 18 |
| gate | `DECK_NOTES_ENABLED` | same |

## Component: DeckNotesBlock

| Property | Mobile | Desktop |
|---|---|---|
| stack | flex column, gap 8 | gap 6 |
| heading | button, min-h 28 (44 hit), `▾`/`▸` mono 9 + `h2` mono 10 uppercase .14em `--fg-faint` | min-h 24 |
| heading note | mono 10 `--fg-locked`: `notes.head.note` (`oldest first`) or `.noteEmpty` with no notes | same |
| list | `ul`, gap 4 | same |
| show all | `Show all N` mono 11 `--fg-muted`, min-h 44, after 6 rows | min-h 30 |
| open state | `localStorage` `the99:deck-notes-open:{deckId}`, default open | same |

## Component: DeckNoteRow

| Property | Mobile | Desktop |
|---|---|---|
| shell | `li`, radius 9, `--surface`, 1px `--border`, pad 10 10 10 12, min-h 48, gap 12, align start | pad 7 8 7 12, min-h 40, gap 11 |
| box | `input type=checkbox` sr-only + 22×22 drawn box, radius 5, 1px `--border-strong`; hit area is the 44 cell | 18×18, mt 2 |
| box selected | `--elevated` fill, 1px `--fg-locked`, ✓ mono 12 `--fg-muted` | ✓ 11 |
| text | 14 / 1.5 `--fg`, `overflow-wrap:anywhere`, no clamp | 13.5 |
| date | under text, mono 10 `--fg-locked` | right, mono 10.5, pt 5, nowrap |
| actions | `⋯` 44×44 `--fg-muted` → anchored panel `Edit` · `Delete` | ✎ and × 28×28 `--fg-locked`, hover `--fg` / `--danger` |
| done row | no fill, text `--fg-faint`, tags `--fg-muted` | same |
| format | `formatNoteDate`: `d MMM`, + ` yyyy` outside the current year; done `done d MMM` | same |

## Component: DeckNoteTag (inline)

| Property | Value |
|---|---|
| element | `button` inline, no padding, `font: inherit`, 500, `--fg` |
| held | `border-bottom: 1px solid var(--fg-faint)` |
| not held | `1px dashed var(--fg-faint)` |
| unresolved | `span`, plain `--fg-body`, no underline |
| done | `--fg-muted`, underline `--fg-locked` |
| press | `useCardDetail().open(oracleId)` with the deck's provider |
| hover (desktop) | shipped card hover preview |
| focus | 2px `--accent` ring, offset 2 |
| aria | `{Name}, card details` |

## Component: DeckNoteInput (add and edit)

| Property | Mobile | Desktop |
|---|---|---|
| field | `input type=text`, min-h 48, pad 11 13, radius 8, `--surface-sunken`, 1px `--border-strong`, focus `--accent` | min-h 40, pad 9 12 |
| text | 14 / 1.5 | 13.5 |
| placeholder | `notes.add.placeholderShort` `--fg-placeholder` | `notes.add.placeholder` |
| add button | hairline, h 48, pad 0 16, 14 / 500; disabled `--fg-disabled` | h 40, pad 0 14, 12.5 |
| hint | none | mono 10 `--fg-locked` `notes.add.hint` / `.hintTyping` |
| counter | mono 10, right, from focus; `--warning` at 120; `n / 140` | same |
| maxLength | 140 rendered characters (tags count as their names); enforced in the action and `deck_notes_body_length_check` on the rendered length | same |
| enterkeyhint | `enter` | — |
| edit buttons | `Save` bone `PRIMARY` h 44 · `Cancel` hairline h 44 | h 32 |
| error | `MutationError` | same |

## Component: CardTagPicker

| Property | Mobile | Desktop |
|---|---|---|
| trigger | `[[` before the caret, with no `]]` after it | same |
| panel | `ANCHORED_PANEL_CLASS`, full field width, top 54; page scrolls the field under the deck bar | 440 wide, top 46 |
| role | `listbox`, field `aria-controls` + `aria-activedescendant` | same |
| section head | mono 9.5 uppercase .14em `--fg-faint`, pad 8 12 4 | same |
| sections | `In this deck` (local, from the first letter) · `Any card` (`searchCards` picker mode, from 2 letters, 150ms, deck matches removed) | same |
| row | min-h 48, pad 4 12, gap 10; name 13.5; meta mono 10 `--fg-faint` | min-h 42 |
| row, not shipped | a 24×34 thumb and a 600-weight match in the name are not drawn: the lookup returns no art, and the first version reads without either. Open question for Design if wanted | same |
| limits | 5 per section; the list scrolls inside `max-h` 220 | 5 per section |
| active | `--elevated` | same |
| footer | none | mono 10 `--fg-locked` `notes.picker.keys`, top 1px `--border` |

## Storage

| Property | Value |
|---|---|
| table | `deck_notes` per lock 1 |
| body | text with tags stored as `[[oracleId|Name at pick]]`; render resolves the id to the current name, then falls back to the stored name as plain text |
| caps | rendered length ≤ 140 (check constraint on a generated rendered-length or in the action; engineering's call, G4); ≤ 100 rows per deck (action check + count in the insert) |
| order | open: `created_at asc`; done: `done_at desc` |
