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
primary key (user_id, oracle_id, deck_id)
index (user_id, oracle_id)
```

The natural key IS the primary key — a surrogate id would buy nothing and allow a second row
for a pair the model treats as one reservation. `copies > 0` at the database boundary: a zero
or negative row inverts the supply arithmetic durably, and no caller-side guard survives a
future caller. The `user_id`/`deck_id` pair is validated by the write (PR 3), not by a
constraint: the deck's owner lives on `decks`, and a composite FK would need `decks` keyed on
`(id, user_id)`.

### 1.2 Reservations, and a ceiling — not a promotion

The design spec says commander copies come "off the top", ahead of reservations. Taken
literally that promotes every commander claim ahead of the seniority queue **unconditionally**,
which moves live figures with zero assignment rows in the table: a deck holding a card as its
commander with a later `commander_since` than another deck's list claim would take the copy it
loses today. That is a behaviour change nobody asked for, it lands on the deck page marker, the
Shopping filter, `shopping-rollup` and Home's commitments, and it would make PR 1 un-shippable
as an inert change.

What the spec actually needs is narrower: **an assignment must never consume a copy a commander
claim needs.** So commander copies set a *ceiling on what may be reserved* and are otherwise
left exactly where they are in the seniority queue:

```
reservable(oracle)      = greatest(owned − commander_copies_committed, 0)
granted(oracle, deck)   = least(copies,
                                ask − own_commander_copies,
                                greatest(reservable − granted_prior, 0))
remainder(oracle)       = greatest(owned − granted_total, 0)
```

- `commander_copies_committed` sums the two commander arms of `all_claims` **restricted to
  decks with a version**. `all_claims` also has three brew arms, two of them commander arms, and
  summing those would hand a brew a hard pre-seniority claim — an inversion of the one rule the
  whole model rests on.
- `ask − own_commander_copies`, not `ask`: a deck holding the card as commander *and* as a list
  card folds to one claim of quantity 2, and only the list copy is reservable. Without the
  subtraction a reservation of 2 grants 2 on top of the commander's 1.
- `granted_prior` is a running total over `(created_at, deck_id)` **partitioned by
  `oracle_id`**, framed `rows between unbounded preceding and 1 preceding`. All three clauses
  are load-bearing: the default frame includes the current row, so a lone reservation of 1
  against 1 copy would grant itself nothing; without the partition one card's reservations eat
  another's supply; and the total runs over the *capped* `least(copies, ask − own_commander)`
  rather than raw `copies`, or a reservation asking for more than its deck wants would consume
  supply it was never granted.

With no rows in `card_assignments`, `granted_total` is 0, `remainder` is `owned`, and every
figure below is what it is today. PR 1 is genuinely inert.

### 1.3 Four read sites, not three

The subtraction that decides a vantage deck's shortfall decomposes into three terms, each with
its own cap. Writing it as one term is why the naive version cannot change an allocation at
all: a reservation to deck B leaves B's senior claimant still counted against B at the old cap,
so B reads short on the copy it just won.

```
free_B = owned
       − own_claim_B
       − reserved_others                                  -- uncapped
       − least(seniors_ahead_unreserved, remainder)        -- remainder, NOT owned
```

Worked, on the feature's headline case — one copy owned, senior deck A unreserved, vantage deck
B holding the reservation: `reserved_others = 0`, `remainder = 0`, so the senior term is 0 and
`free_B = 1 − 1 − 0 − 0 = 0` — B is covered. From A's vantage `reserved_others = 1` and
`free_A = 1 − 1 − 1 − 0 = −1` — A must buy one. Both correct, and both wrong under the
single-term form.

There is deliberately **no global commander term** in `free`. `own_claims` already subtracts the
vantage deck's own commander, so a global term would subtract it twice and make `free` one low
on every deck's own commander, always; and in `loadDeckBuyRows` it would start billing every
deck for its own commander, which the #470 limitation exists to prevent. Commanders bound the
reservable ceiling in 1.2 and appear nowhere else.

Four sites change together:

| Site | Change |
|---|---|
| `senior_hard` | Sums the **unreserved** part of each senior claim |
| the `senior` flag in `claims` | Same predicate, so a junior claim still draws no pull |
| `free`'s subtraction (`availability-query.ts` outer select) | The three-term form above |
| `supply.senior` + the deficit in `loadDeckBuyRows` | The same three terms, `senior` already excluding the deck itself |

The reservation CTEs are vantage-independent, so they live in `claimModel` after `owned` and
both outer queries splice them unchanged. The vantage deck's **own** reservation is excluded
downstream the way `claim_decks` already excludes its own claim.

### 1.4 `DeckClaim` gains three fields

| Field | Why | Shape |
|---|---|---|
| `since` | The chooser's options sit in commit order and each carries a `v7 · 2 Aug` stamp. `min(ac.since)` is already computed and dropped before `jsonb_build_object`. | **Epoch millis**, not the raw timestamp. `since` is `timestamp` without time zone, so `jsonb_build_object` renders `2026-08-02T12:00:00` with no `Z` and `new Date()` reads it as local — a trap this repo has already shipped once. |
| `versionNumber` | The `v7` half of the same stamp. | `newest_version` does not project `v.number` today: add it there, and add `nv.number` to `claim_decks_all`'s `group by`. One `newest_version` row per deck, so the aggregate does not fan out. |
| `commanderCopies` | A folded commander-plus-list claim is one row with `bool_or`, so state 34 — commander half inert, spare copies pickable — is undrawable from a boolean. `commander` stays, as `commanderCopies > 0`. | |

All three are **optional in the type**, documented as always emitted by the query. 19 test files
construct `DeckClaim` literals; making them required would put a mechanical edit to all 19 in
this PR and push it past the size gate for nothing.

**The consumer re-sorts.** `claims` is aggregated `order by cd.name, cd.deck_id`, and the
chooser needs commit order — the row builder in PR 3 sorts on `(since, deck_id)`, and that is
the only place the order is decided.

### 1.5 Probe cases — `pnpm probe:claims`

Each is run against the unfixed build before being believed:

- a reservation beats an earlier `since`
- a reservation is capped at the deck's own committed ask
- a reservation is capped at the supply left after an earlier reservation: two decks each
  assigned one copy of a single-copy card resolve to the earlier assignment, and the remainder
  never goes negative
- two copies, two assignments, both honoured
- no shortage, with a LIVE reservation: no deck buys anything. Purchases, not every
  figure — `free` is a surplus and a reserved copy is not this deck's spare, so a covered
  deck's `free` does move from 1 to 0, which the case asserts rather than avoids
- **with no rows in the table at all, every figure equals the pre-change answer** — the claim
  that PR 1 is inert, measured rather than asserted
- a commander claim is not displaced **in the arithmetic**, with one copy owned
- the folded commander-plus-list-copy case: `commanderCopies` is 1 while `quantity` is 2, and
  only the list copy is reservable
- a reservation for a card the deck no longer asks for reserves nothing
- a reservation naming a brew reserves nothing (the spec's "hard claimants only")
- a reservation naming a card the deck holds only as a **draft add** reserves nothing
- `since` and `versionNumber` come back on every mature claim and are null on a brew's
- the row vanishes when its deck is deleted — **last**, since it deletes a deck the earlier
  steps depend on

The existing fixture deliberately picks three *distinct* oracle ids and warns that a commander
which is also the contested card breaks every figure. The two commander cases need exactly that
overlap, so they go in a second section with its own `user_id` and its own decks rather than
being appended to the first.

**On the Drizzle qualification rule:** it does not bite here, and the reason is worth stating
rather than leaving a spec requirement unanswered. `claimModel` and both outer queries are raw
`sql` templates with bare table names and no `${table.column}` interpolation, so nothing can
render unqualified — and equally there is no query-builder surface for a `.toSQL()` assertion to
read. Any new SQL added here follows the same rule: bare names, aliased inner tables.

### 1.6 Also in this PR

- The handoff drop `design/design_handoff_the99_card_assignments` is currently **untracked** in
  the main checkout. PR 1 commits it (the main → worktree → PR rule) and amends its
  `READINESS.md` from 🟠 to 🟢, recording the two rulings. PR 3's gate is satisfied only once
  this merges.
- The spec gains the two rulings, the ceiling-not-promotion correction, and the readiness
  errata.

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

- **The upload's own problems.** `preview_payload.unmatched` and `parseErrors`. STATES 1c
  needs a third reason clause — `name didn't match`, in `--warning` — and READINESS ratifies it:
  a card whose CSV line failed is one the player already owns, so the remedy is *fix the file*,
  not *buy it*. An unmatched row carries no `oracle_id` (that is what unmatched means), so the
  link is by **normalised name**, using `match.ts`'s own `normalizeName`, against the card name
  on the still-owed row. No match, no clause — the counts line (1d) carries it instead.

Pure, in `src/lib/collection/arrivals.ts`, over the four inputs. Unit-tested directly.

The money sections are frozen into the payload, so a fourth input added later would need a
payload migration. That is why the preview payload is read here rather than in PR 3.

### 2.2 `summary_payload` and idempotency

New jsonb column on `csv_uploads`. `confirmUpload` short-circuits on a row that already
carries `confirmed_at` and returns the stored summary — today it re-runs the whole replace, so
a double submit would overwrite the summary with an empty diff and destroy the decision
surface.

**A read-then-check does not close that race**, and the fix belongs in `import.ts`, where
`confirmed_at` is stamped: `update csv_uploads set confirmed_at = now() where id = ? and
confirmed_at is null returning id`, aborting the transaction when it returns no row. Two
concurrent confirms otherwise both read null and both replace.

**The summary is written in the same transaction as that stamp.** Written after it, a crash
between the two leaves `confirmed_at` set and the payload null, and the short-circuit then
returns nothing forever — state 6 permanently, for a real import that moved real cards.

`ReplaceFlow` keeps navigating to `/collection` in this PR. The route ships in PR 3 and the
navigation flips there, or every confirmed upload hits a 404 for as long as PR 2 is deployed
alone.

### 2.3 Cost

Two user-wide `loadDeckBuyRows` and one `loadAvailability` join a confirm path that already runs
a full `recommendCommanders` in an `after()`. The two diff reads are inside the request; the warm
is not. If the route's duration becomes a problem the warm is what moves, not the diff — the
diff is the payload's only source.

### 2.4 The invalidation fix

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
  `not-your-deck` falls back to the transport treatment and is not drawn.

  Three write rules, not one: picking a deck with **no** reservation writes a row; picking the
  deck **you already reserved for** deletes it; picking a third deck when the cap is already
  spent **moves** the reservation. With more than one copy arrived the pick **adds** up to the
  cap rather than moving — state 21's `2 of 2 given` is only reachable that way. The cap the row
  *states* is the arrivals figure it was built from; the cap the write *enforces* is the
  reservable ceiling from 1.2, and where the two disagree the write refuses with
  `no-supply-left`, which is drawn. Revalidates `/decks/[id]` and `/decks/[id]/changes` in pattern
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
