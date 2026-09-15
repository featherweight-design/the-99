# Assigning a contested copy

A card a deck owes arrives in the collection and the deck stops owing it. Where one copy
arrives and more than one committed deck wants it, the player decides which deck gets it.

Spec: `docs/superpowers/specs/2026-09-14-card-assignments-design.md`.
Design handoff: `design/design_handoff_the99_card_assignments` (READINESS 🟢 after the two
rulings recorded below).

## What already works, and is not rebuilt

- Buy state is derived, not stored. `isShoppingCard` and `loadDeckBuyRows` compute against
  `collection_items` at read time.
- Every figure is oracle-keyed, so the pickup is set-agnostic already.
- `deck_version_cards.since` already gives the first-committed deck priority, per card.

## Rulings that shape this plan

1. **No deck-page door.** The `over` availability marker stays inert — the shipped ruling in
   `availability-marker.tsx` ("no hover, no focus ring and is never a tap target") holds. The
   chooser appears on the summary and on `/decks/[id]/changes`, and nowhere else. README
   decision 10, state 41 and the deck-page half of decision 9 are out of scope.
2. **Import issues stay reachable.** `IssueInspector` becomes readable after the confirm and
   the summary links it (state 1d).

A knock-on from (1): the compact two-line deck option was justified by the deck-page panel's
345px column. With that door gone it survives only as the 390px form, and the `/changes`
panel takes the one-line option at desktop — to be measured against the real column in PR 4
rather than assumed.

## PR 1 — the model

### 1.1 `card_assignments`

```
user_id     text      not null
oracle_id   uuid      not null references cards(oracle_id)
deck_id     uuid      not null references decks(id) on delete cascade
copies      integer   not null default 1  check (copies > 0)
created_at  timestamp not null default now()
unique (user_id, oracle_id, deck_id)
index (user_id, oracle_id)
```

`copies > 0` at the database boundary: a zero or negative row inverts the supply arithmetic
durably, and no caller-side guard survives a future caller. The `user_id`/`deck_id` pair is
validated by the write (PR 3), not by a constraint — the deck's owner is on `decks`, and a
composite FK would need `decks` keyed on `(id, user_id)`.

### 1.2 Three-phase allocation in `claimModel`

One new CTE chain, consumed by all three sites that today compare `(since, deck_id)`:

1. `commander_copies` — per `(oracle_id, deck_id)`, the copies a committed deck holds as
   commander or partner. `all_claims` already carries `is_commander` per arm, so this is a
   sum over those arms rather than a new read.
2. `reservations` — `card_assignments` joined to the deck's committed ask, each row capped at
   that ask **and** at the supply remaining after earlier reservations. A running total over
   `(created_at, deck_id)` does the cumulative cap: `least(copies, ask, greatest(owned −
   commander_total − running_prior, 0))`.
3. The existing seniority queue, over `remainder = greatest(owned − commander_total −
   reserved_total, 0)` and the unreserved part of each claim.

Sites to change together, or the deck page and the buy roll-up disagree about one card:
`senior_hard`, the `senior` flag inside `claims`, and `supply.senior` in `loadDeckBuyRows`.

### 1.3 `DeckClaim` gains three fields

| Field | Why |
|---|---|
| `since: string \| null` | The chooser's options sit in commit order and each carries a `v7 · 2 Aug` stamp. The query already computes `min(ac.since)` and drops it before `jsonb_build_object`. |
| `versionNumber: number \| null` | The `v7` half of the same stamp. From `newest_version`. |
| `commanderCopies: number` | Replaces reading `commander` as a whole-row fact. A deck holding the card as commander **and** as a list card folds to one claim today via `bool_or`, so state 34 — commander half inert, spare copies pickable — is undrawable. `commander` stays, as `commanderCopies > 0`, because every current reader wants exactly that. |

### 1.4 Probe cases — `pnpm probe:claims`

Each is run against the unfixed build before being believed:

- a reservation beats an earlier `since`
- a reservation is capped at the deck's own committed ask
- a reservation is capped at the supply left after an earlier reservation: two decks each
  assigned one copy of a single-copy card resolve to the earlier assignment, and the remainder
  never goes negative
- two copies, two assignments, both honoured
- no shortage: no figure moves
- a commander claim is not displaced **in the arithmetic**, with one copy owned
- the folded commander-plus-list-copy case: `commanderCopies` is 1 while the claim's
  `quantity` is 2, and only the list copy is reservable
- a reservation for a card the deck no longer asks for reserves nothing
- the row vanishes when its deck is deleted
- `since` and `versionNumber` come back on every mature claim and are null on a brew's

### 1.5 Also in this PR

The merged spec gains the two rulings above and the errata the readiness audit produced; the
handoff gains a `READINESS.md` amendment recording the same. Bundled here rather than shipped
as a doc-only PR.

## PR 2 — arrivals, and an invalidation bug

### 2.1 The diff

`confirmUpload` takes three reads and stores the result:

- **Owned delta.** Per-oracle `sum(quantity)` before and after. `DeckBuyRow.quantity` is a
  deficit, so it cannot say how many copies arrived — one deck owing one copy reads
  `[{quantity: 1}]` → `[]` whether one arrived or five.
- **Buy-row delta.** `loadDeckBuyRows(userId)` before and after, keyed `(deckId, oracleId)`
  **with quantity**. Classified: gone, reduced, raised, new. A membership-only diff misses a
  deficit falling 2 → 1.
- **Claims on what arrived.** `loadAvailability(userId, { oracleIds: arrived })`. The buy rows
  cannot answer contention: a fully funded deck has no buy row, so the senior holder
  disappears exactly when there is something to choose.

Pure, in `src/lib/collection/arrivals.ts`, over the three inputs. Unit-tested directly.

### 2.2 `summary_payload` and idempotency

New jsonb column on `csv_uploads`. `confirmUpload` short-circuits on a row that already
carries `confirmed_at` and returns the stored summary — today it re-runs the whole replace, so
a double submit would overwrite the summary with an empty diff and destroy the decision
surface.

`ReplaceFlow` keeps navigating to `/collection` in this PR. The route ships in PR 3 and the
navigation flips there, or every confirmed upload hits a 404 for as long as PR 2 is deployed
alone.

### 2.3 The invalidation fix

`confirmUpload` revalidates `/collection`, `/`, `/commanders` and `/commanders/[slug]` and
drops `user-lists:<userId>`. It never revalidates `/decks`, `/decks/[id]` or
`/decks/[id]/changes`. The tag covers the cached payloads; the paths do not, so a back
navigation to a deck serves the pre-import render with its buy tags still on. A replace
changes every claim figure there is, so the confirm takes the claim surfaces, pattern form for
the dynamic segments. Standalone — nothing else in this PR depends on it.

## PR 3 — the summary and the chooser

Gated on the handoff, which is 🟢.

- `/collection/replace/summary/[uploadId]` — STATES table A, all 15 states. Three sections
  (`No longer to buy` / `Still to buy` / `Still short`), no prices and no totals anywhere,
  renders for an empty result, money sections frozen and truncating at four, contested section
  live and never truncating.
- `ContestedCardRow` — STATES table B, states 20–37 and 40–46. One component, no variant.
- `assignCopy` server action. Validates in its own transaction: the deck is this user's, its
  newest committed version claims the card, the card is not that deck's own commander, and
  there is supply left. Returns a **named** cause — `claimant-no-longer-asks`,
  `no-supply-left`, `target-is-commander` — plus the row's fresh state, in one round trip.
  `not-your-deck` falls back to the transport treatment and is not drawn. Picking the holding
  deck deletes the reservation. Revalidates `/decks/[id]` and `/decks/[id]/changes` in pattern
  form, because one reservation changes every claimant's figures.
- Assignment cleanup: the commit transaction that produces a version without the card deletes
  that deck's row for it.
- `IssueInspector` readable post-confirm, linked from the summary's issues line.
- `ReplaceFlow` navigates here.
- Copy from `card-assignments · copy strings.ts`, into `src/lib/copy/`.
- Contact sheet + a browser probe: the chooser's default, a pick, a cleared pick, a refusal,
  the inert commander row, the folded row, at 390 and 1300.

## PR 4 — the `/changes` door

- The chooser as a panel beneath the decklist row on `/decks/[id]/changes`, states 38–39.
  Row template unchanged, row does not grow.
- `review.lede` drops "except the pulls" — already wrong since Put back shipped (#593/#598),
  and the gives make it wrong by two.
- One new chip (`still short`) on the `/changes` strip.
- Measure the panel's real column before choosing the one-line or two-line option at desktop.
- Probe extension on `probe:review`, plus the contact-sheet row.

## Out of scope, deliberately

The deck-page door (ruling 1) · bulk allocation · windowing the contested section · any
surface showing a reservation at rest · a pick from the card detail modal · allocation
history · lifting the commander guard (#470) · serializing the import diff (spec `## Settled`)
· two players on one collection.
