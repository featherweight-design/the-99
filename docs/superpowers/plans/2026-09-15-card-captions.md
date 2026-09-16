# Plan — Card captions

**Handoff:** `design/design_handoff_the99_card_captions/` (R1).
**Readiness:** `docs/superpowers/readiness-card-captions.md` — 🟢 Green, five errata.
**Brief:** `docs/superpowers/design-briefs/2026-09-14-modifiers-below-the-card.md`.

Both card views move their modifiers off the art and into a two-line caption. The art keeps
nothing but its 1px inner edge. Grids standardize on a 178px tile.

Written against `origin/main` at `f5745d11`.

---

> **Superseded in three places, 2026-09-15.** This plan is the record of what was built; three of
> its rulings were overturned after the feature shipped and are carried as errata 10–12 of
> `docs/superpowers/readiness-card-captions.md`:
>
> - the draft's accent rule is a **drawn 2px strip down the whole tile**, not a `draftEdge` shadow
>   on the caption — an inset shadow paints under the opaque art and was invisible across it;
> - a single-copy add prints **no figure**, where this plan specifies `+N`;
> - the slot box is `py-[3px]`, taking the meta line to 17/18 and the caption to **56/50**, where
>   this plan specifies `py-[1px]` and 52/46.
>
> Read the verdict for what ships.

## PR boundaries, named before implementation

Three PRs. §10's size gate is ~20 files / ~800 lines.

| PR | Scope | Ledger items |
|---|---|---|
| **1 — the caption chassis** | The shared caption, both tiles, both grids, the undo receipt's height | 1, 2, 3, 4, 5, 6, 8 |
| **2 — draft state in card view** | The caption edge and the meta line's figure | 7 |
| **3 — the lone copy** | `×1` suppressed on `/collection` | 10 |

**Why the slot's three occupants cannot be split across PRs.** PR 1 moves the availability chip and
the collapsed `$` into the caption. The proxy mark is already drawn on the tile's art
(`deck-card-tile.tsx:121`), so leaving it there while the other two move would put one slot in two
places — call D's first refusal, and the exact failure the handoff's dependency section warns
about. Ledger item 8 is therefore PR 1's work, not PR 3's.

**Why both routes are in one PR.** The readiness doc's ledger says items 3 and 4 ship in the same
release: one caption on two surfaces, and splitting them leaves the app with two caption shapes for
one idea.

**If PR 1 trips the size gate**, the cut is *not* collection-versus-deck. It is to lift ledger items
1 and 2 — the `plate` prop on both primitives, with their unit tests — into a PR 0. That is a
genuine seam: the prop is additive and independently testable. It is not the default because a
merged prop with no call site reads as speculative.

---

## PR 1 — the caption chassis

### T1 · The shared caption

New: `src/components/ui/card-tile-caption.tsx`.

Per handoff §7, the caption block is shared and the tile is not. The deck's `✕` carries
`useDeckMutation`, `useRemoveOptimisticCard`, `markSlotSpent` and an undo tile that `/collection`
has no use for.

```
CardTileCaption({ meta, name, nameTrail, trailing, draftEdge })
```

- `meta` — the meta line's occupants, already ordered by the caller.
- `name` — the printed front-face name; the component owns the truncation.
- `nameTrail` — the `//` mark. Absent on `/collection` (spec errata 3).
- `trailing` — the full-height right column. The deck's `✕`; `undefined` on `/collection`.
- `draftEdge` — `inset 2px 0 0 0 var(--accent)` on the caption block.

Exports `CARD_TILE_CAPTION_H` (`"min-h-[52px] md:min-h-[46px]"` — see T5 on why `min-h`) so the
undo receipt reads the same figure rather than restating it.

Geometry, from `STATES-card-captions.md` § Geometry:

| | Desktop | Phone |
|---|---|---|
| caption height | 46px fixed | 52px fixed |
| meta line | mono 9.5px, gap 6 | mono 9px |
| name | 13px / 600, one line, never clamped | 12px / 600 |
| pad left | 10px | 9px |
| pad right | 3px with `trailing`, 10px without | 3px / 9px |
| `//` | mono 11px, gap 6 | same |

### T2 · The unified slot box

Ledger 1 and 2, plus readiness erratum 3.

`AvailabilityMarker` and `BuyTag` each gain `plate?: boolean` (default `true`). `plate={false}`
drops the scrim **and the absolute positioning**, keeping the glyph, the border and the label.

The size rides that prop, which is erratum 3's containment boundary. **Do not edit
`CHIP_SKIN`, `PLACEMENT.tile` or `PLACEMENT.band` in place** — each is shared with a surface this
handoff never drew:

| Primitive | Variant | Also used by |
|---|---|---|
| `AvailabilityMarker` | `density="chip"` | `suggestion-tile.tsx:214` |
| `BuyTag` | `variant="tile"` | `suggestion-tile.tsx:229` |
| `ProxyTag` | `variant="band"` | `spine-desktop.tsx:391,417`, `spine-mobile.tsx:137,168,178` |

`ProxyTag` gains a `caption` variant rather than a prop, because its two existing variants already
differ by placement and it has no plate to drop — its `band` scrim is the only thing going.

The box, all three: `font-mono rounded-[4px] px-[5px] py-[1px]`, `text-[8.5px] md:text-[9px]`.

**The chip's edge becomes an outline, and that is the whole of the height problem.** The `$` uses an
inset `boxShadow` and the `P` an `outline` at `-1px`; both occupy no layout. The chip uses Tailwind
`border`, which is 1px of real box on every side. Normalizing font size and padding alone leaves it
2px taller than the two beside it — so `plate={false}` swaps the border for an outline in the same
three inks. `proxy-tag.tsx:29-36` already made this exact ruling for itself.

The glyph is not the constraint: a 9px span's line box is ~13.5px against a 6px diamond.

**Restructure the shared records without changing what they emit.** Both primitives keep the scrim
and the edge in one entry — `PLATE.tile` pairs a `background` with a warning `boxShadow`,
`CHIP_SKIN` pairs a `bg-` with a `border-`. Splitting them to drop one and keep the other is an
edit to a shared constant, which is what the boundary above forbids in spirit but not in letter. The
test is what the existing variants *emit*: unchanged, byte for byte. Say so in the commit, or the
first reviewer reads it as a violation.

### T3 · The deck tile

`decks/deck-card-tile.tsx`.

- All four marks leave the art: chip, `$`, `P`, `×N`. The `deckRowTag` exclusivity moves with them,
  unchanged — it already decides the slot.
- The art's bottom scrim deletes. `inset 0 0 0 1px rgba(0,0,0,0.25)` stays: it keeps a pale card
  frame from bleeding into the plate, which is a job nothing else does.
- **`CostPips`, `spokenManaCost` and the no-art branch all stay** (readiness erratum 2). Ruling 2
  means *no pips over art*, which main already shipped. A tile with art keeps its `sr-only` cost; a
  tile with no art keeps its drawn pips, because the plate prints no cost of its own. The
  bottom-left `<span>` survives for that one branch and the dot leaves it.
- Caption becomes `CardTileCaption` with the dot, the slot, the count, the name, the `//` and the
  `✕` column.

### T4 · The collection tile

`collection/grid-view.tsx`.

- Chip and `×N` down onto the meta line; `SET · rarity` right-aligned on it, rarity dropped at the
  phone as shipped.
- No ownership dot (the route lists what you own), no `//`, no `trailing`.
- Grid goes `md:grid-cols-[repeat(auto-fill,minmax(178px,1fr))]` — readiness erratum 5. **Not
  `md:grid-cols-6`**: `md:` begins at 768px, where six columns is a 90px tile. The phone keeps an
  explicit `grid-cols-2`; at 390px the track is 362px and one 178px floor plus a gap already exceeds
  it, so auto-fill there collapses to one column.
- The art's bottom scrim deletes here too. It is in the same composed shadow string as the 1px inner
  edge (`grid-view.tsx:56`), and call D applies to both routes.
- `Show more` spans `col-span-full`. It is `md:col-span-5` today, which a floor-based track cannot
  keep in step — it would sit off-centre on every page with more results.
- The tile stays one `<button>`. The caption is inside it, so the `aria-hidden` name and its
  `sr-only` sibling keep their current arrangement — `CardTileCaption` must not introduce a nested
  interactive element on this route.

### T5 · The undo receipt

`decks/deck-card-undo-tile.tsx`, readiness erratum 4.

It borrows `TILE_SHELL` and `TILE_ART_RATIO` so a removed card leaves a hole exactly its own size,
then hardcodes `min-h-[44px] md:min-h-[36px]`. Replace with `CARD_TILE_CAPTION_H`.

**`min-h`, not `h`.** The handoff's READINESS point 3 says the height is fixed and must stay fixed,
and warns that swapping `min-h` for `h` under pressure is how the design fails — but the warning is
about the *value* drifting per state, not about the property. `min-h` with no conditional occupant
able to exceed one line is fixed in practice and degrades to taller rather than clipped if a future
string is longer. The test asserts the two tiles report equal caption heights, which is the
invariant that actually matters.

### T6 · The grid floor

`decks/decklist-group.tsx`, ledger 6, readiness erratum 5.

Takes the **same declaration as `/collection`** — `repeat(auto-fill, minmax(178px, 1fr))`. One
number, both routes, and the column count falls out of the width.

**Correct the stale comment in the same edit.** `:69-74` says the grid is `auto-fill` because a
340–346px Add panel opens over the pane. `QuickAddBar` is a full-width sticky bottom dock
(`builder-shell.tsx:1224`) and nothing overlays the grid. The grid still wants `auto-fill`, for the
ordinary reason: a floor is what holds a tile size across widths. Leaving the comment would hand
the next reader a rationale that supports nothing.

**The target is the floor, not the resulting tile.** With `auto-fill` and `1fr` the floor selects
the column count and the tracks then stretch to fill: at 1300px the deck pane's 1186px of content
gives six tracks of **181px**, and no floor produces 178 there. `/collection`'s 1170px gives 178.3px.
The probe asserts each route's own measured figure, named — never a shared ±2, which on the deck
pane is unreachable and would flip on whether a scrollbar is rendered.

### T7 · Tests

- `card-tile-caption.test.tsx` — the six-state matrix per route, occupant presence and absence.
- Both tiles' existing tests updated for the moved marks.
- Equal-caption-height assertion across `DeckCardTile` and `UndoTile`.
- Mutation-check every fix that ships with a test: revert, confirm red, restore.

### T8 · Probe

`scripts/probe-card-captions.mjs`, at 1300x900 and 390x844:

- The art has **no** mark and no bottom scrim — computed styles, not class lists.
- The caption's height is equal across a live tile and an undo receipt on the same grid.
- The three slot occupants report the same box height — the erratum 3 invariant, and the one a
  class-list assertion cannot see.
- Six columns at 1300 on both routes; `/collection`'s tile measures 178±2 and the deck pane's 181±2
  — each route's own achievable figure, not one shared number.
- The three slot occupants report the same box HEIGHT. A class-list assertion cannot see this: it
  reads `border` and `outline` as equally present, and the border is the 2px that differs.
- Each check gets its failure path exercised before the run is believed.

---

## PR 2 — draft state in card view

Ledger 7. `usePendingChange` gains its second consumer.

- The caption block draws `inset 2px 0 0 0 var(--accent)` when the draft touched the card. **Not
  the shell** — the shell's border already carries over-committed, and both are true at once often
  enough to matter (readiness, carried forward).
- The meta line's count position is vacated by the figure: `1 → 2` for a recount between non-zero
  counts, `+N` for an add. `×N` is suppressed either way — **which is call B's ruling and not parity
  with the row.** The row suppresses on a recount only (`decklist-row.tsx:137`: `!recounted`, and
  `recounted` needs `from > 0`), because an add there has no figure to put in the name's place. The
  tile's figure sits in the count's own position, so both cases displace it.
- `from === 0` is the add. `PendingChangeMove` already documents it (`pending-change.tsx:8-12`), so
  this needs **no new query** — readiness erratum 1.
- **Copy: reuse before adding.** `deckImportCopy.update.diff.recountedItem` and
  `deckVersioningCopy.pending.{addMarkA11y, addMarkRecountedA11y}` already say these things. The
  handoff's own copy file bills itself as a reuse manifest, so a fourth module restating
  `${from} → ${to}` is the drift it warns against. Decide this before writing the component.
- Zero motion. The edge does not transition in when a draft opens.

## PR 3 — the lone copy

**Ledger 10, severable.** `×1` suppressed on `/collection`, matching the deck tile. The meta line
makes the redundancy louder by putting the count beside a chip. One condition, one line.

**Ledger 9 was withdrawn, and is now SHIPPED** — the record in full, because a plan that stopped at
the withdrawal would tell future acceptance work the card-view key is intentionally absent.

Erratum 7 withdrew it: `decklist.tsx:185-196` recorded the guard as an argued scope decision, and the
tile's `$` says *not owned* where the row's identical glyph says *to buy*. That went back to Design
as the one open question of this feature.

Design answered with `ADDENDUM-the-key.md` and overturned it on a better argument than the erratum
had. The two glyphs mark two different SETS of cards — `deckRowTag` returns `buy` for
`!owned || spokenFor` and only the row passes `spokenFor` — so no one word is true of both, and
shared copy was never available. But `P` is `card.proxied` on both, so **the divergence is one word
wide**. Two keys differing by one entry are not a third vocabulary.

Shipped as 9a–9d in its own PR: one sibling string (`key.regionAriaCards`), one optional prop on
`MarkKey`, and the guard becomes a branch. Samples unchanged — readiness erratum 9.

## Out of scope

- List view on either route.
- `/collection/sets/[code]` — ruling 4, unchanged at 146px.
- The Consider tile, the top-off list and the commander spine. They share the primitives and are
  protected by T2's variant boundary; none of them changes.
- Any change to what a modifier means.

---

## Carried, not scheduled

Raised by the plan's cold review, each real and each outside the three PRs above:

- **`decklist.tsx:752` and `:763` are PR 2's, not PR 1's.** Both guard a draft surface on
  `view === "list"` and both comments give the same reason — "the card view draws tiles that carry
  no mark at all". PR 2 gives the tiles the mark, which invalidates both. Ship PR 2 without them and
  card view has the marks but neither the change-list caption nor the per-group note. **Folded into
  PR 2.**
- **The design tables still specify the old tile.** `design-tables/collection.md:684-770` gives
  `repeat(5, 1fr)` and a section each for the quantity badge, the caption area and the set caption;
  `card-availability.md:407` puts the tile chip top-left on the art and `:392` fixes it at
  mono 8.5/600. Every one is falsified by PR 1. This repo's convention is that property tables are
  the dangerous ones and get swept in ONE pass — **PR 1 sweeps them, and `pnpm check:copy-drift`
  runs over the result.**
- **`probe-printed-name.mjs` measures the thing being rebuilt.** `tileArt()` climbs at most six
  parent levels from the caption leaf; the new caption adds levels between the name span and the
  shell. Run it before opening PR 1.
- **`feature-acceptance` needs an inventory.** No `docs/superpowers/inventories/*.json` covers these
  two card views. `proxy-mark.json` already records the deck tile as "a fifth renderer of the mark
  and this file does not check it" — which PR 1 makes checkable.
