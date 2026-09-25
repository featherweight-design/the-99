# Change commander (sub-project 7): plan

**Lane:** `change-commander` (brief: `boards/lanes/change-commander.md`). **Written against** `origin/main` at
`88298610`. **Status:** Hugh pre-approved overnight plans. Sent to the orchestrator (the-99-d9), and the build
starts on PR 1 unless d9 flags something.

## Goal

A player who likes their 99 but not its leader puts a different commander (or pair) at its head, chosen from
commanders who can lead the same cards, as an ordinary draft change they can review, commit or discard.

## Sources, in precedence order

1. **Hugh's rulings.** Brief `docs/superpowers/design-briefs/2026-09-24-alternate-commander.md` §2 (rulings 1–7).
   Audit `design/design_handoff_the99_change_commander/READINESS-audit.md`, rulings of 2026-09-25: H1 (a
   half-owned pair sits with the pairs to buy, ranked by fit, its buy tag naming the half to buy), H2 (below),
   and the mana value accepted as drawn.
2. **The design:** `design/design_handoff_the99_change_commander/` R3. Audit F1–F10 are corrections.
3. **The data trap:** `commander_support_cards.inclusion` is stored 0–100, not as a share.

## H2, as ruled: minimum sample only

**Ruling (Hugh, 2026-09-25):** the ranking is the plain "N of M" count, with too-small samples hidden. N is
measured and its curve recorded. Cancelling the popularity lean is a possible follow-up if the staging walk
(*HD - Zombies*) reads as "the usual suspects". No seam is built for it: one plain scoring function.

**Why not the inclusion threshold the audit first recorded (F10).** Measured on `staging`
(`br-polished-pond-a6e63y0b`, read-only, 2026-09-25): 18 real single-commander decks of 90+ cards, and 2,852
deck × same-identity candidate pairs.

- **Support lists are not longer for popular commanders.** The average list is flat at 258–295 cards from 8
  decks to 54,591 (EDHREC caps it). Commanders with 1–7 decks average 184 cards, and every one of them is at
  10% or more, because a single deck puts each card at 100.
- **A threshold does not move the lean.** The figure's correlation with log(deck_count): 0.286 with no
  threshold, 0.285 at 10, 0.291 at 20, 0.313 at 30. The median deck count of each deck's top 10 candidates stays
  at about 1,600 (1,658 / 1,572 / 1,718). Worse, a higher threshold admits more tiny, noisy commanders into the
  top 10 (6, 12, 19 slots held by candidates under 50 decks), because their lumpy inclusions pass it.

**The floor's curve** (same 18 decks; "step" is how many points one deck moves a card's inclusion, 100 / N):

| Floor N | Candidates kept | Top-10 slots under 50 decks | under 20 | Mean step | r (figure vs log decks) |
|---|---|---|---|---|---|
| 0 | 100.0% | 6 | 2 | 2.5 | 0.286 |
| 5 | 97.5% | 6 | 2 | 1.4 | 0.245 |
| 10 | 94.4% | 6 | 2 | 1.0 | 0.223 |
| **20** | **89.2%** | **4** | **0** | **0.6** | **0.205** |
| 30 | 85.4% | 2 | 0 | 0.5 | 0.194 |
| 50 | 80.4% | 0 | 0 | 0.3 | 0.192 |
| 100 | 72.7% | 0 | 0 | 0.2 | 0.159 |
| 200 | 62.6% | 0 | 0 | 0.1 | 0.115 |

**N = 20.** It is the first floor where no candidate under 20 decks reaches a deck's top 10, one deck can move a
card's figure by at most 5 points, and it keeps 89% of candidates. Above it the correlation barely moves
(0.205 → 0.192 at 50) while candidates keep falling (80% at 50). A candidate under the floor is hidden, never
shown with a caveat. The same floor applies to a pair's `commander_pair_support.deck_count`. The constant is
`MIN_CANDIDATE_DECKS` in `src/lib/commander-change/fit.ts`, with this table cited beside it. The probe re-reads
the curve so a changed index cannot silently move it.

**The row keeps "41 of 62 are in its decks".** The meaning did not change, so no copy change is owed for H2.

## Decisions this plan makes (one defensible answer each)

1. **The live commander columns are the draft.** `decks.commander_oracle_id` and `partner_oracle_id` already act
   as the draft's commander. A commit copies them into the version (`src/lib/decks/versions.ts:163-168`), and
   it already resets seniority when the id changed (:199-210). So a swap writes the live columns, and the draft
   learns of it by comparing them with the newest version. **No migration.** 0062/0063 are not needed.
2. **What "pending" means grows by one clause everywhere it is decided:** the commander columns differ from the
   newest version's. The sites are `draft-state.ts` (`readSnapshot`, and the early return in `readDraft`
   at :250), the `pending_decks` CTE (`availability-query.ts:134-150`), `pendingChangesSql` (`read.ts:778`) and
   the pull guard (`actions.ts:2065`). The commit route needs no change for the model: `commitVersionIn` already
   copies the live columns and resets the tenure. What the commit's RECEIPT says about a new commander (a copy
   to buy, a copy back in the pool) is drawn with the review page in PR 4. One helper,
   `commanderMoved(version, deck)`, in `src/lib/commander-change/pending.ts`, used by the TypeScript sites. The
   two SQL sites use one SQL fragment exported from the same file, so the rule is written once in each language.
3. **`DraftState` gains `commander: { from: CommanderPair; to: CommanderPair } | null`.** `changeCount` counts
   it as one, so `hasChanges` is true on a swap alone (F1). `admitsReview` takes it, so a commander-only draft
   reaches the review page.
4. **`releasedCopies` adds one copy per commander that leaves the deck** (F3), unless it traded into the 99.
5. **Discard restores the commander columns** from the newest version, in `restoreDraftFromVersion`'s own
   transaction, and re-runs `pruneOrphanProxies`, since commander proxies key on those columns
   (`prune-proxies.ts:59`).
6. **The write (F2)** is `changeCommander(deckId, to)`, a server action. In one transaction it locks the deck,
   re-reads it, re-checks legality with `createDeck`'s rules (`actions.ts:277-310`: `commanderLegal`,
   `isCommanderCandidate`, `canPair`), and refuses unless the candidate's identity equals the deck's exactly and
   its size matches (rulings 2 and 3). A trade moves the old commander into `deck_cards` and removes the new one
   from it. Then `touchDeck` runs. `revalidateClaims` and the user-lists tag run in `after()`, because a Server
   Action that revalidates during its run re-renders its caller's route into the response.
7. **Other readers of the live columns follow the draft, as they do today:** `notBuiltBy`, proxies, stats, home,
   near-miss and discovery. That is the existing meaning of the live columns. Other decks keep seeing the
   COMMITTED commander's claim, because `claimModel` reads committed decks from the newest version
   (`availability-query.ts:93-98`). Both behaviors already exist; nothing new is decided here.
8. **The fit figure is one plain function**, `fitCount(candidateSupport, deckBody)`, in
   `src/lib/commander-change/fit.ts`. It counts the deck's distinct non-basic cards, other than universal staples
   (`loadUniversalStaples`, `src/lib/staples/universal.ts:40`), that appear in the candidate's support list. The
   denominator is the same set's size. Candidates under `MIN_CANDIDATE_DECKS` are dropped before ranking.
9. **Mana value comes from `cards.cmc`** (F7), summed for a pair, never parsed from the cost.
10. **Candidates**: `loadChangeCandidates(deckId)` in `src/lib/commander-change/candidates.ts`. It filters
    `commander_support` (or `commander_pair_support`, keyed through `canonicalPair`,
    `src/lib/edhrec/pair.ts:26`) to the deck's exact identity and size, excluding the current commander(s). It
    groups the rows by ownership: Yours (every half free or held, or in this deck's 99), then To buy (any half to
    buy; H1). Availability is read with this deck excluded (Design's eng 6). Each group is ordered by the figure,
    ties by name. A to-buy row's price is the sum of the halves it has to buy, and its buy tag names that half.
11. **`CHANGE_COMMANDER_ENABLED`** (`src/lib/commander-change/flag.ts`, a copy of `src/lib/swaps/flag.ts`). With
    it off, the deck page renders today's `FullCardTrigger` exactly as it is (F6), and the action refuses.

## PRs (each ≤ 20 files, based on `main`, one at a time)

1. **The draft learns commanders** (data and model; no UI). Decisions 1–5 and 11, the flag, and `pending.ts`. Unit
   tests for `changeCount`, `releasedCopies`, `admitsReview` and the SQL fragment's `.toSQL()`. A probe,
   `probe:change-commander-draft`, runs against local-dev: it swaps a fixture deck's live columns, then reads
   `loadDraftState`, the pending edge and the deck list's pending mark, commits, and discards, asserting that
   Discard restores the columns. **Shared files:** `draft-shape.ts`, `draft-state.ts`, `availability-query.ts`,
   `read.ts`, `versions.ts`, `actions.ts`. `admits-review.ts` needs no change: the route passes it
   `changeCount`, which now counts the move, and a test there pins that. **The switch gates the model too**
   (d9, 2026-09-25): off, every pending SQL site is byte-identical to today's, pinned by
   `src/lib/commander-change/queries.test.ts`. The probe runs as
   `pnpm tsx scripts/probe-change-commander-draft.ts`, with no `package.json` entry, because that file is outside
   the fence.
2. **Candidates, the fit figure and the write.** Decisions 6, 8, 9 and 10. `fit.ts`, `candidates.ts`, the
   `changeCommander` action, and the copy module `src/lib/copy/change-commander.ts`, transcribed from Design's
   copy file for `/copy-review`. A probe, `probe:change-commander-write`, runs against local-dev: a swap, a trade,
   a pair swap and a refused cross-identity write, then the floor's curve re-read from the index.
   **Shared file:** `actions.ts`, for the action's export only, or a new `src/lib/commander-change/actions.ts`
   if d9 prefers the fence.
3. **The door and the sheet.** The joined plate on the art (R3-E). `change-commander-sheet.tsx` on `ModalChrome`
   at 700: the list, figure-opens-its-cards, Show more, the confirm with mana value, the trade, the pair,
   errors, and `CardModal` stacked with `← Change commander`. **Shared files:** `spine-desktop.tsx` and
   `spine-mobile.tsx`, at the `FullCardTrigger` mount only.
4. **The banner and the review page.** A commander line in both `PendingBanner` densities, and a *Commander*
   section first on the review page (F1). `DECK_MIX_KEY` gains the commander ids (F5). Discard's consequence names
   the old commander back. **Shared files:** `pending-banner.tsx`, `review-changes.tsx`, `changes/page.tsx`.

**Every UI PR (3, 4):** design-review against the handoff's property tables before opening. Then
`probe:change-commander` at 390 and 1300, which PRESSES the door, a candidate, the confirm, and Discard from the
banner, with mutations run against it, and `feature-acceptance` with a contact sheet.

## The About entry

**Batched with the deck-analysis line at launch** (brief §7; AGENTS.md, *a multi-round feature line batches its
About entries*). It is a named task of the line's close-out, not of these PRs: Design draws the entry on the
per-entry artboard, and the line's `ABOUT_VERSION` bump carries it. Nothing here bumps the version.

## Fence and shared files

Fence (the lane brief): `src/lib/commander-change/**`, `src/components/decks/change-commander*`,
`src/lib/copy/change-commander*.ts`, `scripts/probe-change-commander*`, this plan,
`docs/superpowers/design-tables/change-commander*.md`, `.env.example` and `docs/deployment.md` (the switch).

Shared, and asked of d9 before each PR: the files each PR names above. Swap tools (the-99-2b), Locked
(the-99-d8) and Help me choose (the-99-1f) all touch the deck page tonight, so each PR's shared hunks are kept
to the named call sites.
