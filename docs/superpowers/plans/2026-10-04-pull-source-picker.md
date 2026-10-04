# Build plan: Pull it picks its source deck (addendum R1)

Source: `design/design_handoff_the99_pull_source/` (docs PR #1245). Readiness: GREEN
(`docs/superpowers/readiness-pull-source.md`, 2026-10-04), three eng-resolved findings logged
there. No open design or product question — proceeding straight to PR 1.

**Rebase dependency:** `#1244` ("Changes view: remove the per-row card-assignment panel") is open
and touches the same two files (`contested-card-row.tsx`, `review-changes.tsx`) with no logical
overlap — see READINESS §header. This build starts from `#1244`'s branch tip and rebases onto
`main` once #1244 merges, before either of this plan's PRs opens, to keep every push's diff clean.

## Current-code map (confirmed by direct read, 2026-10-04)

- `pullCandidate(a)` (`draft-shape.ts:203`) — the SINGLE pick, by `releasableClaims(a)[0]`, else
  a sleeved commander, else a sleeved locked claim. **Untouched.** Stays the source of
  `defaultId` and the single-source fast path.
- `releasableClaims(a)` (`draft-shape.ts:188`) — `a.claims.filter(c => c.mature && c.senior &&
  !c.commander && !c.locked)`. **Untouched.**
- `Availability.claims` ordering: `availability-query.ts:565`, `jsonb_agg(... order by cd.name,
  cd.deck_id)` — alphabetical by deck name. The new list function sorts by `since` itself
  (READINESS §2.1); the query is **untouched**.
- `PullControl` (`pull-control.tsx`, 189 lines) — takes one `claim: DeckClaim`. Becomes
  `claims: DeckClaim[]` + `defaultId: string | null`. **The arm is chosen by the count of
  RELEASABLE claims (`releasableClaims(a).length`), never `claims.length`** — found by
  Copilot's round-1 review of this plan: `pullSourceChoices` is a superset that also includes
  locked/commander rows for display, so "one free source plus one locked" is
  `pullSourceChoices.length === 2` but `releasableClaims.length === 1`, and design call 5 is
  explicit that this stays ONE-TAP ("only sources that can be chosen count"). The three
  existing render arms (commander guard, locked guard, single-pull button) stay exactly as
  they are whenever `releasableClaims(a).length <= 1` — unchanged in every case that reaches
  them today, guard-only included; a new arm renders the popover/sheet trigger only when
  `releasableClaims(a).length > 1`, using the full `pullSourceChoices` list to draw every row
  (the releasable ones selectable, the rest disabled with their reason).
- `review-changes.tsx:255` — `pullClaim = pullCandidate(row.availability)`. Becomes two reads:
  `pullCandidate` for `defaultId` (unchanged call) and a new `pullSourceChoices(row.availability)` for
  the full list, both pure and both already have the `Availability` in scope. Named
  `pullSourceChoices` rather than `pullSources`: `#1244` landed its own `pullSources` in
  `availability.ts` (the hard, senior claimants a pull could take from, projected to
  `HardDeck[]` for marker strings) between this plan's audit and PR 1's build — a different
  question, a different shape, same name. Found as a hard collision (a duplicate import/export
  binding) when PR 1 was cherry-picked onto `main` after #1244 merged; renamed rather than
  reusing #1244's function, since the two answer genuinely different questions (every DISPLAYABLE
  claim, full `DeckClaim[]`, sorted — vs. the hard releasable subset, projected to id+name).
- `update-diff-row.tsx:320-326` (`HeldBy`) — draws `in {deck}` before a pull. Draws nothing after
  (the claim is gone). Gets a second state: `pulled from {deck}`, read from the new post-pull
  source-name lookup (READINESS §2.3), passed down as a new prop rather than widening `heldBy`'s
  meaning — a row either HOLDS (pre-pull) or WAS PULLED FROM (post-pull), never both, so two
  props with one drawn at a time is clearer than one prop whose meaning depends on a flag beside
  it.
- `page.tsx:115` (`Promise.all` block) — gains one more member: the batched source-deck-figures
  read (`loadSourceDeckFigures`, READINESS §2.2), degrading to an empty map on failure like
  `loadContestedCards` does for the whole list. `loadContestedCards` itself is deleted by
  #1244 — this build does not touch that removal, only adds its own new batched read beside
  wherever #1244 leaves the block.
- `pull-release.ts` — gains `latestReleaseSources(userId, askingDeckId, oracleIds)` (built in
  PR 1), beside the existing `writePullRelease` / `clearPullReleases` / `releaseAskers`. No
  schema change — the primary key already allows the multiple rows this reads around.
- `pullCardFromDeck(sourceDeckId, oracleId, askingDeckId)` (`actions.ts:1968`) — **untouched**.
  Already takes the chosen source id as a parameter; every guard inside it (ownership, commander,
  locked, claim-based authorization) is already general over any candidate the UI might send,
  confirmed by reading the whole transaction body.
- `pending-banner.tsx`'s `pullFrom` hint (`draft-state.ts:104`, `pullHints`) — informational only,
  no control, names `releasableClaims(...)[0]`. **Out of scope**, per the orchestrator's scope
  note — left exactly as it is.
- Breakpoint: the review page's own two-column switch is Tailwind `md:` (768px,
  `review-changes.tsx:980`), which is exactly the handoff's "≥ md" call — no new breakpoint
  constant needed.

## PR boundaries

**PR 1 — data: the sorted source list, the deck-size read, the post-pull source name.**
Pure functions and loaders, each independently unit-testable, no UI change.

- `draft-shape.ts`: new `pullSourceChoices(a): DeckClaim[]`, the handoff's filter
  (`claims.filter(c => c.mature && (c.senior || c.locked || c.commander))`), sorted by `since`
  ascending (nulls last, though none are expected in this filtered set — `mature` implies a
  version, which always carries `since`). Unit test: fixture with claims in deliberately
  non-alphabetical, non-chronological insertion order; assert the sort, not just the filter.
- `pull-release.ts`: `latestReleaseSources(userId, askingDeckId, oracleIds)`, filtered on
  `userId` so the read uses `pull_releases_user_idx` rather than scanning every release row in
  the table (round-1 finding) — neither the primary key nor the index covers
  `(askingDeckId, oracleId)` alone. The newest-wins reduction is pulled into its own pure
  `newestPerCard`, unit tested directly (round-1 finding: the DB-backed function had no test
  covering the reduction itself, only the upsert's SET clause).
- `read.ts`: `loadSourceDeckFigures(pairs, userId)`, batching BOTH each candidate deck's
  current size and whether the specific (deck, card) pair is still present in `deck_cards` —
  round-1 finding: `pullCardFromDeck` only decrements a source when the card is `inDraft`
  there, so "size minus one" is wrong whenever a claim has outlived its draft row. Mirrors
  `loadVersionShape`'s per-deck query shape (`versions.ts`) but batched across several decks
  and cards in two round trips.
- Wire both into `page.tsx`'s existing `Promise.all`, degrading to an empty map on
  failure (never failing the route).

**PR 2 — UI: the popover/sheet, the row wiring, the post-pull label.**

- `PullControl`: `claims`/`defaultId` props, the `n > 1` popover (≥ md) / sheet (< md) arm —
  `role="dialog"`, a `radiogroup`, locked/commander rows disabled with their reason, confirm
  reads `Pull from {deck}` and calls the unchanged `pullCardFromDeck(chosenId, ...)`. Reuses
  `useDialogA11y`/`useScrollLock` (`src/lib/a11y/dialog.ts`) for the popover/sheet's own focus
  trap and scroll lock — no new dialog mechanism.
- `review-changes.tsx`: wire `pullSourceChoices`, the new deck-size map, and `defaultId` through to
  `PullControl`.
- `update-diff-row.tsx`: the post-pull `pulled from {deck}` state on `HeldBy`'s slot, linked to
  the source deck.
- Copy: `design/design_handoff_the99_pull_source/pull-source · copy strings.ts` are placeholders
  (handoff README says so) — route the real strings through `/copy-review` per standing policy,
  not to Hugh directly.
- Walk at 390 and 1300 (no new browser probes, per the orchestrator's instruction) — the existing
  `decks-review` or equivalent manual walk covers: zero sources (unchanged), one source
  (unchanged, both the pullable and the two guard arms), 2+ sources at both widths, a refused
  pull inside the open list (the list stays open, pick kept, per handoff state 9), and the
  post-pull label on the asking deck's row.

No About entry, no version bump (READINESS §3).
