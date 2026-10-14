# Gap report — Deck versioning (R1.2)

**Handoff:** `design/design_handoff_the99_deck_versioning/` (R1.2)
**Issue:** #389
**Spec:** `docs/superpowers/specs/2026-09-09-deck-versioning-design.md` (incl. Addendum R1, R2)
**Date:** 2026-09-10

## Verdict — 🟠 Orange · one Design blocker

Not either of the two Design flagged — **both of those close**, below — and every locked decision
audits clean. The blocker is a contract the handoff asserts and the canvas contradicts, and it is
the one finding eng cannot close without inventing a design decision.

No readiness doc is filed at Orange. This report is the round's record; the verdict follows at R2.

## The blocker — the mana track on a diff row is not `CostPips`

The handoff says twice that no new mana atom exists: *"`CostPips` is read, not forked. The diff and
version rows mount the shipped component"* (README §Notes) and *"Four new atoms and one deletion,
and that is the whole inventory"* (READINESS #14). **The canvas draws something else.**

| Card | Cost | Canvas draws | `CostPips` draws |
|---|---|---|---|
| Beast Within | `{2}{G}` | numeral **3**, one green pip (canvas 136, 177, 248) | numeral **2**, one green pip |
| Thought Erasure | `{U}{B}` | numeral **2**, blue + black (canvas 265) | **no numeral**, blue + black |

The canvas's numeral is the **mana value**, on every row. `CostPips` renders the generic-cost token
parsed out of the cost string, and nothing when there is none (`src/components/ui/cost-pips.tsx`:
`numeral = parts.find((p) => /^\d+$/.test(p))`). Two different atoms — and the drawn one is what
Design's own rationale asks for: *"Mana value is the thing you judge a swap by"* (README:166).

Three things move with the answer, which is why it goes back rather than being ruled here:

1. If these rows draw a mana-value track, it is a **fifth new atom** and the inventory is wrong.
2. **`COST-TRACK.md`'s blast radius collapses.** Its premise is that versioning put `CostPips` on two
   new surfaces and so surfaced the shingling. If versioning never mounts `CostPips`, the amendment
   is card-rows' business start to finish and versioning's rows are untouched by either outcome.
3. **The ceiling argument changes.** A track carrying *distinct colours* tops out at five by the
   rules of the format. A track carrying *symbols* does not — see correction 9.

Eng's reading, offered rather than assumed: **a mana-value numeral plus distinct colour pips, at most
five, no cap and no overflow.** It is what is drawn, it is what the rationale asks for, and it makes
the ceiling claim true rather than nearly true. Design to confirm or overrule.

## Design's two self-flagged blockers, both closed

Neither needed a redraw and neither was a design gap:

| Design's blocker | Ruling |
|---|---|
| **Ruling 2 — the cost track.** `CostPips` shingles; `COST-TRACK.md` proposes a 90px/76px five-slot track, but the component belongs to card-rows (Q2/R5) | **Closed externally.** Hugh, 2026-09-10: *"We'll be changing the pip overlap for card rows."* The amendment is card-rows' to land, and filing it as a request was right. Versioning is not gated on it either way — and if the blocker above resolves as eng reads it, versioning is not even *connected* to it. Corrections 9–11 are amendments to the request, for card-rows to have before they rule. |
| **`Commit as v1` on a versionless full-body deck** is Design's addition, not the spec's; Design offered three options and preferred option 1 | **Option 1, as drawn.** §Decisions 4 leaves a real hole — the migration stamps existing full-body decks, so a deck *built after this ships* would have no route to a first version. Option 2 (auto-stamp at a full body) makes a deck's claims go hard without anyone asking, which is the class of thing this feature exists to prevent. The brass-**outline** offer at `deckBodySize()` with *locks this list as v1 — nothing about the deck changes* stands. |

Every locked decision is drawn as written, no new token is asked for, and `OVERLAPS.md` answers both
of the spec's open calls in a way the shipped code supports. What follows are engineering
corrections against the handoff's **prose**, plus a class of stale R1 text the canvas settles. None
of these needs a Design ruling — they need Design to *correct the prose* in the same round that
answers the blocker, because eng following the prose instead of the canvas would build the
pre-R1.2 layout.

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
9. **`COST-TRACK.md`'s "five pips is the ceiling" is wrong, and the no-cap ruling rests on it.**
   Colour *identity* is capped at five; a mana **cost** repeats colour symbols freely. Progenitus is
   a legal commander at `{W}{W}{U}{U}{B}{B}{R}{R}{G}{G}` — ten slots, `10 × 10px + 9 × 2px = 118px`,
   which overflows both the 90px desktop and the 76px phone track. `cost-pips.test.tsx:101` already
   asserts against that exact string, so the repo's own tests cover the case the document says
   cannot arise. Whatever card-rows rules, **`cap` cannot be dropped** — and the shingle-free track
   is not the same proposal once it needs an overflow rule.
10. **`CostPips` mounts in five places, not two.** `COST-TRACK.md`'s blast-radius table names
    `decklist-row` and `card-search-row`. It also mounts in `top-off-list.tsx:138`,
    `suggestion-tile.tsx` and `deck-card-tile.tsx`. A widened track is a five-surface change, and
    two of the three unlisted surfaces are tiles, not rows — their width budget is not the deck
    page's whitespace.
11. **`card-search-row` has no phone cost track to un-shingle**, and its desktop slot is 34px, not
    40px: `<span aria-hidden className="hidden md:flex flex-none w-[34px] justify-start">`
    (`card-search-row.tsx:161-163`). The document's before/after for that surface describes neither
    the shipped width nor the shipped breakpoint behaviour.
12. **`decklist-row`'s padding is 9px/8px, so the 3px left rule cannot be absorbed as drawn.**
    `ROW_PADDING = "pl-[8px] pr-[4px] md:px-[9px] md:py-[7px]"` (`decklist-row.tsx:41`). READINESS
    1b says left padding goes 12px → 10px desktop and 11px → 9px phone; the real move is 9px → 6px
    desktop and 8px → 5px phone. The *ruling* survives — no grid template changes, no row grows —
    but the numbers quoted describe a row that does not exist.
13. **The README component table and `STATES-pending.md` states 13/14 still describe the pre-R1.2
    layout.** They carry the 300px stripped removes rail, the commit sheet repeating the review
    page's two lists, and a per-row type slot on the diff row — all three reversed by READINESS
    3b/3c and by the deletion in item 14. The canvas is right and the prose is R1 residue. This is
    the class the blocker sits in: eng reading the prose instead of the canvas would build the
    layout Design already withdrew.
14. **Two provenance paths do not resolve.** README:4 cites
    `uploads/2026-09-09-deck-versioning-design.md` (the spec is
    `docs/superpowers/specs/2026-09-09-deck-versioning-design.md`), and README:43 borrows the count
    chips and `update-diff-row` from `design_handoff_the99_deck_reimport/`, which does not exist —
    that material is `design/design_handoff_the99_amendments/STATES-reimport.md` plus
    `deck-reimport · copy strings.ts`. Both are citation fixes, not design changes, but a borrowed
    atom whose source cannot be opened cannot be checked against the shipped component.

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
