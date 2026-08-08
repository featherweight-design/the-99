# Gate 1 — state reachability, Add panel addendum (#176)

Run 2026-08-08, before PR 5's build, against the local dev database.

Gate 1 exists because of #1169: a component that renders correctly when handed the right props,
inside an app that never hands it those props. The type compiled, the route computed the field,
and the state was still unreachable at runtime. So each state gets all three questions, and the
third is answered by running the code rather than reading it.

## The state under test

`suggestion.owned === false` — the unowned EDHREC staple. PR 5 gives it a `buy` tag, a secondary
Add and a trailing shelf. Every one of those is dead pixels if the branch cannot be entered.

| # | Question | Answer |
|---|---|---|
| 1 | **Type** — is the field on the response type? | ✅ `DeckSuggestion.owned: boolean`, set explicitly at `src/app/decks/actions.ts:158`. |
| 2 | **Route** — does the route compute it, or is it a `= null` stub? | ✅ `actions.ts:105-170` runs a real catalog query, a real three-way filter and a real EDHREC-rank sort, then `eligible.slice(0, 5)` merges at `:173`. No stub. |
| 3 | **Runtime** — can the condition ever be true, given how this is actually mounted and seeded? | ✅ Proven by probe, below. |

Question 3 is the one that matters here, because the branch is guarded four deep: EDHREC has to
return `topCards`, the catalog has to hold a name match, that card has to be colour-legal for the
commander, and the user has to not already own it or have it in the deck. Any of the four zeroing
out produces an empty append and a feature nobody can see.

## The probe

`scripts/probe-unowned.ts`, hand-run and committed — the same convention as `scripts/probe-bob.mjs`
and `scripts/probe-bottom.mjs`, which stay out of `pnpm test` because they need a real database.
It replays the route's exact query and filter for every deck in the database and prints the count
at each stage that can zero out.

```
DATABASE_URL=... pnpm tsx scripts/probe-unowned.ts
```

Result, 12 decks, two commanders:

| Commander | EDHREC | Catalog matches | Owned | In deck | Unowned suggestions |
|---|---|---|---|---|---|
| Akawalli, the Seething Tower | 253 topCards | 100 | 2472 | 0–3 | **5** |
| Greta, Sweettooth Scourge | 247 topCards | 97 | 40 | 0 | **5** |

**Reachable, ✅.** The append hits its cap of 5 on every deck in the database, and it does so at
both ends of the collection-size range — a 2472-card collection and a 40-card one. That the large
collection still yields five is the useful half of the result: owning a lot of Magic cards does not
starve the branch, because EDHREC's staples for a commander are not what a given player happens to
have.

## What the probe does not prove

- **The empty case is untested here**, because no deck in this database produces it. A commander
  EDHREC does not index returns `topCards === null` and the whole block is skipped, and PR 5's
  trailing shelf must not render on that path. That is a forced state for Gate 2, not something
  this probe can show, and PR 5's tests cover it directly: the shelf appears only when the append
  produced something.
- **Ordering is asserted but not measured.** The probe counts; it does not check that the five
  arrive in EDHREC rank order.
- **`degraded` is a separate axis.** `unreachable` (a real EDHREC outage) and a 4xx miss both
  produce no staples, but only the first flags the panel. Untouched by PR 5.

## Verdict

✅ on all three questions. PR 5's build may start.
