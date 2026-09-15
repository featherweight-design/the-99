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

`since` means "when this card entered this deck's committed version". The claim model treats
that as a hard claim whether or not the player owns a copy, so in the case this feature
exists for both decks hold a hard claim on a card **neither of them physically has** — each
committed a list carrying a buy on it. An assignment therefore overrides a hard claim; what
it must not do is falsify the record of when that claim was made. Three approaches were
considered and two rejected:

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
| `copies` | Default 1, `check (copies > 0)`. One assignment reserves this many copies for this deck. A zero or negative value would be a durable row that inverts the supply arithmetic, so it is refused at the database boundary rather than by the caller. |
| `created_at` | Orders reservations against each other when they compete for the same copies. Not decoration — see the allocation rule below. |

Unique on `(user_id, oracle_id, deck_id)`: a deck's reservation on a card is one row, and
assigning again to the same deck updates it rather than accumulating.

`user_id` and `deck_id` must agree — the deck named has to belong to the user named. Every
claim read is scoped by `user_id`, so a row pairing a user with another player's deck would
reserve copies out of a collection the deck cannot draw on. The write validates the pair in
the same transaction as the upsert (see **The chooser**), which is where the rest of the
target's eligibility is checked.

### Three-phase supply

`claimModel` today distributes the supply by one seniority queue. It gains two phases in
front of it:

1. **Commander claims.** A committed deck's commander and partner take their copies first,
   ahead of every reservation. This is what actually enforces the commander rule below; a
   chooser that renders a commander holder as unpickable protects the screen and not the
   arithmetic, and with one copy owned an assignment taken purely off the top would empty a
   commander's slot in a way no surface can render. Both commander columns, and the
   commander-plus-list-copy case, where the deck's single folded claim is part commander and
   part list card and only the commander half is protected here.
2. **Reservations**, over what phase 1 left. Each assignment reserves `copies`, capped twice:
   at the target deck's own ask, and at the supply still unallocated when its turn comes.
   Reservations take their turns in `(created_at, deck_id)` order, so two decks each assigned
   one copy of a card with one copy left resolve deterministically — the earlier assignment is
   honoured and the later one reserves nothing. Without the cumulative cap the remainder below
   goes negative and nothing says which reservation won.
3. **Seniority over what is left.** `remainder = owned − commander_claims − reserved`, floored
   at zero, distributed across the unreserved parts of every claim by the existing
   `(since, deck_id)` order. That ordering is unchanged.

A deck's claim therefore splits into a commander part, a reserved part guaranteed whatever its
`since`, and an unreserved remainder that queues as it always did.

A quantity model rather than a reordering is what makes "one assignment equals one copy"
expressible. The queue sums whole claims, so a deck wanting four copies with one assigned to
it cannot be described by a position in that queue; it can be described exactly by a
reservation of one against an ask of four.

### Consequences

- **The losing deck does not change.** Its committed version still lists the card, it still
  bills the purchase, and no new version is cut. This is the whole reason for the approach.
- **Inert without a shortage.** Two copies and two claimants: reservations move no figure.
  Assignments only bite under contention, which is why they need no expiry.
- **Lifetime.** An assignment is about a **committed** claim, so "still wanted" means the
  deck's newest committed version still lists the card. The row is deleted in the commit
  transaction that produces a version without it, and cascades when the deck is deleted. Two
  reasons it is deleted rather than left to go inert: a deck that drops a card and later adds
  it back would otherwise reactivate a reservation the player made about a different list, and
  a row nobody can see is worse than no row. It is also inert by construction in between — the
  phase-2 cap is the deck's own ask, so a reservation for a card the deck no longer asks for
  reserves nothing even before cleanup runs. There is no expiry and no per-import reset.
- **Hard claimants only, not merely committed decks.** The write refuses a deck with no
  committed version, because a brew claims softly by design and letting one win a reservation
  would let a brew make a sleeved deck short. But "has a version" is not enough on its own:
  a committed deck can hold the card as a **draft add** its version does not contain, and
  reserving on that basis would let a draft-only ask displace a hard claimant — the precise
  thing seniority exists to prevent. The write therefore requires a current hard claim: the
  card is in the target's newest committed version (or is its commander, which is refused for
  a different reason below), checked in the same transaction as the upsert.
- **Three read sites move together.** `senior_hard` and the `senior` flag in
  `loadAvailability`, and `supply.senior` in `loadDeckBuyRows`. They mirror each other by
  hand today; the reserved term has to land in all three or the deck page and the buy
  roll-up disagree about the same card.

## Arrivals and the summary

### Computing what arrived

Three reads, because no single one answers all three questions the summary asks.

**How many copies arrived.** An oracle-level sum of `collection_items` before and after the
replace. The buy rows cannot supply this: `DeckBuyRow.quantity` is a positive deficit, so a
deck asking for one copy reads `[{quantity: 1}]` before and `[]` after whether one copy
arrived or five. The summary says how many arrived, so it has to read what arrived.

**Which decks cleared, and which incurred.** `loadDeckBuyRows(userId)` before the replace
and again after, diffed **by `(deckId, oracleId)` and quantity**, not by membership. A deck
asking for two copies whose deficit falls from 2 to 1 keeps its row, so a membership-only diff
would report nothing at all for a real arrival. Each pair is classified: gone (deficit cleared),
reduced (deficit smaller, card partly covered), raised or new (deficit larger or appeared —
the **lost** case, since a replace removes cards as well as adding them).

**Who is contesting what.** `loadAvailability(userId, {oracleIds: arrived})`, which the buy
rows cannot answer either: a deck that is fully funded has no buy row at all, so the senior
holder — the deck the chooser most needs to name — disappears from that source exactly when
there is something to choose. `loadAvailability` returns `claims`, carrying each claimant's
name, quantity, `mature` and `commander` flags, which is what the chooser rows render.

**A note on whose demand.** `loadDeckBuyRows` builds `list_claims` from live `deck_cards`, so
its figures are **draft** demand: they include a deck's draft adds and exclude its pending
removals even when its committed version is untouched. That is the right source for the
cleared and lost lines, which answer "what will this deck have to buy" — the same question the
deck page bills. It is the wrong source for contention, which is a question about hard claims,
and the availability read above is version-shaped for exactly that reason. The two figures can
legitimately disagree about a card, and the summary's copy must not imply otherwise.

### Where the summary lives

A new `summary_payload` jsonb column on `csv_uploads` holds the computed diff, and
`/collection/replace/summary/[uploadId]` renders it.

Stored rather than returned to the client because the chooser acts against these rows: a
reload or a back navigation must not drop the decision surface.

**`confirmUpload` becomes idempotent, which it is not today.** It accepts an already-confirmed
upload and will happily run the whole replace again, so a lost response or a double submit runs
a second before/after diff — one that finds nothing, because the first one already landed — and
overwrites the stored summary with an empty one, destroying the decision surface this section
exists to keep. The confirm therefore short-circuits on a row that already carries
`confirmed_at`, returning the stored summary rather than recomputing it.

**The rows are a record of one import, not live state.** A contested row can be overtaken: the
deck can commit a removal, or a later import can change the supply. The chooser's write is what
guards that, not the payload — see below.

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

Picking a deck writes one `card_assignments` row. Picking a different deck moves the
reservation; picking the same deck again clears it. The action is reversible because a mis-click
on a screen seen once would otherwise be unfixable without finding the row by hand.

**The write authorizes itself, in its own transaction**, exactly as `pullCardFromDeck` does and
for the same reason: a stored summary row may describe a state that has since moved. Inside the
transaction it re-reads the target's ownership by this user, its newest committed version's claim
on the card, and the current supply, and refuses with a named reason when any of them no longer
holds — the deck no longer asks for the card, the deck is not this user's, the card is the
target's own commander, or there is nothing left to reserve. A refusal is reported on the row
rather than swallowed, because the row's default allocation is still the truth and the player
needs to know their pick did not take.

**Revalidation covers every claimant, not just the chosen deck.** One reservation changes the
allocation figures of every deck claiming that card, and `revalidateClaims(deckId, userId)`
names `/decks/${deckId}` literally — the `/decks` index does not invalidate the detail pages
underneath it. The assignment write therefore revalidates `/decks/[id]` and
`/decks/[id]/changes` in pattern form, as `revalidateClaims` already does for the review page,
so a losing deck's page cannot go on drawing the marker and buy state it had before the pick.

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
reservation capped at the deck's own ask; a reservation capped at the supply left after an
earlier reservation, so two decks assigned one copy of a single-copy card resolve to the
earlier assignment and not to a negative remainder; two copies with two assignments; no
shortage, so no figure moves; an assignment to a brew refused; an assignment on a draft-only
add refused; a commander claim not displaced **in the arithmetic** with one copy owned, and
again for a deck holding the card as both commander and list card; a reservation for a card
the deck no longer asks for reserving nothing; and the row vanishing when its deck is deleted.

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
2. The arrivals diff, `summary_payload`, the confirm's idempotency, and the `/decks`
   invalidation fix. `ReplaceFlow` keeps navigating to `/collection` here: the summary route
   ships in PR 3, and flipping the navigation before it exists would send every confirmed
   upload to a 404 for however long PR 2 is deployed alone. The navigation flips in PR 3,
   beside the route it depends on. The invalidation half is separable if this runs long.
3. *(Gated on a design handoff.)* The summary route, the chooser, and the assignment server
   action.
4. *(Gated on the same handoff.)* The second door on `/decks/[id]/changes` and the deck page.

PRs 3 and 4 are new UI and so are blocked by the pipeline rule: no UI until a handoff exists
and carries a READINESS verdict. PRs 1 and 2 carry no such gate.

## Amendments, 2026-09-14

**Rulings.** The deck-page door is dropped: the `over` availability marker stays inert, and the
chooser lives on the summary and `/decks/[id]/changes` only. `IssueInspector` becomes reachable
after the confirm, so the summary's issues line keeps its link.

**The commander rule is a CEILING, not a promotion.** This design said commander copies come
"off the top", ahead of reservations. Taken literally that promotes every commander claim ahead
of the seniority queue unconditionally, which moves live figures with no assignment rows in the
table at all — a deck holding a card as its commander with a later `commander_since` than
another deck's list claim would start winning a copy it loses today, and that lands on the deck
page marker, the Shopping filter and Home's commitments. What this design needs is narrower and
is what shipped: commander copies **bound what may be reserved** and are otherwise left exactly
where they are in the queue. With no reservations, every figure is unchanged.

**`free` decomposes into three terms, not one.** `owned − own_claim − reserved_others −
least(seniors_ahead_unreserved, remainder)`. Written as one term a reservation cannot change an
allocation at all: the vantage deck's senior claimant stays counted against it at the old cap,
so a deck reads short on the copy it just won. There is deliberately no global commander term —
`own_claims` already subtracts the vantage deck's own commander, and a second subtraction would
leave `free` one low on every deck's own commander, always.

**Errata from the readiness audit.** `DeckClaim` carried no `since` and no version number, both
of which the chooser's commit stamp and its ordering need; they ship in PR 1 beside
`commanderCopies`. The handoff's flag against `review.bucketFreeNote` is stale — that string is
retired. The `review.lede` finding stands and is fixed in PR 4.

## Settled

- **The before/after reads are not one serialized snapshot, deliberately.** Review asked for
  the replace and both diff reads to run under one serialized transaction or a generation
  check. Declined. `loadDeckBuyRows` takes no transaction handle, and the hazard it guards
  against is the same player editing a deck in a second tab during their own import. The cost
  of that race is a mis-stated line in a summary, never a wrong claim figure: every claim
  figure in the app is recomputed live on read, and the chooser's write re-validates in its own
  transaction. Serializing a user-wide read around a delete-and-reinsert of the whole
  collection is real complexity bought against a one-player app. Revisit if the summary ever
  becomes a record something else acts on.

## Settled during design

- The scope of "picks up" is clearing the buy state only. A card arriving is never added to
  a deck that does not list it, and no fill is re-run.
- The signal is a post-import summary, not a standing Home block. A Home block would need
  stored per-deck last-seen state to know what is new.
- An assignment is one copy, not a queue position.
- Assignments are refused for decks with no committed version.
