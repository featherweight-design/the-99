# The 99 — Collection · Per-printing art selection (design handoff addendum)

Branch **`feat/printings-and-sets`**. A stateful addendum to the **shipped** card detail modal on
`/collection`: when you own more than one printing of a card, the modal lets you see them all and
pin the one that represents it. **2,368 of 2,470 cards have exactly one printing** — for those the
only change is a caption naming the printing you're already looking at. Nothing else on the surface
is redesigned.

File: `The 99 - Collection · Printing Picker.dc.html` (canvas — pan/zoom). Each state leads with the
phone (392px), desktop (1060px) beside it. Read `design_handoff_the99_collection/README.md` and
`design_handoff_the99_collection_filter/README.md` first — this document only records what
**changes**.

## States delivered
- **Anatomy** — the caption/trigger at all five states, the four tile states, why it's a second
  modal view rather than a panel, and the roles + keyboard model.
- **1 · No picker** — one printing owned, the default view. The whole diff is a two-line caption.
- **2 · Picker, 3 printings, none chosen** — the resolver default marked as *provisional*, plus
  hover and keyboard-focus tiles in situ.
- **3 · One chosen** — pick and default side by side, the footer's un-pin, and the caption back on
  the card.
- **4 · Overflow** — 54 Forests across 20 real sets, with SearchField, finish chips and set groups.
- **5 · Edge entries** — a foil count (`×3 · 1 foil`), an all-foil entry, and two printings with no
  collector number, at both scales.
- **#101** — the three filter-panel calls ratified (with a caveat; see below).

---

## Decisions log

The five decisions the spec left to design. (The ten locked decisions are honoured as stated in the
brief — granularity per printing, persistence, commit model, caption behaviour — see gap 1 for what
I could and could not verify.)

### 1. Placement → **the modal turns over; the chooser is a second view of the same modal**
This is the composition problem the brief flags, and the reason nothing fits *beside* the art:
the desktop art panel is a fixed `320px` column (`card-modal.tsx:180`) and the mobile modal has no
art panel at all (`hidden md:flex`). A picker docked to the art column would need two different
designs, and neither could hold 54 thumbnails.

So the chooser **replaces the modal body**: `‹ Back to Cyclonic Rift` sits where the art was, then
title, then the grid, then a footer. Same 820px shell on desktop; on phone it is the push view
players already know from the tab bar. One component, one grid, two widths, no new surface and no
new backdrop — you are still inside the same `?card=` modal, one layer down.

**Why not the alternatives:** a horizontal filmstrip under the art fits three thumbnails and dies at
54. A nested popover means a dialog inside a dialog — two Escs, two focus traps, and on phone it
would cover the thing it describes. A dedicated route breaks the "flip through cards without losing
scroll position" premise the modal exists for.

### 2. Entry point → **the printing caption, and only past one printing**
Every card gets a **printing caption** — under the art on desktop, a property row on phone. At one
printing it is plain dim text with no border and no chevron; at two or more the same element becomes
a button with a brass `N printings you own ▾` line. Growing a dead control on 2,368 cards to keep
4% of them company would be the worse trade, and the caption pays for itself even inert: the shipped
modal never said *which* printing you were looking at.

On phone the `Set` cell is **promoted out of the 2×2 meta grid** into a full-width printing row with
a `40×56` thumbnail; the grid drops to Rarity + Identity and quantity moves into the row's mono line.
Nothing is duplicated. The row reads correctly whether or not the mobile modal ever gets an art
header — if it does, the thumbnail is a redundancy you can drop; if it doesn't, that thumbnail is the
only art on the screen.

### 3. Chosen vs. resolver-default → **three signals, none of them colour**
The tile sits on card art, so contrast under it is unpredictable (SC 1.4.1, and 1.4.11 for the ring).

| | ring | badge | word | set name |
|---|---|---|---|---|
| **Your pick** | `2px solid #C9A24B`, offset `+3px` | filled brass square, `✓` | `Your pick` + brand diamond | 600 |
| **Default** | `1px dashed #8E8269`, offset `+3px` | dark plate, dashed border, hollow `◇` | `Default` | 400 |
| Rest | none | — | — | 400 |
| Focused | `2px #C9A24B` behind a `2px` dark gap (detached) | — | — | — |

Strip the colour and all four still read apart: dashed vs solid, hollow vs filled, two different
words. Badges sit on an `rgba(10,8,6,.72)` plate so the glyph clears AA over any art; the brass badge
is `#14110E on #C9A24B` ≈ 9.4:1. Footer status copy is `#A89B84` on `#1A160F` ≈ 7.4:1; the dimmest ramp value `#6E6353` is used only for disabled controls and for annotation chrome on this canvas, never for product text. **Chosen and focused are deliberately different rings** — a tile can
be both at once, so the pick hugs the art and focus floats clear of it. Hover is `1px #4A4033` and
never brass: the pointer's position must not look like a commitment.

The default is marked at all, rather than left blank, because before you've picked anything one tile
*is* the art you've been looking at — unmarked makes the modal look arbitrary, brass would claim you
chose it. Dashed and hollow says *present, explained, provisional*, and the subtitle says why:
`We show the newest one unless you pick.`

### 4. Overflow → **stays a grid; gains search, finish chips and set groups past 12 entries**
Basics are the only cards where this gets big, and it gets big honestly — a decade of drafting means
a Forest from nearly every set. It stays a **grid** because the task is recognising art, not reading
a table; a list of 54 rows saying "Forest" would be a joke. Past **12 entries** three things appear:

- the **`SearchField` primitive** (same one the filter panel reuses), matching **set name, set code
  and collector number** — the three things a player says out loud (*"the Kaldheim one"*, *"blb"*,
  *"282"*). Same substring rules and the same no-highlighting decision as the filter panel. A *card
  name* search would be useless: every entry has the same name.
- a **finish chip row** in `chip-row.tsx`'s idiom — `All 54` / `Foil 6` / `Non-foil 48`, single-select,
  the active chip filled brass. Not the filter panel's checkbox listbox: three mutually exclusive
  views of one pile.
- **set group headers** (`Kaldheim · KHM · 4`) so a 20-set scroll has landmarks. Release date, newest
  first, ties A→Z — the same order the filter panel taught on this surface.

No virtualisation. 54 tiles is nothing and Magic's real worst case is under 200; the grouping already
caps what renders above the fold. Empty state reuses the panel's shape at picker copy:
**"Not in that set"**.

### 5. Finish and missing data → **foil is shown, not chosen; `no number` is spelled out**
Granularity is locked at the printing, and a finish is not a printing — so **one entry per printing**
with the split in the quantity: `×3 · 1 foil`. An all-foil entry reads `×2 foil`, never
`×2 · 2 foil`. Foil art carries a faint diagonal sheen so a foil-only entry doesn't look like a data
error; the sheen is decoration and says nothing the text doesn't.

A printing with no collector number reads **`no number`** in the same dim mono — never `#—`, never
`#null`, never a silently missing field. Two numberless printings from one set stay two entries,
told apart by their art and their position in the set group, and the accessible name falls back to
*no collector number*. On phone the **set code** is dropped from the mono line before the number is;
the number is what a player looks for.

---

## Accessibility model

```
button[aria-expanded][aria-controls=printings]          ← the caption
div#printings[role=radiogroup][aria-label="Printings you own"]
  button[role=radio][aria-checked]
    span.sr-only  "shown by default"
```

- **Radiogroup, not listbox.** Exactly one printing represents the card, and the resolver default
  means one radio is always effectively on. Arrow keys move *and select* (radio semantics); `Tab`
  leaves the group; `Home`/`End` jump the ends. No wrap.
- **`Esc` returns to the card view, not out of the modal** — one Esc per layer, the second closes the
  modal. The chooser is not `aria-modal`; it *is* the modal.
- Picking writes to the modal's **existing live region**: `Pinned Return to Ravnica number 71.`
  Un-pinning: `Pin removed. Showing the default, Ravnica Remastered.`
- Tap targets: tiles are `110×154` minimum on phone; the mobile printing row is `62px`.
- The mobile search field is **16px** (the iOS zoom floor — see #101, ratified below).
- Nothing animates except the phone's push transition, behind `prefers-reduced-motion`.

## Component notes (token references)

| Component | Spec |
|---|---|
| **Printing caption — 1 printing** | Centred under the art. Label Plex Mono 9.5px `.14em` uppercase `#8E8269`; value Plex Sans 12.5 `#A89B84`, number in Plex Mono `#8E8269`. No border, no background, not focusable. |
| **Printing caption — 2+** | `button`, `bg #221D16`, `1px #3A3229`, radius `10px`, padding `12×16`, full column width. Value lifts to `#EDE6D8`; third line Plex Mono 11 `#C9A24B` `N printings you own ▾`. Hover `bg #2A241D / border #4A4033`, count `#D8B25E`. Focus `2px #C9A24B` at `+2px`. |
| **Printing caption — pinned** | Third line becomes brand diamond `7px #C9A24B` + `Your pick` (Plex Mono 10, `.14em`, uppercase, `#C9A24B`) + `· of 3 ▾` in `#8E8269`. |
| **Printing row (mobile)** | `bg #1E1A15`, `1px #2A241D`, radius `10px`, padding `11×14`, `min-height 62px`. Thumb `40×56` radius `5px`. Label / name / `CODE · #num · ×n` mono `#8E8269`; brass `N printings you own ›` line + trailing `›` only past one. |
| **Chooser header** | `‹ Back to {card}` Plex Sans 13.5 `#C9A24B`; title Cinzel 700/26 (phone 23); subtitle Plex Sans 14 `#A89B84`, max `560px`. `1px #2A241D` bottom. Close `✕` in the shipped `#221D16` circle, unmoved. |
| **Tile grid** | `repeat(auto-fill, minmax(150px, 1fr))`, gap `18px` — 4-up at 820px. Phone: 3 fixed columns, gap `12px` (≈110px tiles). Art `aspect-ratio 63/88`, radius `9px` (phone `8px`), `inset 0 0 0 1px rgba(0,0,0,.35)`. |
| **Tile caption** | Set name Plex Sans 13 `#EDE6D8` (phone 12), wraps to 2 lines, no truncation. Meta Plex Mono 11 `#8E8269` (phone 10.5): `CODE · #num · ×n`. Badge line Plex Mono 9.5 `.14em` uppercase. |
| **— your pick** | `outline 2px solid #C9A24B` at `+3px`; badge `21px` radius `5px` `#C9A24B` with `#14110E ✓`; name weight 600; meta lifts to `#C6B79A`. |
| **— default** | `outline 1px dashed #8E8269` at `+3px`; badge `19px` `rgba(10,8,6,.72)` + `1px dashed #8E8269` + `◇ #C6B79A`; label `Default` `#A89B84`. |
| **— hover / focus** | Hover `outline 1px solid #4A4033` at `+3px`. Focus `box-shadow 0 0 0 2px #1A160F, 0 0 0 4px #C9A24B`. |
| **Foil sheen** | `linear-gradient(115deg, rgba(255,255,255,.20) 4%, transparent 24%, rgba(201,162,75,.20) 44%, rgba(255,255,255,.16) 56%, transparent 80%)` over the art, inside the radius. Decorative. |
| **Search field** | `SearchField` from `text-field.tsx`, unchanged: `bg #181410`, `1px #3A3229` → `#C9A24B` on focus, radius `8px`. **16px** text on mobile, 14px desktop. |
| **Finish chips** | `chip-row.tsx` geometry — radius `999px`, 12.5px, padding `7×13`. Idle `#2A241D` / `1px #3A3229` / `#EDE6D8`; active `#C9A24B` fill / `#14110E`. Single-select. |
| **Set group header** | Plex Mono 10px (phone 9.5), `.16em`, uppercase, `#8E8269`: `{name} · {CODE} · {n}`. |
| **Chooser footer** | `1px #2A241D` top, padding `16×32`. Left Plex Mono 11 `#8E8269` (`54 printings · 20 sets · newest set first`). Right: nothing pinned → status note in `#A89B84` (≈7.4:1 — it is product copy, not a disabled control, so it does not sit at `#6E6353`); pinned → `Use the default again` in brass. Phone footer: same left/right pair plus the brass `Done` dismiss. |
| **Scroll fade** | `48px` bottom fade to `#1A160F` (phone `#181410`), `pointer-events:none`. |

## Notes for engineering
- **New component:** `src/components/collection/printing-chooser.tsx` — props
  `printings[] {printId, setName, setCode, collectorNumber, qty, foilQty, imageUri}`,
  `pinnedPrintId`, `defaultPrintId`, `onPin`, `onUnpin`. Renders the radiogroup + grid + (past 12)
  search and chip row. It renders **inside** the existing modal shell — no second dialog, no second
  focus trap.
- **`card-modal.tsx`** gains a `view` state (`'card' | 'printings'`) and the caption/row component.
  The `320px` art column is unchanged in the card view. The chooser view spans the full `820px`.
- **`chip-row.tsx` / `text-field.tsx` are untouched** — reused as-is.
- **Data need:** the card query must return every owned printing of the card, not just the resolved
  one: `{printId, setCode, setName, releasedAt, collectorNumber, qty, foilQty, imageUri}`. Set names
  and release dates come from the same Scryfall set data the filter panel needs. `collectorNumber`
  is nullable and the UI handles null — do not coerce it to `''` or `'0'`.
- **Pin identity:** key the pin on the **Scryfall print id**, not `setCode + collectorNumber` — the
  latter is not unique when the number is missing (gap 4).
- **On replace:** if a pinned printing isn't in the new export, drop the pin silently and fall back
  to the resolver default. No warning on the review screen — the player sold a card, they didn't lose
  a preference.
- **No new dependencies.** No virtualisation, no drag, no image cropping.
- **Theme-aware values** (`base`, `surface`, `elevated`, `line`, text ramp, `accent`) come from
  `src/app/globals.css` `var(--*)`; the hexes above are Palette A "Table Candlelight" values for
  theme-independent reference only. **No new token is introduced** — the dashed default ring uses the
  existing muted text colour, the sheen is a literal gradient on decoration.
- **Copy** lives in `src/lib/copy/collection.ts` — see `printing-picker · copy strings.ts` here for
  the exact strings, keyed and ready to paste, following `shell.ts`'s shape.
- **Mock data:** set names and codes in state 4 are real sets that printed a basic Forest, in real
  release order. **Collector numbers, owned quantities, foil counts and the 2,368 / 2,470 / 54 / 6
  figures are illustrative** and mirror `data/the-vault.csv`'s shape. Art regions are
  colour-identity gradient placeholders per the Collection handoff — swap in the Scryfall image,
  keep the `63/88` frame and the badge chrome.

## Tweaks on the canvas
Three props, for reviewing the calls rather than re-drawing them: **foil sheen** on/off, **tile
minimum width** (100–220px, changes how many fit per row), and the **entry count at which search
appears** (default 12).

## Gap report
Things this addendum deliberately does **not** answer, for the audit:

1. **The spec, the property table and `src/` are not in this design project.**
   `docs/superpowers/specs/2026-07-29-per-printing-art-selection-design.md`,
   `docs/superpowers/design-tables/collection.md:743-1023` and
   `src/components/collection/card-modal.tsx` are all absent — `docs/` here contains only
   `design-tables/appshell.md`, and `src/` only `components/shell/nav.tsx`. I built against the
   shipped Collection handoff, the filter-panel addendum, and the brief's summary of the locked ten.
   **The five open decisions are fully owned; the ten locked ones are honoured as paraphrased in the
   brief, not read.** Diff the **commit model** (drawn as: picking commits immediately, `Done` only
   dismisses) and **caption behaviour** first — those are the two most likely to collide.
2. **The property table row.** I could not confirm the picker sits in
   `collection.md:743-1023` without breaking it. The card view's *external* geometry is unchanged
   (same 820px modal, same 320px art column, same close button, same Prev/Next), and the chooser is a
   second view of the same shell rather than a new surface — which should be the sufficient
   condition, but that is an assumption, not a check.
3. **Mobile art.** The brief says the mobile modal has no art panel (`hidden md:flex`); the shipped
   Collection handoff draws a mobile art header. I've drawn the header (design intent) **and** made
   the printing row work without it. Whichever is true, the picker is unaffected — but somebody
   should reconcile the two documents.
4. **Pin identity for numberless printings.** `setCode + collectorNumber` is not a unique key when
   the number is null. Drawn on the assumption that a Scryfall print id is available and stable
   across a replace. If it isn't, two numberless printings from one set cannot be told apart and the
   pin will drift.
5. **Where the pin is honoured.** State 3's copy promises "the list, the grid, and every deck it's
   in". That's the honest reading of a per-card pin, but it means the collection list/grid, the
   commander cards and the deck views all read the same field. Confirm the pin is resolved once,
   server-side, rather than per-surface.
6. **#59's richness pass will restyle this modal.** Everything here is drawn against the *current*
   property table. The collision surface is small and specific: the tile ring weights, the badge
   plate opacity, and the caption's `#221D16` button fill. If the richness pass changes the modal's
   elevation ramp, those three want re-checking — nothing else in this addendum depends on it.
7. **#101 is ratified against the wrong list, possibly.** The issue text isn't in this project, so I
   ratified the three questions the filter-panel handoff itself flagged (its gaps 3, 4, 5). The
   canvas says so in an amber banner. If eng's three were different, that section is void.

## Files
- `The 99 - Collection · Printing Picker.dc.html` — the canvas (this addendum's deliverable).
- `printing-picker · copy strings.ts` — the copy block for `src/lib/copy/collection.ts`.
- `READINESS.md` — readiness rating and what is blocking a green.
- `brand/` — the locked brand sheet + brand README, copied in for self-containment.
- `support.js` — runtime for the HTML reference; not production code.
