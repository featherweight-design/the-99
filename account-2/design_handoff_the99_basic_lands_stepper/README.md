# The 99 — Basic lands stepper (design handoff, R1)

`design/design_handoff_the99_basic_lands_stepper/` · 2026-10-14 · mirrors `design_handoff_the99_undo_removal/`
(a small control on an existing row). Voice: Kitchen Table. Theme drawn: Kaldheim, the live theme.

**Source of truth:** `docs/superpowers/design-briefs/2026-10-14-basic-lands-stepper.md` on branch
`brief/basic-lands-stepper` (not on main yet). Hugh's locks (2026-10-14) are taken as given:

- Basics only. Nothing about Shopping, money or ownership changes.
- One save writes the final count, so rapid presses combine into one save.
- No new 99-card cap.
- Failed saves use the shipped shape: `We couldn’t <verb> that. The deck is unchanged.`

Canvas: `The 99 - Basic Lands Stepper (R1).dc.html` (the calls) plus five boards: `R1 - List-Phone`,
`R1 - List-Desktop`, `R1 - Card-Phone`, `R1 - Card-Desktop`, `R1 - Access`. Open with `support.js` beside them.
The same canvas is live as a Design artifact in account 2.

---

## R2 changes (Hugh, 2026-10-14: "a bit more minimalist")

**R2 supersedes R1's component notes below where they differ.** R1's files are kept for the diff. The five calls are
unchanged; only the drawing of the control changed. `R1 - Access.dc.html` still holds for R2.

| | R1 | R2 |
|---|---|---|
| Row, phone | 36px bordered box, radius 9 | **No box, no border.** − and + bare in `--fg-faint`, count in mono `--fg-body`. Buttons still 44×44; 112px in all. |
| Row, desktop | 28px bordered box; row padding cut to 3px | **Bare glyphs at the ✕'s size and rest ink** (`--border-dashed`, `--fg-body` on hover). 22px per glyph, 24px count, 68px in all. Row keeps its shipped 7px padding. |
| Tile | Solid `--surface-sunken` bar with a top border | **No bar.** − count + on a 70% `--bg` scrim across the art's foot. Glyphs `--fg-body` (phone) / `--fg-faint` lifting to `--fg` (desktop). |
| Field focus | Box border goes `--accent` | **A 2px `--accent` underline under the count.** |

The ✕ at 1, the `from N` marker, the refusal line and every state are unchanged.

## The answer in one line

*The count becomes the control.* On a basic row, `− count +` takes the place of the ✕ and the `×N`. Every press
moves the count at once, and one write carries the final figure.

## Design's calls (brief §Open)

### 1. Which control: a stepper on basic rows, with a typed count

The stepper and tap-the-count, combined the way the shipped collection stepper already combines them
(`add-line.tsx:152-172`): − and + around a numeric field. Presses cover the median case (6 copies, +5 is five
presses with one save). The field covers the large one: the 35-Island deck cut to 20 is one typed figure, not
fifteen presses.

**No basics panel this round** (gap G1). It is the only option that adds a surface, and Hugh scoped this as a light
addendum. The rebalance (4 Plains out, 4 Swamps in) is eight presses on two adjacent rows of one group with no
waiting, against eight presses on two surfaces today.

### 2. What − does at 1: removes the row

At 1 the − button **becomes the shipped ✕**, with the shipped label `Remove {name}`. Pressing it removes the row
into #185's receipt (`Island removed · Undo`), so a mis-press is one press from back. No row is held at 0: a count
of nought is never drawn, as in `undo_removal`'s rule 1.

The glyph changes so that the one press that removes the row looks like removal. A − that silently deleted the row
at 1 would be the only − in the app that does something other than subtract.

A typed 0 is the same act: the row leaves into the receipt.

### 3. Card view: a band across the foot of the art

`− count +` on a band over the bottom of the tile's art: 44px tall on the phone (each button 44×44), 32px on
desktop (the width of the tile's ✕ column), full tile width.

- **The tile does not grow,** so the grid stays even. A band under the tile would have made basic tiles 44px taller
  than every other tile in the group.
- **It covers nothing.** A basic has no cost pips (`left 6px, bottom 6px` on the art), and its art says nothing its
  name does not.
- **The caption loses its `×N` and its ✕ column** on basic tiles, as the row loses them. Non-basic tiles are as
  shipped.

### 4. Desktop reveal: always visible, quiet at rest

The stepper holds the count, and a count drawn only on hover is a count most visits never see. So the control is
always drawn on desktop, in both views. At rest the − and + sit in `--border-dashed`, the ✕'s rest ink, and lift to
`--fg-body` on row or tile hover and on focus. The count is full `--fg` throughout.

### 5. The change marker: `from 6`

The shipped recount pair prints `6 → 8` in the name's place. With a stepper the 8 is already on the row, and
printing it twice is the double statement the row already avoids by suppressing `×N` beside a pair. So on basic
rows the pair **keeps only its left half, as `from 6`** (mono 11px, `--fg-faint`), after the name. The 2px accent
edge stays as shipped. On a tile, `from 6` takes the draft figure's place and its `--accent` ink.

When the count returns to the committed figure, the marker and the edge both go. A basic new to the deck (committed
0) has no pair to print, so it carries the shipped add mark only, as today.

The accessible description keeps the shipped recount strings (`addMarkRecountedA11y`, `cutMarkRecountedA11y`).
`from 6` is `aria-hidden`.

## States drawn

Each at 390 and desktop, in list view and Card view. Full matrix in `STATES-stepper.md`.

| # | State | Note |
|---|---|---|
| 1 | Idle, 6 Islands | Desktop also draws hover. |
| 2 | Pending save | +2 pressed: count 8, `from 6`, accent edge. Nothing disabled, nothing spins. |
| 3 | Refused save | Count back to 6, marker gone, shipped `MutationError` line. |
| 4 | At 1 | − is the shipped ✕. |
| 5 | Removed (the "at 0" moment) | #185's receipt / undo tile, unchanged. |
| 6 | Typing a count | 35 → 20; the field's focus lights the box. |
| 7 | Focus | Each button rings itself. |
| 8 | At the size limit | 99, then one press over: shipped `+1` and trim line. |

## Component notes

| Component | Spec |
|---|---|
| **Row stepper, phone** | Replaces the ✕ (44px) on basic rows. Drawn box 36px tall, radius 9, 1px `--border-strong`. − and + are 44×44 targets (the row's 44px is the target height), glyph 16px mono `--fg-muted`. Count field 30px wide, 16px mono so iOS does not zoom. Total 118px. |
| **Row stepper, desktop** | Shipped desktop stepper metrics: 28px box, radius 7, buttons 28 wide, field 30 wide, 12.5px mono. 86px total. The row keeps 34px by taking 3px vertical padding on basic rows instead of 7. |
| **Tile band** | Absolute over the art's foot. `--surface-sunken`, 1px `--border-strong` top. Phone 44px (buttons 44×44), desktop 32px (buttons 32×32). Field fills the middle. |
| **At 1** | The − slot draws the shipped ✕ glyph (13px) with `removeAria`. Same slot, same size, so nothing moves. |
| **`from N`** | Mono 11px `--fg-faint` after the name (row); `--accent` in the caption's meta line (tile). `aria-hidden`. |
| **Focus** | Buttons: 2px `--accent` ring inset. Field: the whole box's border goes `--accent`. |
| **Everything else** | No new token, no new hex, no motion, no spinner, no disabled state on + or −, no toast, no confirm, no tooltip. |

## Notes for engineering

- **Uses engineering's proposed `setBasicQuantity(deckId, oracleId, n)`** (brief §What engineering proposes, 1),
  absolute, coalesced after a short settle. Nothing in this design needs a +1/−1 write.
- **Removal at 1 is the shipped path**, not `setBasicQuantity(0)`: `removeCardFromDeck` with the spent slot and
  #185's receipt, so Undo works as it does today. If the plan prefers routing it through `setBasicQuantity(0)`, the
  receipt must still draw. A burst that ends at 0 cannot happen by presses (the ✕ is a separate press at 1), only by a
  typed 0.
- **Pending is not a visual state.** The count shows the optimistic figure; no button is disabled while a write is
  out (brief proposal 2). A press during an in-flight write restarts the settle and the next write carries the newer
  figure.
- **Refused** reverts to the last saved count and draws the shipped `MutationError` under the row or tile. Verb:
  `change` (brief's working verb), for `/copy-review` to settle. The line clears on the next press.
- **Lifting a shared stepper** (brief proposal 4): the row and the tile band are two layouts of one control. A
  shared `<CountStepper size="row|band">` lifted from `add-line.tsx` fits both. Engineering's call.
- **Gate on `isBasicLand(typeLine)`**, so snow basics get the stepper too. Commander rows never draw it.
- **Over 99** needs nothing new: the shipped `overCopy` figure and trim line read any count.

## About

**No entry and no edit.** With no basics panel, nothing here needs discovering: a reader meets the control on the
row they already edit. The brief's optional key line on `deck-page` was conditional on a panel.

## Gap report

1. **G1 · No basics panel.** Adding a basic the deck does not hold yet still goes through the Add panel search, and a
   rebalance is presses on two rows. A panel (identity basics + Wastes, a count each) is the natural R2 if Hugh
   wants it; it would also earn the `deck-page` key line.
2. **G2 · Tile grid widths assumed.** Card view is drawn 2-up at 390 (171px tiles) and at 168px tiles on desktop. I
   did not confirm the shipped grid's column rule; the band is full-width, so it adapts to any tile width.
3. **G3 · Header figures are schematic.** The size-limit frames draw the shipped over figure and trim line from
   `overCopy`, not from the deck header component itself.
4. **G4 · Fixtures are illustrative.** 6 Islands (the median), 35 Islands (the brief's largest), and a hand-built
   row at 1. No staging read was made from this account.
5. **G5 · Copy.** Every new string is a placeholder for `/copy-review`: the − and + labels, the field label, the
   settle announcement and the refusal verb.
6. **G6 · Folder name.** The brief's §Deliverable names `design_handoff_the99_basics_stepper/`; Hugh's request
   names `design_handoff_the99_basic_lands_stepper/`. This package uses Hugh's.

## Files

- `The 99 - Basic Lands Stepper (R1).dc.html`: the calls. **Start here.**
- `R1 - List-Phone.dc.html` · `R1 - List-Desktop.dc.html` · `R1 - Card-Phone.dc.html` · `R1 - Card-Desktop.dc.html` ·
  `R1 - Access.dc.html`: every state, and the keyboard and screen-reader behaviour.
- `INDEX.md` · `README.md` · `STATES-stepper.md` · `READINESS.md` · `basic-lands-stepper - copy strings.ts`
- `design-tables/basic-lands-stepper.md`: the design-table section.
- `brand/`: the locked brand sheet, copied in so this folder stands alone.
