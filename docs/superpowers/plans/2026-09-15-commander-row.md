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
| 3. `src/lib/edhrec/tag-kinds.generated.ts` — 269 mechanic · 125 creature · 7 format | done |
| 4. `src/lib/edhrec/gap-slot.ts` — `isMechanic`, the 0.5% floor, `gapSlotFor` | done |
| 5. `gap-slot.test.ts` — 43 cases, mutation-checked | done |
| 6. `scripts/probe-fit-parity.mts` + `pnpm probe:fit-parity` | done |
| 7. Spec updated with the parity answer and Ruling D; boundaries revised | done |

**Both of the generator's failure paths were run** before its green was believed: dropping the
`Kindred` clause fails on `Faeries`, dropping the dual-role subtraction fails 9 of the 10
mechanic assertions. **One test of my own was found vacuous** by a mutation run — removing the
runtime format guard failed nothing, because the generator already omits format labels from the
allowlist — so the guard is deleted and the test asserts the mechanism instead.

## PR 2 — one source of truth for Fit (Ruling D)

The parity fix. It changes a figure on every surface that prints one, which is why it is alone.

1. **A stored-overlap reader.** The count and the oracle ids of `commander_support_cards ∩ pool`
   for a set of commanders. `loadCandidates`' aggregate already computes exactly this
   (`candidates.ts:310`) — extract rather than write a second copy, since two expressions of one
   allocation are how the deck page and its receipt came to disagree once already.
2. **`scoreCommander` takes the overlap instead of deriving it.** Today it receives
   `edhrecTopCards` and calls `edhrecOverlap` (`score.ts:252`). It should receive the resolved
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

## PR 3 — the payload and the lane reads

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

## PR 4 — the unified row

`rec-card.tsx` and `discovery-row.tsx` collapse into one component; both lanes adopt it; the
five states are drawn; retired copy is deleted and the property tables quoting it corrected.
`check:copy-drift` will fail until those tables are fixed, which is the point of it.

**`FitBar` is not dead code** — `about/figures.tsx` renders it. `RoleChips` does lose every
caller.

## PR 5 — acceptance

About entry and `ABOUT_VERSION` bump, probe extensions for the row's own rulings, contact sheet
over both lanes at both widths, and the close-out walk.

---

## Fixture note, for every PR from 3 onward

`pnpm db:copy:prose` against local-dev first. It holds **1,070 of 3,279** sentences against
production's 3,341 of 3,342, so two thirds of rows render as `No sentence` until that runs —
a fixture gap that reads exactly like a bug.
