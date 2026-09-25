# Design table: Take, the receipt, the card's door and the stacked card (swap tools PR 4b)

**Addendum (#949).** The revised `Stand-ins Sheet.dc.html` makes Take, taken's Undo swap, `Read the list again` and `Close` real `<button>`s built on `btn` and `quiet`, both of which now carry `lineHeight: 1`. Each is drawn `leading-none`, so the desktop buttons are 3–4px shorter than the R2 spans.

**Sources.** `design/design_handoff_the99_swap_tools/`: `Stand-ins Sheet.dc.html` (primary for Take, taken,
`takenNote` and the refused panel: the template at :78-121 and `renderVals()` at :132-245), `Shopping View.dc.html`
(the receipt, the bought stand-in's pending rule, the strip, pill and group counts after a take: template :94-99,
`renderVals()` :151-176, :225-228), `The 99 - Swap Tools.dc.html` (§4 calls 1 and 4 at :44, :56; 1b's card-modal
door at :111-129; 1c's hover preview and stacked card at :153-203; 1d's refused note at :219; 1e at :230-265),
`Card Details.dc.html` (the shipped modal traced for R3: its footer and Prev/Next at :109-116, used only to
bound where the door and the Take footer sit), `README.md` (R2 wins over R1; R3 governs the card modal's
structure), `READINESS.md` (amendment 3b and 3c), `READINESS-audit.md` (**H2**: `Undo swap` in both tools;
**F3(c)**: a card opened from the sheet draws the Take footer instead of Buy and Find; **F4**: `undoRefused`
renders `MutationError` under its row; **F8**: no phone Prev/Next; **F10**: the removal undo on the row reads
`Undo`, so `Undo swap` sits beside `Undo` in the same list; **F11**: the refused body names a cause the swap
cannot know, so the shared body returns a reason or `/copy-review` cuts the cause; a thrown error is a failure
and takes `MutationError`; **F13**: README's R1 text saying `Put it back` is stale; audit engineering note:
the receipt's `your free copy` comes from the take's own read, not the list's), `swap-tools · copy strings.ts`
(keys), and `docs/superpowers/design-tables/swap-tools-sheet.md` (the PR 4a table this extends; its §5.1 grid
and §5.5 resting Take are restated here only where a 4b state changes them, and its §10.3 is carried over as
§9). **Out of scope:** Fits your decks and `Find a deck for it →` (PR 5); the staple read (PR 6).

Copy is recorded as a KEY under `swapToolsCopy` (`sheet.*`, `row.*`, `modal.*`, `limit.*`, `announce.*`) with
its arguments; canvas fixture wording is never a property. `cut` = the original leaving the draft, `add` = the
stand-in joining it, `deck` = the deck's name, `figure` = the deck's limit through `formatCents` (`$10`).
Fonts: `mono` = `'IBM Plex Mono',monospace`, `sans` = `'IBM Plex Sans',sans-serif`, `--display` = the canvas
variable the app spells as the `font-display` class. Mobile is < 768, Desktop ≥ 768; the canvas draws 390 and
1300 (the sheet at 640, the stacked card at 820).

Two button skins recur, both from the sheet's `renderVals()` (:223-228):

- **Apply skin** (`btn`): desktop `inline-flex`, `align-items: center`, radius `7px`, padding `6px 13px`,
  `12.5px / 600`, `var(--accent)` text, `1px solid var(--accent)`, no background. Phone `flex`, centred both
  ways, `72 × 44`, radius `8px`, `13px / 600`, same ink and border.
- **Quiet skin** (`quiet`): desktop `inline-flex`, `align-items: center`, `min-height: 32px`, radius `7px`,
  padding `6px 11px`, `12px / 500`, `var(--fg-muted)`, `1px solid var(--border-strong)`. Phone the same with
  `min-height: 44px`, radius `8px`, padding `0 14px`, `13px / 500`.

---

## 1 · Take (the stand-in row's third cell)

### 1.1 Grid and cell (carried from 4a §5.1, unchanged by 4b)

| Property | Desktop | Mobile |
|---|---|---|
| Row grid columns | `minmax(0,1fr) 96px 64px` | `minmax(0,1fr) 72px` |
| column-gap / row-gap | `12px` / not set | `10px` / `6px` |
| Take cell placement | column 3, row 1 (the 64px column) | column 2, `grid-row: 1 / span 2` (spans the name line and the price line) |
| Take cell display / justify | `flex` / `flex-end` | `flex` / `flex-end` |
| Cell when Take is absent (taken state, other rows) | the cell still renders, empty; the 64px column stays | the cell still renders, empty; the 72px column stays |

### 1.2 Take states

| State | Property | Desktop | Mobile | Source |
|---|---|---|---|---|
| Resting | key | `sheet.take` | same | Sheet :110 |
| Resting | aria-label key | `sheet.takeAria(add, cut)` | same | copy |
| Resting | skin | Apply skin (desktop) | Apply skin (phone, `72 × 44`) | Sheet :223-225 |
| Pressed / taking | key | `sheet.taking` | same | copy only |
| Pressed / taking | visual | **not drawn.** The canvas has no taking frame; only the key exists | same | — |
| Taken (the pressed row) | render | the row's grid is replaced by the taken row (§2.1); no Take | same | Sheet :87-91, :139 |
| Taken (every other row) | render | `canTake: false`: Take is **removed**, not disabled; the cell stays empty; the row keeps its slot and order | same | Sheet :172; README "The other rows drop Take but keep their slots"; Swap Tools :233 |
| Disabled | visual | **not drawn.** The design removes Take rather than disabling it; no disabled skin exists in the package | same | — |
| Refused (the pressed row) | render | Take stays live on the refused row and on every other row; the refused panel (§3) opens under the pressed row | same | Sheet :168 (`refused` sets no `canTake: false`); Swap Tools :219 ("Close … leaves Take live") |
| After a take lands | announcement | `announce.taken(cut, add)` (live region; no visual) | same | copy |

---

## 2 · The taken state in the sheet

### 2.1 Taken row (suggestion-card's applied `AnsweredRow`, stamped `taken`)

Replaces the pressed row's grid in the same slot, inside the row wrapper, which keeps its
`border-bottom: 1px solid var(--border)`.

| Element | Property | Desktop | Mobile |
|---|---|---|---|
| Container | margin | `8px 0` | same |
| Container | display / flex-wrap / align-items | `flex` / `wrap` / `center` | same |
| Container | gap | `9px` | same |
| Container | border-radius / padding | `9px` / `10px 12px` | same |
| Container | background | `var(--surface)` | same |
| Container | border | `1px solid var(--success)` | same |
| Stamp group | flex / display / align-items / gap | `none` / `flex` / `center` / `6px` | same |
| ✓ box | glyph / aria-hidden | `✓` / `true` | same |
| ✓ box | width × height / radius | `15px × 15px` / `4px` | same |
| ✓ box | display / align / justify | `flex` / `center` / `center` | same |
| ✓ box | font-size | `9px` | same |
| ✓ box | border / color | `1px solid var(--success)` / `var(--success)` | same |
| Stamp | key | `sheet.taken` | same |
| Stamp | font-family / size | mono / `9.5px` | same |
| Stamp | letter-spacing / text-transform | `0.1em` / `uppercase` | same |
| Stamp | color | `var(--success)` | same |
| Swap text | content | cut name, then `→`, then add name. **No single key**: the canvas composes it from the two names (the arguments `row.receipt(cut, add)` takes) with split styling | same |
| Swap text | min-width / font-size / color | `0` / `13px` / `var(--fg-body)` | same |
| Swap text, `→` | font-family / color | mono / `var(--success)` | same |
| Swap text, add name | element / weight / color | `b` / `600` / `var(--fg)` | same |
| Undo swap | key / aria key | `row.undoSwap` / `row.undoSwapAria(cut, add)` | same |
| Undo swap | skin | Quiet skin (desktop), `margin-left: auto` | Quiet skin (phone, 44 min-height), `margin-left: auto`; wraps to its own line when the row is short of room (`flex-wrap`) |

### 2.2 `takenNote`

| Property | Value (both widths) |
|---|---|
| Condition | the taken state only |
| key | `sheet.takenNote(cut)` |
| Placement | body flow after the (absent) sentence and before the groups; because the lead is removed in this state, it reads directly under the head plate |
| margin | `0` |
| font-size / line-height | `12.5px` / `1.55` |
| color | `var(--fg-muted)` |
| text-wrap | `pretty` |

### 2.3 What else the taken state changes

| Part | Taken state | Source |
|---|---|---|
| Lead line | removed (`v.lead = null`) | Sheet :170 |
| Head plate | unchanged | Sheet :166 |
| Group headings | unchanged, including a group whose only row was taken | Sheet :172 |
| Other rows | name, thumb, dot, marker, facts and price unchanged; Take removed (§1.2); no reorder | Sheet :172; Swap Tools :233 |
| Foot | unchanged (`sheet.foot(when)`) | Sheet :166 |
| Take from the stacked card (§7.3) | closes the card and lands this same taken state in the sheet | Swap Tools :158 |

---

## 3 · The refused panel (`sheet.refused.*`)

Placed inside the pressed row's wrapper, directly under its grid (so above the row wrapper's bottom border).
The row itself stays live with Take.

| Element | Property | Desktop | Mobile |
|---|---|---|---|
| Panel | role | `alert` | same |
| Panel | margin | `0 0 10px` | same |
| Panel | display / flex-direction / gap | `flex` / `column` / `7px` | same |
| Panel | padding / border-radius | `12px 14px` / `9px` | same |
| Panel | background | `var(--surface)` | same |
| Panel | border | `1px solid var(--avail-over-border)` | same |
| Tag line | display / align-items / gap | `flex` / `center` / `8px` | same |
| `!` box | glyph / aria-hidden | `!` / `true` | same |
| `!` box | width × height / radius | `15px × 15px` / `4px` | same |
| `!` box | font-family / size | mono / `10px` | same |
| `!` box | border / color | `1px solid var(--danger)` / `var(--danger)` | same |
| Tag | key | `sheet.refused.tag` | same |
| Tag | font-family / size / letter-spacing / transform | mono / `9.5px` / `0.12em` / `uppercase` | same |
| Tag | color | `var(--danger)` | same |
| Heading `b` | key | `sheet.refused.heading` | same |
| Heading | font-size / weight / line-height / color | `13.5px` / `600` / `1.35` / `var(--fg)` | same |
| Body `p` | key | `sheet.refused.body(deck, cut, add)`, with F11 applied: the cause clause is kept only if the shared swap body returns that reason; otherwise `/copy-review` cuts it | same |
| Body | margin / font-size / line-height / color / wrap | `0` / `12.5px` / `1.55` / `var(--fg-body)` / `pretty` | same |
| Actions | display / flex-wrap / gap / margin-top | `flex` / `wrap` / `8px` / `4px` | same |
| Read the list again | key | `sheet.refused.reread` | same |
| Read the list again | skin | Apply skin, `width: auto`, padding `6px 13px` | Apply skin, `height: 44px`, `width: auto`, padding `0 14px`, radius `8px` |
| Read the list again | action | re-reads the list (the list may be stale) | same |
| Close | key | `sheet.refused.close` | same |
| Close | skin | Quiet skin with `border: 0`, `min-height: 30px`, padding `4px 6px` | Quiet skin with `border: 0`, `min-height: 44px`, padding `0 10px` |
| Close | action | dismisses the panel; Take stays live | same |
| Condition | the take was refused (the swap body returned no swap). A thrown error is **not** a refusal: it renders `MutationError` under the row (F11) | same |

---

## 4 · The receipt on the Shopping list

### 4.1 Placement

| Outcome | Where the receipt renders | Source |
|---|---|---|
| Bought (stand-in joins Shopping) | in the cut row's slot: the cut's name-order position in its type group, in the row's wrapper, which no longer holds the row | Shopping :94-99, :152; README §4.4 |
| Free (nothing joins) | same: the cut row's slot | Shopping :155 |
| One copy fewer (the cut row stays) | directly under the row, in the same wrapper (`flex-direction: column`, `gap: 4px`) | Swap Tools :236, :248-262 |
| Grid | desktop: one cell of the 2-up grid (`repeat(2, minmax(0,1fr))`, gap `6px 10px`); phone: the single column (gap `6px`) | Shopping :224 |

### 4.2 Receipt row (UndoRow's shell)

| Element | Property | Desktop | Mobile |
|---|---|---|---|
| Container | display / align-items | `flex` / `center` | same |
| Container | gap | `10px` | `9px` |
| Container | border-radius | `7px` | `7px` |
| Container | padding | `7px 9px` | `0 4px 0 8px` |
| Container | min-height | `34px` | `44px` |
| Container | background | `var(--surface-sunken)` | same |
| Container | border | `1px dashed var(--border-strong)` | same |
| Dot spacer | element | empty `span`, aria-hidden, `flex: none`, `8px × 8px` (holds the dot's column; no dot drawn) | same (`8px`, though the phone's row dot is `7px`) |
| Text | key, bought | `row.receipt(cut, add)` | same |
| Text | key, free | `row.receiptFree(cut, add)` | same |
| Text | key, one copy fewer | `row.receiptOneCopy(add)` | not drawn at 390 (desktop column only) |
| Text | accessible name key | `row.receiptAria(cut, add)`: **not drawn**; the element it labels is not specified | same |
| Text | flex / min-width | `1` / `0` | same |
| Text | overflow / text-overflow / white-space | `hidden` / `ellipsis` / `nowrap` | same |
| Text | font-family / size | mono / `11.5px` | same |
| Text | color | `var(--fg-locked)` | same |
| Undo swap | key / aria key | `row.undoSwap` / `row.undoSwapAria(cut, add)` | same |
| Undo swap | flex | `none` | `none` |
| Undo swap | display | inline (text) | `flex`, `align-items: center` |
| Undo swap | height / padding | not set / not set | `44px` / `0 12px` |
| Undo swap | font-size / weight / line-height | `12.5px` / `600` / `1.4` | `13px` / `600` / not set |
| Undo swap | color | `var(--accent)` | `var(--accent)` |
| Undo swap | border-bottom | `1px solid var(--accent-shadow)` | none |

### 4.3 The row that stays (one copy fewer, illustrative, desktop only)

| Property | Value |
|---|---|
| Row | the shipped DecklistRow, carrying the draft's recount pair (`3 → 2`) in the name |
| Row pending mark | `box-shadow: inset 2px 0 0 0 var(--accent)` |
| ⇄ slot | the empty 22px reserve (the row, now at its new figure, reads under the limit in the drawing) |
| Reachability | "no row reaches this state today" (Swap Tools :236); drawn only as an illustration |

### 4.4 The list around the receipt

| Part | Bought | Free | Source |
|---|---|---|---|
| Stand-in row | joins its type group in name order, as a normal Shopping row, with the draft's pending mark `box-shadow: inset 2px 0 0 0 var(--accent)` | nothing joins | Shopping :153, :163; README Components |
| Stand-in row's over mark and ⇄ | computed as any row (a cheaper stand-in is normally under: reserve slot on desktop, nothing on phone) | — | Shopping :171 |
| Group count (`g.count`) | counts live rows only; the receipt is not counted | same | Shopping :174 (`.filter((r) => r.live)`) |
| Shopping pill (`Shopping N`) | counts live rows (8 → 8 in the fixture: one out, one in) | drops by one (8 → 7) | Shopping :156, :203 |
| Strip total | the new total only, the sum of live rows (`$115.06`); no saved or delta figure | new total (`$113.94`) | Shopping :157, :204; README §4.4 |
| Strip total style | mono `14px / 600`, `var(--fg)` (shipped, unchanged) | same | Shopping :58 |
| Limit count | recounted over live rows (`limit.overCount(n)`, 4 → 3) | same | Shopping :159, :205 |
| Receipt text source | — | `receiptFree` when the take's own read found a free copy, not the list's (audit engineering note) | audit §3 notes |

---

## 5 · Undo swap, its refusal, and its announcement

| Property | Value | Source |
|---|---|---|
| Label (both hosts: the sheet's taken row §2.1 and the Shopping receipt §4.2) | `row.undoSwap` (H2: `Undo swap` in both swap tools and tuning; tuning's `Put it back` is renamed to match) | copy; audit H2 |
| aria | `row.undoSwapAria(cut, add)` | copy |
| Skin in the sheet | Quiet skin | Sheet :237 |
| Skin on Shopping | UndoRow's accent action (§4.2) | Shopping :226-228 |
| Neighbouring label | the removal undo on the same Shopping list reads `Undo` (shipped), not `Put back` (F10) | audit F10 |
| Effect | reverses both halves: the cut returns and the add leaves | Swap Tools :72 |
| On success | `announce.undone(cut, add)` (live region) | copy |
| Refused | `sheet.undoRefused`, rendered as the shipped `MutationError` under the row that hosts the Undo swap (F4). **Not drawn** | audit F4 |
| Receipt lifetime | **not drawn**: nothing states when a receipt leaves the list | — |

---

## 6 · The card modal's door (`modal.seeStandIns`)

### 6.1 Condition

| Case | Renders? | Source |
|---|---|---|
| Card modal opened from a Shopping row, row over the limit | yes, with `modal.overLimit(figure)` beside the tag | README R2; Swap Tools :128 |
| Card modal opened from a Shopping row, row under the limit | yes, with `modal.underLimit(figure)` beside the tag | Swap Tools :104, :115 |
| Card modal opened anywhere else | no | Swap Tools :128; READINESS amendment 3b |
| Stand-in card stacked from the sheet (§7) | no; it carries the Take footer instead | Swap Tools :158; audit F3(c) |

### 6.2 Placement and style (canvas 1b, a 500px content column; the phone at 390)

| Element | Property | Desktop | Mobile |
|---|---|---|---|
| Door block | placement | under the buy tag, which sits between the title block and the oracle text box | same |
| Door block | display / flex-direction | `flex` / `column` | same |
| Door block | gap (tag line to link) | `8px` | `2px` |
| Surrounding column gap | modal content gap | `22px` | `16px` |
| Tag line | display / align-items / gap | `flex` / `center` / `8px` | same |
| Buy tag | font-family / size | mono / `10px` | same |
| Buy tag | border-radius / padding | `4px` / `2px 6px` | same |
| Buy tag | color / background | `var(--warning)` / `color-mix(in oklab, var(--warning) 13%, transparent)` | same |
| Buy tag | content | `buy`, `·` in `var(--border-strong)` (padding `0 3px`), figure in `var(--fg-body)` | same |
| Limit text | key | `modal.underLimit(figure)` or `modal.overLimit(figure)` | same |
| Limit text | font-family / size | mono / `10.5px` | same |
| Limit text | color, under | `var(--fg-faint)` | same |
| Limit text | color, over | **not drawn** (only the under case is drawn) | same |
| Link | key | `modal.seeStandIns` | same |
| Link | display / align-items | `inline-flex` / `center` | same |
| Link | min-height | `0` | `44px` |
| Link | font-size / weight / color | `13px` / `600` / `var(--accent)` | same |
| Link inner span | border-bottom | `1px solid var(--accent-shadow)` | same |
| Link | action | opens the stand-ins sheet for that row (§7.1) | same |

---

## 7 · Stacking

### 7.1 The stand-ins sheet opened from the card modal (the door)

| Property | Value |
|---|---|
| What opens | "the same sheet" as the ⇄ (Swap Tools :104): `ModalChrome` 640 centred / from 52px on the phone (4a §1.1) |
| Card modal underneath | **not drawn.** Neither the canvas nor README says whether the card modal stays mounted under the sheet or closes first; the audit's F3(b) reverse-stacking note covers the Fits picker only |
| A stand-in opened from that sheet | stacks per §7.2, which would make card → sheet → card if the first card stays. **Not drawn** |

### 7.2 A stand-in's card, stacked over the sheet

| Element | Property | Desktop (820 over a 640 sheet) | Mobile |
|---|---|---|---|
| Trigger | — | the stand-in row's name (dotted underline) or its thumb: click | tap |
| Component | — | `CardModal` with `stacked` and `backLabel` = `sheet.backLabel` | same |
| Sheet underneath | — | stays mounted under its scrim | stays mounted; its 43px header remains visible from 52px to 95px |
| Card placement | position | centred horizontally (left `240` at 1300), top `120px` | `top: 96px`, `left: 0`, `right: 0`, `bottom: 0` |
| Card | width | `820px` (Card Details: `824`) | full width |
| Card | background | `var(--surface-raised)` | same |
| Card | border | `1px solid var(--border-strong)` | `border-top: 1px solid var(--border-strong)` |
| Card | border-radius | `14px` | `14px 14px 0 0` |
| Card | box-shadow | `0 24px 60px rgba(0,0,0,0.55)` | `0 -12px 30px rgba(0,0,0,0.45)` |
| Art | — | left column `320px` (Card Details: `322px`) | header band `170px` tall (Card Details phone: `180px`) |
| Way back | element | back pill in the close slot, content `←` + `sheet.backLabel` | the shipped `×` (44 × 44, top `6px`, right `6px`, mono `14px`, `var(--fg)`), which closes the card and uncovers the sheet |
| Back pill | display / align-items | `inline-flex` / `center` | — |
| Back pill | height / padding / radius | `34px` / `0 12px` / `999px` | — |
| Back pill | border / background | `1px solid var(--border-strong)` / `var(--elevated)` | — |
| Back pill | font-size / weight / color | `12.5px` / `600` / `var(--fg)` | — |
| Title | size | `21px` | `20px` |
| Buy and Find footer | render | **replaced** by the Take footer (F3(c)) | the in-flow Mana Pool link is not drawn on this card |

### 7.3 The Take footer (`CardModal` footer slot, READINESS amendment 3c)

| Element | Property | Desktop | Mobile |
|---|---|---|---|
| Condition | — | the card was opened stacked from the stand-ins sheet | same |
| Footer | position | `margin-top: auto` (pinned to the card's bottom) | `flex: none` at the bottom of the card's column (pinned) |
| Footer | display / direction | `flex` / row, `align-items: center` | `flex` / `column` |
| Footer | gap | `12px` | `8px` |
| Footer | padding | `12px 24px` | `10px 16px 20px` |
| Footer | border-top | `1px solid var(--border)` | same |
| Footer | background | `var(--surface-sunken)` | same |
| Pager | content | `‹`, position `pos of total`, `›` (paging the sheet's list, §7.4) | **none** (F8) |
| Pager | font-family / size / color | mono / `11px` / `var(--fg-faint)` | — |
| In place of | key | `modal.inPlaceOf(cut, deck)` | `modal.inPlaceOfShort(cut, pos, total)` |
| In place of | flex / font-family / size / color | `1` / mono / `10.5px` / `var(--fg-muted)` | same |
| Mobile line 1 | display / align-items / gap | — | `flex` / `center` / `8px` (in place of, then the tag) |
| Tag, free | key / style | `sheet.free`; mono `9.5px`, radius `4px`, padding `1px 6px`, `var(--success)` on `color-mix(in oklab, var(--success) 13%, transparent)` | same |
| Tag, to buy | style | the stand-in row's buy tag (4a §5.4.1) | same |
| Take | key | `sheet.take` | `modal.take(add)` |
| Take | aria key | `sheet.takeAria(add, cut)` | same |
| Take | skin | Apply skin (desktop), inline | full-width block: `flex`, centred, `height: 44px`, radius `8px`, `13px / 600`, `var(--accent)`, `1px solid var(--accent)` |
| Take | action | closes the card and lands the taken state in the sheet (§2) | same |
| Take refused / taking | visual | **not drawn** on the card | same |

### 7.4 Paging (desktop only)

| Property | Value | Source |
|---|---|---|
| List paged | the sheet's own stand-ins, in the sheet's order, across its groups (`1 of 4` = 2 free + 2 to buy); the original is not in the list | README R2; Swap Tools :157, :181 |
| Phone | no Prev/Next (F8); `inPlaceOfShort` still prints the position | audit F8; Swap Tools :199 |
| After a take | not drawn (Take closes the card) | — |

### 7.5 The head plate's name

| Property | Value |
|---|---|
| Behaviour | opens the original's card (README Components, 4a §2) |
| Stacking, Take footer, paging | **not drawn**: nothing says whether it stacks with `backLabel`, and it has no Take |

---

## 8 · Hover preview on a stand-in

| Property | Desktop (fine pointer) | Mobile |
|---|---|---|
| Component | the shipped hover preview (`usePreviewRow` / `HoverPreviewProvider`) | none (coarse pointer) |
| Attaches to | the stand-in row's name **and** its 22×31 thumb | — |
| Condition | fine pointer only | — |
| Where drawn | beside the sheet (the canvas frame puts it 16px right of the 640 sheet's edge); placement is the shipped preview's own | — |
| Row hover tint | the 1c frame draws a `color-mix(in oklab, var(--fg) 5%, transparent)` box, radius `6px`, over the hovered name and thumb; README does not mention it | — |
| Head plate thumb and name | not stated | — |

---

## 9 · The key line (carried from 4a §10.3)

| Property | Value |
|---|---|
| Glyph span | `⇄` in `var(--warning)` |
| Text key | `limit.key`, drawn after the glyph and a space |
| font-family / size / line-height | mono / `10px` / `1.5` |
| color | `var(--fg-faint)` |
| Placement | under the limit line's row, in the limit block (flex column, gap `4px` desktop / `0` phone) |

---

## 10 · Hover and focus

| Element | Hover | Focus |
|---|---|---|
| Take | Apply's shipped skin; not drawn | shipped focus ring; not drawn |
| Undo swap (sheet) | quiet skin's shipped hover; not drawn | shipped; not drawn |
| Undo swap (Shopping receipt) | UndoRow action's shipped hover; not drawn | shipped; not drawn |
| Read the list again / Close | not drawn | not drawn |
| `See cheaper stand-ins →` | not drawn (the canvas's global rule `a:hover { color: var(--accent-hover) }` applies to anchors only; the door is drawn as a span) | not drawn |
| Back pill | not drawn | not drawn |
| Stand-in name / thumb | the hover preview (§8) and the row tint | not drawn |
| Refused panel | `role="alert"`; focus movement not specified | — |
| After Take in the sheet | focus target not specified | — |

---

## 11 · Mobile vs desktop summary

| Part | Desktop | Mobile |
|---|---|---|
| Take cell | column 3, 64px | column 2, 72px, spans both rows |
| Take | inline Apply, `6px 13px` | `72 × 44` |
| Taken row | Undo swap quiet, 32 min | Undo swap quiet, 44 min |
| Refused actions | reread `6px 13px`; close 30 min, `4px 6px` | reread 44 tall, `0 14px`; close 44 min, `0 10px` |
| Receipt | 34 min, `7px 9px`, gap 10 | 44 min, `0 4px 0 8px`, gap 9 |
| Receipt Undo swap | 12.5 text link with `--accent-shadow` underline | 13, 44-tall box, `0 12px`, no underline |
| Door link | min-height 0, 8px under the tag | 44px, 2px under the tag |
| Stacked card | 820 at top 120, back pill 34 | from 96, `×` 44 |
| Take footer | one row: pager · in place of · tag · Take | two rows: in place of + tag; full-width 44 `Take {add}` |
| Paging | `‹ pos of total ›` | none |
| Hover preview | name and thumb, fine pointer | none |

---

## State Coverage

| State | Triggering condition | Component rendered | Key props |
|---|---|---|---|
| Take resting | a live stand-in row, nothing taken | Take in the row's third cell (desktop) / spanning cell (phone) | `add`, `cut` for `takeAria` |
| Taking | Take pressed, swap in flight | Take reading `sheet.taking` (visual undrawn) | row id |
| Taken, in the sheet | the swap landed | taken row (✓, `taken`, cut → add, Undo swap) in the pressed row's slot; `takenNote(cut)` under the head; lead removed; other rows with no Take | `cut`, `add`, `canTake: false` on the rest |
| Refused | the swap body returned no swap | refused panel under the pressed row; Take live everywhere | `deck`, `cut`, `add`, the refusal reason (F11) |
| Take errored | the swap threw | `MutationError` under the row (F11) | error |
| Receipt, bought | take landed, stand-in is a card to buy | receipt in the cut's slot with `row.receipt(cut, add)`; stand-in row joins its group with the pending rule; pill unchanged; new total; recount | `cut`, `add`, snapshot id |
| Receipt, free | take landed, the take's read found a free copy | receipt in the cut's slot with `row.receiptFree(cut, add)`; nothing joins; pill −1; new total | `cut`, `add`, `free: true`, snapshot id |
| Receipt, one copy fewer | the cut row had more than one copy | row stays with its recount pair and pending rule; receipt under it with `row.receiptOneCopy(add)` (illustrative; unreachable today) | `add`, snapshot id |
| Undo swap | Undo swap pressed on the taken row or the receipt | both halves reversed; `announce.undone(cut, add)` | snapshot id, `cut`, `add` |
| Undo refused | the undo could not land | `MutationError` with `sheet.undoRefused` under the hosting row (undrawn) | — |
| Door, under | card modal opened from a Shopping row under the limit | buy tag, `modal.underLimit(figure)`, `modal.seeStandIns` | `figure`, the row's card and deck |
| Door, over | card modal opened from a Shopping row over the limit | buy tag, `modal.overLimit(figure)`, `modal.seeStandIns` | `figure`, the row's card and deck |
| No door | card modal opened anywhere else, or stacked from the sheet | nothing | opener is not Shopping |
| Sheet over card modal | door pressed | stand-ins sheet (stacking undrawn) | the row's card and deck |
| Stand-in card stacked | a stand-in's name or thumb pressed | `CardModal stacked`, `backLabel = sheet.backLabel`, Take footer | `cut`, `deck`, `pos`, `total`, free or price |
| Stand-in card, paged | desktop ‹ or › | the next stand-in's card in the sheet's order | `pos`, `total` |
| Take from the card | Take in the Take footer | card closes; taken state in the sheet | `cut`, `add` |
| Hover preview | fine pointer over a stand-in's name or thumb | shipped hover preview beside the sheet | the stand-in's image |
| Key line | the limit line renders | `⇄` + `limit.key` | none |
