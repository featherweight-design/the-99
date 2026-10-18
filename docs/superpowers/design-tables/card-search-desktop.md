# Design Property Table — Card search (desktop)

Source: `design/design_handoff_the99_card_search/` — `R2 - Rail-Desktop.dc.html` (D1, D1h, D2, D2n, D3, D4, D5, D6, D7, D8 and the keys note; main source), `R2 - Deck-Page.dc.html` (DD1, DD2), `R1 - Rows.dc.html` (the desktop row), `R2 - Options.dc.html` (rail slot R-A, graphic A), `README.md`, `STATES-card-search.md`, `READINESS.md`, `card-search · copy strings.ts`. Frame values are read from each board's inline CSS and markup. Desktop frame is 1300x820 (`.dk`). Copy is not enumerated: each element names its copy key (`cardSearchCopy.*`, or REUSED shipped keys).

Conventions in the boards: the dashed pink outline (`.new`, `outline:1.5px dashed rgba(255,77,154,.55)`, offset 3px, 6px on the field) marks a new part on the board and is an annotation, not shipped UI. Fonts are written as literal families in the boards (`IBM Plex Sans`, `IBM Plex Mono`, `Chakra Petch`, `Cinzel`); no font CSS variable is named in them, so none is recorded. Colors are CSS variables with the board's `:root` hex.

Board `:root` tokens used below: `--bg` #0E0F14 · `--surface-raised` #191B22 · `--surface-rail` #12141B · `--surface-sunken` #101219 · `--elevated` #20222A · `--border` #181C26 · `--border-strong` #262A35 · `--border-dashed` #343843 · `--fg` #E6E8F0 · `--fg-body` #B1B6C7 · `--fg-muted` #959AAD · `--fg-faint` #6F7486 · `--fg-placeholder` #7D8294 · `--accent` #FF4D9A.

---

## Component: Rail search slot (R-A)

### Placement in the rail

| Property | Desktop |
|---|---|
| Rail width | 62px (`.rail`), `box-sizing: border-box` |
| Rail padding | 14px 0 (top/bottom 14, left/right 0) |
| Rail layout | flex column, `align-items: center` |
| Rail background | `var(--surface-rail)` (#12141B) |
| Rail border | right: 1px solid `var(--border)` |
| Rail z-index | 6 |
| Order, top to bottom | mark, search slot, rule, Home, Collection, then the other three slots, account control at the foot (`margin-top: auto`) |
| Mark block margin-bottom | 20px (mark = 12px glyph + 3px gap + 20px numeral line, so the slot's top sits at 14 + 35 + 20 = 69px from the rail top) |
| Slot top, relative to the frame (`.dk`) | 69px |
| Rule between search and Home | 24px wide, 1px high, background `var(--border-strong)`, margin 6px 0 10px |
| Distance slot to rule | 4px (slot margin-bottom) + 6px (rule margin-top) = 10px; rule to Home 10px |
| Touch rail (88px) | slot carries the label under the glyph, as every touch slot does; copy key `touchRailLabel`. Board draws no frame for it, only the note in D1h. |

### Slot (rest)

| Property | Desktop |
|---|---|
| Element class | `.rsl`, same box as the five nav slots |
| Width / height | 38px / 38px |
| Border radius | 10px |
| Display | flex, centered both axes |
| Margin | bottom 4px |
| Color (rest) | `var(--fg-muted)` (#959AAD), set inline on this slot; the other nav slots at rest use `var(--fg-faint)` |
| Background (rest) | none |
| Border | none |
| Text | none: no label, no shortcut at rest (`R-A`) |
| Accessible name | `aria-label` = `cardSearchCopy.label` |
| `aria-keyshortcuts` | `Meta+K` (README: `Control+K` off a Mac) |

### Slot glyph (SVG)

| Property | Desktop |
|---|---|
| Width / height | 19 / 19 |
| viewBox | 0 0 20 20 |
| fill | none |
| stroke | currentColor |
| stroke-width | 1.5 |
| stroke-linecap | round |
| Circle | cx 8.6, cy 8.6, r 5.6 |
| Path d | `M12.8 12.8 17 17` |
| aria-hidden | true |

### Slot hover and open (`.rsl.on`)

| Property | Desktop |
|---|---|
| Applies when | pointer on the slot (D1h); field open (D2, D2n, D3, D4, D5, D6, D8, DD2) |
| Background | `var(--elevated)` (#20222A) |
| Color | `var(--fg)` (#E6E8F0) |
| Same as | the lit Collection slot (`.rsl.on`) |
| Name tag shown | on hover only (see Name tag) |
| Slot while card details is up (D7) | rest state again: color `var(--fg-muted)`, no background |
| Slot after card closes (D8) | lit again (`.on`) |

### Slot focus ring

| Property | Desktop |
|---|---|
| Keyboard focus ring on the slot | not drawn |

---

## Component: Rail name tag (hover)

| Property | Desktop |
|---|---|
| Shown | D1h only, while the pointer is on the slot |
| Position | absolute in the frame (`.dk`): left 72px, top 76px; z-index 9 (the rail's right edge is 62px, so 10px out) |
| Height | 28px |
| Padding | 0 10px |
| Border radius | 7px |
| Background | `var(--surface-raised)` (#191B22) |
| Border | 1px solid `var(--border-strong)` |
| Box shadow | 0 10px 24px rgba(0,0,0,.45) |
| Layout | flex, `align-items: center`, gap 8px |
| Label font | inherited IBM Plex Sans, 12.5px, color `var(--fg)`; copy key `label` |
| Shortcut font | IBM Plex Mono, 10.5px, color `var(--fg-faint)`; copy key `shortcutMac` (`shortcutOther` off a Mac) |
| Arrow / caret | not drawn |
| Transition / delay | — |

---

## Component: Field (opens beside the rail)

### Container (`.fly`)

| Property | Desktop |
|---|---|
| Position | absolute in the frame (`.dk`, `position: relative`): left 74px, top 69px |
| Offset from rail | 12px out of the 62px rail; top equals the slot's top (69px) |
| Width | 540px |
| Layout | flex column, gap 8px (between field and dropdown) |
| z-index | 9 (above the card scrim at 7 and modal at 8) |
| Page behind | stays visible; no scrim |
| Caret back to the slot | `::before`, 10x10, absolute left -6px, top 18px, rotate 45deg, background `var(--bg)`, border-left and border-bottom 1px solid `var(--accent)` |
| Width on the page well | the same 540px on Collection and on the deck page (DD2) |

### Field box (`.dfld`)

| Property | Desktop |
|---|---|
| Height | 46px |
| Border | 1px solid `var(--accent)` (#FF4D9A) |
| Border radius | 10px |
| Background | `var(--bg)` |
| Padding | 0 10px 0 16px (top/bottom 0, right 10, left 16) |
| Gap | 12px |
| Layout | flex, `align-items: center` |
| Font size | 15px (family IBM Plex Sans, inherited) |
| Color (typed text) | `var(--fg)` |
| Color (placeholder state, `.ph0`) | `var(--fg-placeholder)` (#7D8294) |
| Box shadow | 0 18px 40px rgba(0,0,0,.45) |
| Placeholder / typed text copy key | `label` as the placeholder; typed text is the query |

### Field glyph (SVG)

| Property | Desktop |
|---|---|
| Width / height | 18 / 18 |
| viewBox | 0 0 20 20 |
| fill | none |
| stroke | currentColor |
| stroke-width | 1.6 |
| stroke-linecap | round |
| Circle | cx 8.6, cy 8.6, r 5.6 |
| Path d | `M12.8 12.8 17 17` |

### Caret

| Property | Desktop |
|---|---|
| Width / height | 1.5px / 18px |
| Background | `var(--accent)` |
| Margin-left, empty field (D2, D2n) | -2px (inline), sits before the placeholder |
| Margin-left, typed (D3, D4, D5, DD2) | -10px (class default), after the typed text |
| Drawn | D2, D2n, D3, D4, D5, DD2; not drawn in D6 and D8 |
| Blink / animation | — |

### Shortcut at the right edge (`.esc`)

| Property | Desktop |
|---|---|
| Shown | until typing starts (D2, D2n); replaced by the clear control once there is a query |
| Margin-left | auto (pushes to the right edge) |
| Font | IBM Plex Mono, 10.5px, weight 500 |
| Color | `var(--fg-faint)` |
| Border | 1px solid `var(--border-strong)` |
| Border radius | 5px |
| Padding | 2px 6px |
| Copy key | `shortcutMac` / `shortcutOther` |

### Clear control (`.clr`)

| Property | Desktop |
|---|---|
| Shown | once the field holds a query (D3, D4, D5, D6, D8, DD2) |
| Glyph | text character ✕ (no SVG) |
| Margin-left | auto |
| Width | 28px, `text-align: center` |
| Font size | 13px |
| Color | `var(--fg-faint)` |
| Accessible name | not specified on the board (`closeAria` is the phone/sheet close; no desktop clear name is given) |
| Behavior | Escape clears the query, then closes (README, keys note) |

---

## Component: Dropdown under the field (`.dres`)

### Container

| Property | Desktop |
|---|---|
| Position | in flow under the field, 8px below (the `.fly` gap) |
| Width | 540px (the `.fly` width) |
| Background | `var(--surface-raised)` (#191B22) |
| Border | 1px solid `var(--border-strong)` |
| Border radius | 12px |
| Box shadow | 0 22px 50px rgba(0,0,0,.6) |
| Padding | 6px 0 |
| Overflow | hidden |
| Role | listbox for the results (README: field is a combobox, `aria-expanded`, `aria-controls`, `aria-activedescendant`) |

### Section header (`.hd`)

| Property | Desktop |
|---|---|
| Used for | Recent cards (D2), the result count (D4, DD2), Searching (D3) |
| Layout | flex, `align-items: center`, `justify-content: space-between` |
| Padding | 8px 14px 6px |
| Font | IBM Plex Mono, 10.5px |
| Letter spacing | .14em |
| Text transform | uppercase |
| Color | `var(--fg-faint)` |
| Copy keys | `recent.heading`, `count(n)`, `searching` |

### Clear link in the header (`.hd a`, D2)

| Property | Desktop |
|---|---|
| Font | IBM Plex Sans, 13px, weight 500 |
| Letter spacing | 0 |
| Text transform | none |
| Color | `var(--accent)` (global `a`) |
| Text underline offset | 3px (underline itself is the browser default for `a`; not overridden) |
| Copy key | `recent.clear` |

### Foot line (`.ft`, D4 only)

| Property | Desktop |
|---|---|
| Padding | 9px 14px 5px |
| Border | top: 1px solid `var(--border)` |
| Font | IBM Plex Mono, 11px |
| Color | `var(--fg-faint)` |
| Layout | flex, `justify-content: space-between` |
| Left span | copy key `keysHint` |
| Right span | copy key `shortcutFoot(shortcut)` |
| Limit line (`limitReached`) | the copy exists; the desktop boards draw no frame at 20 results |

### Skeleton row (`.skel`, D3)

| Property | Desktop |
|---|---|
| Count | 3 |
| Height | 58px |
| Padding | 0 14px |
| Gap | 12px |
| Layout | flex, `align-items: center` |
| Border | top: 1px solid `var(--border)`, except the first row (border-top 0) |
| Art block | 30x42, border radius 4px, background `var(--elevated)` |
| Line column | flex column, gap 9px, flex 1 |
| Lines | 2 per row, height 10px, border radius 5px, background `var(--elevated)` |
| Line widths | row 1: 52% and 30%; row 2: 40% and 24%; row 3: 60% and 34% |

### Progress bar (`.prog`, D3)

| Property | Desktop |
|---|---|
| Height | 2px |
| Background | `var(--border)` |
| Fill | `<i>` absolute, left 0, top 0, bottom 0, width 38%, background `var(--accent)` |
| Margin | 0 0 4px |
| Overflow | hidden |
| Position | first child of the dropdown, above the header |
| Animation | — |

---

## Component: Result row (desktop, `.dres .rr`)

### Row box

| Property | Desktop |
|---|---|
| Layout | flex, `align-items: center` |
| Min height | 58px |
| Padding | 7px 14px 7px 14px |
| Gap | 12px |
| Border | top: 1px solid `var(--border)`; first row (`.first`) none |
| Position | relative |
| Press target | the whole row; no other control on it |
| Accessible name | copy key `row.aria(name, owned, decks, wish)` |

### Art

| Property | Desktop |
|---|---|
| Width / height | 30px / 42px |
| Border radius | 3px |
| Overflow | hidden, flex none |
| Background | `var(--surface-sunken)` |
| Box shadow | 0 0 0 1px rgba(0,0,0,.35), 0 4px 10px rgba(0,0,0,.35) |
| Image | width/height 100%, `object-fit: cover` |
| Source | R1 Rows notes: "the Wishlist panel's row as it ships: 30x42 art" |

### Text column (`.tx`)

| Property | Desktop |
|---|---|
| Layout | flex column, gap 4px, flex 1, min-width 0 |

### Name (`.nm`)

| Property | Desktop |
|---|---|
| Font | IBM Plex Sans, 14px, weight 600 |
| Line height | 1.3 |
| Color | `var(--fg)` |
| Lines | 1 (`-webkit-line-clamp: 1`, ends in an ellipsis past about 420px of the 540 panel) |
| Typed-letter match (`em`) | `font-style: normal`, color `var(--accent)` |
| Title | the card's own name, also for a Secret Lair flavor match |

### Ownership line (`.own`)

| Property | Desktop |
|---|---|
| Layout | flex, `align-items: center`, gap 0, `white-space: nowrap`, min-width 0 |
| Font | IBM Plex Mono, 11px |
| Color | `var(--fg-faint)` |
| Count (`b`) | weight 500, color `var(--fg-body)` |
| Joiner (`.j`) | color `var(--border-dashed)`, `white-space: pre`, flex none; text is ` · ` |
| Deck name (`.dn`) | color `var(--fg-body)`, overflow hidden, ellipsis, min-width 0 (gives way first) |
| More decks (`.pl`) | color `var(--fg-body)`, flex none, text is a non-breaking space then `+N`; never ellipsized |
| Copy keys | REUSED `rowOwned` (`×N owned`), `rowNotOwned`; new `row.inDeck`, `row.moreDecks` |
| Parts present | owned only; owned + deck; owned + deck + `+N`; `not owned` alone; `not owned` with wishlist |

### Flavor line (`.fl`, Secret Lair match)

| Property | Desktop |
|---|---|
| Position | line 2, ownership moves to line 3 |
| Font | IBM Plex Mono, 11px |
| Color | `var(--fg-muted)` |
| Overflow | nowrap, hidden, ellipsis |
| Typed match (`em`) | color `var(--accent)`, `font-style: normal` |
| Copy key | REUSED `rowFlavorNamePrefix` |
| Desktop frame | R1 Rows draws it at desktop; D2–D8 do not use it |

### Wishlist marker (`.wl`)

| Property | Desktop |
|---|---|
| Box | 28px x 28px, flex center, flex none |
| Color | `var(--accent)` |
| Space reserved on rows without it | yes (`.sp`, `visibility: hidden`), so rows align |
| Glyph (SVG) | width 16, height 16, viewBox 0 0 24 24, fill currentColor, stroke currentColor, stroke-width 1.8, stroke-linejoin round |
| Path d | `M6.5 3.5h11v17l-5.5-4-5.5 4z` |
| Accessible name | copy key `row.wishlistAria`, read as the last clause of the ROW's name; the box itself is `aria-hidden` (the board's `aria-label` on the box would announce it twice inside the listbox option; ruled at the close-out, 2026-10-18, matching the phone table) |
| Type | bookmark glyph, not a press |

### Row states

| Property | Desktop |
|---|---|
| Active (`.act`, arrow-key row / first recent) | background `var(--elevated)` |
| Focused (`.foc`, D8, the row that opened the card) | `box-shadow: inset 0 0 0 2px var(--accent)`, border radius 8px |
| Hover | not drawn |
| Press / pressed | not drawn |
| Disabled | not drawn |

---

## Component: Empty state in the panel (D2n)

### Layout

| Property | Desktop |
|---|---|
| Shown | field open, no recent cards, no query |
| Container | flex row, `align-items: center`, gap 18px, padding 14px 18px |
| Graphic left of the text | yes |
| Text block (`.msg`) | padding 0 (override of 14px 16px 12px), flex column, gap 6px |
| Title | IBM Plex Sans, 14.5px, weight 600; copy key `empty.title` |
| Body | font-size 13.5px, line-height 1.55, margin 0, color `var(--fg-muted)`; copy key `empty.body` |
| Title color | not set (inherits `var(--fg)`) |

### Graphic A at 62% (`.g`, aria-hidden, `role="img"`)

| Property | Desktop (62%) | Full size (phone S1, for scale) |
|---|---|---|
| Box | 124 x 93px | 200 x 150px |
| Back card | left 19.22, top 8.68, 43.4 x 62, rotate(-18deg) | left 31, top 14, 70 x 100, rotate(-18deg) |
| Mid card | left 40.3, top 8.68, 43.4 x 62 | left 65, top 14, 70 x 100 |
| Front card | left 61.38, top 8.68, 43.4 x 62, rotate(18deg), font-size 16.12px | left 99, top 14, 70 x 100, rotate(18deg), font-size 26px |
| Lens | left 71.92, top 40.92, 34.72 x 34.72, border-width 1.86px | left 116, top 66, 56 x 56, border-width 3px |
| Handle | left 101.68, top 71.3, 18.6 x 3.1, rotate(45deg) | left 164, top 115, 30 x 5, rotate(45deg) |

Shared styling (not scaled in the board's CSS):

| Property | Value |
|---|---|
| Card (`.bc`) radius / shadow | 8px; 0 10px 24px rgba(0,0,0,.5); position absolute |
| Back card | background #20222A, border 1.5px solid #262A35 |
| Mid card | background #1B1D25, border 1.5px solid #343843 |
| Front card | background `color-mix(in srgb, #FF4D9A 14%, #16181F)`, border 1.5px solid #FF4D9A, flex center, text `99` in Chakra Petch 700, color #FF4D9A |
| Lens | border-radius 50%, border solid #FF4D9A, background rgba(14,15,20,.35), shadow 0 0 0 1px rgba(0,0,0,.4), 0 10px 24px rgba(0,0,0,.45) |
| Handle | background #FF4D9A, border-radius 3px, transform-origin left center |
| Card art anywhere in the empty state | none |

---

## Component: Messages (D5 no results, D6 failed)

### Message block (`.dres .msg`)

| Property | Desktop |
|---|---|
| Padding | 14px 16px 12px |
| Layout | flex column, gap 6px |
| Title (`b`) | IBM Plex Sans, 14.5px, weight 600 |
| Body (`p`) | 13.5px, line-height 1.55, margin 0, color `var(--fg-muted)` |
| D5 copy | REUSED `collectionEditCopy.add.noResultsTitle` and `noResultsBody` (title carries the query in curly quotes) |
| D6 copy | REUSED `collectionEditCopy.add.searchFailed`; body color `var(--fg-body)` (inline, overrides muted); no title |
| D6 role | `role="alert"` |

### Try again button (`.obtn` inside `.msg`, D6)

| Property | Desktop |
|---|---|
| Height | 34px |
| Padding | 0 14px |
| Font | IBM Plex Sans, 13px, weight 500 |
| Border | 1px solid `var(--border-strong)` |
| Border radius | 8px |
| Color | `var(--fg)` |
| Display / align | flex, `align-items: center`, `align-self: flex-start` |
| Margin-top | 6px |
| Copy key | `tryAgain` |

---

## Component: Card details from a result (D7, shipped modal)

Drawn as the shipped 820 card modal; nothing in it is new. Values below are the board's drawing.

| Property | Desktop |
|---|---|
| Field and dropdown | closed (not drawn) |
| Scrim | `.dscrim`, absolute inset 0, background rgba(14,15,20,.78), z-index 7 |
| Modal | `.cmod`, absolute, left 50% / top 50%, translate(-50%,-50%), 820 x 620, z-index 8 |
| Modal border / radius | 1px solid `var(--border-strong)`, 16px |
| Modal background / shadow | #12141B; 0 30px 80px rgba(0,0,0,.7) |
| Left column | 316px wide, background `var(--surface-sunken)`, padding 20px, gap 12px |
| Card image | 248px wide, aspect-ratio 63/88, radius 12px, rotate(-1.2deg) |
| Pager pill (`3 of 10`) | absolute left 16, top 16, height 30, padding 0 11px, radius 999px, background rgba(32,34,42,.85), IBM Plex Mono 11.5px, color `var(--fg-body)` |
| Close (✕) | absolute right 22, top 20, 34 x 34, radius 50%, background `var(--elevated)`, border 1px solid `var(--border-strong)` |
| Find a deck for it | present (nothing sits below the card, lock 1) |
| Paging | through the results (`3 of 10`) |
| Rail slot | rest state (not lit) |

---

## Component: Deck page (DD1, DD2)

### DD1, rail slot beside the page's own add field

| Property | Desktop |
|---|---|
| Rail slot | rest state (color `var(--fg-muted)`), same as D1 |
| Deck's add field | docked at the foot of the column, unchanged |
| Dock padding | 11px 30px (inline) |
| Dock field (`.f`) | max-width 520px, height 38px, font-size 14px |
| Dock field glyph | 16 / 16 (viewBox 0 0 20 20, stroke 1.6, round) |
| Dock field copy | the deck's own `Add a card by name · {identity} only` (not in the card-search copy file; unchanged) |
| Owned-only toggle | unchanged |

### DD2, field open on the deck page

| Property | Desktop |
|---|---|
| Field and dropdown | same `.fly` as D4: left 74, top 69, width 540 |
| Rail slot | lit (`.on`) |
| Query | typed (`gia`), caret and clear control drawn |
| Results | header with count (`count(1)`), one row (active), wishlist bookmark shown, no foot line |
| Deck | untouched; pressing a row opens card details, where Find a deck is the way to add |
| Add field | stays where it is, covered by nothing |

---

## Transitions and animation

| Property | Desktop |
|---|---|
| Slot hover / open | no transition specified |
| Field open / close | no transition specified |
| Dropdown open / close | no transition specified |
| Skeleton shimmer, progress bar motion | not specified (static in the board) |
| Debounce | 150ms after the last key; search starts at 2 characters (README call 1, D3 caption) |
| Live region | polite, always mounted; announces after typing has paused 500ms |

---

## Conditional rendering

| Condition | Rendered |
|---|---|
| Switch off | not on the boards; README G1: the slot, ⌘K and the About entry follow `CARD_SEARCH_ENABLED` |
| Field open, query empty, recent cards exist | dropdown: `Recent cards` header with `Clear`, then recent rows; shortcut chip at the field's right edge |
| Field open, query empty, no recent cards | dropdown: graphic A at 62% beside title and body; shortcut chip at the right edge |
| Query under 2 characters | not drawn |
| Query 2+ characters, first search in flight | progress bar, `Searching…` header, 3 skeleton rows; clear control instead of the chip |
| Later search in flight | phone keeps the previous rows at 50%; the desktop board does not draw this |
| Results | count header, rows, foot line (keys hint left, shortcut foot right) |
| No results | message block only |
| Failed | alert message block with Try again |
| A row has a wishlist flag | bookmark shown; otherwise the 28px space is kept hidden |
| A row has decks | `· in {deck}` and `+N` for the rest |
| A row has no copy | `not owned` replaces the count |
| Row has no decks and owned | count only |
| Row is a Secret Lair flavor match | `printed as` line between name and ownership |
| Card details open | field closed; scrim over the page |
| Card details closed | field reopened as it was (query, results, scroll), focus on the row that opened it |
| Offline | no desktop frame; the board says the field behaves as the phone's S7 (rail's own offline pill) |

---

## State Coverage

| State | Trigger | Board frame | What is drawn |
|---|---|---|---|
| D1 | Any page, search closed | Rail-Desktop D1 | Plain slot under the mark, above Home, rule beneath, color `--fg-muted`, no shortcut, no text |
| D1h | Pointer on the slot | Rail-Desktop D1h | Slot lit (`--elevated`, `--fg`); name tag `Search all cards` + `⌘K` at left 72 / top 76 |
| D2 | Press or ⌘K, recent cards exist | Rail-Desktop D2 | Slot lit; 540 field at left 74 / top 69 with caret, placeholder, `⌘K` chip; dropdown with `Recent cards` header, `Clear`, 5 rows, first active; no foot line |
| D2n | Press or ⌘K, no recent cards | Rail-Desktop D2n | Same field; dropdown holds graphic A at 62% (124x93) beside title and body |
| D3 | 2+ characters typed, first search in flight | Rail-Desktop D3 | Field with `in`, caret, ✕; dropdown: 2px accent bar at 38%, `Searching…`, 3 skeleton rows |
| D4 | Read returned rows | Rail-Desktop D4 | Count header (`10 cards`), 8 rows drawn with typed letters in accent, row 3 active, bookmarks on rows 2 and 4, foot line with keys hint and shortcut |
| D5 | Read returned none | Rail-Desktop D5 | Field `zqx` with ✕; dropdown holds the shipped no-results title and body only |
| D6 | Read failed | Rail-Desktop D6 | Field `in`, ✕, no caret; dropdown holds the failure sentence (`role="alert"`) and Try again |
| D7 | Row pressed or ↵ | Rail-Desktop D7 | Field closed; scrim; shipped 820 modal for the card, pager `3 of 10`, Find a deck for it; slot back to rest |
| D8 | Card closed (✕, Escape, swipe, Back) | Rail-Desktop D8 | Field reopened with `in`, ✕ (no caret), `10 cards`, same rows; row 3 shows the inset 2px accent focus ring; slot lit |
| DD1 | Deck page, search closed | Deck-Page DD1 | Slot at rest at the rail top; deck's own add field in the dock, unchanged |
| DD2 | ⌘K on the deck page, `gia` typed | Deck-Page DD2 | Same field over the deck; `1 card`, one active row with bookmark; dock still visible |
| ⌘K on a Mac | ⌘K, anywhere including inside page fields | Rail-Desktop keys note | Opens the same state as D2; `aria-keyshortcuts="Meta+K"` on the slot |
| Ctrl+K elsewhere | Ctrl+K off a Mac | Rail-Desktop keys note | Same; shortcut text `shortcutOther` (`Ctrl K`); `aria-keyshortcuts="Control+K"` |
| Never Ctrl+K on a Mac | Ctrl+K on a Mac | Rail-Desktop keys note | Does nothing for search (Ctrl+K deletes to end of line in text fields) |
| Not while a dialog is up | ⌘K with a modal or sheet open | Rail-Desktop keys note | Nothing; the dialog's keys are the dialog's |
| ⌘K while open | ⌘K with the field open | Rail-Desktop keys note | Selects the query, so typing starts a new search |
| Escape | Escape in the field | Rail-Desktop keys note, D8 caption | Clears a query, then closes; focus returns to where it was before ⌘K |
| ↑ ↓ ↵ | Arrow keys, Enter | Rail-Desktop D4, keys note | ↓ moves into the rows from the field; ↑ ↓ move the active row; ↵ opens it (D7) |
| Back closes in one press | Browser Back with the field open | README call 7 / 8 | One history entry for search, replaced by the card's; Back from the card returns to search, Back again to the page. Desktop board does not draw it. |
| Focus return | Close by Escape or ✕ | README call 7, D8 caption | Focus to the slot, or to wherever ⌘K was pressed; after a card closes, to the row that opened it |
| Combobox semantics | Field open | Rail-Desktop keys note | `aria-expanded`, `aria-controls`, `aria-activedescendant`; listbox for rows; polite live region announces count or no-results line after 500ms of pause |

---

## Not drawn

- A Mac versus other-platform variant of the slot, tag, chip or foot line: only the `⌘K` form is drawn. `shortcutOther` (`Ctrl K`) exists in the copy file.
- The touch rail (88px) with the `Search` label: described in a caption, no frame.
- The slot's keyboard focus ring.
- Row hover and press states.
- Any transition, easing or animation on the slot, field, dropdown, skeleton or progress bar.
- The limit line at 20 results on desktop (the copy key `limitReached` exists, drawn on the phone only per README).
- A desktop offline state (STATES: "not drawn, on purpose"; behaves as the phone's S7).
- A later search in flight keeping the previous rows at 50% on desktop (phone S3 only).
- The recent cards ownership "read fresh" state; the recent rows are drawn as results are.
- Clear control's accessible name on desktop.
- A shortcut-chip variant when the field has text but is not yet at 2 characters.
- The scroll behavior of a long dropdown (the panel is drawn with a fixed content height and `overflow: hidden`; no max-height or inner scroll is specified).
- An error or limit state inside the foot line.
- The nav slots' own hover colors beyond `.rsl.on`.
- The gap between the dropdown and the viewport bottom.
