# Plan: the Commander index fetches every legal partner pair

**Date:** 2026-09-25 · **Lane:** the-99-b1 · **Approved by Hugh on 2026-09-25**, with these
numbers in front of him (relayed by the orchestrator, the-99-d9): +1,750 requests (+57%, about
16 min), about 463k rows, about 860 pairs projected against 1 today, and Backgrounds and
Doctor's companions out of scope.

**Why:** Change commander (sub-project 7) ranks a pair
only when its `commander_pair_support` row is `ok` with at least `MIN_CANDIDATE_DECKS` (20)
decks. The index fetches pairs someone has **built**, so staging holds exactly one pair row
against 3,380 single commanders, and "Change pair" on a partner deck offers nothing.

## What was measured (2026-09-25)

**Legal pairs.** They are enumerated with the app's own rules (`canPair` over `partnerAbility`,
filtered by `isCommanderCandidate`), because a pair the app would refuse to build is one Change
commander can never offer. The count covers 129 commander-legal cards whose text carries a
partner ability (the same 129 on staging and local-dev). 119 of those are commander candidates,
and they form **1,717 legal pairs**:

| Kind | Cards | Pairs |
|---|---|---|
| `Partner` (generic) | 58 | 1,653 |
| `Partner with` (named) | 42 | 21 |
| Restricted (`Partner—Friends forever`, `—Character select`, `—Survivors`, `—Father & son`) | 19 | 43 |

`Choose a Background` and `Doctor's companion` are **not** pairs the app forms, because
`canPair` does not know them. They stay out of scope here: a pair the picker cannot build is not
a candidate to change to.

**What EDHREC serves.** A sample of 124 pairs, fetched with the real `fetchPair` at 400ms
spacing, covered every non-generic pair plus 60 generic pairs chosen by a seeded random draw:

| Kind | Sampled | Served (`ok`) | With 20 or more decks |
|---|---|---|---|
| Restricted | 43 | 43 | 42 |
| Named | 21 | 21 | 21 |
| Generic | 60 | 60 | 29 (48%) |

**124 of 124 served, in 125 requests.** Nearly every first-order slug hits directly. The run
saw no absent page and no degraded fetch. Projected across the population, that is about **860
pairs** clearing the 20-deck floor, up from **1**.

## The change

1. **Enumerate from the catalog.** `loadPairs` returns the union of every legal pair (above) and
   every pair present in `decks`, so a built pair outside today's `canPair` is never dropped.
   Pairs are deduplicated on the canonical key, as today.
2. **Resume skips pairs as well.** A pair whose `commander_pair_support.computed_at` is at or
   after `resume_since` is skipped, the same rule commanders follow. Without it every resumed
   run refetches all 1,717 pairs.
3. **Same walk, same limits.** The pairs are fetched serially after the commanders, with the
   same `delayMs` (250), inside the job's existing `max-parallel: 1` concurrency group. There is
   no second request stream.

## Request budget

- **Today:** about 3,000 commander requests per full run.
- **Added:** about 1,717 pair requests, plus about 1% for other-order redirects and a HEAD per
  missing page. None were seen in the sample. At 250ms spacing and about 300ms latency, that is
  **about 16 more minutes**, roughly +57% requests.
- **Storage:** about 270 support cards per pair, so about 463k rows in
  `commander_pair_support_cards`, against 892k for singles today.

## Refusal floors

1. **Enumeration floor, 1,500.** If fewer than 1,500 legal pairs are enumerated, the pair sweep
   does not run and the job exits non-zero. A broken partner parse or a short catalog read would
   otherwise shrink the sweep silently. The measured figure is 1,717, and the floor leaves room
   for a set rotating partners out.
2. **Pair degradation floor, 5%.** Mirroring the commanders' proportional guard: if more than 5%
   of *attempted* pairs (skipped ones excluded) come back degraded or failed, the job exits
   non-zero. The pair counters stay separate from the commander counters, as they are today.
3. **Unchanged:** a degraded pair writes nothing, so the previous row survives, and an absent
   pair writes its absent header.

## Out of scope

- Backgrounds and Doctor's companion, until `canPair` forms those pairs.
- Changing the 20-deck floor.
- Dispatching the workflow against production. Measurement and the probe run on staging and
  local-dev.

## Proof

`probe:pair-index` runs the real enumeration and the real pair pass against local-dev, with the
fetcher injected so no EDHREC traffic is made. It asserts:

- the enumeration yields at least 1,500 pairs and includes a named, a restricted and a generic
  pair;
- a resumed run skips a pair written after `since` and fetches one written before;
- a sweep whose enumeration comes back short refuses and writes nothing;
- the degradation floor trips at 6% and not at 4%.
