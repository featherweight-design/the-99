# The 99 — Collection · Per-printing art selection (design handoff addendum)

**R3.** Issue [#105](https://github.com/HartiganHM/the-99/issues/105) · branch
`feat/printings-and-sets` · spec `docs/superpowers/specs/2026-07-29-per-printing-art-selection-design.md`.

When you own more than one printing of a card, the card detail modal's **Set field becomes a
disclosure** and opens a region of every printing you own, inside the modal's scrolling content
column. **2,368 of 2,470 cards own exactly one printing** — those render the modal unchanged
(decision 6).

File: `The 99 - Collection · Printing Picker.dc.html` (canvas — pan/zoom). Each state leads with the
phone (392px), desktop (1060px) beside it. R1 and R2 are preserved as `(R1 superseded)` and
`(R2 superseded)` — do not build from either.

---

## ⚠ Read this before auditing R3

R3 was **rebuilt against the repo**, not revised from R2. The spec, `card-modal.tsx`, `globals.css`,
`chip-row.tsx` and `text-field.tsx` became readable after the GitHub connection landed; R1 and R2
were built from a paraphrase and inherited two factual errors from it. That means R3 lands
**after** the R2 audit and **disagrees with parts of it**. Three items need an explicit ruling.

| # | R2 audit said | R3 does | Why |
|---|---|---|---|
| 1 | Desktop is Green as drawn — 980px/92vh modal, art panel collapsing to a 100px strip. Don't touch it. Eng will update the property table. | **Reverted to the shipped 820×620 / 85vh.** The region lives inside `.flex-1.overflow-auto`. | The fixed height isn't a table row to update — it's a **bug fix with a source comment**: the dialog was `h-auto` and paging Prev/Next through one-line vs twelve-line oracle text "resized the dialog under the cursor on every step." A picker that grows the modal 360px on expand rebuilds that bug in a worse form. The content column already scrolls; that is where variable-height content belongs. |
| 2 | Keep the dormant-pin tile and *Forget that pick*. | **Kept, as ruled** — and flagged on the canvas. | Decision 5 says the pick "falls back **silently**." R3 first drew this state as showing nothing. Drawn as ruled, but it is a **knowing exception to a locked decision**; decision 5's text should be amended so the next audit doesn't flag it as drift. |
| 3 | The caption entry point is confirmed; don't reopen. | **The caption is now the existing `Set` MetaField**, and at one printing there is no diff at all. | Decision 6: "one owned printing renders the modal *exactly as it does today*." R1/R2 added a permanent printing caption to all 2,470 cards. `MetaField label="Set" value={printingCaption(card)}` already names the printing — a second caption would also risk contradicting it, which decision 8 forbids. |

Two more corrections, both mine, both closed:

- **Mobile art.** The phone has shipped art all along (`card-modal.tsx:146-177`, table `:761`/`:785`).
  The `hidden md:flex` at `:180` is only the desktop column. The spec's §Open item 5 states the
  opposite and I propagated it into R2. Every phone state in R3 is drawn on the real 180px header.
  **The Collection handoff was right; my "stale" call was wrong.**
- **`no number`.** R1/R2 printed a `no number` label. On a bare `Name,Qty` import *every* entry
  carries an empty collector number, so every tile would say it. R3 omits the field and its
  separator entirely, per the spec's "not render a stray separator."

---

## States delivered
- **Anatomy** — the Set field at five states, four tile states, why the modal must not resize, roles
  + keyboard, and the mobile art header's collapse behaviour.
- **1 · No picker** — one printing owned. The shipped modal, unchanged.
- **2 · Region open** — 3 printings, nothing checked, hover and focus in situ.
- **3 · One chosen** — art column, Set field and tile ring all move together.
- **4 · Overflow** — 54 Forests across 20 real sets, in the same 820×620 modal.
- **5 · Edge entries** — finish detail, and the bare-import empty collector number.
- **6 · Pick outlives the holding** — dormant tile (ratified exception), and silent reactivation.

---

## Decisions log

The five decisions the spec left open (§Open for Design to call).

### 1. Presentation → **a thumbnail grid, not a list or a carousel**
The task is recognising art, so the art is the control. A list of 54 rows all reading "Forest" is a
joke; a carousel hides most of the pile behind a swipe and makes comparison serial. The tile is the
**collection grid's tile** at a smaller size — `grid-view.tsx:41` gives the art region
`aspectRatio: "63/88"` with `rounded-[9px] md:rounded-[10px]` and an inset hairline, which is what
the picker tile reuses. **One collision worth knowing:** the grid tile carries a brass `×qty` badge
at `top-[8px] right-[8px]` — the same slot the picker's `✓`/`◇` occupies. That is why quantity lives
in the picker's caption line and never as a badge.

### 2. Placement → **inline in the modal's scrolling content column**
Decision 4 keeps this inside the card detail modal with no modal modes. Within that, the region sits
**below the meta row, inside `.flex-1.overflow-auto`**, separated by the same `1px var(--border)`
rule the Prev/Next footer uses.

The modal keeps its shipped geometry: `md:w-[820px] md:h-[620px] md:max-h-[85vh]`, full-bleed
`w-full h-full` on phone. It does not grow, because the fixed height exists to stop the dialog
resizing under the cursor while paging Prev/Next — see the conflict table above.

Content column: `820 − 320 = 500px`, less `32px` padding each side = **436px usable → three tiles at
a 16px gap** (~135px each). Larger than the 110px phone tile, and *Commander Anthology Volume II*
sets on two lines without truncating.

**The content column scrolls, and states 2–4 are drawn scrolled.** At `620px` the column gives
`547px` of viewport; title + oracle + meta row take ~268px, so a tile row with its caption and badge
does not fit under them unscrolled. That is not a defect — it is the shipped component doing what it
already does for twelve lines of oracle text — but it means the honest frame is the scrolled one.
Every state from 2 on is drawn **at the offset a player is looking at while choosing**, with a top
fade marking the content scrolled above. How deep that offset runs varies with what each state has
to show: desktop keeps the meta row in frame, and mobile state 2 — the tightest, since it must show
three tiles, their collector numbers *and* the shown-now badge on a 451px body — is drawn past the
title and oracle entirely. An engineer building from these frames sees the badges and the reset
control, because that is what the user sees at the moment the state matters.

**Mobile order changes when the region is open.** Rarity and Identity move *above* the Set row, so
the disclosure and its region are last in the column. Otherwise the meta grid sits behind a
full-height region and is pushed off-screen the moment you expand. Collapsed, the order is the
shipped one.

The art column is a flex sibling and never scrolls, so the card stays put however far down the grid
you are. At 54 printings the modal is **identical in size to state 2** — that's decision 4's intent
falling out of the shipped layout rather than being enforced.

**Mobile:** the shipped 180px art header stays. Below it the `Set` cell is **promoted out of the 2×2
`MetaCell` grid** into a full-width row (Rarity + Identity stay behind); the row expands in place.
Its `40×56` thumbnail identifies the current printing beside art that's already showing it — it is
not a substitute for the art panel.

**The art header collapses past the overflow threshold**, and only there. At 54 entries a 180px
header plus a 62px row plus search plus chips leaves about one tile row on an 812px phone. It
collapses to a **72px thumbnail with the title and type line beside it** — the same trade as the
desktop panel, on a device with less room to make it. The card name moves *into* the header as it
collapses rather than being lost, and the space it vacates is what the grid gains. Below the
threshold the header is untouched.

### 3. How selection reads → **three signals, none of them colour**
The tile sits on card art, so contrast under it is unpredictable (SC 1.4.1; 1.4.11 for the ring).

| | ring | badge | word | set name |
|---|---|---|---|---|
| **Your pick** | `2px solid var(--brass)`, offset `+3px` | filled brass square, `✓` | `Your pick` + brand diamond | 600 |
| **Shown now** | `1px dashed var(--fg-faint)`, offset `+3px` | dark plate, dashed border, hollow `◇` | `Shown now` | 400 |
| **Dormant** | `2px dashed var(--brass)`, art `grayscale(.55)`, `opacity .55` | dark plate, brass outline, `✓` | `Your pick · not owned now` | 400 |
| Rest | none | — | — | 400 |
| Focused | the global `:focus-visible` from `globals.css` — `2px var(--brass)`, offset `2px`, not overridden | — | — | — |

**"Shown now", not "Default".** Decision 10 says the fallback-resolved printing must not render as
though the user chose it. *Shown now* describes what the app is doing; *Default* starts to sound
like a setting you own. With no preference stored, **no radio is checked** — `aria-checked="false"`
throughout, roving tabindex parked on the shown-now entry.

Badges sit on `rgba(10,8,6,.72)` so the glyph clears AA over any art; the brass badge is
`var(--bg)` on `var(--brass)` ≈ 9.4:1. Chosen and focused are deliberately different rings — a tile
can be both. Hover is `1px var(--border-dashed)`, never brass.

### 4. Overflow → **grid + search + finish chips + set headers, past 12 entries**
Measured worst case is 54 (`Forest`), then Swamp 41, Mountain 32, Plains 30, Island 28, Sol Ring 13.
Basics dominate, which is exactly where art choice is the point. Past **12 entries**:

- **`SearchField`** from `text-field.tsx`, reused unmodified — including its `focus-within` brass
  border and `0 0 0 3px rgba(201,162,75,.16)` glow. Matches **set name, set code and collector
  number** (*"the Kaldheim one"*, *"blb"*, *"282"*). Card-name search is useless — every entry
  shares the name.
- **Finish chips** in `chip-row.tsx`'s geometry (`--elevated` fill, `1px var(--border-strong)`,
  radius 999px): `All 54` / `Foil 6` / `Non-foil 48`. Single-select with a brass active fill and
  **no dismiss ✕** — a view switch, not removable filters.
- **Set group headers** — `Bloomburrow · BLB · 4`. Release date newest first, ties A→Z, undated last
  (the filter panel's rule, ratified in R1 #101).

No virtualisation: 54 tiles is nothing, and the content column already scrolls.

### 5. Mobile composition → answered in decision 2 above
Kept separate in the spec because the premise was that mobile had no art. It does; the composition
question collapses into placement.

---

## Accessibility

```
button[aria-expanded][aria-controls=printings]          ← the Set field
div#printings[role=radiogroup][aria-label="Printings you own"]
  button[role=radio][aria-checked]
    span.sr-only  "shown now, not chosen"
  button[role=radio][aria-disabled]                     ← dormant
```

- **Radiogroup.** Arrow keys move and select; `Tab` leaves; `Home`/`End` jump the ends; no wrap.
  Nothing checked until a pick exists (decision 10).
- **`Esc` collapses the region**, focus returns to the Set field. `useDialogA11y` handles the second
  `Esc` as it does today — the region adds no handler that swallows it.
- The region is inside the existing dialog, so **the focus trap already covers it**. No new trap.
- **One live region.** The modal has none today, so engineering adds the single one specified in the
  copy file. Do not add a second.
- Tiles ≥ `100×140`; mobile Set row `62px`; mobile search field 16px (iOS zoom floor, ratified #101).
- Only the disclosure animates — height + fade, 160ms, behind `prefers-reduced-motion`, matching the
  filter sheet's `0.18s ease-out` precedent in `globals.css`.

## Component notes

Hexes live only in `globals.css`; everything below is `var(--*)`. **No new token is introduced.**

| Component | Spec |
|---|---|
| **Set field — 1 printing** | Shipped `MetaField` / `MetaCell`, untouched. |
| **Set field — 2+, collapsed** | Same `MetaField` markup wrapped in a `button`: `background var(--elevated)`, `1px solid var(--border-dashed)`, radius `8px`, padding `8px 12px` with `-8px -12px` margin so the meta row's `gap-[26px]` rhythm is unchanged. Third line: mono 11px `var(--brass)` — `N printings you own ▾`. |
| **— expanded** | Chevron `▴`. Border and fill unchanged. |
| **— pinned** | Third line: brand diamond `7px var(--brass)` + `Your pick` (mono 10px `.14em` uppercase `var(--brass)`) + `· of 3 ▾` in `var(--fg-faint)`. |
| **Set row (mobile)** | Promoted out of the 2×2 grid at 2+; full width, `background var(--elevated)`, `1px var(--border-dashed)`, radius `10px 10px 0 0`, padding `11px 14px`, `min-height 62px`. Thumb `40×56` radius `5px`. Region attaches directly below (`border-top:none`, `margin-top:-1px`). |
| **Mobile art header** | Shipped rows `collection.md:761` / `:785`, unchanged below the overflow threshold. Collapsed: `padding 44px 20px 14px`, `display:flex; align-items:flex-end; gap:14px`, art `72px` at `63/88` radius `10px`, name + type line beside it with `0 2px 8px rgba(0,0,0,.5)` text-shadow for legibility over art. |
| **Region** | Block inside `.flex-1.overflow-auto`, `margin-top 24px`, `padding-top 22px`, `border-top 1px var(--border)` — the Prev/Next divider's rhythm. Mobile: bordered continuation of the Set row, `1px var(--border-dashed)`, radius `0 0 10px 10px`, padding `14px`. |
| **Region intro** | Plex Sans 13.5px `var(--fg-muted)`. `Use the default again` right-aligned in `var(--brass)` once a pick exists. |
| **Tile grid** | Desktop `repeat(3, 1fr)`, gap `16px` (~135px tiles). Mobile `repeat(3, 1fr)`, gap `12px` (~101px). Art `aspect-ratio 63/88`, radius `10px`, `inset 0 0 0 1px rgba(0,0,0,.35)`. |
| **Tile caption** | Set name Plex Sans 13px `var(--fg)` (mobile 12px), wraps to 2 lines, no truncation. Meta mono 11px `var(--fg-faint)` (mobile 10.5px). Badge line mono 9.5px `.14em` uppercase. |
| **— your pick** | `outline 2px solid var(--brass)` at `+3px`; badge `21px` radius `5px` `var(--brass)` with `var(--bg) ✓`; name weight 600; meta `var(--fg-body)`. |
| **— shown now** | `outline 1px dashed var(--fg-faint)` at `+3px`; badge `19px` `rgba(10,8,6,.72)` + `1px dashed var(--fg-faint)` + `◇ var(--fg-body)`; label `Shown now` in `var(--fg-muted)`. |
| **— dormant** | `outline 2px dashed var(--brass)`; art `grayscale(.55)`; wrapper `opacity .55`; badge `rgba(10,8,6,.78)` + `1px var(--brass)` + brass `✓`; meta `×0`; label `Your pick · not owned now`. `aria-disabled`. Keeps its position in set order. |
| **Dormant note** | `background var(--elevated-hover)`, `1px var(--border-strong)`, radius `9px`, padding `12px 14px`, `7px` `var(--fg-faint)` diamond + Plex Sans 12.5px `var(--fg-body)`. |
| **Foil sheen** | `linear-gradient(115deg, rgba(255,255,255,.20) 4%, transparent 24%, rgba(201,162,75,.20) 44%, rgba(255,255,255,.16) 56%, transparent 80%)` inside the radius. Decorative. |
| **Set group header** | Mono 10px (mobile 9.5px), `.16em`, uppercase, `var(--fg-faint)`. |
| **Scroll fade** | `36–40px` fade to `var(--surface-rail)` desktop / `var(--bg)` mobile, `pointer-events:none`. |

## Notes for engineering

- **New component:** `src/components/collection/printing-region.tsx`. Props:
  `printings[] {setName, setCode, collectorNumber, qty, foilQty, imageUri}`, `preferred`,
  `resolvedKey`, `onPick`, `onReset`. Renders the radiogroup + grid + (past 12) search and chips.
  Rendered **inside** the modal's content column — no dialog, no focus trap, no live region of its
  own.
- **`card-modal.tsx`** gains one `expanded` boolean and wraps the `Set` `MetaField`/`MetaCell` in a
  button at `printings.length > 1`. The art column and Prev/Next are untouched. On mobile, the art
  header takes a `compact` boolean driven by the same threshold as the search field.
- **`chip-row.tsx` / `text-field.tsx` untouched** — `SearchField` reused as-is; chips reuse the
  geometry, not the component (single-select, no dismiss).
- **Data:** `BrowseCard.printings` already carries what the grid needs. Two additions the spec
  already calls for — `finish` carried onto `BrowsePrinting` and aggregated (`{nonfoil: 3, foil: 1}`)
  for decision 9, and `primaryPrinting` honouring the preference so the grid tile and the modal
  agree. `collectorNumber` may be `''` — do not coerce or drop the row.
- **Pin identity:** `(user_id, oracle_id)` primary key, `(set_code, collector_number)` as the value,
  per `card_art_preferences`. Not `scryfall_id`.
- **Write path:** server action upserts, `revalidatePath("/collection")`, per `decks/actions.ts:193`.
- **Scope:** collection surfaces only (decision 2). Deck builder, recommendations and commander
  surfaces keep the resolver's choice. Per-deck art is
  [#42](https://github.com/HartiganHM/the-99/issues/42).
- **No new dependencies**, no virtualisation, no image cropping.
- **Copy:** `printing-picker · copy strings.ts` → `src/lib/copy/collection.ts`.
- **Mock data:** set names and codes in state 4 are real sets that printed a basic Forest, in real
  release order. Collector numbers, quantities and foil counts are illustrative. Art regions are
  colour-identity gradient placeholders — swap in the Scryfall image, keep the `63/88` frame and the
  badge chrome.

## Tweaks on the canvas
**Foil sheen** on/off, **tile minimum width** (90–180px), **entry count at which search appears**
(default 12).

## Gap report

1. **Decision 5 vs. the dormant tile.** Drawn as ruled, against the spec's "silently". Needs the
   spec amended, not the drawing changed. See the conflict table.
2. **The modal's height.** ~~Assumed~~ **read**: `md:h-[620px] md:max-h-[85vh]`, with the reason in
   a source comment. R3 stays inside it, so no property-table row changes and no table update is
   needed. R2's gap 2 is closed — not as answered, but as moot.
3. **The overflow threshold of 12 is a judgement, not a measurement.** It sits between Sol Ring (13,
   which gets search) and the next tier down. If eng would rather derive it from rows-per-viewport,
   the canvas tweak makes it cheap to re-look.
4. **The mobile art collapse is new behaviour** with no property-table row. It needs one, or an
   explicit note that the header is conditional. Same for the **mobile meta-row reorder** when the
   region is open.
5. **#59's richness pass** will restyle this modal. Collision surface: tile ring weights, badge
   plate opacity, the Set field's `--elevated` fill, and the mobile art header's compact variant.
6. **The picker badge and the grid tile's quantity badge share a corner.** Harmless today — the
   picker renders no quantity badge — but if #59 adds one, they collide.

## Files
- `The 99 - Collection · Printing Picker.dc.html` — R3, the deliverable.
- `The 99 - Collection · Printing Picker (R2 superseded).dc.html` / `(R1 superseded)` — audit trail.
- `printing-picker · copy strings.ts` — the copy block for `src/lib/copy/collection.ts`.
- `READINESS.md` — rating and what's blocking Green.
- `brand/` — brand sheet + README. `support.js` — canvas runtime, not production code.
