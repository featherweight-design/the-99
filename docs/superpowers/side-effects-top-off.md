# Side-effect provenance — top off the last 31 (#360)

Gate 6. The fill-pass ledger's core is a record created by *something else happening* — a
deck being built, or later topped off. Nothing renders it in this PR, so no amount of
clicking through a page proves it fired, fired once, and belongs to the right deck. Every
claim below was produced by running the thing, not by reading it.

Probe: `scripts/probe-seed-pass.mjs` (Playwright + a direct read of the ledger tables).
Run against local dev on the `local-dev` Neon branch, 2026-09-08, after `pnpm db:migrate`
applied `0020_tidy_rocket_raccoon`.

## Trigger — building a deck records a seed pass

| Question | Answer | How it was proven |
|---|---|---|
| Fires | Yes | Two decks built through `/decks/new`. Each came back with exactly one `fill_passes` row, `kind = 'seed'`, `ordinal = 1`, `open_slots = 99`. |
| Membership is the rows actually placed | Yes | Each deck held 44 cards and its pass held 44 members, and a join found **0** members whose oracle id is absent from that deck's `deck_cards`. |
| Fires once | Yes | One pass per deck after a full build. The database refuses a second: a hand-inserted duplicate `(deck, 'seed', 1)` was rejected by `fill_passes_deck_kind_ordinal_key`. |
| Fires for the right deck | Yes | Two decks built back to back in one session; the passes and their members partitioned cleanly by `deck_id`, with no cross-deck member. |
| Kind is closed | Yes | An inserted `kind = 'reshuffle'` was rejected by `fill_passes_kind_check`. |

**Idempotency key.** None is needed at the application layer, because the ordinal is
allocated as `max(ordinal) + 1` scoped to `(deck, kind)` under the deck row lock every
caller already takes, and `unique(deck_id, kind, ordinal)` is the backstop if that lock is
ever lost. A concurrent second build of the same deck fails the insert rather than writing a
second seed.

**The retry trigger** — `fillDeck`, the action that runs when a deck was created but its
fill failed — is covered by unit tests rather than the probe, because forcing a failed fill
through the browser means breaking the catalog mid-request. `src/app/decks/actions.test.ts`
proves three things about it: a retry that places rows records a seed pass; a retry that
meets a deck already holding cards records **no** second pass; and a fill that placed
nothing records no pass at all (`recordFillPass` returns null and writes nothing on an empty
row set).

## Lifecycle

**What marks a pass handled.** Nothing. The membership record is immutable — no code path in
this feature or any later one updates or deletes a `fill_passes` or `fill_pass_cards` row.
`live` / `kept` / `removed since` are derived at read time by joining the record against
`deck_cards` as it stands now, which is why a player keeping a card needs no write to the
pass, and why the sweep needs no write either.

This matters for a specific misreading. The STATES doc says the sweep "removes every pass",
and a builder could take that literally and write a delete. That would break
`restoreAutoCards`, which re-inserts swept rows with `auto: true` — the passes those rows
belong to must still exist for the ledger to reappear alongside them. What the sweep removes
is every *auto row*, and the ledger disappears as a consequence: a pass with no live cards
renders no line.

**Old records.** No pruning. A pass row is small, is bounded by how many times a player fills
one deck, and is the only thing that keeps an ordinal from being handed out twice — an undone
pass keeps its row precisely so `top-off 3` cannot be reused as a name. Deleting a deck takes
its passes and their members with it: proven by deleting a probe deck and finding its 44
member rows and its pass gone (`on delete cascade` on `fill_passes.deck_id`, and on
`fill_pass_cards.pass_id`).

**A second device** sees the same ledger, because it is derived from the database on every
read and held nowhere else — no client state, no localStorage key.

**Before any trigger has fired** the reader is a deck with no passes. Two populations sit
here and they render differently, which is the state coverage PR 4 has to honour:

- A deck built before this migration has auto rows and zero passes. It renders the legacy
  provenance line, not a ledger — the invariant is scoped to decks with at least one pass row,
  and holds vacuously for these.
- A deck with no auto rows at all renders nothing, which is what it already does.

## Not in scope for this PR

`commitTopOff` and `undoFillPass` (PR 2) add a second trigger and the only path that removes
cards a pass placed. They get their own rows in this table when they land.
