# Printed name — design spec

**Date:** 2026-09-09 (R2 audit and errata folded in 2026-09-10)
**Ticket:** follow-on to #467
**Handoff:** `design/design_handoff_the99_printed_name/` — READINESS **Green** (R2)

## The problem

A player who owns the Secret Lair printing of *World at War* holds a card whose face reads
**Battle of Olympus**. The deck row calls it *World at War*; the card modal, which resolves a
specific printing to show its art, shows the Secret Lair art beside that same oracle name. The
app already knows which printing the player owns and still refuses to call the card by the name
printed on it.

The player's framing, and the one this spec adopts: a renamed printing is not a variant of a
card, it is a different version of the card, and it should be represented as such everywhere the
player is looking at their own copy.

`printings.flavor_name` shipped in #467 (migration `0023_chubby_lady_vermin`) and is populated —
619 rows on staging and production. #467 spent it on *matching* during import and search. This
spec spends it on *display*.

## The four locked decisions

Settled in the brainstorm; not re-opened by this spec or by either handoff round.

1. **The displayed name follows `resolvedPrinting()`** — the same printing the art comes from.
   The name and the art must never disagree, which is the standing invariant stated in
   `primaryPrinting()`'s own doc comment at `src/lib/collection/browse.ts:348-350` — *"Art and
   caption MUST come from this same printing"* — and enforced by the closing loop that sets
   `primarySetCode` and `imageUri` from one call to it.
2. **A card you do not own keeps its oracle name.** With no printing in hand there is no printed
   name to resolve, and inventing one would assert a printing the player does not have.
3. **Rows and tiles show the printed name alone.** No parenthetical, no second line, no marker.
   A truncated printed name therefore has no fallback on those surfaces, which is why the
   handoff measures the ladder rather than estimating it.
4. **The modal is the only place the oracle name survives on screen** — and is therefore the
   recovery path for every truncation this spec permits, one tap from the row that clipped it.

## Scope

Human-facing surfaces **and** exports.

**In:** the decklist row on `/decks/[id]` (list and grid view), the deck grid tile, the shared
card modal, `/collection` grid and rows views, the row and tile accessible names, and the decklist
export.

**Out:** `card-search-row` (the player is choosing between printings and the set code is already
on the row), `unresolved-row` (no oracle id yet), `update-diff-row` and `synergy-row` (they audit
oracle cards, not the player's own copy), deck import matching (#467 owns it), and the commander
header on `/commanders/[id]`.

## Display rules

The handoff owns the drawing; this section records only what binds implementation.

### Rows and tiles

- The name string comes from `resolvedPrinting()`, falling back to the oracle name when the card
  is unowned or the resolved printing prints no name of its own.
- Single line, end ellipsis, on every surface. **No wrap and no clamp** — a wrapped row shunts
  the ninety-eight rows below it, and a two-line caption makes tile height data-dependent and
  costs the grid its equal-height read.
- The **full, untruncated** printed name is the row's and tile's accessible name. On both surfaces
  that name already comes from the `CardDetailTrigger`'s `name` prop, which is a real `<button>`,
  so the full string goes there rather than onto an `aria-label` — a label on the caption `<span>`
  would satisfy a test and reach no assistive technology. **Never a `title`** either: pointer-only
  recovery on a phone-first surface.
- The name block is the only shrinking child. On the decklist row this is already true and needs
  no change: `flex-auto` with `flex-none` siblings has been the shape since #354. **Keep
  `flex-auto`; do not swap it for `flex:1`.** The only requirement worth restating is
  `min-width:0`.
- The count rides *inside* the name block, after the name, at `flex-none`. `×2` never vanishes.

### The modal

- The title becomes the **printed** name.
- A new line sits between the title and the type line, rendered **only** when the printed name
  differs from the oracle name — absent, not blank, with no reserved height. This is the state to
  regression-test, because it is every card but a handful.
- The line is a mono 10.5px `--fg-faint` label reading `oracle`, then the oracle name at
  13.5px desktop / 13px phone, weight 400, `--fg-body`, no italic. Gap 5/6px to the title,
  10px to the type line.
- `aria-labelledby` does not move. The printed name is the title and the title is the label.

### Two-faced cards

Rows and tiles show the **front face's** printed name alone; the modal title carries the full
`printed // printed` string and the oracle line the full `oracle // oracle` string. When only one
face is renamed both halves still render — a half-printed pair is exactly the case where showing
one name would mislead. The shipped `//` layout mark (card-surfaces ruling 6) keeps doing the
work of saying there is a back face.

## Exports

**The decklist export takes the printed name plus set and collector number:**

```
Deck
1 Battle of Olympus (SLD) 2208
```

This is the Moxfield/Archidekt line format, it round-trips through `buildDeckImport`, and it is
what the player's own Moxfield export already shows. Naming the printing is the point: the export
describes the specific cards in the deck.

**The shopping list stays on bare oracle names.** #330 ruled that we recommend an oracle card and
let the player choose the printing on Mana Pool's all-printings grid — `manapoolCardUrl` is keyed
on the oracle name deliberately, and `manapoolDeckText` emits `N Name`. Pinning `(SLD) 2208` on a
list of cards the player is about to *buy* would force the most expensive printing of every card.
The two exports diverge on a functional basis, not a technical one.

**Verified, not assumed:** a live probe against Mana Pool confirmed that `/cards?q=Battle+of+Olympus`
resolves and that an `/add-deck` payload of printed names resolves too. Per #330's "never construct
a Mana Pool URL from an inferred rule", this was measured rather than reasoned about — but the
shopping list still does not use it, for the pricing reason above.

## Data and plumbing

- `printings.flavorName` already exists. **No migration.**
- `BrowsePrinting` (`src/lib/collection/browse.ts:16-36`) gains `flavorName: string | null`, and
  every select that builds one carries the column. `resolvedPrinting()` and `primaryPrinting()`
  are unchanged — they already return the object the name comes off.
- **The deck route needs the player's resolved printing, which it does not read today.**
  `src/lib/decks/read.ts:196-254` selects oracle columns only, so `resolvedPrinting()` has nothing
  to resolve there. This is the one piece of real query work in the feature.

  The readiness audit called this "one join". It is not, and the plan does not do it that way: a
  join on `printings` would have to re-implement the tier-0 art preference in SQL, and a second
  implementation of that precedence is exactly how the name and the art come to disagree. The
  route instead reuses `selectCollectionRows()` + `aggregateCollection()`, which is where the
  precedence already lives — **one extra query for the whole decklist**, no new prop threading,
  no second call per card, and no second copy of the rule this spec's locked decision 1 exists to
  protect. The cost is a collection-shaped query per deck load, accepted for that reason; the
  plan records it rather than leaving it to be discovered.
- The modal and both collection surfaces are free — they already resolve a printing to show art,
  so they need the column and nothing else.
- The unowned-card path in `src/lib/collection/card-detail.ts:169-181` selects printings without
  `flavorName`; it needs the column so an unowned card's modal can still say the line is absent
  for the right reason.
- Comparison for "is there a printed name" is **exact string equality** against the oracle name,
  and the printed name is used **verbatim** — no case folding, no suffix stripping, no
  normalisation.

## Errata carried from the readiness audit

Recorded here because the handoff states "where the spec and this handoff disagree, the spec
wins", and because R2's own closing rule is that no claim about shipped code lands without a file
and line.

1. **Call 3's corner is occupied.** R2 moves the deck tile's `✕` to the art block's top-left on
   the reasoning that the block "has two free corners". It has one. Top-left is the availability
   slot — `deck-card-tile.tsx:96-98` states it in a comment, and it draws the `AvailabilityMarker`
   chip when owned and the collapsed `$` `BuyTag` when not. Top-right is the `×2` count chip
   (:126-131), bottom-left the ownership dot and cost pips (:170-178). **Bottom-right is the only
   free corner.** The `✕` overlays the art as an absolute sibling rather than nesting inside
   `CardDetailTrigger`, which is a `<button>` — the file already uses that pattern.
   **This spec takes call 3's own fallback**: the `✕` stays on the caption line, the caption keeps
   its 93–94px single-line ladder, and the `title` removal ships regardless — the full name goes
   on the trigger's accessible name, not on an `aria-label` the caption `<span>` could not expose.
   Moving the control is a card-surfaces amendment and is not part of this feature.
   **The handoff's own call table still reads "leaves the caption line"** (`README.md`, calls 3
   and 4), and `STATES-printed-name.md:49,56` still sizes the caption at the 132/143px the moved
   `✕` would have bought. Both are superseded here, and the handoff's covering rule — where the
   two disagree, the spec wins — is what settles it. Design's drop is a historical record and is
   not edited after the fact.
2. **The 93–94px caption figure is a ceiling.** It omits the conditional `TwoFacedMark` and its
   `ml-[2px]` (`deck-card-tile.tsx:194`), and assumes 16px of padding where the tree has 11px
   phone / 14px desktop. The same caveat R2 already applies to the row's figures. **93/94px is
   the figure this feature builds to**, not the 132/143px of the STATES matrix.
3. **The `//` layout mark is not on the collection grid.** Call 5 leans on it to signal a back
   face; it ships on `decklist-row.tsx:278,326` and the deck tile, but `collection/grid-view.tsx`
   has none. A front-face-only printed name is unsignposted there. Accepted: the collection tile
   already carries the set code, which is the fact that explains the name.
4. **#467 has no truncation branch on `decklist-row.tsx`.** #467 (`034d6037`) touched
   `card-search-row.tsx`, `quick-add-bar.tsx` and `resolution-expander.tsx`. Nothing deletes.
5. **Call 4's `aria-label` is the wrong element.** The handoff replaces the deck tile's `title`
   with "an `aria-label` carrying the full printed name". The `title` does go. But the element it
   sat on is the caption `<span>`, and an `aria-label` there is exposed to nothing — it would pass
   a testing-library query and reach no screen reader. The full name's home is the
   `CardDetailTrigger`'s `name` prop, which is a real `<button>` and is already the accessible
   name on both the row and the tile. The outcome call 4 wants is unchanged; only the element is.
   `STATES-printed-name.md:58` states the same rule for the row and is superseded the same way.
6. **The handoff is R2, with some rows re-derived at R3.** The README's title says R2, its call
   table tags rows individually, and the density figures carry an R3 stamp because the audit's
   arithmetic error was corrected in a later pass than the calls around it. There is one drop and
   it is the authoritative one; **the per-row tag says when a figure was last re-derived, not that
   two revisions are in play.** Recorded because a reader hunting for a separate R3 will not find
   one.
7. **The modal's meta field is labelled `Set`**, not `Printing` (`card-modal.tsx:575,617`), and
   still names set and collector number — so the one-word `oracle` label stands on the reasoning
   the handoff gives.

## Testing

- **The control state is the regression risk**, not the feature: every card without a printed
  name must render byte-identically to today, on every surface, with no reserved height in the
  modal header.
- Unit: `resolvedPrinting()` name selection across owned/unowned/no-flavor-name; the exact-equality
  comparison; `buildDecklistText` emitting `N Name (SET) CN` and round-tripping through
  `buildDeckImport`; `buildShoppingText` unchanged.
- Component: the modal header's present/absent line; the row and tile accessible name carrying the
  full name while the visible string clips; `title` gone from the deck tile.
- Browser probe: a deck holding a Secret Lair printing, walked at 320, 390 and desktop, in list
  and grid view — the surface walk, not a screenshot of one row.

## Out of scope, explicitly

Search matching on printed names (a query change with no visual consequence here), the commander
header, deck import echoing printed names, and any normalisation of the printed string.
