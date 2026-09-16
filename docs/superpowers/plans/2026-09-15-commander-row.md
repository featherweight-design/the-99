# The commander row — implementation plan

Spec: `docs/superpowers/specs/2026-09-15-commander-row-play-style-design.md` (merged, PR #664).
Handoff: `design/design_handoff_the99_commander_row/` (R1, audited Green with five errata).

Five PRs, revised from the spec's original three after `probe:fit-parity` came back red. No
stacking: each merges to `main` before the next opens.

---

## PR 1 — the classifier and the gap slot · THIS PR

Pure code and one probe. No surface reads any of it, no payload changes, no figure moves.

| Task | State |
|---|---|
| 1. `src/lib/edhrec/tag-kinds.ts` — the format list, irregular plurals, `isCreatureTypeLabel` | done |
| 2. `scripts/build-tag-kinds.mts` + `pnpm build:tag-kinds`, asserting its own cases | done |
| 3. `src/lib/edhrec/tag-kinds.generated.ts` — 260 mechanic · 134 creature · 7 format | done |
| 4. `src/lib/edhrec/gap-slot.ts` — `isMechanic`, the 0.5% floor, `gapSlotFor` | done |
| 5. `gap-slot.test.ts` — 61 cases, mutation-checked | done |
| 6. `scripts/probe-fit-parity.mts` + `pnpm probe:fit-parity` | done |
| 7. Spec updated with the parity answer and Ruling D; boundaries revised | done |

**The generator's failure paths were run** before its green was believed: dropping the dual-role
exclusion fails the mechanic assertions, and removing any one plural rule fails its own case —
`-ice` on `Mice`, `-men` on `Cybermen`, `-ies` on `Allies`, `-es` on `Foxes`.

**One claim did not survive a later change, and review caught it.** While the vocabulary was
card-derived alone, dropping the `Kindred`/`Tribal` clause sent `Faeries` to the mechanic side
and a mutation run showed it. After the union landed it changes no answer, because `faerie` is
in Scryfall's catalog — and the claim was carried forward across the change that invalidated it.
The clause stays, as the correct reading of a type line rather than as a proved guard; the claim
is withdrawn.

**Six measured corrections, four of them found only by running it.** The vocabulary is now
Scryfall's six subtype catalogs unioned with the card-derived one, because neither is sufficient
alone: the catalogs supply token-only (`Servo`) and multi-word (`Time Lord`) types that `cards`
cannot know, and the card data supplies `Cephalid`, a real tribe in no Scryfall catalog. Full
reasoning in the spec.

**Three dead guards and one vacuous test of my own**, each found by a mutation run rather than by
reading: a runtime format guard that could never fire, a multi-word guard in
`isCreatureTypeLabel` that changed no answer, and four irregular-plural entries the trailing-`s`
rule already handled.

## PR 2 — one source of truth for Fit (Ruling D) · SHIPPED

`probe:fit-parity` is **green**: numerator, denominator and `fitSynergy` all agree across 95
commanders, with the numerator computed independently in SQL against the TypeScript
`scoreCommander` runs. Before the change the same run found 57, 56 and 20 disagreeing.

**What it cost, and what it found.**

- `scoreCommander` takes a `SupportList` instead of `edhrecTopCards`. `inclusionByName` stays
  live — it feeds role-chip percentages, not the score, and nothing compares it across
  surfaces, so it keeps the fresher reading.
- **`client-bundle-safety.test.ts` caught a real regression**: putting the loader and the pure
  overlap in one file made `score.ts` reach `src/db`, which drags the neon driver into the
  client bundle through `components/commanders/fit-legend.tsx`. Split into
  `support-overlap.ts` (pure, imported by `score.ts`) and `support-read.ts` (the query).
- **`edhrecOverlap` is deleted.** Its name matching — full name plus front face, for DFCs EDHREC
  lists by their front — is what the id intersection replaces. No caller, no test; a second way
  to resolve a card to an id is exactly what drifted from the first.
- **A total of 0 still means NO READING**, preserved verbatim from the live payload's empty
  `topCards`. Ruling D moves the source; deciding an empty list now scores 0 of 60 would be a
  second change riding along. Unreachable in any event — all 3,342 indexed commanders carry a
  positive total.
- **`SCORE_WRITER_CURRENT` bumped to 3**, and this is the case the mechanism was built for and
  the least visible: version-2 rows are the same SHAPE and a different MEANING, so nothing about
  one looks stale, and a warm set would have been out by what the probe measured. **Both cache
  versions bumped too** — `rankings.ts` to 4, `discovery/list.ts` to 3 — together rather than
  leaving the discovery one for PR 3, because the two are dropped independently and a
  half-bumped pair is the state nobody would think to check.

### The finding PR 3 must not miss

**`loadCandidates.ownedSupport` is the WRONG numerator for Fit**, and the spec's claim that all
four inputs were already in the payload was wrong about this one. That figure counts support
cards the reader owns with **no colour-identity restriction**; the score counts the ones legal in
the commander's identity, and excludes the commander's own card. The two disagreed on
`Faceless One` — colourless, 83 off-identity cards out of 322, reading **122 owned against 96
playable**.

Fit measures what could actually be played, so the pool's restriction is the correct one. PR 3
must build the row's numerator the way `probe:fit-parity`'s SQL does: support cards ∩ owned, with
`sup.color_identity <@ cmd.color_identity` and `sup.oracle_id <> cmd.oracle_id`. The probe holds
that expression already and is the guard that the two do not drift.

## PR 2 — the original task list

The parity fix. It changes a figure on every surface that prints one, which is why it is alone.

1. **A stored-overlap reader.** The count and the oracle ids of `commander_support_cards ∩ pool`
   for a set of commanders. `loadCandidates`' aggregate already computes exactly this
   (`candidates.ts:310`) — extract rather than write a second copy, since two expressions of one
   allocation are how the deck page and its receipt came to disagree once already.
2. **`scoreCommander` takes the overlap instead of deriving it.** Today it receives
   `edhrecTopCards` and calls `edhrecOverlap` (`score.ts:151`, reaching `fitSynergy` at `score.ts:288`). It should receive the resolved
   overlap and the stored total. `inclusionByName` stays live — it feeds role-chip percentages,
   not the score, and nothing compares it across surfaces.
3. **Every caller updated**: `getRankedList` / `rankFree` (`/commanders`, Home), and
   `scoreOneCommander` (Commander Details).
4. **`probe:fit-parity` goes green.** It is the acceptance test and it exits non-zero while the
   two disagree, so it cannot pass by measuring nothing.
5. **Consider the `commander_scores` writer stamp.** The persisted score set changes meaning.
   `probe:writer-version` covers the stamp; record which way it goes and why.
6. **Both cache versions bump** (see PR 3's note — they bump here too, for the same reason).
7. **What must NOT change**: `synergyState`, the degraded note and its Retry. The live read still
   serves the card lists, so an EDHREC outage still has to be describable. A scoring path that
   can no longer be degraded is a simplification to consider separately, not to smuggle in here.

**The denominator question is settled, and it makes PR 2 simpler than feared.**
`index-build.ts:74` sets `edhrecTotal = d!.topCards.length` — the RAW name count — and
unresolvable names are deliberately dropped from `commander_support_cards` while staying
counted in the total, because (`:95–97`) "a missing name reduces measured overlap rather than
silently shrinking the denominator and inflating every user's completeness." The commander's
own card is skipped from the child table too (`:99`).

So the stored total is always ≥ the rows held, by design, and the two measured equal on 3,340
of 3,342 only because resolution is near-perfect — the two that differ by 1 are most likely
the commanders that appear in their own top-cards list.

**What this means for the ruling: the stored and live denominators are the same quantity.**
Both are `topCards.length`; one was recorded on the 3rd and one is read now. The denominator
drift is therefore purely staleness, not a difference in definition, and PR 2 can take
`edhrec_total` as the denominator and the support-card join as the numerator without changing
what either figure MEANS — only when it was measured. That is also why the deliberate
under-count of the numerator survives the change: dropping an unresolvable name from the
overlap is the existing intent, stated in the code, not a side effect of the new source.

## PR 3a — the index-generation guard · SHIPPED

The correctness task carried from PR 2's fourth round, split out because it is self-contained and
should not wait behind a payload reshape. **Boundaries revised again here:** the size gate has
bitten twice on this feature, and this fix touches five files where the payload work touches
about fifteen.

**It is not the fix this plan named.** The plan said to add an `index_generation` column stamped
by the writer and compared by the reader. `persistScores` already guards a COLLECTION generation
with a better shape — read the fingerprint inside its own transaction, abort if it moved since
the caller captured it — and extending that closes the same race with **no migration and no
read-path cost**, where a reader-side check costs a query on every scoring read. The column and
its migration were written and reverted.

`writer_version` cannot express this, which is why a second fingerprint is needed: it says which
CODE wrote a row, and the rebuild changes the DATA under identical code. The generation is
`max(commander_support.computed_at)`, exactly as the collection's is `max(confirmed_at)`.

Three values, not two: omitting the argument means do not check, `null` is a real reading of an
empty index that must compare equal to itself. There is a case for the asymmetry — caller read
empty, index has since been built — that passes under the conflation.

## PR 3b — the payload and the lane reads


1. `prose` into both lane queries (`candidates.ts`, and the owned lane's ranked read).
2. `GapSlot` onto the row payload; `loadPlayedTags` added to the owned lane, which has no such
   read today.
3. Fit onto discovery rows, now that PR 2 has made it one figure.
4. The encode shape change: six fields out (`roleCounts`, `colorPoolSize`, `ownedSupport`,
   `supportPct`, `tagTotal`, `nearestDeck`), `score` and `prose` in, `unplayedLabels` replaced
   by the gap slot's three indices.
5. **The byte guard**, which is also what establishes the payload's absolute size — the spec's
   measurement establishes only the +40 KB delta.
6. **Both cache versions bump**: `discovery/list.ts:224` and `commanders/rankings.ts:56`.
   Separate constants, separate modules, each dropped independently.
7. **The owned lane's two missing fields**: `deckCount` from `commander_support.deck_count`, and
   price from `loadPrices` — reused, never re-derived.

## PR 4 — the unified row · SPLIT IN TWO

`rec-card.tsx` and `discovery-row.tsx` are 1,222 lines between them, and the work adds a copy
block, a new component, two lane adoptions, eleven retired string groups, the property tables
quoting them and the six payload fields 3b left in place. That is over the ~20-file / ~800-line
gate, so the boundary is named here before implementation rather than discovered mid-PR.

**`FitBar` is not dead code** — `about/figures.tsx` renders it. `RoleChips` does lose every
caller.

### PR 4a — the row, on both lanes

The whole visible change, and the smallest unit that puts the feature on screen.

1. `commanderRowCopy` — one new block, the gap line's four forms and the foot separator. Every
   other string is imported per the handoff's reuse manifest, never retyped.
2. The shared row component, drawing the handoff's five states. No `"use client"`: the
   disclosure trigger retired with the tag list, so the row has no control on it.
3. Both lanes adopt it in the same PR. The row reads nothing lane-specific — ruling D1 — so a
   one-lane adoption would prove nothing the second could not undo.
4. The eleven retired string groups deleted, and **the property tables quoting them corrected
   in the same PR.** `check:copy-drift` reads JSX text nodes as well as copy modules, so the
   moment the row stops emitting `not in your collection` a table still quoting it is drift.
   That coupling is why the deletions cannot wait for 4b.

### PR 4b — what the old row leaves behind

Mechanical, and separable because nothing on screen depends on it.

1. The six payload fields 3b deliberately kept: `roleCounts`, `colorPoolSize`, `ownedSupport`,
   `supportPct`, `tagTotal`, `nearestDeck` — plus `unplayedLabels`, `unplayedCount` and
   `edhrecTotal`, which the gap slot and Fit replaced. `ROW_KEYS` and the encoder shrink with
   them.
2. `discovery-row.tsx` and `rec-card.tsx` deleted; `RoleChips` with them.
3. A THIRD cache bump on both constants, because the payload's shape moves again. Cheap, and
   the alternative is a warm entry whose rows carry fields the decoder no longer names.

**Neither half is a stacked PR**: 4b branches from main after 4a merges.

## PR 5 — acceptance

Probe extensions for the row's own rulings, contact sheet over both lanes at both widths, and
the close-out walk.

### No About work in this feature — Hugh, 2026-09-16

**The About entry and the `ABOUT_VERSION` bump are OUT**, and `/about` is not touched by any PR
here. Hugh will take it to Design separately: there are several features in flight at once and
the entries are shifting around, so filing one from this run would be writing against a page
whose shape is being decided elsewhere.

This is the ruling AGENTS.md reserves for him — *"Design draws the entries and Hugh decides
which features owe one"*, and he may overrule that file. `feature-acceptance` does not gate on
the entry for this feature, and `about.test.ts`'s content hash stays pinned because no copy in
`src/lib/copy/about.ts` moves.

**Carried into that Design conversation, not actioned here.** The existing `discover` entry
becomes factually false the moment PR 4 ships, and this is a different thing from declining to
add an entry:

> "Discover prints **counts, never a score** — how many of its most-played cards you already
> own, how many decks are tracked, and how many of its top cards would be new to you."

Fit **is** a score, and the row prints it. Two of that entry's three key lines go with it (the
headline-count line, and the "new to you" line the mechanic gap slot replaces). The
`/commanders` entries survive — `fit-score` describes the three-part arithmetic and
`commander-lane` describes `Build from`, neither of which moves — but they deserve the same
re-read whenever the About round happens.

Nothing mechanical will catch this: the content hash notices an edit to that copy and cannot
notice that unedited copy has stopped being true.

---

## Fixture note, for every PR from 3 onward

`pnpm db:copy:prose` against local-dev first. Production holds 3,341 of 3,342 sentences.
Local-dev held **1,070 of 3,279** until the copy was run on 2026-09-16, which installed 2,778;
**501 rows keep their null** (inputs the target no longer has) and render with no paragraph,
which is the state the design draws rather than a fixture gap. Before that run two thirds of
rows drew empty, which reads exactly like a bug.
