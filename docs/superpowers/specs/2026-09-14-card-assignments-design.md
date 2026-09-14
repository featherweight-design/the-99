# Assigning a contested copy — design

**Date:** 2026-09-14
**Status:** Design approved, not yet planned
**Feature:** A card you owed arrives in the collection, and the decks that owed it stop
owing it. Where one copy arrives and more than one deck wants it, the player decides which
deck gets it.

## The problem, and what is already true

A deck that lists a card it does not own bills that card as a purchase. When the card later
arrives in the collection, the deck should stop billing it.

Three parts of that already work, and this design does not change them:

- **Buy is derived, never stored.** `isShoppingCard` and `loadDeckBuyRows` compute against
  `collection_items` at read time, so a new collection row changes the answer on the next
  read. There is no stored flag to update.
- **It is set-agnostic.** Claims, supply and CSV matching all key on `oracle_id`, and the
  `owned` CTE sums every printing the player holds. A Brushland from any set counts.
- **The deck committed first already wins.** `deck_version_cards.since` is per card, the
  claim model orders on `(since, deck_id)`, and `senior_hard` subtracts only the claims
  ahead of a given deck. The deck that sleeved the card first keeps it; the other buys.

What is missing is a signal that the arrival happened, a correct invalidation of the deck
surfaces when the collection is replaced, and any way for the player to override the
default allocation.

## Why not an override of seniority

`since` means "when this deck sleeved this card". In the case this feature exists for,
neither deck has ever sleeved the contested card — both committed a list carrying a buy on
it. Three approaches were considered and two rejected:

- **Cutting the card from the senior deck** (what `pullCardFromDeck` already does) is wrong
  here. Giving a copy to another deck is not a change to the senior deck's list, and it must
  not cut that deck a new version.
- **Rewriting `since`** would falsify a timestamp that means something, and every other
  reader of that column would inherit the lie.
- **Reserving copies**, below, leaves every timestamp honest and states the decision as
  what it is: the player allocating a copy.

Seniority remains the default. An assignment is only what happens when the player disagrees
with it.

## The model

### `card_assignments`

| Column | Notes |
| --- | --- |
| `user_id` | The owning player. |
| `oracle_id` | The card. Oracle-level, like every other figure in the claim model. |
| `deck_id` | The deck receiving the copies. FK to `decks`, `on delete cascade`. |
| `copies` | Default 1. One assignment reserves this many copies for this deck. |
| `created_at` | For ordering between assignments and for debugging. |

Unique on `(user_id, oracle_id, deck_id)`: a deck's reservation on a card is one row, and
assigning again to the same deck updates it rather than accumulating.

### Two-phase supply

`claimModel` today distributes the supply by one seniority queue. It gains a phase in front
of it:

1. **Reservations.** Each assignment reserves `copies` off the top, capped at that deck's
   own ask — a reservation larger than what the deck wants reserves only what it wants. A
   deck's claim thereby splits into a reserved part, guaranteed whatever its `since`, and an
   unreserved remainder.
2. **Seniority over what is left.** `remainder = owned − sum(reserved)`, distributed across
   the unreserved parts of every claim by the existing `(since, deck_id)` order. That
   ordering is unchanged.

A quantity model rather than a reordering is what makes "one assignment equals one copy"
expressible. The queue sums whole claims, so a deck wanting four copies with one assigned to
it cannot be described by a position in that queue; it can be described exactly by a
reservation of one against an ask of four.

### Consequences

- **The losing deck does not change.** Its committed version still lists the card, it still
  bills the purchase, and no new version is cut. This is the whole reason for the approach.
- **Inert without a shortage.** Two copies and two claimants: reservations move no figure.
  Assignments only bite under contention, which is why they need no expiry.
- **Lifetime.** An assignment lives until the deck stops listing the card, or the deck is
  deleted (cascade). There is no expiry to explain and no per-import reset.
- **Committed decks only.** The write refuses a deck with no committed version. A brew
  claims softly by design, and letting one win a reservation would let a brew make a sleeved
  deck short — an inversion of the hard/soft rule.
- **Three read sites move together.** `senior_hard` and the `senior` flag in
  `loadAvailability`, and `supply.senior` in `loadDeckBuyRows`. They mirror each other by
  hand today; the reserved term has to land in all three or the deck page and the buy
  roll-up disagree about the same card.

## Arrivals and the summary

### Computing what arrived

`confirmUpload` calls `loadDeckBuyRows(userId)` before the replace and again after, and
diffs the two sets.

The diff is taken over buy rows rather than over `collection_items` deliberately. A card can
arrive and still be bought by a given deck, because a senior deck takes the copy; only the
buy rows know that. Diffing the collection alone would announce an arrival the deck pages
then contradict.

Three sets come out of it:

- **Cleared** — the deck owed the card and now does not.
- **Contested** — the card arrived, and committed demand still exceeds supply. These are the
  chooser's rows.
- **Lost** — a replace is a full replace, so cards leave as well as arrive, and a deck can
  come out of an import owing something it did not owe before. The same diff read the other
  way; silence about it would be the more surprising half.

### Where the summary lives

A new `summary_payload` jsonb column on `csv_uploads` holds the computed diff, and
`/collection/replace/summary/[uploadId]` renders it. `ReplaceFlow` pushes there on confirm
instead of `/collection`.

Stored rather than returned to the client because the chooser acts against these rows: a
reload or a back navigation must not drop the decision surface.

### The invalidation fix

`confirmUpload` today revalidates `/collection`, `/`, `/commanders` and
`/commanders/[slug]`, and drops the `user-lists:<userId>` tag. It never revalidates
`/decks`, `/decks/[id]` or `/decks/[id]/changes`. The tag covers the cached payloads behind
those pages; the paths do not, so a back navigation to a deck can serve the pre-import
render with its buy tags still on.

A collection replace changes every claim figure there is, so the confirm gains the claim
surfaces, in pattern form for the dynamic segments. This is a standalone bug fix and does
not depend on anything else in this design.

## The chooser

The contested block of the summary renders one row per contested card: how many copies
arrived, and every committed deck claiming it with the copies each currently gets. The
default order is seniority, so a row already shows what happens if the player does nothing.

Picking a deck writes one `card_assignments` row and revalidates the claim surfaces. Picking
a different deck moves the reservation; picking the same deck again clears it. The action is
reversible because a mis-click on a screen seen once would otherwise be unfixable without
finding the row by hand.

### What it refuses, and what it does not

An assignment never touches another deck's list, so a senior deck with pending draft changes
is no obstacle. That refusal belongs to `pullCardFromDeck`, which cuts a card and commits a
version on the other deck's behalf.

A **commander claim cannot be displaced.** `loadDeckBuyRows` deliberately emits no commander
row (#470): `DeckDetail.commander` carries no owned flag and is absent from
`DeckDetail.cards`, so no surface can render that purchase. Displacing a commander claim
would make a deck short in a way nothing draws. The chooser therefore renders a commander
holder as a fixed holder rather than a pickable option. Lifting this belongs to #470.

### The second door

The contested row on `/decks/[id]/changes` and the deck page marker gain the same control
beside the existing `Pull it`, so a contention met later is decidable where it is met.

The two verbs must read as different things: `Pull it` takes the card out of the other
deck's sleeves and cuts them a version, while claiming says the copy is this deck's and
leaves the other list alone. Distinguishing them is copy on a new surface, and therefore a
Design call.

## Proof

The reservation term is raw SQL that no unit test in this repository can reach, so
`pnpm probe:claims` is the gate. It gains: a reservation beating an earlier `since`; a
reservation capped at the deck's own ask; two copies with two assignments; no shortage, so
no figure moves; an assignment to a brew refused; a commander claim not displaced; and the
row vanishing when its deck is deleted.

Each new check is run against the unfixed build before being believed. A claim check that
measures nothing reports green exactly as loudly as one that measures the right thing.

The arrivals diff is pure over two `DeckBuyRow[]` sets and is unit-tested directly. Any new
correlated subquery in the claim model carries a `.toSQL()` assertion on the qualified form,
because that is the shape that silently returns zero.

The UI surfaces get a browser probe and a contact-sheet row at both widths when they land.

## Delivery

Four pull requests, sequential, none stacked — each branched from `main` after the previous
one merges.

1. Migration, `card_assignments`, the reservation term in all three read sites, and the new
   probe cases. No UI and no behaviour change until something writes a row.
2. The arrivals diff, `summary_payload`, the `confirmUpload` wiring, and the `/decks`
   invalidation fix. The invalidation half is separable if this runs long.
3. *(Gated on a design handoff.)* The summary route, the chooser, and the assignment server
   action.
4. *(Gated on the same handoff.)* The second door on `/decks/[id]/changes` and the deck page.

PRs 3 and 4 are new UI and so are blocked by the pipeline rule: no UI until a handoff exists
and carries a READINESS verdict. PRs 1 and 2 carry no such gate.

## Settled during design

- The scope of "picks up" is clearing the buy state only. A card arriving is never added to
  a deck that does not list it, and no fill is re-run.
- The signal is a post-import summary, not a standing Home block. A Home block would need
  stored per-deck last-seen state to know what is new.
- An assignment is one copy, not a queue position.
- Assignments are refused for decks with no committed version.
