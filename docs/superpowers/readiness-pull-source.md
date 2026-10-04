# READINESS — Pull it picks its source deck (addendum R1)

**Verdict: 🟢 Green.** Build starts now. Three findings, **all engineering-resolvable** — none
sends the round back to Design.

- **Handoff:** `design/design_handoff_the99_pull_source/` (R1, 2026-10-04)
- **Audited:** 2026-10-04 against `origin/main` at `bf17f3401`
- **Design self-assessment:** none stated explicitly, but the README's own "Not listed" and
  "Flag for Hugh" notes are the only open questions it raises, and both are answered below without
  a round trip.
- **Scope, confirmed with the orchestrator:** the Changes view (`/decks/[id]/changes`) only. The
  card-assignment control on the card modal and on `/collection` is untouched, even where the
  handoff's engineering notes brush against shared copy modules — Hugh will flag those separately
  if he wants them touched.
- **Rebase dependency, resolved.** `#1244` ("Changes view: remove the per-row card-assignment
  panel") touched `contested-card-row.tsx` and `review-changes.tsx` — the same two files this
  build edits. Confirmed the overlap was structural, not logical: #1244 removes "THE SECOND
  DOOR" block (`contestedCard && (...)` around `review-changes.tsx:388-409`, the `ContestedCardRow`
  import, and the `contested` prop plumbing) — a wholly separate mechanism from the
  `pullClaim`/`PullControl` path this build touches (`review-changes.tsx:250-360`). No shared
  state, no shared component. It merged ahead of PR 1 opening; PR 1's branch was rebased onto the
  result, surfacing one real naming collision (both this build's `pullSourceChoices` and #1244's
  own `pullSources` wanted to exist) — resolved by renaming, see the plan's PR 1 boundary.

## §1 The ruling, and it holds

> **A pull takes the card out of the SOURCE deck's draft and commits nothing. A release record
> clears the asker's buy tag. Discard undoes it. A locked copy is never offered. Draft-only decks
> are never sources.**

Checked each clause against the shipped tree:

| Clause | Source | Result |
|---|---|---|
| A pull edits the source's draft, commits nothing | `pull-release.ts:26-36` (`writePullRelease` doc comment), `actions.ts:1968-` (`pullCardFromDeck` deletes a `deck_cards` row, no version write) | **True** |
| A release clears the asker's buy tag | `assign.ts:108-120` sums `pullReleases.copies` into the claim model's `all_claims`, which is what `shortfall`/`bucket` read | **True** |
| Discard undoes it | `pull-release.ts:48-59` (`clearPullReleases`, called on commit AND discard) | **True** |
| A locked copy is never offered | `pull-control.tsx:108-116` (guard tag, no control) + `actions.ts` `PULL_REFUSED_LOCKED` under `isLiveLocked` inside the transaction | **True**, both halves |
| Draft-only decks are never sources | `draft-shape.ts:192` `releasableClaims` filters `c.mature` (committed), and `pullCandidate`'s fallback also filters `(a?.claims ?? []).filter(c => c.mature)` | **True** |

The handoff's own filter for the new picker list — `claims.filter(c => c.mature && (c.senior ||
c.locked || c.commander))` — is consistent with every one of the five rows above: it is a
**superset** of today's single-pick logic (adds locked/commander rows that `pullCandidate` already
names in its fallback, for display as disabled rows rather than silently) and changes no guard.

## §2 Findings, all resolved without a round trip

### 2.1 The claims array is NOT in commit order — it's alphabetical by deck name

Design call 3 says "Rows are in commit order (`since`), the same order as the contested-card row."
The SQL that builds `Availability.claims` (`availability-query.ts:565`) ends `jsonb_agg(... order by
cd.name, cd.deck_id)` — **alphabetical by deck name**, not `since`. The fixture (HD - Avatar Aang,
2 Aug, listed first; Prismari Artistry, 19 Sep, second) is consistent with EITHER ordering by
coincidence — "HD" sorts before "Prismari" too — so this did not surface from the fixture alone;
it surfaced from reading the query.

**Resolution:** the new candidate-list function sorts explicitly by `since` ascending (committed
longest ago first) — this is NEW ordering, introduced for the displayed list only. Today's
default pick is unchanged and does NOT follow commit order: `pullCandidate()` takes
`releasableClaims(a)[0]`, i.e. whichever claim is first in `Availability.claims`'s own
alphabetical-by-deck-name order (§2.1 above). The fixture's longest-committed source happens to
also sort first alphabetically, which is why the two orders agree there, but that is coincidence,
not a rule either function follows. `pullCandidate()` itself is untouched — it stays the single
source of truth for `defaultId`, independent of how the full list is sorted for display.

### 2.2 "→ {n} cards" needs a new read — no surface on this page has it today

Engineering note 3: "`→ {n} cards` is the source's current draft count minus one." No query on
`/decks/[id]/changes` currently loads another deck's card count — `DeckClaim.quantity` is this
CARD's ask on that deck, not the deck's total. `pullCandidate`'s single-pick path never needed it
(today's `PullControl` draws no size figure). Confirmed by reading every `cardCount`/`quantity`
site in `versions.ts` and `draft-state.ts`: each is per-card or per-this-deck, never a batched read
of several OTHER decks' totals.

**Resolution (revised during PR 1, by a second round-1 finding):** "current size minus one" is
itself only sometimes right. `pullCardFromDeck` (`actions.ts`) touches `deck_cards` only when
the card is still `inDraft` there — a claim can outlive the draft row it came from (the player
cut the card themselves; the claim stands until the draft is re-committed or discarded), and a
pull against that claim writes only the release, leaving the source's size unchanged. The
loader returns BOTH figures per (deck, card) pair — `built` and `inDraft` — so the caller
applies the same branch the action does: `built − 1` when `inDraft`, `built` otherwise.

Shape: one batched loader, in the spirit of `loadContestedCards` (`page.tsx:115`, also batched
and swallowed-on-failure): given the distinct (deck id, oracle id) pairs across every contested
row on the page (at most a handful), two queries — one for each candidate deck's current size,
one for which of the asked-for (deck, card) pairs are actually present in `deck_cards`. Threaded
down beside `contested` was removed by #1244, but the PATTERN — one extra `Promise.all` member,
read after admission, degrading to an empty/absent figure on failure rather than failing the
route — is the one to copy. A failed read of this figure omits the `→ N cards`
clause rather than drawing a wrong one or erroring the panel.

### 2.3 `pull_releases` allows more than one row per (card, asker) — the "pulled from" label needs a tie-break

`pull_releases`' primary key is `(sourceDeckId, oracleId, askingDeckId)` (`schema.ts:966`) — one
row per SOURCE. A deck asking for 2+ copies of a card can be satisfied by pulls from two DIFFERENT
sources over time, leaving two release rows for the same `(oracleId, askingDeckId)`. Engineering
note 4 says to read "the `pull_releases` row" (singular) to name the post-pull source, which is
ambiguous the moment there are two.

**Resolution (eng call, no design frame covers this, so the narrowest safe default):** when
naming the source for the "pulled from {deck}" label, read the MOST RECENT row by `created_at` for
that `(oracleId, askingDeckId)` pair. The label is informational/undo-oriented — "where did my
last pull on this card send it" — and a reader who pulled from two sources for one card is already
an edge case the handoff draws no frame for; showing one name rather than a list or nothing is the
smallest addition that is still truthful about the most recent action.

## §3 About

No version bump — matches the handoff's own call. The underlying capability (take a copy out of
another deck) is unchanged; this adds a CHOICE where today the app chose silently, plus a
transparency label about a choice already made. Neither is a capability the reader was previously
unaware the app had. Flagged here rather than escalated, per the standing rule that a refinement of
an existing entry needs Hugh's override only when the audit finds a genuinely new capability — it
did not.

## §4 Not escalated, and why

- **"A junior holder exists but isn't offered"** (handoff's own flag) — this is the EXISTING rule
  (`releasableClaims` and the new list's filter both exclude non-senior, non-locked, non-commander
  claims), restated rather than changed. Nothing to decide.
- **Rebase on #1244** — mechanical, not a design question; covered in the header above.
