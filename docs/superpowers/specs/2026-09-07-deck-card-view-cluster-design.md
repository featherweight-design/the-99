# Deck detail — card view cluster — design brief

Covers issues #349 (card view / list view toggle), #350 (mana value on the decklist
row), #351 (hover preview), #363 (double-faced card flip control). All four are UI on
`/decks/[id]`, and none of them appears in any existing handoff — the Decks README's
component notes describe a decklist row carrying an ownership dot, a name, a buy tag and
a trailing `✕`, and nothing else. This brief is the specification request for that gap.

## Why the four travel together

They are one question wearing four hats: **how much of a Magic card does a deck page
show, and where does that stop?** A mana pip, a card image, a hover preview and a back
face are all the same trade — more of the card, less of the room the deck-building
controls need. Specified separately, four people would each spend the same 400 pixels.

## What exists today

Verified against the current build, 2026-09-07.

The decklist row (`src/components/decks/decklist-row.tsx`) carries, in order: an
ownership dot, the card name (opens the card modal, with Prev/Next across siblings), a
quantity glyph, an availability marker, a buy tag with a price, an auto tag, and a
remove `✕`. Rows are 44px on phone / 34px on desktop, radius 6/7px. Desktop groups
render in a **two-column grid**, so a row is roughly **400px wide on desktop and 358px
on phone** — desktop buys only ~42px more than phone, not a full window's worth.
Measured furniture already consumes ~273px desktop / ~288px phone in the worst case (a
long name, an unowned card, a buy tag with a four-digit price).

The control bar (`group-toggle.tsx`) already carries six controls — All/Shopping,
Keep all, Clear all auto, the Group label, By type, By role — and its own code comment
records that `flex-wrap` is mandatory or the last control falls off the edge at 390px.

Two components draw mana pips. `cards/mana-pips.tsx` is shared but sized for the modal
(22px phone / 26px desktop) and renders hybrid symbols as flat grey. `decks/suggestion-tile.tsx`
holds a private `CostPips` at **14px** with a 9px numeral that splits hybrid and
Phyrexian correctly with a 135° gradient. The better component is the buried one.

Nothing in the database can identify a double-faced card. `cards` and `printings` have
no `layout` column, and both Scryfall transforms read `card_faces` only to pick the first
face with an image as a fallback for the single `imageUri` — the back face is discarded
at ingest.

## Corrections to the card line item parity brief

`docs/superpowers/specs/2026-09-07-card-line-item-parity-design.md` (merged today) is
wrong on two rows of its table, verified against `src/` and dated with `git log -S`:

- `collection/rows-view.tsx` draws **colour identity** pips (`ColorPips`), not mana cost.
- `decks/card-search-row.tsx` **does** draw mana cost pips (`CostPips`,
  `card-search-row.tsx:149`), and has since commit `fdf8f89` (#196).

So that brief's claim that "mana cost appears in exactly one row… no other card row does,
including the add-panel search row" is wrong on both halves, and its open question 2
("should mana pips generalise, or stay a collection-browse affordance?") rests on an
unsound premise. **This brief supersedes that question for the decklist row.** Whatever
Design rules here about pips on the decklist row is the answer; the parity brief's
question 2 should be re-read as "should pips reach the remaining rows —
`unresolved-row`, `update-diff-row`, `synergy-row`?"

## What eng has already settled, and is not asking about

These were worked through before writing this brief and are recorded so Design can
design around them rather than re-open them.

1. **Card view is a middle-weight tile, not a gallery.** Art plus name plus the deck
   controls a reader needs while looking at pictures. Ownership and availability read
   **inside the art** rather than beside it; the tile keeps **remove**, and drops the
   buy tag, the price and the auto tag — those are shopping affordances and shopping has
   its own view.
2. **Card view is available on the All tab only**, and grouping (By type / By role)
   still applies to it. The Shopping tab stays a list, because its whole content is a
   price strip, a buy tag and a footer, none of which survive being turned into a tile.
3. **The view toggle does not persist.** Per the repo's "a cache lives for one visit"
   rule, it is component state, resets on navigation, and writes nothing to storage or
   the URL.
4. **Hover preview stays, and is desktop-only.** It is anchored to the row, not tracking
   the cursor — cursor-tracked previews jitter on mousemove and collide with the 340–346px
   add panel. Touch gets nothing; the card modal already serves that case.
5. **The flip control lives in the card modal only.** Everywhere else a double-faced card
   gets a corner glyph that says "this card has a back", and the modal is where you turn
   it over.
6. **Mana cost is pips, not a number.** A bare CMC integer was proposed and overruled;
   the reference is deckcheck.co, which fits real pips into a comparable row on both
   breakpoints. Pips are right-aligned. `CostPips` gets promoted out of `suggestion-tile.tsx`
   into the shared card components, and carries an `sr-only` textual alternative.
7. **The phone row grows a meta line.** With ~288px of furniture already on a 358px row,
   inline pips do not fit on phone in the worst case. Phone renders the same content in a
   different arrangement — the pattern `decklist-row.tsx:118-123` already uses for its
   phone/desktop figure text — with the pips on a second line and the row at the 52px
   height the shopping variant already establishes. Desktop keeps them inline.
8. **#363 has a data dependency with no design gate.** A `layout` column plus back-face
   image storage plus a full catalog re-seed is required before any flip control can be
   drawn. That work can start in parallel with this specification.

## Open for Design to call

1. **The card view tile.** Aspect ratio, columns per breakpoint, and where in the art the
   ownership and availability readings sit without covering the card's own type line and
   art box. Prior art to reconcile with: `commanders/` uses tiles already.
2. **The third control axis.** The bar is at six controls and wrapping. Where does a
   view toggle go — a segmented control in the bar, an icon pair, or somewhere else
   entirely? `design/design_handoff_the99_discovery/CONTROLS-four-above-one-list.md`
   already rejected three control-stacking shapes; the answer should not be a fourth one
   of those.
3. **Pip metrics on the decklist row.** 14px is the `CostPips` default and 11–13px is the
   `ColorPips` range. Design should state the size, gap, and the overflow rule for a
   six-plus-pip cost. `collection/rows-view.tsx` solved its overflow by **shingling**
   pips at four-plus; whether the decklist row inherits that or truncates differently is
   a design call.
4. **The phone meta line.** Ruling 7 fixes that there is one; Design owns what else sits
   on it. Candidates: the type line, the availability marker moving down off the primary
   row, or pips alone.
5. **The hover preview surface.** Size, anchor edge, the delay before it opens, and what
   it shows besides art — the card modal resolves a specific printing and renders art as
   a CSS background, and is too heavy to reuse whole.
6. **The double-faced corner glyph.** What it looks like on the decklist row, on the card
   view tile, and where the flip control sits inside the modal.

## Not in scope

Shopping view density; the card modal's non-flip content; every card row outside
`/decks/[id]`, which the parity brief owns.
