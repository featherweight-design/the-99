# Basic lands in the draft diff

A deck that cut five Swamps and added five other lands shows **nothing** on
`/decks/[id]/changes` and nothing in the pending banner. The player cannot tell
how many Swamps to pull out of the sleeve or how many lands to put back in.

## The cause

`readDraft` (`src/lib/decks/draft-state.ts`) drops every basic land out of both
change lists before anything downstream runs, and leaves a bare `basicsChanged`
boolean in their place — enough to keep the commit button alive, not enough to
name a card or a count. `commitDeckVersion` filters the same way.

The filter is in the wrong place. Its reason is sound and stays true: a basic is
outside the availability and price model, so it has no claim, no shortfall and
nothing to buy. That is a fact about **money**, and it was applied at the
**change list**. Cutting five Swamps is a change whether or not anyone can price
it.

The version rail proves the point from the other side: `loadVersionDiff` never
filtered basics, so `/decks/[id]` → `Versions` has been drawing the Swamps the
draft's own review page hides. It was not drawing their count — see "What the
probe found" below, which is the half of this that reading the code missed.

## The rule this ships

**A basic land is a free, owned card that the app never asks the claim model
about.** That is already how every other Shopping surface in the app treats one.
Stated in the draft model rather than worked around per surface, it makes every
figure on the page correct without a new concept:

| Figure | Basics |
|---|---|
| `adds` / `removes`, the drawn rows | **In**, with `from → to` |
| `changeCount`, the column counts | **In** |
| `releasedCopies` — "back in the pool" | **In**. Five Swamps come out of the box. |
| `bucket` | `free`, so the `free · sleeved · buy` breakdown still sums to the column |
| `buyCount`, `unfreeCount`, `total`, `pricedCopies` | **Out** — a basic buys nothing |
| `pullFrom`, `pullableCount` | **Out** — nothing to pull |
| availability read, price read | **Not asked** |

## Design

**No round-trip.** Design already ruled the row form — README correction 21:
"Every diff and version row renders `{name} {from} → {to}`, reusing
`recountedItem`" — and named this filter as the downstream defect in the same
breath ("the pull list must be filtered exactly as the buy list is"). The row
already exists on the version rail. Nothing new is drawn.

One designed state is **retired** as a consequence, and is recorded as errata in
the handoff rather than escalated: `review.basicsHeading` / `review.basicsLede`
("Mana base only, since v*n*"). That state existed because a basics-only draft
had no nameable row. It now has rows, so the state is unreachable — not
overruled, dissolved.

## What the probe found, and the rule it added

Drawing the rows was not enough on its own. All three diff surfaces — the review
page, the pending banner and the version rail — decided whether to print a
`from → to` pair with their own copy of `from > 0 && to > 0`, so a **whole cut
printed a bare name**. That was correct for as long as no row could lose more
than a copy: a card is sleeved singly, so a whole cut was always `1 → 0`, which
is exactly what the column heading above it already said. A deck that cut all
five of its Swamps therefore drew `Swamp` — five cards coming out of the sleeve,
stated as though they were one, which is the reported defect surviving the fix
that was supposed to end it.

The three copies are now one predicate, `printsPair` in `draft-shape.ts`:
`from > 1 || to > 1`. `0 → 1` and `1 → 0` stay bare, because the heading has
said it; every other shape carries copies nothing else on the page holds. One
rule rather than three is what stops the surfaces describing the same move three
ways the next time a row can move more than one copy.

`pnpm probe:review` is what found it — the component tests were green, because
none of them had ever mounted a row that lost more than one copy.

## Tasks

### 1 · The model

- `bucketAdds` (`draft-diff.ts`) takes a `basics: ReadonlySet<string>`. A basic
  returns `{ shortfall: 0, bucket: "free", heldBy: [] }` **before** the
  availability lookup, so it is free even when the claim read failed — a failed
  read says nothing about a Swamp.
- `readDraft` (`draft-state.ts`) stops filtering `diff.adds` / `diff.removes`.
  It keeps the basics set and uses it to scope the availability ask and the
  price ask, and passes it to `bucketDraftAdds`.
- `loadDraftRows` sets `owned: true` on a basic row. This is what keeps the buy
  tag off it: `AvailabilitySlot` draws the tag on `!owned || committed ||
  shortfall > 0`, and `availability` is already null for a card nothing was
  asked about. No component learns what a basic is.
- Delete `basicsChanged`, `basicsMoved` and `anyBasicMoved`. `changeCount > 0`
  now answers every question they were invented for. `hasChanges` collapses to
  `changeCount(state) > 0`.

### 2 · The commit path

- `commitDeckVersion` keeps its basics filter on `adds` (the buy list) and drops
  it from `removes`. `pull` is currently returned and consumed by nothing; the
  "back in the pool" figure the sheet draws is the client's `releasedCopies`.

### 3 · The surfaces

- `admitsReview` loses `basicsChanged`; `changes > 0` admits.
- `pending-banner.tsx` loses the `n > 0` gate on the review link — there is no
  longer a draft with changes and no rows.
- `review-changes.tsx` loses the `basicsOnly` heading/lede branch.
- **`PutBackControl` is offered only when `from - to === 1`.** A put-back is
  `addCardToDeck` unwrapped — one copy — while the optimistic model retires the
  whole row and credits `from - to`. Basics are the only rows that ever carried
  a quantity above one, so this path has been unreachable and is now reachable.
  A `5 → 4` basic still offers it; a `5 → 0` does not.
- Copy: `review.basicsHeading`, `review.basicsLede` deleted;
  `discard.question`'s zero branch and `discard.consequence`'s no-named-card
  branch deleted with them (both are now unreachable — a draft with changes
  always names a card).

### 4 · Proof

- `draft-diff.test.ts` / `draft-state.test.ts`: a basic add buckets `free` with
  a failed claim read; a basic never reaches the availability or price ask;
  `releasedCopies` counts a cut basic's copies.
- `probe:draft`: a basics-only draft comes back with a named row and a
  `from → to` pair, and quotes no price for it.
- `probe:review`: `Swamp 5 → 0` draws at both widths, with no buy tag, no
  availability marker and no `Put back` control; a `5 → 4` basic keeps its
  control. The fixture sleeves two basics into the version at five copies each,
  so both figures are real diffs rather than props, and a direct visit with no
  `?commit=1` is expected to be ADMITTED — the refusal is what left the edit
  undescribed.
- `draft-state.test.ts`: `printsPair` across all four shapes, and one component
  test per diff surface for the whole cut of more than one copy.
- Contact sheet: `docs/superpowers/inventories/basics-in-diff.json`.

## Route inventory

| Route | 390px | 1300px | Shares with |
|---|---|---|---|
| `/decks/[id]` — pending banner, basics named inline | ☐ | ☐ | — (origin) |
| `/decks/[id]/changes` — basic rows in both columns | ☐ | ☐ | `/decks/[id]` (the diff row) |
| `/decks/[id]` → `Versions` — a version's own diff | ☐ | ☐ | already correct; walked to prove the two agree |

No `shares` block: the review row and the version rail row are deliberately
different components (`DiffRowOut` vs the rail's own), because one carries
availability and a control and the other is a historical record with neither.

## Why one PR

The change deletes two fields off `DraftState`. Every consumer of those fields
has to move in the same commit or the tree does not compile, so a model/UI split
would produce a broken intermediate rather than two reviewable halves. Estimated
at ~18 files and well under 800 lines, most of it deletion. If it lands over
either bar, the cut is: the probe and the inventory move to a follow-up PR, and
nothing else is severable.
