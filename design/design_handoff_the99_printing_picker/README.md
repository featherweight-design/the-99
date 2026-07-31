# The 99 — Collection · Per-printing art selection (design handoff addendum)

**R2.** Branch `feat/printings-and-sets`. A stateful addendum to the **shipped** card detail modal on
`/collection`: when you own more than one printing of a card, an **inline region inside the card
view** shows them all and lets you pin the one that represents it. **2,368 of 2,470 cards have
exactly one printing** — for those the only change is a caption naming the printing you're already
looking at.

File: `The 99 - Collection · Printing Picker.dc.html` (canvas — pan/zoom). Each state leads with the
phone (392px), desktop (1060px) beside it. R1 is preserved as
`The 99 - Collection · Printing Picker (R1 superseded).dc.html` — do not build from it.

## R2 delta

R1 audited 🟠 Orange on one blocker. Everything else stood.

| # | Change | Why |
|---|---|---|
| 1 | **Placement redrawn.** The chooser is an **inline region inside the card view**, not a second view. No `view: 'card' \| 'printings'`, no `Back to {cardName}`, no `Done`. | Locked decision 4: *"Inside the existing card detail modal. No new route, no modal modes."* R1's second view was the workshop-rejected option. |
| 2 | **Mobile art settled.** No mobile art panel anywhere in R2. | `card-modal.tsx:180` is `hidden md:flex`. The brief is the correct document; the Collection handoff's mobile art header is stale. R1 gap 3 closed. |
| 3 | **A pin is kept when a replace loses its printing**, goes dormant, and reactivates if the card returns. New state 6. | R1 drew and argued the opposite. |
| 4 | **Scope corrected to collection surfaces only** — grid, rows, modal. Not decks. | Per-deck art is deferred to #42. Fixed in state 3 and at `regionSubtitleChosen`. |
| 5 | **Pin key is `(oracle_id, set_code, collector_number)`.** R1 gap 4 withdrawn. | Zero duplicate groups across 100,601 rows; `collection_items.scryfall_id` is nullable, so R1's print-id plan would have denied the feature to bare `Name,Qty` importers. |
| 6 | **Per-finish selection was rejected in decision 3**, not 5. | Corrected throughout. |
| 7 | `no number` reframed as the **empty string**, not null. | No catalogue row is null; the case arrives from imports. Treatment unchanged. |

Not reopened, per the audit: the caption entry point, the three non-colour chosen/default signals and
the SC 1.4.1 argument, the overflow model, foil-shown-not-chosen, the radiogroup model.

## States delivered
- **Anatomy** — the caption at all five states, the four tile states, why the region spans the modal,
  roles + keyboard.
- **1 · No picker** — one printing owned, the default view.
- **2 · Region open, none chosen** — the resolver default marked as provisional, hover and focus in
  situ, card fully visible above.
- **3 · One chosen** — pick and default side by side; the art panel updates on press.
- **4 · Overflow** — 54 Forests across 20 real sets: pinned search, finish chips, set groups, region
  scrolls internally while the card block stays fixed.
- **5 · Edge entries** — `×3 · 1 foil`, `×2 foil`, and empty collector numbers at both scales.
- **6 · Dormant pin** — a replace lost the pinned printing.

---

## Decisions log

The five decisions the spec left to design.

### 1. Placement → **an inline region inside the card view** *(redrawn for R2)*
Desktop: the region docks **under the art panel**, spanning the full modal width. Mobile: the
promoted Set row **expands in place**.

Locked decision 4 keeps this inside the card view. Within that, the region spans the modal rather
than living inside the `320px` art column: that column has `264px` of content after its `28px`
padding — two tiles per row, 27 rows of Forests, and no room for a search field beside three chips.
Spanning gives 5-up on desktop and keeps the art, name, oracle text and mana cost visible above the
grid the whole time. **That is the point of the lock**: you compare printings *against the card*, not
against your memory of it.

The region is **attached to the caption**, not floating — the caption's bottom radius flattens and
its border runs continuous into the region's, so the two read as one object rather than a popover.
Padding rhythm follows the modal: `28px` vertical, `32px` horizontal.

At 54 entries the modal grows to `980px` (capped at `92vh`) and the **art panel collapses to a
compact strip** — a `100px` thumbnail with the caption beside it, instead of a `264px` image with the
caption stacked under. The card block drops from `520px` to `~254px`, and the **region scrolls
internally** with its search and chips pinned to its own header. That buys the grid `~604px`: **two
full tile rows with their captions, plus the next set's header**. You never scroll the card away to
reach the grid.

The collapse is the rule for the expanded state generally, not a special case for basics. A
`264px`-wide card image is 369px tall, and spending that on one printing while the fifty-three you're
choosing between sit below the fold is the wrong trade — especially since the same art is the first
tile in the grid. Collapsed, the panel fills the column as it always has.

**Mobile:** the Set row keeps its promotion out of the 2×2 meta grid (confirmed correct in the
audit) and becomes a disclosure. Since `card-modal.tsx:180` is `hidden md:flex`, its `40×56`
thumbnail is the only card art on the phone — which makes the promotion worth more than it was in R1.

### 2. Entry point → **the printing caption, and only past one printing**
Every card gets a **printing caption**, built as a `MetaField` — same mono uppercase label and Plex
Sans value as every other property in the modal. At one printing it is exactly that: plain text, no
border, no chevron, not focusable. At two or more it grows a third line (`3 printings you own ▾`) and
becomes a `button[aria-expanded][aria-controls]`. Growing a dead control on 2,368 cards to keep 4% of
them company would be the worse trade, and the caption pays for itself even inert — the shipped modal
never said *which* printing you were looking at.

Once pinned, the caption's third line reads brand-diamond + `Your pick` + `· of 3 ▾`, so the pin is
visible without opening anything.

### 3. Chosen vs. resolver-default → **three signals, none of them colour**
The tile sits on card art, so contrast under it is unpredictable (SC 1.4.1; 1.4.11 for the ring).

| | ring | badge | word | set name |
|---|---|---|---|---|
| **Your pick** | `2px solid #C9A24B`, offset `+3px` | filled brass square, `✓` | `Your pick` + brand diamond | 600 |
| **Default** | `1px dashed #8E8269`, offset `+3px` | dark plate, dashed border, hollow `◇` | `Default` | 400 |
| **Dormant** | `2px dashed #C9A24B`, art `grayscale(.55)`, `opacity .55` | dark plate, brass outline, `✓` | `Your pick · not owned now` | 400 |
| Rest | none | — | — | 400 |
| Focused | `2px #C9A24B` behind a `2px` dark gap (detached) | — | — | — |

Strip the colour and they still read apart: dashed vs solid, hollow vs filled vs outlined, three
different words. Badges sit on an `rgba(10,8,6,.72)` plate so the glyph clears AA over any art; the
brass badge is `#14110E on #C9A24B` ≈ 9.4:1. Footer and status copy is `#A89B84` on `#1A160F` ≈
7.4:1; the dimmest ramp value `#6E6353` is reserved for disabled controls and canvas annotation,
never product text. **Chosen and focused are deliberately different rings** — a tile can be both, so
the pick hugs the art and focus floats clear. Hover is `1px #4A4033`, never brass.

The tile itself is the **collection grid's card tile** at a smaller size: same `63/88` frame, `10px`
radius, inset hairline, same brass selection ring. No new tile language is introduced.

The default is marked at all, rather than left blank, because before you've picked anything one tile
*is* the art you've been looking at — unmarked makes the modal look arbitrary, brass would claim you
chose it. Dashed and hollow says *present, explained, provisional*, and the subtitle says why:
`We show the newest one unless you pick.`

### 4. Overflow → **stays a grid; gains search, finish chips and set groups past 12 entries**
Basics are the only cards where this gets big, and it gets big honestly. It stays a **grid** because
the task is recognising art, not reading a table. Past **12 entries**:

- the **`SearchField` primitive**, matching **set name, set code and collector number** — *"the
  Kaldheim one"*, *"blb"*, *"282"*. Same substring rules and no-highlight decision as the filter
  panel. A card-name search would be useless: every entry shares the name.
- a **finish chip row** in `chip-row.tsx`'s idiom — `All 54` / `Foil 6` / `Non-foil 48`,
  single-select, active chip filled brass. Not the filter panel's checkbox listbox: three mutually
  exclusive views of one pile.
- **set group headers** (`Kaldheim · KHM · 4`) so a 20-set scroll has landmarks. Release date newest
  first, ties A→Z, undated last — the same order the filter panel taught on this surface.

No virtualisation: 54 tiles is nothing and Magic's real worst case is under 200. Empty state reuses
the panel's shape: **"Not in that set"**.

### 5. Finish and missing data → **foil is shown, not chosen; `no number` is spelled out**
Granularity is locked at the printing and finish is not a printing (decision 3 rejected per-finish
selection) — so **one entry per printing**, with the split in the quantity: `×3 · 1 foil`. All-foil
reads `×2 foil`, never `×2 · 2 foil`. Foil art carries a faint diagonal sheen so a foil-only entry
doesn't look like a data error; the sheen is decoration and says nothing the text doesn't.

A printing whose collector number is the **empty string** reads `no number` in the same dim mono —
never `#—`, never a silently missing field. Two such entries from one set stay two entries, told
apart by their art and their position in the set group; the accessible name falls back to *no
collector number*. On phone the **set code** is dropped from the mono line before the number is.

---

## Accessibility model

```
button[aria-expanded][aria-controls=printings]          ← the caption
div#printings[role=radiogroup][aria-label="Printings you own"]
  button[role=radio][aria-checked]
    span.sr-only  "shown by default"
  button[role=radio][aria-disabled]                     ← dormant
```

- **Radiogroup, not listbox.** Exactly one printing represents the card, and the resolver default
  means one radio is always effectively on. Arrow keys move *and select* (radio semantics); `Tab`
  leaves the group; `Home`/`End` jump the ends. No wrap. A dormant entry stays in the group
  (`aria-disabled`) so the count and reading order stay honest.
- **`Esc` collapses the region** and returns focus to the caption. A second `Esc` closes the modal —
  the modal's own handler, untouched. No second focus trap; no nested dialog.
- Picking writes to the modal's **existing live region**. **No second live region is introduced.**
- Tap targets: tiles `110×154` minimum on phone; the collapsed printing row is `62px`.
- The mobile search field is **16px** (the iOS zoom floor — #101, ratified in R1).
- Only the disclosure animates (height + fade, 160ms), behind `prefers-reduced-motion`.

## Component notes (token references)

Hexes are Palette A "Table Candlelight" values for theme-independent reference; production reads
`var(--*)` from `src/app/globals.css`. **No new token is introduced.**

| Component | Spec |
|---|---|
| **Printing caption — 1 printing** | A `MetaField`. Centred under the art. Label Plex Mono 9.5px `.14em` uppercase `#8E8269`; value Plex Sans 12.5 `#A89B84`, number Plex Mono `#8E8269`. No border, not focusable. |
| **Printing caption — 2+, collapsed** | `button`, `bg #221D16`, `1px #3A3229`, radius `10px`, padding `12×16`, full column width. Value `#EDE6D8`; third line Plex Mono 11 `#C9A24B` `N printings you own ▾`. Hover `bg #2A241D` / border `#4A4033`. Focus `2px #C9A24B` at `+2px`. |
| **— expanded** | `bg #2A241D`, border `#4A4033`, `border-radius 10px 10px 0 0`, `border-bottom:none`; chevron `▴`. Continuous with the region below. |
| **— pinned** | Third line: brand diamond `7px #C9A24B` + `Your pick` (Plex Mono 10 `.14em` uppercase `#C9A24B`) + `· of 3 ▾` in `#8E8269`. |
| **Printing row (mobile)** | `bg #1E1A15` (`#2A241D` expanded), `1px #2A241D` (`#4A4033` expanded), radius `10px`, padding `11×14`, `min-height 62px`. Thumb `40×56` radius `5px`. `CODE · #num · ×n` mono `#8E8269`; brass count line + `▾`/`▴` only past one printing. |
| **Region** | `bg #14110E`, `1px #4A4033`, top border `#2A241D`, radius `0 0 10px 10px` (mobile) / full-width block with `1px #4A4033` top rule (desktop). Padding `26×32` desktop, `14px` mobile. Modal grows to `980px` / `92vh` when open; the art panel collapses to a `100px` thumbnail + caption strip (`16px` gap, top-aligned) so the grid clears two full rows. |
| **Region header** | Title Cinzel 600/19 `#EDE6D8`; subtitle Plex Sans 13.5 `#A89B84`; right slot Plex Mono 11 `#8E8269` count, or `Use the default again` in brass once pinned. |
| **Tile grid** | `repeat(auto-fill, minmax(150px, 1fr))`, gap `18px` — 5-up in the spanning region. Phone: 3 fixed columns, gap `12px` (≈110px). Art `aspect-ratio 63/88`, radius `10px`, `inset 0 0 0 1px rgba(0,0,0,.35)`. Matches the collection grid tile. |
| **Tile caption** | Set name Plex Sans 13 `#EDE6D8` (phone 12), wraps to 2 lines, no truncation. Meta Plex Mono 11 `#8E8269` (phone 10.5). Badge line Plex Mono 9.5 `.14em` uppercase. |
| **— your pick** | `outline 2px solid #C9A24B` at `+3px`; badge `21px` radius `5px` `#C9A24B` with `#14110E ✓`; name weight 600; meta `#C6B79A`. |
| **— default** | `outline 1px dashed #8E8269` at `+3px`; badge `19px` `rgba(10,8,6,.72)` + `1px dashed #8E8269` + `◇ #C6B79A`; label `Default` `#A89B84`. |
| **— dormant** | `outline 2px dashed #C9A24B` at `+3px`; art `grayscale(.55)`; wrapper `opacity .55`; badge `rgba(10,8,6,.78)` + `1px #C9A24B` + brass `✓`; meta `×0`; label `Your pick · not owned now`. `aria-disabled`. |
| **— hover / focus** | Hover `outline 1px solid #4A4033` at `+3px`. Focus `box-shadow 0 0 0 2px #14110E, 0 0 0 4px #C9A24B`. |
| **Dormant note** | `bg #211C15`, `1px #3A3229`, radius `9px`, padding `13×15`, `7px` grey diamond + Plex Sans 13 `#C6B79A`. Sits above the grid. |
| **Foil sheen** | `linear-gradient(115deg, rgba(255,255,255,.20) 4%, transparent 24%, rgba(201,162,75,.20) 44%, rgba(255,255,255,.16) 56%, transparent 80%)` over the art, inside the radius. Decorative. |
| **Search field** | `SearchField` from `text-field.tsx`, unchanged: `bg #181410`, `1px #3A3229` → `#C9A24B` on focus, radius `8px`. **16px** on mobile, 14px desktop. Pinned to the region header. |
| **Finish chips** | `chip-row.tsx` geometry — radius `999px`, 12.5px, padding `7×13`. Idle `#2A241D` / `1px #3A3229` / `#EDE6D8`; active `#C9A24B` / `#14110E`. Single-select. |
| **Set group header** | Plex Mono 10px (phone 9.5), `.16em`, uppercase, `#8E8269`: `{name} · {CODE} · {n}`. |
| **Scroll fade** | `44px` bottom fade to `#14110E`, `pointer-events:none`. |

## Notes for engineering
- **New component:** `src/components/collection/printing-region.tsx` — props
  `printings[] {setName, setCode, collectorNumber, qty, foilQty, imageUri, owned}`, `pinnedKey`,
  `defaultKey`, `onPin`, `onUnpin`, `onForget`. Renders the radiogroup + grid + (past 12) search and
  chip row. Rendered **inside the card view** — no dialog, no second focus trap, no live region.
- **`card-modal.tsx`** gains the caption component and one `expanded` boolean. **No `view` state.**
  The `320px` art column is unchanged; the region is a sibling block below the two-column row,
  spanning the modal.
- **`chip-row.tsx` / `text-field.tsx` are untouched** — reused as-is.
- **Data need:** the card query must return every owned printing:
  `{setCode, setName, releasedAt, collectorNumber, qty, foilQty, imageUri}`, plus any **dormant**
  pinned printing with `qty: 0`. `collectorNumber` may be the empty string — do not coerce it to
  `'0'` or drop the row.
- **Pin identity:** `(oracle_id, set_code, collector_number)`. Not `scryfall_id` — it's nullable for
  bare `Name,Qty` imports.
- **On replace:** if a pinned printing isn't in the new export, **keep the pin**, mark it dormant,
  fall back to the resolver default, and reactivate the pin automatically if a later import restores
  the printing. `Forget that pick` is the only way to clear it. No banner on the review screen.
- **Scope:** the pin resolves on **collection surfaces only** — grid, rows, this modal. Resolve it
  once, server-side. Deck views are out of scope (#42).
- **No new dependencies.** No virtualisation, no drag, no image cropping.
- **Copy** lives in `src/lib/copy/collection.ts` — see `printing-picker · copy strings.ts`.
- **Mock data:** set names and codes in state 4 are real sets that printed a basic Forest, in real
  release order. **Collector numbers, owned quantities, foil counts and the 2,368 / 2,470 / 54 / 6
  figures are illustrative.** Art regions are colour-identity gradient placeholders per the
  Collection handoff — swap in the Scryfall image, keep the `63/88` frame and badge chrome.

## Tweaks on the canvas
Three props for reviewing the calls rather than re-drawing them: **foil sheen** on/off, **tile
minimum width** (100–220px), and the **entry count at which search appears** (default 12).

## Gap report

1. **The spec and `src/` are still not in this design project.** `docs/` contains only
   `design-tables/appshell.md`; `src/` only `components/shell/nav.tsx`. R2's delta is built from the
   brief's statement of the locked decisions, which was explicit enough to act on — but I still have
   not read decision 4's full text, and `card-modal.tsx:180` is quoted from the brief, not read.
2. **The property table row (`collection.md:743-1023`) remains unverified** — the file isn't here.
   R2 adds a block to the card view rather than a mode, so the table's description of the modal
   should still hold; that is reasoning, not a check.
3. **The dormant tile's position** is drawn as *stays in set order*. If a dormant printing's set is
   itself absent from the new export, its group header has no other members — drawn as the header
   still rendering with a count of 1. Worth confirming against the resolver.
4. **`#59`'s richness pass will restyle this modal.** Collision surface: tile ring weights, badge
   plate opacity, the caption's `#221D16` fill, and now the region's `#4A4033` attach border.
5. **Region height at the extreme.** Two full tile rows is the floor, and the collapsed art strip is
   what buys them. If #59's richness pass grows the card block, the internal scroll absorbs it, but
   the grid stops reading as a grid below two rows — that is the budget to defend.

## Files
- `The 99 - Collection · Printing Picker.dc.html` — R2, the deliverable.
- `The 99 - Collection · Printing Picker (R1 superseded).dc.html` — R1, kept for the audit trail.
- `printing-picker · copy strings.ts` — the copy block for `src/lib/copy/collection.ts`.
- `READINESS.md` — readiness rating and what is blocking a green.
- `brand/` — the locked brand sheet + brand README.
- `support.js` — runtime for the HTML reference; not production code.
