# Readiness verdict — Deck versioning

**Handoff:** `design/design_handoff_the99_deck_versioning/` (R1.2)
**Issue:** #389
**Spec:** `docs/superpowers/specs/2026-09-09-deck-versioning-design.md` (incl. Addendum R1, R2)
**Date:** 2026-09-10

## Verdict — 🟢 Green

Design self-assessed 🟡 Amber on two items. Both close without a redraw, and neither was a design
gap:

| Design's blocker | Ruling |
|---|---|
| **Ruling 2 — the cost track.** `CostPips` shingles; `COST-TRACK.md` proposes a 90px/76px five-slot track, but the component belongs to card-rows (Q2/R5) | **Closed externally.** Hugh, 2026-09-10: *"We'll be changing the pip overlap for card rows."* The amendment is card-rows' to land. `COST-TRACK.md` is correctly filed as a request, and the handoff's own position — the new rows inherit whatever `CostPips` ships — is the right one. **Versioning is not gated on it.** |
| **`Commit as v1` on a versionless full-body deck** is Design's addition, not the spec's; Design offered three options and preferred option 1 | **Option 1, as drawn.** §Decisions 4 leaves a real hole — the migration stamps existing full-body decks, so a deck *built after this ships* would have no route to a first version. Option 2 (auto-stamp at a full body) makes a deck's claims go hard without anyone asking, which is the class of thing this feature exists to prevent. The brass-**outline** offer at `deckBodySize()` with *locks this list as v1 — nothing about the deck changes* stands. |

Everything else in the handoff audits clean against the repo: the locked decisions are drawn as
written, no new token or query is asked for, and `OVERLAPS.md` answers both of the spec's open
calls in a way the shipped code supports. What follows are engineering corrections against the
handoff's **prose** and one inconsistency inside the handoff that the canvas settles. None needed a
Design round-trip.

## The consistency check Hugh asked for

> *"Please watch out for any inconsistencies with existing event row changes."*

**One real collision, and it is the handoff's own gap 5.**

Gap 5 reads: *"a quantity change is invisible in both diffs."* That is wrong twice as of
`dffcab4` (#513, merged 2026-09-10):

1. **The update preview no longer hides it.** #513 moved `recounted` into `planDeckUpdate`, deleted
   `quantityDelta` and the `quantityMoved` check, and prints the reconciled counts **by name**:
   `Same cards, new counts: Island 7 → 8` (`src/lib/copy/deck-import.ts:505-506`,
   `src/components/decks/update-diff.tsx:137-138,207-211`). The landing figure is now derived from
   that same list rather than asserted.
2. **`draftDiff` already carries the movement.** A quantity change is filed as **one** entry in
   `adds` or `removes` carrying `from` and `to` (`src/lib/decks/draft-diff.ts`) — it is not absent,
   it is unlabelled.

The defect that follows is not cosmetic. `commitDeckVersion` filters basics out of `adds` only —
`return { ok: true, number: version.number, buy, pull: diff.removes }`
(`src/app/decks/actions.ts:1320-1342`) — so cutting 3 of 12 Islands renders a bare **Island** under
*back in the pool*, asserting the card left the deck. Design's diff rows are name-only.

**Correction to implement:** every diff and version row renders `from → to` whenever
`from > 0 && to > 0`, in the shape #513 already ships (`{name} {from} → {to}`), and the pull list is
filtered for basics exactly as the buy list is. Reuse `deck-import.ts`'s `recountedItem` rather
than authoring a second phrasing for the same fact.

## The inconsistency inside the handoff, and how it resolves

`README.md` §3 and §Notes describe the adds column as **three availability buckets** —
*"bucket order is free → sleeved → not owned, and within a bucket the function's order stands"* —
and the component table defines a distinct `Bucket` header style. The R1.2 canvas draws **none of
them**: every diff column is grouped by **type**, with Cinzel headings and a mono count
(`Creatures 7`, `Sorceries 7`), rows alphabetical inside each group, and availability carried
per-row by the ownership dot, the holding deck's name, the marker and `BuyTag`.

**The canvas wins** — grouping by type is R1.2's headline correction and §2b says it applies to
every surface this handoff draws. Three consequences:

1. **Bucket headings are deleted.** The `Bucket` row in the component table and §3's
   "headings, not tabs or filters" paragraph are R1 residue.
2. **Ordering is by name inside a type group, not by the function's order.** This is a net
   improvement: `bucketAdds` orders by oracle UUID, which would have given the player an arbitrary
   sequence. `bucket` becomes a per-row treatment, not a grouping key.
3. **The availability word moves into the row's accessible name.** `OwnershipDot` is `aria-hidden`
   and the component table names *"the bucket heading is the accessible statement"* — with the
   heading gone, that statement has no home. Same remedy the pending-add left rule already uses.

Design to ratify; not a blocker, and not a redraw.

## The change stats Hugh added

> *"Added some stats about the change (e.g. shift in card type, CMC, etc.)"*

Drawn as README §3b — six cells in the deck page's mix-cell shape plus a type-distribution block
with before / after / delta, and `was n` replacing `rec n` in each deck-page mix cell while a draft
exists. The design is right and the strip earns its height on the stated fact: **removal crossing
its recommendation is the only thing on the page that says whether the tuning worked.** Two
corrections:

1. **"No new column, and no new query" is true of the schema and false of the reads.** `cards.cmc`
   exists (`src/db/schema.ts:30`), but `DeckDetailCard` carries `typeLine` and `role` and **no mana
   value** (`src/lib/decks/grouping.ts:15,17`), so the strip needs `cmc` added to the detail select
   *and* a `deck_version_cards → cards` join for the before-figure, which no shipped query makes.
   That is a select and a join, not a migration — but it must be planned, not assumed.
2. **The six cells are misnamed.** §3b lists *"mana value, removal, draw, ramp, body"*. The shipped
   fold has five roles and `body` is not one of them: `ROLE_ORDER = ["ramp", "draw", "removal",
   "wipes", "land"]` (`src/components/decks/role-counter-strip.tsx`, over `computeRoleCounts` in
   `src/lib/decks/mix.ts`). **Resolved as mana value plus the shipped five** — the handoff's own
   binding rule is that the strip must be *"the same fold the deck page's mix strip already uses, or
   the two will disagree on the same screen"*, and a creature count is already in the
   type-distribution block directly beside it.

Gap 8 (*the first place the app does arithmetic on a hypothetical*) is answered by that rule: one
fold, called twice with different card sets. Gap 9 (no curve histogram) is accepted as scoped out.

## Corrections carried into the build

1. **No server flag exists for state 16's pull guard.** The `pending` tag + `Open →` needs a
   per-holding-deck "has pending changes" read. Today every guard is a **post-hoc refusal string
   inside the transaction** (`src/app/decks/actions.ts:1379-1450`): *"That deck has pending changes.
   Release the card there."* The handoff is right that the client renders whichever affordance the
   flag names — the flag has to be added to the availability payload, as its own task.
2. **A third guard Design never drew:** *"That card is that deck's commander."* Commander claims are
   in the availability model, so `Pull it` would be offered on a row where it can only ever fail.
   Resolved by reusing state 16's guard shape with the word **commander** and no `Open →`; Design to
   ratify.
3. **`commitDeckVersion` returns no card count**, which contradicts *"the client prints them and
   does not compute them."* It returns `number`, `buy` and `pull`. Either the action returns the
   version's card count or the success line drops it; returning it is one extra field.
4. **The wrong revalidation helper is named.** The handoff names `deckSurfaces()` for commit,
   discard and pull. Those are claim writes — shipped code uses `revalidateClaims(deckId, userId)`,
   and `claimSurfaces()` is what adds `/collection`, `/commanders` and `/discover`
   (`src/lib/decks/revalidate.ts`). Naming `deckSurfaces()` would leave every other deck's
   availability stale after a pull.
5. **The grouping UI is deck-page-local.** `grouping.ts` exports the pure helpers, but
   `DecklistGroup` and `GroupToggle` live inside `decklist.tsx`. *"Mount the same grouping"* needs an
   extraction task before any of the three new surfaces can mount it.
6. **The game log has no mono column-header row**, so `ver` cannot join one. The row's slots are
   result square 26px → meta `md:w-[132px]` → mark chips `flex-1` → delete 44/30px. The 44px version
   slot is still drawable; the header it was drawn under does not exist.
7. **Three traced metrics drift from the shipped values.**
   - `unresolved-row.tsx:66` is `border-l-2` — 2px, not the handoff's 3px. Matching the shipped rule
     is the better answer than a third left-rule width.
   - **The pip is 12px on desktop and 13px on the phone meta line**
     (`src/components/ui/cost-pips.tsx`, and `CostPips` defaults to `size = 14`).
     `COST-TRACK.md`'s "Shipped: 12px" is the desktop value only.
   - **The freed type-slot width differs per row variant:** `DiffRowOut` is `w-[120px]`
     (`update-diff-row.tsx:157`), `DiffRowIn` and `DiffRowUnnamed` are `w-[150px]` (199, 253). So
     `COST-TRACK.md`'s "net −30px" holds for the removes column and understates the adds column by
     30px. Neither figure changes a decision; both are quoted in the amendment request.
8. **`STATES-pending.md` table A is malformed.** Rows 8 / 9b / 9c / 9 are misaligned, row 8 is
   missing its final cell and that cell appears appended to 9c, and the numbering runs 8, 9b, 9c, 9.
   Content is legible; the table needs re-laying before it is read as a checklist.

## Verified true

- `loadDeckBuyRows` uses the LEFT join R1 asked for (`src/lib/decks/availability-query.ts:390`), so
  a draft-added card is in the buy list the moment it is added. Every figure in the handoff depends
  on this and it is shipped.
- `deckBodySize()` exists and owns `DECK_TOTAL = 100`, returning 99 or 98
  (`src/lib/decks/deck-size.ts:7`) — the only place the `Commit as v1` offer learns the number.
- `deckGames.versionId → deckVersions.id` is nullable with `on delete set null`
  (`src/db/schema.ts:348`), so *"how many games it held"* is answerable and a discarded version
  cannot take a logged game with it.
- All four borrowed atoms exist as named: `OwnershipDot`, `BuyTag`, `AvailabilityMarker`,
  `MutationError`.
- The arrival strip is driven by `UPDATED_PARAM = "updated"` (`src/lib/decks/arrival.ts:31`), so
  `OVERLAPS.md`'s suppression on a committed deck is a param the caller declines to set — no new
  state.
- `src/lib/copy/deck-versioning.ts` does not exist, so `deckVersioningCopy` is a new block and not a
  collision.

## Not blocking

- `COST-TRACK.md` stays open as card-rows' amendment request and needs no answer here.
- The one traced colour question — the group heading's plum rule `#574463` and a black pip that
  reads pinker than the brand's `#5B5566` — is the shipped page's to settle. If the pink is
  deliberate, the brand sheet's WUBRG table is what needs correcting.
- Gap 7 (*nothing explains why a card the deck already had now carries a buy tag*) is real and is
  the seniority feature's, not this one's. Recorded, not scoped in.
