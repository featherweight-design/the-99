# Design property table — Top off the last 31 (`design_handoff_the99_top_off`, R3)

Derived **only** from `design/design_handoff_the99_top_off/` (README.md, STATES-top-off.md,
LONG-LIST-thirty-one-rows.md, READINESS.md, the canvas `The 99 - Top Off.dc.html` + its
`data-dc-script` block, `top-off · copy strings.ts`, and `brand/`). No `src/` file was read.

Breakpoint: **640px** (Tailwind `sm:`). "Mobile" = the canvas's Phone-390 frames; "Desktop" = the
940px frames. Where a value is identical it is written in both columns.

## Token map used throughout

The canvas is raw hex. This is the hex → CSS-variable mapping the canvas's own "Tokens spent" panel
and the brand sheet establish. **Implementations must use the variable, never the hex.**

| Hex | Variable | Canvas usage |
|---|---|---|
| `#C9A24B` | `var(--accent)` | the door, the commit, synergy figure, ticked box |
| `#6E5B33` | `var(--accent-shadow)` | ticked row border, buy-tag hairline, in-flight primary border, the `i` disc ring |
| `#211C15` | `var(--elevated-hover)` | ticked row fill; newest ledger line fill |
| `#6FA368` | `var(--success)` | owned dot, filled 7px — nothing else |
| `#D9975C` | `var(--avail-hard-fg)` | committed dot; the count-only marker chip |
| `#E0913C` | `var(--warning)` | buy tag ink; the one commit total |
| `#C6533F` | `var(--danger)` | a refused write, nothing else |
| `#EDE6D8` | `var(--fg)` | card names, Cancel label |
| `#C6B79A` | `var(--fg-body)` | ledger sentences, live counts, ghost-control labels |
| `#A89B84` | `var(--fg-muted)` | canvas annotation prose only (not a product surface) |
| `#8E8269` | `var(--fg-faint)` | captions, inclusion figure, header row, decline name |
| `#6A6152` | `var(--fg-locked)` | mono notes, static counts, inert glyph, "the sweep reverses it" |
| `#1E1A15` | `var(--surface)` | candidate row / ledger line background |
| `#1A160F` | `var(--surface-rail)` | the strip box |
| `#2A241D` | `var(--border)` | row borders, rules, chips |
| `#3A3229` | `var(--border-strong)` | strip border, ghost-button border, dashed rules |
| `#14110E` | `var(--bg)` | the phone commit bar / quick-add dock ground |
| `#F4E9C4` | `var(--w)` | white cost pip |
| `#3A6AA5` | `var(--u)` | blue cost pip |
| `#C05A3E` | `var(--r)` | red cost pip |
| `#3A3229` | `var(--generic)` (generic pip) | generic numeral pip + `+N` pip fill |

Fonts: `var(--font-mono)` = `'IBM Plex Mono', monospace`; `var(--font-sans)` = `'IBM Plex Sans',
sans-serif`; `var(--font-display)` = `'Cinzel', serif` (display is not used by any component in this
pass).

---

# 1 · The strip (`LastSlotsStrip`) — the box

Unchanged from shipped. Same position under the provenance ledger, above the decklist.

| Property | Mobile (<640px) | Desktop (≥640px) |
|---|---|---|
| background | `var(--surface-rail)` | `var(--surface-rail)` |
| border | `1px solid var(--border-strong)` | `1px solid var(--border-strong)` |
| border-radius | `10px` | `10px` |
| padding (closed) | `13px 14px` | `14px 16px` |
| padding (open) | `12px 12px 10px` | `14px 16px` |
| margin-bottom | `12px` (gap in the parent column, `gap:12px`) | `16px` |
| display | `block` | `block` |
| Presence | absent iff `openSlots <= 0` (states 10, 14). Never absent for an unowned pool | same |

## 1a · Strip heading — `The last {n}`

| Property | Mobile | Desktop |
|---|---|---|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `10px` | `10.5px` |
| letter-spacing | `0.14em` | `0.14em` |
| text-transform | `uppercase` | `uppercase` |
| color | `var(--accent)` | `var(--accent)` |
| font-weight | (inherited normal) | (inherited normal) |
| margin-bottom | `4px` (heading is its own block) | — (baseline row, `gap: 10px`) |
| display context | own line | `display:flex; align-items:baseline; gap:10px; margin-bottom:11px` with the caption |
| Changes between states | **the number only** — never rank, never colour, never an icon | same |

## 1b · Strip caption

| Property | Mobile | Desktop |
|---|---|---|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `10px` | `10.5px` |
| color | `var(--fg-faint)` | `var(--fg-faint)` |
| letter-spacing | — | — |
| text-transform | — | — |
| margin-bottom | `11px` | — (in the baseline row with the heading) |
| copy | `strip.captionMobile` | `strip.caption` |
| Presence | absent in state 13 | absent in state 13 |

## 1c · The door — `Choose the last {n}` (`PrimaryButton`, brass-outline form)

| Property | Mobile | Desktop |
|---|---|---|
| display | `flex` | `inline-flex` |
| align-items | `center` | `center` |
| justify-content | `center` | — (default) |
| gap | `8px` | `9px` |
| width | full width of the strip (block) | auto |
| min-height | `44px` | — |
| padding | — (min-height carries it) | `10px 16px` |
| border | `1px solid var(--accent)` | `1px solid var(--accent)` |
| border-radius | `8px` | `8px` |
| background | `transparent` | `transparent` |
| color | `var(--accent)` | `var(--accent)` |
| font-family | `var(--font-sans)` | `var(--font-sans)` |
| font-size | `14px` | `13px` |
| font-weight | `600` | `600` |
| Touch target | **44px** | — |
| aria | `aria-expanded` / `aria-controls` → the list; focus follows the disclosure (erratum 1) | same |
| aria-label | `strip.openAria(n)` | same |
| Never | solid brass fill; never disabled (a control with nothing to do is absent) | same |

### 1c-i · The door's trailing glyph `↓`

| Property | Mobile | Desktop |
|---|---|---|
| character | `↓` (`&darr;`, U+2193) | `↓` |
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `12px` | `12px` |
| color | `var(--fg-faint)` | `var(--fg-faint)` |
| role | decorative — `aria-hidden` | decorative — `aria-hidden` |

## 1d · Door note

| Property | Mobile | Desktop |
|---|---|---|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `10px` | `10.5px` |
| color | `var(--fg-locked)` | `var(--fg-locked)` |
| line-height | `1.55` | `1.6` |
| margin-top | `9px` | — (same flex row as the door) |
| flex | — (own block) | `1` |
| min-width | — | `240px` |
| layout | below the door | `display:flex; gap:12px; align-items:center; flex-wrap:wrap` with the door |
| length | **one clause at 390px** | full sentence |
| copy | `strip.doorNote` / `.doorNoteAgain` / `.doorNoteAgainOwned` | same |

## 1e · `Close the list`

| Property | Mobile | Desktop |
|---|---|---|
| label | `Close` (canvas draws the shortened form at 390px) | `Close the list` |
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `10px` | `11px` |
| color | `var(--fg-faint)` | `var(--fg-faint)` |
| border-bottom | `1px dashed #4A4033` | `1px dashed #4A4033` |
| border (other sides) | — | — |
| background | `transparent` | `transparent` |
| position | `margin-left:auto` in the list head's baseline row | `margin-left:auto` in the list head's baseline row |
| Touch target | **44px hit area** | — |
| Focus return | returns focus to the door, or to the exhausted plate when the pass emptied the pool and the door is gone (erratum 1) | same |
| Copy | `strip.close` — and **the same string is not used for Cancel** | same |

---

# 2 · Selection head (open only)

| Property | Mobile | Desktop |
|---|---|---|
| display | `block` (counts line then a 2-up control row) | `flex` |
| align-items | — | `center` |
| gap | `8px` (between the two controls) | `12px` |
| flex-wrap | — | `wrap` |
| padding | — | `10px 0 11px` |
| border-bottom | — (the phone head has no rule; the strip box divides it) | `1px solid var(--border)` |
| Sticky? | **no sticky list head, at either width** | **no** |

## 2a · The counts line

| Property | Mobile | Desktop |
|---|---|---|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `10px` (canvas draws `38 candidates · ranked by synergy` in the phone head) | `11px` |
| color — live figure (`{t} of {n} slots ticked`) | `var(--fg-body)` | `var(--fg-body)` |
| color — static figures (`{c} candidates, {u} untouched`) | `var(--fg-locked)` | `var(--fg-locked)` |
| copy | `list.headMobile` | `list.head` |

## 2b · `Tick the {owned} I own` / `Clear all ticks` (ghost controls, two)

| Property | Mobile | Desktop |
|---|---|---|
| display | `flex` | `inline-flex` |
| align-items | `center` | `center` |
| justify-content | `center` | — |
| flex | `1` each | `none` |
| height / min-height | `min-height: 44px` | `height: 30px` |
| padding | — (flex centring) | `0 11px` |
| border | `1px solid var(--border-strong)` | `1px solid var(--border-strong)` |
| border-radius | `8px` | `8px` |
| background | `transparent` | `transparent` |
| color | `var(--fg-body)` | `var(--fg-body)` |
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `11px` | `11px` |
| layout | **side by side on one row**, `display:flex; gap:8px; margin-top:11px` | in the head's flex row |
| Touch target | **44px** | — |
| label and aria-label (both controls) | `bulk.collection(n)` / `bulk.collectionAria(n, concession)` and `bulk.best(n)` / `bulk.bestAria(n, concession)`, where `n` is the rows that control's press ticks (its plan's ids the list allows). A control whose `n` is 0 is not drawn | same |

## 2c · Ordering note

| Property | Mobile | Desktop |
|---|---|---|
| Presence | — (absent at 390px; the canvas's phone head carries `ranked by synergy` in the caption instead) | present |
| font-family | — | `var(--font-mono)` |
| font-size | — | `10px` |
| color | — | `var(--fg-locked)` |
| position | — | `margin-left:auto` |
| copy | — | `list.ordering` |

---

# 3 · Header row (column labels) — **desktop only**

| Property | Mobile | Desktop |
|---|---|---|
| Presence | **absent** | present |
| display | — | `flex` |
| align-items | — | `center` |
| gap | — | `10px` |
| padding | — | `9px 4px 7px` |
| font-family | — | `var(--font-mono)` |
| font-size | — | `9.5px` |
| letter-spacing | — | `0.12em` |
| text-transform | — | `uppercase` |
| color | — | `var(--fg-faint)` |

Columns, in DOM order (mirrors the candidate row exactly):

| Column | Width | text-align | Label |
|---|---|---|
| tick spacer | `18px`, `flex:none` | — | (empty) |
| dot spacer | `7px`, `flex:none` | — | (empty) |
| card | `flex:auto; min-width:0` | left | `Card` (`list.colCard`) |
| cost | `40px`, `flex:none` | `right` | `Cost` |
| availability | `84px`, `flex:none` | — | (empty) |
| synergy | `88px`, `flex:none` | `right` | `Synergy` (`list.colSynergy`) |
| decks | `52px`, `flex:none` | `right` | `Decks` (`list.colDecks`) |

---

# 4 · Candidate row

## 4a · Shell

| Property | Mobile | Desktop |
|---|---|---|
| display | `flex` | `flex` |
| align-items | `center` | `center` |
| gap | `9px` | `10px` |
| min-height | `52px` | `34px` |
| padding | `0 4px 0 8px` (8 left / 4 right) | `0 9px` |
| background (unticked) | `var(--surface)` | `var(--surface)` |
| border (unticked) | `1px solid var(--border)` | `1px solid var(--border)` |
| background (ticked) | `var(--elevated-hover)` | `var(--elevated-hover)` |
| border (ticked) | `1px solid var(--accent-shadow)` | `1px solid var(--accent-shadow)` |
| border-radius | `7px` | `7px` |
| Row gap between rows | `6px` (list column `display:flex; flex-direction:column; gap:6px`) | `5px` |
| The whole row is the label | yes — target is the row, not the box | yes |
| Truncation | **the name never truncates**; the row wraps to two lines | name is `flex:auto; min-width:0` |

## 4b · Phone two-line structure (mobile only)

| Element | Property | Value |
|---|---|---|
| content column | display / flex / min-width | `flex; flex:auto; min-width:0` |
| content column | flex-direction | `column` |
| content column | gap | `4px` |
| line 1 | display / align-items / gap | `flex; center; 7px` |
| line 1 contents | — | dot · full name · **availability slot** (the marker never moves down) |
| line 2 | display / align-items / gap | `flex; center; 8px` |
| line 2 | font-family / font-size | `var(--font-mono)` / `10px` |
| line 2 contents | — | pips (13px, **uncapped, no shingling**), synergy, inclusion |
| pip sub-track (line 2) | display / gap | `flex; align-items:center; gap:3px` |

## 4c · Card name

| Property | Mobile | Desktop |
|---|---|---|
| font-family | `var(--font-sans)` | `var(--font-sans)` |
| font-size | `12.5px` | `13.5px` |
| color | `var(--fg)` | `var(--fg)` |
| flex | `auto` (**never `flex-1`**) | `auto` (**never `flex-1`**) |
| min-width | `0` | `0` |
| font-weight | (normal) | (normal) |
| Type line | **—** (dropped; the pip track replaced it) | **—** |

## 4d · Synergy figure

| Property | Mobile | Desktop |
|---|---|---|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `10px` | `12px` |
| color | `var(--accent)` | `var(--accent)` |
| width | auto (line 2) | `88px`, `flex:none` |
| text-align | left (line 2 order) | `right` |
| format | signed, points (`+34`) | signed, points (`+34`) |

## 4e · Inclusion figure

| Property | Mobile | Desktop |
|---|---|---|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `10px` | `11px` |
| color | `var(--fg-faint)` | `var(--fg-faint)` |
| width | auto (line 2) | `52px`, `flex:none` |
| text-align | left (line 2 order) | `right` |
| format | unsigned percentage (`29%`) | unsigned percentage (`29%`) |

## 4f · Row accessibility

| Property | Mobile | Desktop |
|---|---|---|
| accessible name | `list.rowAria(name, ownership, syn, inc)`, preceded by `manaCopy.costAria` (uncapped) | same |
| dot / pips / availability chip / both figures | all `aria-hidden` | all `aria-hidden` |
| control | a real `checkbox` with `aria-checked`; Tab reaches every row, Space toggles | same |
| group | `role="group"` with accessible name `list.groupAria(cand, n)` | same |

---

# 5 · Tick box

## 5a · Unticked (default)

| Property | Mobile | Desktop |
|---|---|---|
| width | `26px` | `18px` |
| height | `26px` | `18px` |
| flex | `none` | `none` |
| border-radius | `6px` (canvas) — README specifies `5px` (see Silent §S1) | `5px` |
| border | `1px solid var(--border-strong)` | `1px solid var(--border-strong)` |
| background | `transparent` | `transparent` |
| color (glyph) | `var(--fg-faint)` | `var(--fg-faint)` |
| glyph | `+` | `+` |
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `13px` | `11px` |
| display / align-items / justify-content | `flex` / `center` / `center` | `flex` / `center` / `center` |
| Touch target | **26px box in a 52px row; the row is the target** | 18px box on a 34px row; the row is the target |

## 5b · Ticked

| Property | Mobile | Desktop |
|---|---|---|
| border | `1px solid var(--accent)` | `1px solid var(--accent)` |
| background | `color-mix(in srgb, var(--accent) 12%, transparent)` (canvas: `#252017`) | same |
| color (glyph) | `var(--accent)` | `var(--accent)` |
| glyph | `✓` (U+2713) | `✓` (U+2713) |
| all other properties | as 5a | as 5a |

## 5c · Inert (at the tick cap, state 6)

| Property | Mobile | Desktop |
|---|---|---|
| border | `1px solid var(--border)` | `1px solid var(--border)` |
| background | `transparent` | `transparent` |
| glyph | `+` | `+` |
| color (glyph) | `var(--fg-locked)` per README (canvas draws `#494037`; see Silent §S2) | same |
| row opacity | `0.55` | `0.55` |
| aria | `aria-disabled` + `aria-describedby` → the cap line | same |
| Hidden? | **never hidden** — the row keeps its figures and its price | **never hidden** |

## 5d · In-flight (state 8)

| Property | Mobile | Desktop |
|---|---|---|
| interactivity | list non-interactive, **fully legible** | same |
| skeleton | **—** (none) | **—** |
| row collapse | **—** (nothing unmounts, nothing collapses) | **—** |

---

# 6 · Ownership dot (`OwnershipDot`, shared, three states)

| Property | Mobile | Desktop |
|---|---|---|
| width | `7px` | `7px` |
| height | `7px` | `7px` |
| flex | `none` | `none` |
| border-radius | `999px` | `999px` |
| aria | `aria-hidden` — the words live in the row's accessible name | same |

| State | background | border |
|---|---|---|
| Owned | `var(--success)` | `1px solid var(--success)` (i.e. filled) |
| Committed (owned, every copy sleeved) | `var(--avail-hard-fg)` | `1px solid var(--avail-hard-fg)` (filled) |
| Unowned | `transparent` | **`1px dashed var(--fg-locked)`** — never a solid hollow ring |

---

# 7 · Cost track (`CostPips`)

## 7a · Track

| Property | Mobile | Desktop |
|---|---|---|
| position in the row | line 2, leading | **between the name block and the availability slot** |
| width | auto | **`40px` fixed**, `flex:none` |
| display / align-items / justify-content | `flex` / `center` / — | `flex` / `center` / `flex-end` (right-aligned) |
| gap | `3px` | `3px` |
| shingling | **none** (uncapped, no shingling at phone) | from **three symbols**, `margin-left: -5px` on pips 2..n |
| cap | **uncapped** | **five slots**; at six or more symbols → four fanned pips + a generic `+N` pip |
| aria | `aria-hidden` | `aria-hidden` |
| sr-only alternative | `manaCopy.costAria` — speaks the whole cost, **never capped** | same |

## 7b · Pip

| Property | Mobile | Desktop |
|---|---|---|
| width | `13px` | `12px` |
| height | `13px` | `12px` |
| border-radius | `999px` | `999px` |
| font-family (numeral / `+N`) | `var(--font-mono)` | `var(--font-mono)` |
| font-size (numeral / `+N`) | `8px` | `8px` |
| display / align-items / justify-content | `flex` / `center` / `center` | `flex` / `center` / `center` |
| background — generic / numeral / `+N` | `#3A3229` (generic pip fill) | `#3A3229` |
| color — generic numeral text | `var(--fg-body)` | `var(--fg-body)` |
| background — W | `var(--w)` (`#F4E9C4`) | same |
| background — U | `var(--u)` (`#3A6AA5`) | same |
| background — R | `var(--r)` (`#C05A3E`) | same |
| color — coloured pip text | `transparent` (no glyph) | `transparent` |
| margin-left — pip 1 | `0` | `0` |
| margin-left — pips 2..n, cost of 2 | `0` | `0` |
| margin-left — pips 2..n, cost of ≥3 | — (no shingling at phone) | `-5px` |
| Absent pip | `display: none` | `display: none` |
| Ring rules for `--b` | R5's shipped ring rules, unchanged (canvas: `#1E1B1A` fill + `1px solid #3A3229`) | same |

---

# 8 · Availability slot — exactly one occupant, or one legitimate silence

## 8a · Slot

| Property | Mobile | Desktop |
|---|---|---|
| position | line 1, after the name | after the cost track, before synergy |
| width | auto, `flex:none` | **`84px` fixed**, `flex:none` |
| display / align-items / justify-content | `flex` / `center` / — | `flex` / `center` / `flex-end` (right-aligned) |
| white-space | `nowrap` | `nowrap` |
| Occupants | exactly one of `BuyTag` \| `AvailabilityMarker` (count-only) \| **silence** | same |
| Never | never both, never zero on a row with an oracle id **except** the `free` silence | same |

Occupancy rule:

| Ownership | Slot |
|---|---|
| Own none | `BuyTag`, **full form at both widths** (the All-tab `$` collapse is **declined here**) |
| Own it, every copy sleeved | `AvailabilityMarker`, count-only — `◆ none free` |
| Own it, copies spare | **silent** — the marker returns `null` at `free` (`display: none`) |

Neither occupant **gates the tick**. Availability is a label.

## 8b · `BuyTag` (own none)

| Property | Mobile | Desktop |
|---|---|---|
| display | `inline-flex` | `inline-flex` |
| align-items | `center` | `center` |
| white-space | `nowrap` | `nowrap` |
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `10px` | `10px` |
| color | `var(--warning)` | `var(--warning)` |
| border | `1px solid var(--accent-shadow)` | `1px solid var(--accent-shadow)` |
| border-radius | `4px` | `4px` |
| padding | `1px 6px` | `1px 6px` |
| text | `buy {price}` — **never collapsed to `$`** | `buy {price}` |

## 8c · `AvailabilityMarker`, count-only (own it, none free)

| Property | Mobile | Desktop |
|---|---|---|
| display | `inline-flex` | `inline-flex` |
| align-items | `center` | `center` |
| white-space | `nowrap` | `nowrap` |
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `10px` | `10px` |
| color | `var(--avail-hard-fg)` | `var(--avail-hard-fg)` |
| border | `1px solid var(--accent-shadow)` | `1px solid var(--accent-shadow)` |
| border-radius | `4px` | `4px` |
| padding | `1px 6px` | `1px 6px` |
| text | `◆ none free` (`◆` = U+25C6) | `◆ none free` |

## 8d · Silent slot

| Property | Mobile | Desktop |
|---|---|---|
| display | `none` | `none` |
| Reserved width | slot still occupies its `84px` column at desktop | — |

---

# 9 · Commit row — desktop

| Property | Desktop | Mobile |
|---|---|---|
| display | `flex` | (see §10) |
| align-items | `center` | — |
| gap | `14px` | — |
| flex-wrap | `wrap` | — |
| border-top | `1px solid var(--border)` | — |
| margin-top | `14px` | — |
| padding-top | `14px` | — |
| Sticky? | **not sticky** — sits at the list's end | — |

## 9a · Primary — `Add {t} cards` (enabled)

| Property | Desktop | Mobile |
|---|---|---|
| display / align-items | `inline-flex` / `center` | (see §10c) |
| border | `1px solid var(--accent)` | |
| border-radius | `8px` | |
| background | `transparent` | |
| color | `var(--accent)` | |
| font-family | `var(--font-sans)` | |
| font-size | `13px` | |
| font-weight | `600` | |
| padding | `10px 18px` | |
| aria-label | `commit.addAria(ticked, total)` | |

## 9b · Primary — disabled (zero ticks, state 11/12)

| Property | Desktop | Mobile |
|---|---|---|
| border | `1px solid var(--border)` | same |
| color | `var(--fg-locked)` | same |
| background | `transparent` | same |
| label | `Add cards` — **no count** | same |
| Error beside it | **—** (never) | **—** |
| Absent instead? | **no** — this is the one disabled control in the set | no |

## 9c · Primary — in flight (state 8)

| Property | Desktop | Mobile |
|---|---|---|
| border | `1px solid var(--accent-shadow)` | same |
| color | `var(--fg-faint)` | same |
| background | `transparent` | same |
| label | `commit.inFlight(t)` → `Sleeving {t} cards…` | same |
| disabled | yes | yes |
| `Stop` control | **—** (none — a local write, not a model call) | **—** |
| focus | stays on the primary, then moves to the ledger line the pass created | same |

## 9d · `Cancel` (GhostButton)

| Property | Desktop | Mobile |
|---|---|---|
| display / align-items | `inline-flex` / `center` | `flex` / `center` |
| border | `1px solid var(--border-strong)` | `1px solid var(--border-strong)` |
| border-radius | `8px` | `8px` |
| background | `transparent` | `transparent` |
| color | `var(--fg)` | `var(--fg)` |
| font-family | `var(--font-sans)` | `var(--font-sans)` |
| font-size | `13px` | `14px` |
| font-weight | (normal) | (normal) |
| padding | `10px 16px` | `0 16px` |
| min-height | — | `44px` |
| flex | `none` | `none` |
| In flight | disabled, **in place** (`opacity: 0.5`, border `1px solid var(--border)`, color `var(--fg-locked)`), never hidden | same |

## 9e · Consequence line

| Property | Desktop | Mobile |
|---|---|---|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `11px` | `10.5px` |
| line-height | `1.6` | (default) |
| color — `{total} of 99 when added` | `var(--fg-body)` | `var(--fg-locked)` (phone puts it right-aligned as `95 of 99`) |
| color — `{b} to buy · {money}` | `var(--warning)` | `var(--warning)` |
| color — ticked count `{t} of {n} ticked` | (in the head) | `var(--fg-body)` |
| Money said | **once**, here, in `var(--warning)` — never on a button face | once |

## 9f · Slots-stay-open note

| Property | Desktop | Mobile |
|---|---|---|
| Presence | when the selection leaves slots open | **—** (absent at 390px; the canvas's bar carries three lines only) |
| font-family | `var(--font-mono)` | — |
| font-size | `10.5px` | — |
| color | `var(--fg-locked)` | — |
| position | `margin-left: auto` | — |
| copy | `commit.slotsStayOpen(n)` | — |

---

# 10 · Commit bar — phone (the quick-add dock's slot)

| Property | Mobile | Desktop |
|---|---|---|
| position | pinned bottom (`position:absolute/fixed; left:0; right:0; bottom:0` in the scroll column) | **n/a — not sticky at desktop** |
| background | `var(--bg)` (`#14110E`) | — |
| border-top | `1px solid var(--border-strong)` | — |
| border (other sides) | — | — |
| padding | `11px 12px 13px` | — |
| display / flex-direction / gap | `flex` / `column` / `9px` | — |
| Occupants | **one bottom slot, one occupant** — never stacked with the dock | — |

Three lines, in order:

## 10a · Line 1 — the quick-add swap notice

| Property | Mobile | Desktop |
|---|---|---|
| font-family | `var(--font-mono)` | — |
| font-size | `10px` | — |
| color | `var(--fg-locked)` | — |
| copy | `dock.retired` → `Quick-add is back when you close the list` | — |
| DOM | the dock is **collapsed, never unmounted**; its query and focus are restored on close | — |

## 10b · Line 2 — the counts line

| Property | Mobile | Desktop |
|---|---|---|
| display / align-items / gap | `flex` / `baseline` / `8px` | — |
| font-family | `var(--font-mono)` | — |
| font-size | `10.5px` | — |
| `{t} of {n} ticked` colour | `var(--fg-body)` | — |
| `{b} to buy · {money}` colour | `var(--warning)` | — |
| `{total} of 99` colour | `var(--fg-locked)`, `margin-left: auto` | — |

## 10c · Line 3 — the two buttons

| Property | Mobile | Desktop |
|---|---|---|
| container display / gap | `flex` / `8px` | — |
| primary flex | `auto` | — |
| primary min-height | `44px` | — |
| primary display / align-items / justify-content | `flex` / `center` / `center` | — |
| primary border / radius / color | `1px solid var(--accent)` / `8px` / `var(--accent)` | — |
| primary font-size / weight | `14px` / `600` | — |
| Cancel flex | `none` | — |
| Cancel min-height | `44px` | — |
| Cancel padding | `0 16px` | — |
| Cancel border / radius / color | `1px solid var(--border-strong)` / `8px` / `var(--fg)` | — |
| Cancel font-size | `14px` | — |

## 10d · Quick-add dock, at rest (closed states 1, 9, 13)

| Property | Mobile | Desktop |
|---|---|---|
| background | `var(--bg)` | — |
| border | `1px solid var(--border-strong)` | — |
| border-radius | `8px` | — |
| padding | `10px 11px` | — |
| display / align-items / gap | `flex` / `center` / `9px` | — |
| field flex / min-height / padding | `auto` / `44px` / `0 11px` | — |
| field border / radius / background / color / font-size | `1px solid var(--border)` / `8px` / `var(--surface-rail)` / `var(--fg-locked)` / `12.5px` | — |
| `Add` button flex / min-height / padding | `none` / `44px` / `0 13px` | — |
| `Add` button border / radius / color / font | `1px solid var(--border-strong)` / `8px` / `var(--fg)` / `var(--font-mono)` `11.5px` | — |
| Presence | **exactly where it ships** whenever no list is open | — |

---

# 11 · Declined row (state 7)

| Property | Mobile | Desktop |
|---|---|---|
| display / align-items / gap | `flex` / `center` / `10px` | `flex` / `center` / `10px` |
| min-height | `34px` | `34px` |
| background | `var(--surface-sunken)` per README (canvas draws `var(--surface)`; see Silent §S3) | same |
| border | `1px solid var(--border)` | `1px solid var(--border)` |
| border-radius | `7px` | `7px` |
| padding | `0 10px` | `0 10px` |
| Position | **same slot, no reorder, no animation out, no gap** | same |
| label `not this one` — font | `var(--font-mono)` `9.5px`, `letter-spacing:0.1em`, `uppercase`, `var(--fg-locked)` | same |
| name — font | `var(--font-sans)` `13px`, `var(--fg-faint)`, `flex:auto; min-width:0` | same |
| `Show it again` — font | `var(--font-mono)` `10.5px`, `var(--fg-faint)`, `border-bottom: 1px dashed #4A4033` | same |
| Question asked? | **none** | **none** |
| Persistence | survives closing/reopening the list; **not** a reload | same |

---

# 12 · Illegal row (state 17)

| Property | Mobile | Desktop |
|---|---|---|
| display / align-items / gap | `flex` / `center` / `10px` | `flex` / `center` / `10px` |
| min-height | `34px` | `34px` |
| background | `var(--surface)` | `var(--surface)` |
| border | **`1px dashed var(--border-strong)`** | **`1px dashed var(--border-strong)`** |
| border-radius | `7px` | `7px` |
| padding | `0 10px` | `0 10px` |
| reason — font | `var(--font-mono)` `9.5px`, `letter-spacing:0.1em`, `uppercase`, `var(--fg-locked)` | same |
| name — font | `var(--font-sans)` `13px`, `var(--fg-faint)`, `flex:auto; min-width:0` | same |
| `untickable` — font | `var(--font-mono)` `10.5px`, `var(--fg-locked)` | same |
| Behaviour | **unticks itself, states why, keeps its slot, recounts** | same |

---

# 13 · Provenance ledger (`#359`)

## 13a · Container (the shipped provenance strip's box)

| Property | Mobile | Desktop |
|---|---|---|
| background | `#181410` (see Silent §S4) | `#181410` |
| border | `1px solid var(--border)` | `1px solid var(--border)` |
| border-left | `3px solid var(--accent)` | `3px solid var(--accent)` |
| border-radius | `9px` | `9px` |
| padding | `10px 12px` | `12px 15px` |
| margin-bottom | `12px` (parent column gap) | `12px` |
| Presence | present **exactly when the sweep is** (`sweep absent ⟺ 0 auto rows ⟺ every pass empty ⟺ ledger absent`) | same |
| Ordering | **oldest-first, never reorders**; a new pass appends | same |

## 13b · The `i` disc

| Property | Mobile | Desktop |
|---|---|---|
| width / height | `18px` / `18px` | `20px` / `20px` |
| flex | `none` | `none` |
| border-radius | `999px` | `999px` |
| border | `1px solid var(--accent-shadow)` | `1px solid var(--accent-shadow)` |
| color | `var(--accent)` | `var(--accent)` |
| font-family / font-size | `var(--font-mono)` / `10px` | `var(--font-mono)` / `11px` |
| display / align-items / justify-content | `flex` / `center` / `center` | `flex` / `center` / `center` |
| glyph | `i` | `i` |

## 13c · Ledger header line

| Property | Mobile | Desktop |
|---|---|---|
| display / align-items / gap | `flex` / `center` / `9px` | `flex` / `center` / `11px` |
| margin-bottom | `9px` | `11px` |
| header text font-family | `var(--font-sans)` | `var(--font-sans)` |
| header text font-size | `12px` | `12.5px` |
| header text color | `var(--fg-body)` | `var(--fg-body)` |
| header copy | `ledger.header(total)` (canvas shortens to `Where these 95 came from` at 390px) | `ledger.header(total)` |
| meta font-family / size / color | — (absent at 390px in the canvas) | `var(--font-mono)` / `10.5px` / `var(--fg-locked)` |
| meta position | — | `margin-left: auto` |
| meta copy | — | `ledger.headerMeta(passes, buy)` / `.headerMetaOne(buy)` |
| States passes and money **only** | no kept total, no auto total | same |

## 13d · Ledger line — desktop

| Property | Desktop | Mobile |
|---|---|---|
| display / align-items / gap | `flex` / `center` / `11px` | (see 13e) |
| min-height | `34px` | |
| background (ordinary line) | `var(--surface)` | |
| border (ordinary line) | `1px solid var(--border)` | |
| background (**newest** line) | `var(--elevated-hover)` | |
| border (**newest** line) | `1px solid var(--accent-shadow)` | |
| border-radius | `7px` | |
| padding | `0 11px` | |
| Line-to-line gap | `6px` (`flex-direction:column; gap:6px`) | |

### Columns

| Column | Property | Desktop |
|---|---|---|
| pass label | width | **`66px` fixed**, `flex:none` |
| pass label | white-space | `nowrap` |
| pass label | font-family / size | `var(--font-mono)` / `9.5px` |
| pass label | letter-spacing / transform | `0.1em` / `uppercase` |
| pass label | color — seed / ordinary | `var(--fg-faint)` |
| pass label | color — **newest** line | `var(--accent)` |
| sentence | flex / min-width | `auto` / `0` |
| sentence | font-family / size | `var(--font-sans)` / `12.5px` |
| sentence | color | `var(--fg-body)`; the card-count figure bolded `var(--fg)` `600`; recount clauses `var(--fg-locked)` |
| `Show these {n}` | flex / white-space | `none` / `nowrap` |
| `Show these {n}` | font-family / size | `var(--font-mono)` / `10.5px` |
| `Show these {n}` | color — ordinary / newest | `var(--fg-faint)` / `var(--accent)` |
| `Show these {n}` | border-bottom — ordinary / newest | `1px dashed #4A4033` / `1px dashed var(--accent-shadow)` |
| undo column | width | **`126px` fixed**, `flex:none` |
| undo column | justify-content | `flex-end` |
| seed reversal text | font-family / size / color | `var(--font-mono)` / `10px` / `var(--fg-locked)` |
| seed reversal text | text-align | `right` |

Both fixed widths are sized so **no label wraps mid-phrase at three digits**, the widest either gets.

### `Undo these {n}` (GhostButton)

| Property | Desktop | Mobile |
|---|---|---|
| display / align-items | `inline-flex` / `center` | `flex` / `center` |
| white-space | `nowrap` | `nowrap` |
| border | `1px solid var(--border-strong)` | `1px solid var(--border-strong)` |
| border-radius | `7px` | `8px` |
| color | `var(--fg)` | `var(--fg)` |
| font-family / font-size | `var(--font-mono)` / `11px` | `var(--font-mono)` / `11.5px` |
| padding | `5px 10px` | `0 13px` |
| min-height | — | `44px` |
| position | `margin-left: auto` within the 126px column | `margin-left: auto` |
| aria-label | `ledger.undoAria(n, pass)` | same |
| In flight (state g) | label `ledger.undoInFlight(n)`, disabled; **neighbouring lines stay enabled** | same |
| Refused (state h) | line unchanged, **still enabled**; `MutationError` beneath the ledger | same |

## 13e · Ledger line — phone (one card per pass)

| Property | Mobile | Desktop |
|---|---|---|
| background / border / radius | `var(--surface)` / `1px solid var(--border)` / `7px` | (see 13d) |
| background / border — **newest** | `var(--elevated-hover)` / `1px solid var(--accent-shadow)` | |
| padding | `9px 10px` | |
| card-to-card gap | `6px` | |
| line 1 | `display:flex; align-items:baseline; gap:8px` — label left, **money** (or `the sweep reverses it`) right via `margin-left:auto` | |
| line 1 label font | `var(--font-mono)` `9.5px`, `0.1em`, `uppercase`, `var(--fg-faint)` / `var(--accent)` when newest | |
| line 1 right-hand text font | `var(--font-mono)` `10px`, `var(--fg-locked)` | |
| line 2 (sentence) | `font-size:12px`, `line-height:1.5`, `var(--fg-body)`, `margin-top:5px`; count bolded `var(--fg)` `600` | |
| controls row | `display:flex; align-items:center; gap:10px; margin-top:8px` | |
| `Show these {n}` | `display:flex; align-items:center; min-height:44px`, `var(--font-mono)` `10.5px`, `var(--accent)` (newest) / `var(--fg-faint)`, `border-bottom: 1px dashed var(--accent-shadow)` / `#4A4033`, `margin-top:7px` when alone | |
| `Undo these {n}` | `margin-left:auto`, `min-height:44px` (see 13d) | |
| Touch target | **44px on both controls** | |

## 13f · Legacy ledger line (state `l0`)

| Property | Mobile | Desktop |
|---|---|---|
| display / align-items / gap | `flex` / `center` / `10px` | `flex` / `center` / `10px` |
| min-height | `34px` | `34px` |
| background | `var(--surface)` | `var(--surface)` |
| border | **`1px dashed var(--border-strong)`** | **`1px dashed var(--border-strong)`** |
| border-radius | `7px` | `7px` |
| padding | `0 10px` | `0 10px` |
| sentence font-family / size | `var(--font-sans)` / `12.5px` | `var(--font-sans)` / `12.5px` |
| sentence colour | first clause `var(--fg-faint)`, second clause `var(--fg-locked)` | same |
| label column | **—** | **—** |
| `Show these` | **—** | **—** |
| undo | **—** | **—** |
| Lifetime | goes for good the first time a pass lands | same |

---

# 14 · Pass mark (`Show these {n}`, states k–n)

| Property | Mobile | Desktop |
|---|---|---|
| Applied to | the pass's rows in the decklist below | same |
| border-left | **`3px solid var(--accent)`** | **`3px solid var(--accent)`** |
| Row shell otherwise | unchanged: `var(--surface)`, `1px solid var(--border)`, radius `7px`, `min-height:34px`, `padding:0 9px`, `gap:10px` | same |
| Dim | **—** | **—** |
| Filter | **—** | **—** |
| Reorder | **—** | **—** |
| Collapse | **—** | **—** |
| Scroll-to | **—** | **—** |
| Motion | **—** (appears and clears instantly) | **—** |
| Control | `aria-pressed` toggle | `aria-pressed` toggle |
| Concurrency | **one pass marked at a time**; marking another moves the mark | same |
| Accessible name of marked rows | gains *"from 1st top-off"* while the mark is up | same |
| `AutoTag` on those rows | **unchanged** — no ordinal, no second tag | same |

`AutoTag` (drawn on the decklist rows, unchanged): `var(--font-mono)` `9.5px`,
`letter-spacing:0.1em`, `uppercase`, `var(--fg-faint)`, `1px solid var(--border)`, radius `4px`,
padding `1px 5px`.

---

# 15 · Refusal (`MutationError`, states 15 and h)

| Property | Mobile | Desktop |
|---|---|---|
| display / align-items / gap | `flex` / `center` / `9px` | `flex` / `center` / `9px` |
| background | `#1A1310` (see Silent §S5) | `#1A1310` |
| border | `1px solid var(--danger)` | `1px solid var(--danger)` |
| border-radius | `8px` | `8px` |
| padding | `9px 12px` | `9px 12px` |
| label `refused` — font | `var(--font-mono)` `9.5px`, `letter-spacing:0.1em`, `uppercase`, `var(--danger)` | same |
| message — font | `var(--font-sans)` `12.5px`, `var(--fg-body)` | same |
| Position | **under the control that was clicked** (commit → under the commit row; undo → beneath the ledger) | same |
| Ticks | **all preserved** | **all preserved** |
| Primary | back to `Add {t} cards`, **enabled** | same |
| `--danger` elsewhere | appears in exactly one panel state (15) and one ledger state (h) | same |

---

# 16 · Exhausted-state line (state 13)

| Property | Mobile | Desktop |
|---|---|---|
| display / align-items / gap | `flex` / `flex-start` / `10px` | `flex` / `flex-start` / `10px` |
| background | `#181410` | `#181410` |
| border | `1px solid var(--border)` | `1px solid var(--border)` |
| border-left | `3px solid var(--accent)` — **never `--warning`** | `3px solid var(--accent)` |
| border-radius | `9px` | `9px` |
| padding | `11px 13px` | `11px 13px` |
| disc | `18px` (see 13b) | `20px` |
| sentence font-family / size / color / line-height | `var(--font-sans)` / `12.5px` / `var(--fg-body)` / `1.6` | same |
| Control | **none** — the strip keeps the line and loses its control | **none** |
| Caption | **absent** | **absent** |

---

# 17 · Toolbar cluster (unchanged and unmoved — drawn for context only)

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| Toolbar row | display / align-items / gap | `flex` / `center` / `8px` | `flex` / `center` / `12px` |
| Toolbar row | border-top / padding-top | — | `1px solid var(--border)` / `14px` |
| `All {n}` chip | height / padding / radius | `32px` / `0 12px` / `999px` | `30px` / `0 12px` / `999px` |
| `All {n}` chip (active) | background / border / color | `#221D16` / `1px solid var(--accent)` / `var(--fg)` | same |
| `Shopping {n}` chip | background / border / color | `#221D16` / `1px solid var(--border)` / `var(--fg-body)` | same |
| chips | font-family / size | `var(--font-mono)` / `11.5px` | `var(--font-mono)` / `11.5px` |
| Kept note | font-family / size / color / position | — (absent at 390px in the canvas) | `var(--font-mono)` / `11px` / `var(--fg-locked)` / `margin-left:auto` |
| `Clear all auto · {n}` | min-height / padding | `44px` / `0 12px` | `—` / `8px 13px` |
| `Clear all auto · {n}` | border / radius / color / font | `1px solid var(--border-strong)` / `8px` / `var(--fg)` / `var(--font-mono)` `12px` | same |
| `Clear all auto` | label at phone | `Clear auto · {n}` | `Clear all auto · {n}` |
| Presence | absent at 0 auto | absent at 0 auto |

`Keep` / `Keep all` / the kept note: **unchanged, unmoved, no string added.** Keeping clears a
card's auto flag **and** its pass membership.

---

# 18 · Hover / focus / active / disabled

| Component | State | Mobile | Desktop |
|---|---|---|---|
| The door | hover | — (silent in the design) | — (silent in the design) |
| The door | focus | shipped `PrimaryButton` focus ring | shipped `PrimaryButton` focus ring |
| The door | disabled | **never disabled** (absent instead) | **never disabled** |
| Candidate row | hover | — (silent) | — (silent) |
| Tick box | active/pressed | instant state change, **no transition** | instant |
| Commit primary | disabled | §9b | §9b |
| Commit primary | in flight | §9c | §9c |
| `Cancel` | disabled (in flight) | `opacity: 0.5`, border `var(--border)`, color `var(--fg-locked)`, **in place** | same |
| `Undo these {n}` | in flight | disabled, label `Putting {n} back…` | same |
| `Undo these {n}` | neighbouring lines during in-flight/refusal | **stay enabled** | **stay enabled** |
| Inert tick box | disabled | §5c, row `opacity: 0.55` | §5c |
| `Show these {n}` | pressed | `aria-pressed="true"`; tapping again clears | same |

# 19 · Transitions and transforms

| Property | Mobile | Desktop |
|---|---|---|
| transition (any) | **—** — no motion class is added | **—** |
| Opening the list | a height change **with no transition** (shipped disclosure) | same |
| Ticking | instant state change | instant |
| Decline collapse | **no animation out** | **no animation out** |
| Pass mark | appears and clears **instantly** | instantly |
| transform | **—** | **—** |
| skeleton / shimmer | **—** | **—** |

# 20 · Touch targets (phone-specified)

| Control | Mobile | Desktop |
|---|---|---|
| The door | `44px`, full width | — |
| `Close the list` | `44px` hit area | — |
| `Tick the {owned} I own` | `44px` | `30px` |
| `Clear all ticks` | `44px` | `30px` |
| Commit primary | `44px`, `flex:auto` | — |
| `Cancel` | `44px`, `flex:none` | — |
| `Show these {n}` (ledger) | `44px` | — |
| `Undo these {n}` (ledger) | `44px` | — |
| `Clear all auto` | `44px` | — |
| Quick-add field + `Add` | `44px` each | — |
| Tick box | `26px` box on a `52px` row — **the row is the target** | `18px` box on a `34px` row — the row is the target |
| Ledger `Undo` in the provenance line | **below the clause at 44px** | right-aligned inline |

---

# State Coverage

## The panel — states 1–20

`n` = open slots (`99 − built`) · `cand` = legal candidates EDHREC ranks (in colour, not in the
deck, singleton-legal) · `owned` = the subset in the collection · `ticked` = current selection,
capped at `n`.

| # | Triggering condition (data) | Rendered | Copy strings |
|---|---|---|---|
| 1 | `n > 0` ∧ `cand > 0` ∧ list closed ∧ no prior top-off pass on this deck | Strip closed: heading, caption, **one door**, door note. Body absent. | `strip.heading(n)`, `strip.caption(n,cand)` / `.captionMobile`, `strip.open(n)` + `.openAria`, `strip.doorNote(owned)` |
| 2 | List open ∧ selection untouched since open ∧ `owned < n` | 38 rows, `owned` ticked, 0 declines; commit row enabled | `list.head`/`.headMobile`, `commit.add(owned)`, `commit.cancel`, `commit.consequence(total)` |
| 3 | List open ∧ `ticked > owned` (some unowned ticked) ∧ `ticked < n` | mixed selection; commit row carries money + slots-stay-open | `commit.add(t)`, `commit.consequence`, `commit.toBuy(b,money)`, `commit.slotsStayOpen(n)` |
| 4 | List open ∧ `owned >= n` | `n` ticked, **at the cap on open**; unticked boxes inert | `commit.add(n)`, `commit.consequence(99)`, `list.cap(n)` |
| 5 | List open ∧ `owned < n` ∧ `cand > owned` (shallow owned pool) | `owned` ticked, remainder untouched. Label states what it places, **never the gap** | `commit.add(owned)`, `commit.consequence(total)` |
| 6 | `ticked == n` ∧ ∃ unticked candidate | Unticked boxes **inert, not hidden**; rows keep figures + price; row `opacity:.55`; cap line printed | `list.cap(n)` |
| 7 | Player declines a row (`declined[rowId] = true`) | Row collapses to one line **in its own slot**; no reorder, no gap, no animation out, **no question** | `list.declined`, `list.restore`, `list.restoreAria(name)` |
| 8 | Commit mutation pending | List on screen, legible, **non-interactive**, no skeleton; primary in-flight; `Cancel` disabled in place; **no `Stop`** | `commit.inFlight(t)`, `commit.consequence(total)` |
| 9 | After commit, `n > 0` ∧ `cand > 0` (candidates remain) | Strip closed, **recounted heading**; caption names candidates left; door note says the list reopens with declines | `strip.heading(n')`, `strip.caption(n',cand')`, `strip.open(n')`, `strip.doorNoteAgain(cand')` / `.doorNoteAgainOwned(owned',cand')` |
| 10 | After commit, `openSlots <= 0` | **Strip unmounts as a unit.** Ledger and its undo stay | — |
| 11 | List open ∧ `ticked == 0` (cleared by hand, or `owned == 0` on open) | rows as ranked, none ticked; primary **disabled, no count, no error** | `commit.addEmpty`, `commit.nothingTicked` / `.nothingTickedUnowned(cand)` |
| 12 | List open ∧ `owned == 0` ∧ `cand > 0` | 38 rows, **0 ticked on open**; renders as state 11. **The door is never absent because the pool is unowned** | `commit.addEmpty`, `commit.nothingTickedUnowned(cand)` |
| 13 | `cand == 0` ∧ `n > 0` | Heading printed, **caption absent**, body absent, **no control**; the §7.6 line prints in the provenance-line shape, `--accent` rule, never `--warning` | `strip.heading(n)`; the exhausted sentence (shipped `recommendationsCopy.fill.provenanceShort` / `synergyCopy.lastSlots.short`, narrowed to this state only) |
| 14 | `openSlots <= 0` at first render (`planLastSlots` returns an empty plan) | **Strip absent from first render** — arithmetic, not a flag | — |
| 15 | Commit mutation rejected | **Every tick preserved**; primary back to `Add {t} cards`, enabled; `MutationError` beneath it | `commit.add(t)`, `commit.refused` |
| 16 | Undo mutation pending, then settled, on a pass's ledger line | Line's button reads in-flight, disabled; on settle **the line leaves the ledger** and the strip recounts | `ledger.undoInFlight(n)`; then `strip.heading(n)`; `announce.undone(added,total)` |
| 17 | A ticked candidate becomes illegal while the list is open (added by quick-add, or singleton) | Row **unticks itself, states why**, goes untickable, **keeps its slot**; recounts. If count → 0, state 11 | `list.illegalInDeck` / `list.illegalColour`, `list.illegalUntickable` |
| 18 | Candidate is owned ∧ every copy sleeved elsewhere (`AvailabilityMarker` at hard) | Availability slot draws `◆ none free`; dot is the **committed** one; **ticked on open like any owned candidate** | the shipped count-only marker; `list.committedClause(qty)` |
| 19 | Candidate is owned ∧ copies spare (marker returns `null` at `free`) | Slot is **silent** — not the zero-occupant defect | `list.ownedClause(qty)` (spoken only) |
| 20 | Phone only (<640px) ∧ list open | **Commit bar takes the quick-add dock's slot**; dock collapses to its notice — **collapsed, never unmounted**, query + focus restored on close. **One pinned element.** Closed (1, 9, 13): dock is exactly where it ships | `dock.retired`, `dock.retiredAnnounce` |

## The ledger — states a–j, i2, i3, i4, l0

| # | Triggering condition (data) | Rendered | Copy strings |
|---|---|---|---|
| a | 0 auto rows on the deck (every card added by hand) ∧ no pass rows | **Ledger absent**, as the shipped strip is | — |
| b | Exactly one pass row, `kind = seed`, with ≥1 surviving row | One line: the seed. Names its reversal rather than drawing one | `ledger.header(total)`, `.headerMetaOne(buy)`, `.seedLabel`, `.seedLine(n,buy)` / `.seedLineNoBuy(n)`, `.seedReversal`, `.mark(n)` |
| c | Seed pass + one `top-off` pass, both with survivors | Two lines, **seed first**; the top-off line adds an undo | + `ledger.passLabel(1)`, `.passLine(n,slots,buy)` / `.passLineNoBuy`, `.undo(n)`, `.undoAria(n,pass)` |
| d | Seed + three `top-off` passes with survivors | Four lines, oldest first; one `Undo these {n}` per top-off line — **any of them, in any order** | `ledger.headerMeta(passes,buy)`, `.passLabel(i)`, `.undo(n)` |
| e | A pass's undo mutation settles | **Its line leaves the ledger** (it placed nothing); others unchanged; **ordinals do not renumber** | `announce.undone(added,total)` |
| f | Every `top-off` pass undone, seed survives | Back to (b) | as (b) |
| g | Undo mutation pending on one line | That line's button reads in-flight, disabled; **others stay enabled** | `ledger.undoInFlight(n)` |
| h | Undo mutation rejected | Line unchanged, **still enabled**; `MutationError` beneath the ledger | `ledger.undoFailed` |
| i | ≥1 row of a pass removed by hand, ≥1 survivor, 0 kept | Line **recounts**, naming the removed exit; undo counts down | `ledger.passRecounted(placed,removed)`, `.undo(surviving)` / `.undoOne` |
| i2 | ≥1 row of a pass kept (per-row or bulk), ≥1 survivor | Line recounts naming the other exit; kept and removed counted **separately**; undo counts down and **can never reach a kept card** | `ledger.passRecountedKept(placed,kept)` / `.passRecountedBoth(placed,kept,removed)`, `.undo(surviving)` |
| i3 | Every surviving row of a pass kept (0 unkept, 0 unremoved) | **Its line leaves the ledger**, like any empty pass | `ledger.passRecountedAllKept(placed)` (the sentence just before the line goes) |
| i4 | `keepAllAutoCards` ran (`Keep all`) | **The whole ledger goes**, in the same act that makes the sweep absent | — |
| j | `Clear all auto` ran (the sweep) | Back to (a) — the sweep removes every pass | shipped `autoCopy.swept` / `.sweptUndo` |
| l0 | Deck has **no pass rows** (predates the ledger). **No count synthesised** from `auto` rows or from `filled` | Header + **one dashed line**. **No label column, no `Show these`, no undo.** Goes for good the first time a pass lands | `ledger.header(total)`, `ledger.legacy` |

## The mark — states k–n

| # | Triggering condition (data) | Rendered | Copy strings |
|---|---|---|---|
| k | No pass currently marked (`markedPassId == null`) | Nothing on the decklist | `ledger.mark(n)` (the untoggled control), `ledger.markAria(n,pass)` |
| l | `markedPassId == passId` | **3px `var(--accent)` left edge** on that pass's decklist rows. Nothing dimmed, filtered, reordered, collapsed or scrolled to. `aria-pressed="true"`; each marked row's accessible name gains *"from 1st top-off"* | `ledger.unmarkAria(pass)`, `announce.marked(n,pass)` |
| m | A different line's `Show these` is pressed | The mark **moves** — one pass marked at a time | `announce.marked(n,pass)` |
| n | Same control tapped again, **or** the pass is undone, **or** the list is committed | The mark clears | `announce.markCleared` |

## Announcements (one live-region message per settle; ticking debounced, never per row)

| Event | Copy key | Text |
|---|---|---|
| List opens | `announce.opened(cand,n,ticked)` | `{cand} candidates for {n} slots. {ticked} already ticked.` |
| Ticking settles (debounced), with money | `announce.ticked(ticked,n,buy)` | `{ticked} of {n} ticked, {buy} to buy.` |
| Ticking settles, no money | `announce.tickedNoBuy(ticked,n)` | `{ticked} of {n} ticked.` |
| Cap reached | `announce.capped(n)` | `{n} of {n} slots ticked.` |
| Commit settles, with money | `announce.added(added,total,buy)` | `{added} cards added. {total} of 99, {buy} to buy.` |
| Commit settles, no money | `announce.addedNoBuy(added,total)` | `{added} cards added. {total} of 99.` |
| Commit refused | `commit.refused` | the refusal sentence, once |
| Undo settles | `announce.undone(added,total)` | `{added} cards put back. {total} of 99.` |
| A pass marked | `announce.marked(n,pass)` | `{n} cards from {pass} marked in the deck.` |
| A mark cleared | `announce.markCleared` | `Mark cleared.` |
| A decline | `announce.declined(name,ticked,n)` | `{name} set aside. {ticked} of {n} ticked.` |
| List opens, phone | `dock.retiredAnnounce` | `Quick-add hidden while the list is open.` |
| A card kept | shipped `autoCopy.keptAnnounce` | **unchanged**; the ledger recount is not announced separately |
| Sweep | shipped `autoCopy.sweptAnnounce` | **unchanged** |

---

# Copy keys

From `top-off · copy strings.ts` (`src/lib/copy/top-off.ts`). Interpolation slots and their meaning
are listed under each group.

**Slot meanings:** `{n}` open slots (`99 − built`) — or, in ledger strings, the count of cards a
pass placed/survives · `{c}` / `{cand}` legal candidate count · `{u}` / `{untouched}` candidates
neither ticked nor declined · `{owned}` candidates already in the collection · `{t}` / `{ticked}`
current selection size · `{total}` deck card count after the act · `{b}` / `{buy}` cards to buy ·
`{money}` the money total · `{i}` a pass's stable ordinal · `{slots}` the open-slot count the pass
chose from · `{placed}` the pass's original row count · `{kept}` rows graduated out of the pass ·
`{removed}` rows removed by hand · `{passes}` number of passes · `{price}` a single card's price · in the four `bulk.*` keys only, `{n}` is the rows that control's press ticks (its plan's ids the list allows), not the open-slot count ·
`{qty}` copies in the collection · `{name}` a card name · `{pass}` a pass label.

## strip

| Key | Exact text |
|---|---|
| `strip.heading(n)` | `The last {n}` |
| `strip.caption(n, cand)` | `{n} slots open · {cand} candidates ranked by synergy for this commander` |
| `strip.captionMobile(n, cand)` | `{n} slots open · {cand} candidates ranked` |
| `strip.open(n)` | `Choose the last {n}` |
| `strip.openAria(n)` | `Choose the cards for the last {n} slots` |
| `strip.close` | `Close the list` |
| `strip.doorNote(owned)` | `{owned} of them are in your collection and arrive ticked. Nothing is added until you say so.` |
| `strip.doorNoteAgain(cand)` | `You own none of the {cand} left. The list reopens where you left it, declines and all.` |
| `strip.doorNoteAgainOwned(owned, cand)` | `You own {owned} of the {cand} left. The list reopens where you left it, declines and all.` |

## list

| Key | Exact text |
|---|---|
| `list.groupAria(cand, n)` | `{cand} candidates for the last {n} slots` |
| `list.head(ticked, n, cand, untouched)` | `{ticked} of {n} slots ticked · {cand} candidates, {untouched} untouched` |
| `list.headMobile(ticked, n)` | `{ticked} of {n} ticked` |
| `bulk.collection(n)` | `Select {n} from my collection` |
| `bulk.best(n)` | `Select the {n} this deck needs` |
| `bulk.collectionAria(n, concession)` | `Select {n} cards from your collection — {concession}` |
| `bulk.bestAria(n, concession)` | `Select the {n} cards this deck needs — {concession}` |
| `bulk.gapNone` | `matches every recommendation` |
| `bulk.gapOne(n, type)` | `{n} {type} short of recommendations` |
| `bulk.gapTwo(n, type, m, other)` | `{n} {type} and {m} {other} short of recommendations` |
| `bulk.gapMany(types, worst, worstType)` | `short on {types} types · {worstType} worst at {worst}` |
| `bulk.gapUnmeasured` | `no recommendation for this commander` |
| `bulk.andNothingToBuy(gap)` | `{gap} · nothing to buy` |
| `bulk.buy(n, money)` | `{n} to buy` / `{n} to buy · {money}` |
| `bulk.replaces(selected)` | `replaces your {selected} selections` |
| `bulk.replacesOne` | `replaces your 1 selection` |

The single `list.tickOwned` / `list.tickOwnedAria` control these replaced was retired with the
pair (PR 9b). Its wording was correct about its pool and silent about its concession, which is
the reported failure in one string.
| `list.clearTicks` | `Clear all ticks` |
| `list.colCard` | `Card` |
| `list.colSynergy` | `Synergy` |
| `list.colDecks` | `Decks` |
| `list.ordering` | `ranked · synergy, then inclusion, then name` |
| `list.cap(n)` | `{n} of {n} slots ticked — untick one to swap another in` |
| `list.rowAria(name, ownership, syn, inc)` | `{name}. {ownership} Synergy plus {syn} points. In {inc} of decks.` |
| `list.ownedClause(qty)` | `×{qty} in your collection.` |
| `list.committedClause(qty)` | `×{qty} in your collection, none free.` |
| `list.unownedClause(price)` | `Not in your collection, {price}.` |
| `list.illegalInDeck` | `already in the deck` |
| `list.illegalColour` | `not in these colors` |
| `list.illegalUntickable` | `untickable` |
| `list.declined` | `not this one` |
| `list.restore` | `Show it again` |
| `list.restoreAria(name)` | `Put {name} back on the list` |

The cost is spoken from the **shipped** `manaCopy.costAria`, read **before** the ownership clause and
**never capped**. No string is added for it.

## commit

| Key | Exact text |
|---|---|
| `commit.add(ticked)` | `Add {ticked} cards` |
| `commit.addEmpty` | `Add cards` |
| `commit.addAria(ticked, total)` | `Add {ticked} cards to the deck, {total} of 99` |
| `commit.cancel` | `Cancel` |
| `commit.consequence(total)` | `{total} of 99 when added` |
| `commit.toBuy(b, money)` | `{b} to buy · {money}` |
| `commit.slotsStayOpen(n)` | `{n} slots stay open: you can come back to them` |
| `commit.nothingTicked` | `nothing ticked: the list arrives with what you own already ticked` |
| `commit.nothingTickedUnowned(cand)` | `nothing ticked: you own none of these {cand}, so every tick is one to buy` |
| `commit.inFlight(ticked)` | `Sleeving {ticked} cards…` — **UNCHANGED**, `recommendationsCopy.fill.fillingRows` |
| `commit.refused` | `We couldn’t add those. The deck is unchanged.` — **UNCHANGED**, `synergyCopy.lastSlots.topUpFailed` (note the curly apostrophe `’`) |

## ledger

| Key | Exact text |
|---|---|
| `ledger.header(total)` | `Where these {total} cards came from` |
| `ledger.headerMeta(passes, buy)` | `{passes} passes · {buy} to buy` |
| `ledger.headerMetaOne(buy)` | `one pass · {buy} to buy` |
| `ledger.seedLabel` | `the seed` |
| `ledger.passLabel(i)` | `{ordinal(i)} top-off` (`1st top-off`) |
| `ledger.seedLine(n, buy)` | `{n} cards: the roles and the mana base, {buy} to buy.` |
| `ledger.seedLineNoBuy(n)` | `{n} cards: the roles and the mana base.` |
| `ledger.seedReversal` | `the sweep reverses it` |
| `ledger.passLine(n, slots, buy)` | `{n} cards you chose from the last {slots}, {buy} of them to buy.` |
| `ledger.passLineNoBuy(n, slots)` | `{n} cards you chose from the last {slots}.` |
| `ledger.passRecounted(placed, removed)` | `{placed} cards · {removed} removed since` |
| `ledger.passRecountedKept(placed, kept)` | `{placed} cards · {kept} now yours` |
| `ledger.passRecountedBoth(placed, kept, removed)` | `{placed} cards · {kept} now yours, {removed} removed since` |
| `ledger.passRecountedAllKept(placed)` | `all {placed} now yours` |
| `ledger.legacy` | `This deck was built before we started keeping this record. Anything we place from here on is listed below.` |
| `ledger.mark(n)` | `Show these {n}` |
| `ledger.markAria(n, pass)` | `Mark the {n} cards from {pass} in the deck below` |
| `ledger.unmarkAria(pass)` | `Clear the mark on {pass}` |
| `ledger.undo(n)` | `Undo these {n}` |
| `ledger.undoOne` | `Undo this 1` |
| `ledger.undoAria(n, pass)` | `Undo the {n} cards from {pass}, and put back what they cost` |
| `ledger.undoInFlight(n)` | `Putting {n} back…` |
| `ledger.undoFailed` | `We couldn’t put those back. The deck is unchanged.` (curly apostrophe) |

## dock

| Key | Exact text |
|---|---|
| `dock.retired` | `Quick-add is back when you close the list` |
| `dock.retiredAnnounce` | `Quick-add hidden while the list is open.` |

## announce

| Key | Exact text |
|---|---|
| `announce.opened(cand, n, ticked)` | `{cand} candidates for {n} slots. {ticked} already ticked.` |
| `announce.ticked(ticked, n, buy)` | `{ticked} of {n} ticked, {buy} to buy.` |
| `announce.tickedNoBuy(ticked, n)` | `{ticked} of {n} ticked.` |
| `announce.capped(n)` | `{n} of {n} slots ticked.` |
| `announce.added(added, total, buy)` | `{added} cards added. {total} of 99, {buy} to buy.` |
| `announce.addedNoBuy(added, total)` | `{added} cards added. {total} of 99.` |
| `announce.declined(name, ticked, n)` | `{name} set aside. {ticked} of {n} ticked.` |
| `announce.undone(added, total)` | `{added} cards put back. {total} of 99.` |
| `announce.marked(n, pass)` | `{n} cards from {pass} marked in the deck.` |
| `announce.markCleared` | `Mark cleared.` |

## Strings DELETED from `synergyCopy.lastSlots`

| Key | Reason |
|---|---|
| `lastSlots.fillOwned` / `.fillOwnedAria` | deleted with control A; behaviour survives as the list's preselection |
| `lastSlots.topUp` / `.topUpAria` | deleted with control B (#361) |
| `lastSlots.fillFailed` | deleted; one refusal string remains (`commit.refused`) |
| `lastSlots.ownedNote` | **replaced** by `strip.doorNote` |
| `lastSlots.caption` / `.captionMobile` | **replaced**, gaining the candidate count |
| `lastSlots.filledAnnounce` / `.shortAnnounce` / `.boughtAnnounce` | **replaced** by `announce.added` / `.addedNoBuy` |
| R1's `provenance.clause` / `.clauseNoBuy` / `.undo` / `.undoAria` | did not survive R2 |

## Strings KEPT VERBATIM

`synergyCopy.lastSlots.heading` · `synergyCopy.lastSlots.short` (**narrowed to state 13 only**) ·
`recommendationsCopy.fill.fillingRows` · `recommendationsCopy.fill.provenanceShort` (recast as
`ledger.seedLine`, and unchanged as the exhausted-list sentence) · `autoCopy.clearAll` /
`.clearAllMobile` / `.swept` / `.sweptUndo` · `autoCopy.keptNote` · `autoCopy.keep` / `.keepAll` /
`.keptAnnounce` · `addPanelCopy.tile.*` and every buy-tag string · `manaCopy.costAria` · the
count-only availability strings.

---

# Silent in the design

Things a builder needs that this handoff does not state, or states inconsistently. **Do not guess —
escalate or ratify.**

1. **S1 — Tick-box radius disagrees between README and canvas.** README's component table says
   radius `5px` for the tick box at both widths; the canvas's phone row draws `border-radius:6px`
   (desktop draws `5px`). Which wins at <640px is unspecified.
2. **S2 — Inert tick-box glyph colour disagrees.** README says the glyph is `--fg-locked`
   (`#6A6152`); the canvas's state-6 frame draws `#494037`, which is not a named token anywhere in
   the handoff or the brand sheet.
3. **S3 — The declined row's background disagrees.** README specifies `--surface-sunken`; the canvas
   draws `#1E1A15` = `--surface`. `--surface-sunken` has no hex anywhere in this handoff.
4. **S4 — `#181410` (the provenance/ledger box background) is unnamed.** It is not in the canvas's
   "Tokens spent" list, not in the brand sheet's four-step neutral ramp, and README calls the box
   only "the shipped strip's box".
5. **S5 — `#1A1310` (the `MutationError` background) is unnamed.** Same gap: no token, no brand-sheet
   entry.
6. **S6 — `#4A4033` (the dashed-underline colour on `Close the list`, `Show these`, `Show it again`,
   `Undo these` at ordinary lines) is unnamed.** Used seven times on the canvas; no token given.
7. **S7 — `#221D16` (the `All {n}` / `Shopping {n}` chip fill) is unnamed.** Toolbar context only,
   but it is drawn and has no token.
8. **S8 — The availability slot's width is stated twice, differently.** README's component table and
   the canvas markup both say **84px**; the canvas's own sidecar prose says **74px**. 84px is used
   here (two sources to one), but the contradiction is on record.
9. **S9 — Ledger line height disagrees.** README says one **34px** line per pass; the `d, e` frame
   draws `min-height:32px` with `gap:10px; padding:0 10px`, while the Surface-3 ledger draws
   `min-height:34px; gap:11px; padding:0 11px`. 34/11/11 is treated as canonical here.
10. **S10 — Hover states are specified for nothing.** No hover value is given for the door, the
    candidate row, the tick box, the ghost controls, `Show these`, `Undo these`, or `Cancel`.
11. **S11 — Focus-ring geometry is never drawn.** The design says the door does not steal focus and
    focus moves to the new ledger line after a commit, but no ring colour, width, offset or style is
    specified for any control on this surface.
12. **S12 — The commit primary's `active`/pressed appearance is unspecified** at both widths.
13. **S13 — The price formatter is absent.** README gap 2: only `BuyTag`'s shape is drawn. Currency,
    decimal handling, and staleness behaviour are explicitly not specified by Design.
14. **S14 — The `{money}` total's formatting** (currency symbol, thousands separator) is likewise
    unspecified; the canvas draws `$42.80`.
15. **S15 — The desktop row height is stated as 34px but the a11y panel says "40px row"** ("18px box
    on a 40px row at desktop"). README, the component table and every drawn row say `min-height:34px`.
16. **S16 — The ordering note (`list.ordering`) has no phone placement.** It is absent from the
    390px head on the canvas but the copy file does not mark it desktop-only.
17. **S17 — `commit.slotsStayOpen` has no phone placement.** The phone commit bar draws three lines
    and none of them is this string.
18. **S18 — `commit.nothingTicked` (the non-unowned zero-tick string) is never drawn.** Only
    `.nothingTickedUnowned` appears on the canvas; when each is chosen is stated only implicitly.
19. **S19 — The declined row's colour at phone width is not drawn**, nor is the illegal row's; only
    desktop frames exist for both. The 52px/two-line treatment for them is unspecified.
20. **S20 — The header row's `Cost` column label is drawn on the canvas but is not in the copy
    file** (`list.colCard`, `.colSynergy`, `.colDecks` exist; no `colCost`).
21. **S21 — The ledger header's phone copy is shortened on the canvas** (`Where these 95 came from`)
    but the copy file has only the full `ledger.header(total)`. No `headerMobile` exists.
22. **S22 — The strip's phone caption is shortened again inside the open list** (`38 candidates ·
    ranked by synergy`) — a third caption form with no copy key.
23. **S23 — `Close` (phone) vs `Close the list` (desktop).** The canvas shortens the label at 390px;
    `strip.close` has only the long form and no mobile variant.
24. **S24 — The kept note has no phone treatment.** It is drawn at desktop (`margin-left:auto`) and
    simply absent from the 390px toolbar frame; whether it wraps, moves or hides is unstated.
25. **S25 — The list's empty-declines / all-declined case is not enumerated.** A player who declines
    every candidate is not one of the twenty states.
26. **S26 — The provenance ledger's `padding` at desktop is drawn twice differently** (`11px 15px`
    in the state-1 provenance line vs `12px 15px` in the Surface-3 ledger box). Which is canonical
    when the box holds lines is unstated.
27. **S27 — No `min-width` or overflow behaviour is given for the 66px pass-label column** below
    390px, only the assertion that neither fixed column wraps "at three digits".
28. **S28 — Scroll/focus behaviour on commit settle at phone** is unspecified: focus moves to the
    new ledger line, which is above the strip and may be off-screen; whether it scrolls is not said
    (the design forbids scrolling for the *mark*, but says nothing here).
29. **S29 — The `sr-only` cost sentence's position in the row's accessible name** is given as
    "read before the ownership clause", but `list.rowAria` as written places `{ownership}` first
    with no cost slot — the two do not compose without an eng decision.
30. **S30 — The strip's open-state padding at desktop** is drawn as `14px 16px` (same as closed) but
    the list, head, header row and commit row all add their own padding; no total is stated.

---

# Errata — where the shipped build departs from this table

Each row above that carries an "erratum" reference is corrected here rather than in place, so
the table stays a record of what Design drew.

1. **The door does not stay mounted, so focus has to follow it.** §1c gives the door
   `aria-expanded` / `aria-controls` and says it "does not move focus on open", which is the
   contract the shipped `CoverageDisclosure` honours by keeping one control mounted and
   relabelling it. This design does not draw that: the door is *replaced* by `Close the list`,
   and §1d gives that replacement its own geometry and its own copy key. A control that
   unmounts under the cursor drops focus to the body, which is the outcome "does not move
   focus" exists to prevent.

   The build therefore treats the door and `Close the list` as two faces of one disclosure.
   Focus follows the disclosure to whichever face is mounted, and never into the rows — the
   prohibition §1e actually states. `Close the list` carries `aria-expanded` and
   `aria-controls` so the pair is not silent about its state while the list is up.

   §1d's focus-return row inherits the same correction: a pass that takes the last candidates
   leaves slots open and no door, because the exhausted plate stands in its place. Focus
   returns to the plate in that one case, which is otherwise the only close in the feature
   that lands nowhere.

   **For Design to ratify**, alongside the open items in the PR body.
