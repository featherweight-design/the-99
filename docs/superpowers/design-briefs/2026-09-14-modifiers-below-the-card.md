# Design Brief — Modifiers below the card

**Workshop:** 2026-09-14, Hugh + agent. No ticket. This brief is the source of truth the Claude
Design handoff prompt points at.

**Verified against `origin/main` at `0e008f2b` on 2026-09-14.** Every `file:line` below was read on
that commit, not recalled.

This app draws a card grid on three routes and draws it three different ways. Two of them —
`/collection` in card view and `/decks/[id]` in card view — put the card's modifiers *on the art*,
in the corners, on top of the illustration the reader came to look at. Under each of those tiles
sits a caption holding a name and almost nothing else.

Hugh's observation is that the space below the card is free real estate and the art is not. The
modifiers move down. Everything else in this brief follows from that one move, plus a second
finding it surfaced: the deck's card view has no way to say the draft touched a card, while the
list view has had one since #389.

---

## §1 The three grids, as they stand

| Route | View | Grid declaration | Tile at 1300px |
|---|---|---|---|
| `/collection` | card | `grid-cols-2 md:grid-cols-5`, gap 12/20 (`collection/grid-view.tsx:29`) | **218px** |
| `/decks/[id]` | card | `grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(132px,1fr))]`, gap 12/20 (`decks/decklist-group.tsx:75`) | ~132–150px |
| `/collection/sets/[code]` | card | `repeat(auto-fill, minmax(146px, 1fr))` (`sets/set-grid-view.tsx:1561`) | 150px |

The arithmetic for `/collection`: the nav rail is 62px (`shell/nav.tsx:148`), so `main` is 1238px;
the grid pays 34px each side and 20px between, leaving 1170px of track. Five columns is a 218px
tile, six is 178px, seven is 150px. **At 390px the phone tile is 175px** — 362px of track, one
12px gap.

### What each tile draws today

**Collection tile** (`collection/grid-view.tsx`). On the art: `×N` quantity badge top-right
(`:65`), availability chip top-left (`:81`). The `×N` is unconditional — a collection where one
copy is the common case still prints `×1`. Caption: printed front-face name, then the set line —
`SET · rarity` on desktop and the **set code alone at the phone** (`:110-111`).

**Deck tile** (`decks/deck-card-tile.tsx`). On the art: availability chip *or* buy tag top-left,
never both (`:107`, `:118`); `×N` top-right and **absent at one copy** (`:129`); ownership dot plus
cost pips sharing a bottom-left scrim (`:177`, `:187`). Caption: printed front-face name, the
two-faced mark, and the `✕` that is the only way to remove a card in this view (`:192`).

The art in both carries `inset 0 -40px 40px -30px rgba(0,0,0,0.6)` at the phone and `-50px/-34px`
above `md:`. **Only the deck tile has a bottom-left group** — the collection tile's art carries the
chip and the badge and nothing along its bottom edge, so there the shadow is already doing no work
at all. On the deck tile it exists to hold the dot and the pips off light art, and it has no other
job. It goes from both.

---

## §2 Rulings

Settled in the workshop. These are not open.

1. **Modifiers leave the art.** Neither tile draws anything over the illustration except what §3
   leaves there. The art is the picture; the caption is the data.
2. **Cost pips are deleted from the card view, not relocated.** They are illegible at tile scale
   and the card face already prints its own cost. This is a removal, and it takes the bottom-left
   scrim's only remaining occupant with it once the ownership dot moves.
3. **Six columns on the desktop, 178px tiles.** Chosen because the phone tile is 175px: one
   caption design then serves both widths instead of a desktop caption that has room the phone
   never has. Rejected: five columns (218px), which lets the two widths drift.
4. **`/collection/sets/[code]` is out of scope and stays at 146px/7-up.** Its card view answers a
   different question — set completion, not a collection read — and Hugh has ruled the difference
   deliberate.
5. **The deck's card view gains a draft-state treatment.** It has none today: `usePendingChange`
   is consumed by `decks/decklist-row.tsx:124` and by no other component, so a deck with an
   uncommitted draft photographs identically in card view whether the draft is clean or not.
6. **The proxy mark is a caption resident from the start.** It is not deferred to the proxy
   handoff — see §5.
7. **No forced component share.** If one tile serves both routes, good; if the deck's `✕` and
   optimistic-remove machinery make that a contortion, two files that agree by convention is an
   acceptable answer. Design should not be constrained to either.

---

## §3 What the caption has to hold

Per route, at 178px desktop and 175px phone.

**`/collection`:** availability chip, quantity, name, and the set line — `SET · rarity` on desktop,
the set code alone at the phone. That difference is shipped behaviour and is what keeps the line
inside 175px.

**`/decks/[id]`:** ownership, availability chip *or* buy tag *or* proxy mark (one slot, §5),
quantity, name, two-faced mark, draft state, and the `✕`.

That is the whole problem. The deck caption is carrying up to seven things across 178px, one of
which is a 44px touch target at the phone. The existing tiles solve the crowding by putting four
of them on the art, which is the thing this brief removes.

Two constraints on any answer:

- **Caption height cannot depend on the data.** Both tiles say so in their own comments
  (`grid-view.tsx:88-92`, `deck-card-tile.tsx:194-198`): a grid whose captions are sometimes one
  line and sometimes two is either ragged or padded to the worst case on every tile. Whatever
  shape the caption takes, every tile takes it.
- **The `✕` keeps its floor.** 44px at the phone, 32px on desktop, per `deck-card-tile.tsx:215`,
  which took the floor rather than the shortcut exception because it is the only removal path in
  this view.

**Open for Design to call:** the caption's shape — one line or two, which modifiers get glyphs and
which get words, and whether anything at all is left on the art. Ruling 1 removes the modifiers;
it does not say the art must be bare. A treatment that keeps exactly one corner and moves the rest
is a legitimate answer if Design can defend it.

> **Closed in the handoff (R1), call D: nothing stays on the art.** Design declined the corner and
> named the price — the slot's three occupants would then be in two places, and keeping any corner
> re-imports the scrim this brief identified as the thing worth recovering. The permission above is
> spent; zero overlays is now the rule.

---

## §4 Draft state in card view

The list view's treatment, which the card view has to answer for:

- A 2px accent inset edge on any row the draft touched.
- A recounted row — one whose count moved between two non-zero values — prints its pair inline in
  the name's place, `Sol Ring 1 → 2`, and suppresses the `×N` glyph so the same fact is not stated
  twice (`decklist-row.tsx:124-142`).

The tile has a name that already truncates at 178px and a `×N` badge with the same double-statement
problem. **Open for Design to call:** whether the tile reuses the edge and the pair, or draws
something tile-native.

---

## §5 Proxy

A proxy is one deck's statement that it needs nothing from the collection for that card — the slot
is filled, the claim is released, no buy tag, not in Shopping. The spec is
`docs/superpowers/specs/2026-09-14-deck-proxies-design.md` (on `main` at `013a37e8`) and the
feature is in flight on `feat/proxies`.

Its handoff already exists — `design/design_handoff_the99_proxies/` on that branch, **not on
`main`** — and it draws the proxy mark on the decklist *row*, the card detail receipt, and the
cross-deck list. It never draws the card tile: `STATES-proxies.md` has no card-view state.

The rule to carry across is in `STATES-proxies.md:27-30`. The buy tag and the proxy mark **share
one slot and are mutually exclusive** — `deckRowTag` returns one. A proxied row must not draw a
price, a quantity, an availability marker, or a filled ownership dot, and must not grow the row.

**Open for Design to call:** the mark's tile treatment, under that one-slot rule.

---

## §6 The columns are a tile floor, not a count

**Both grids take `repeat(auto-fill, minmax(178px, 1fr))`.** One declaration, one number, both
routes. Six columns is what that floor *produces* at the 1300px reference width; it is not the
thing being specified.

Two corrections, both found in review of this brief, drove that:

**A fixed `md:grid-cols-6` breaks the tile it exists to protect.** `md:` begins at 768px, where
`/collection` has 638px of track and six columns is a **90px** tile — half the 175px phone tile
whose parity is ruling 3's entire argument. A fixed count holds the count and lets the tile vary,
which is backwards: the tile is the design and the count is the consequence.

**The Add panel no longer opens over the deck pane.** `decklist-group.tsx:69-74` says the deck grid
is `auto-fill` because a 340–346px panel opens over it — and that is stale. `BuilderShell` renders
`QuickAddBar` as a **full-width sticky bottom dock** (`builder-shell.tsx:1224`:
`sticky bottom-[var(--tabbar-h)] md:bottom-0 … px-[16px] md:px-[30px]`). Nothing overlays the grid,
so that rationale supports nothing. The grid still wants `auto-fill` — just for the ordinary reason,
that a floor is what holds a tile size across widths. **That stale comment should be corrected in
the same PR that changes the declaration.**

**The arithmetic, at 1300px.** `/collection` has 1170px of track (1238px main, less 34px padding
each side) and 20px gaps: six tracks of 178.3px. The deck pane has 1186px (its ancestor pays
`md:px-[26px]`, `decklist.tsx:717`): six tracks of 181px. Both land within 3px of the target, and
every figure here is quoted at that one reference width — a column count at any other width falls
out of the floor rather than being stated.

## §7 Out of scope

- List view on either route. Nothing here changes a row.
- `/collection/sets/[code]` (ruling 4).
- The proxy feature's own three surfaces, which their handoff already covers.
- Any change to what a modifier *means*. Availability, ownership, buy and proxy keep their current
  semantics exactly; this brief moves where they are drawn.
