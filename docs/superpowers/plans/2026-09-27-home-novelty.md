# Home novelty: Ready to build stops re-showing the same few

Lane `home-novelty` (the-99-d8), orchestrator the-99-d9. Hugh, 2026-09-27: "I've seen the same few
rotate in and out over the last couple of weeks." Ruling: rotate for novelty, engineering only, no
new section and no layout change. Plan approval delegated to d9.

## What Home does today

Home's Ready to build draws two commanders a day (`READY_SHOWN`) out of the top nine by rank
(`READY_COUNT`), walking a per-account shuffle of those nine one pair per UTC day (`daily-pick.ts`,
#697). The rotation is correct as far as it goes; the complaint is its depth. Nine commanders at two
a day is a full tour every 4.5 days, so over two weeks the reader sees the same nine three or four
times each. Nothing on Home reads novelty (`byNovelty` serves `/discover` and `/commanders` only).

## Measurement (staging, Hugh's account, read-only)

Hugh's ranked list on staging holds 230 unbuilt commanders. The scores are flat at the top: rank 1
is 76, rank 9 is 71, rank 28 is 66, rank 100 is 60. So a deeper pool costs almost nothing in fit.

14 simulated days, from 2026-09-27, through the shipped `readySlice`:

| | Distinct commanders shown | Times each is shown |
|---|---|---|
| Before (top 9) | **9** | 3 or 4 (abuelo-ancestral-echo 4, the other eight 3) |
| After (top 28, below) | **28** | exactly 1 |

`scripts/measure-home-rotation.mts` will reproduce both rows read-only against any database and any
account, and the PR carries its output.

## The change

1. **A two-week pool.** The ready set becomes the top 28 by rank, which is two cards a day for 14
   days (`READY_COUNT = READY_SHOWN * 14`). The walk is unchanged in kind: a cycle, so no commander
   repeats inside a tour and consecutive days never share one. The set is still a RANK cut, never a
   score cut (plan ruling 1 in `ready-to-build.ts` stands), and an account with fewer than 28
   ranked commanders walks what it has, exactly as today.
2. **Leaning on Something new.** The cycle's order becomes novelty-first rather than a pure shuffle.
   The pool is sorted by how many of each commander's themes the reader has not played (the measure
   `/discover`'s Something new ranks on), ties kept in the per-account shuffle, and the newer half
   is interleaved with the rest, so the unchanged `(day * count + i)` walk draws one card from each
   half every day. A pool with no novelty to lean on walks the plain shuffle exactly. That keeps
   #697's point, which was not to put the two weakest cards together, and applies it with novelty
   instead of rank; the shuffle breaking ties means two readers do not see the same pair.
3. **The line beside it stays true.** `N more scored X or better` keeps reading the set:
   `26 more scored 66 or better` on Hugh's account today. That is still copy and still one line, so
   there is no layout change.

## Performance (fa is optimizing Home in parallel)

**No new serial round trip.** Novelty needs two facts: the tags the reader has played, and the tags
of the pool's commanders. One new query gets both. It returns the unplayed-theme count for the
account's top 40 unbuilt scored commanders, computed in SQL. It depends on nothing
`getRankedList` returns, so it joins the existing `Promise.all([lastUpdated, ranked, shopping])` in
`src/app/page.tsx` as a fourth entry. Measured on staging: **4.0ms** execution, with 40 small
integers returned rather than 58kB of tags. A commander the query did not cover counts as 0
unplayed, so the rotation never waits on it and never fails on it. It is also fail-soft: a failed
read degrades to today's shuffle, as the availability read degrades on this page.

## PR boundary

One PR, about 8 files:
- `src/lib/recs/ready-to-build.ts` and its test (the 28, and the novelty-ordered walk)
- `src/lib/recs/daily-pick.ts` and its test (the walk takes an order)
- `src/lib/recs/home-novelty.ts` and its test (the one query, `.toSQL()`-pinned, aliased and
  qualified per AGENTS.md)
- `src/app/page.tsx` (one entry in the existing `Promise.all`, and the argument to `readySlice`)
- `scripts/measure-home-rotation.mts` (read-only)
- `src/lib/copy/about.ts` and `about.version.json`: the Ready to build entry states "top nine" and
  "all nine within five days", which becomes false. This is an ordinary edit to the existing entry
  with the hash re-pinned. It is not a new entry and not a bump, because nothing new can be done.

## Proof

- Unit tests: 28 distinct over 14 days at size ≥ 28; the old guarantees at every size below it
  (no repeat across consecutive days from size 4 up); exactly one card from the newer half every
  day; a missing or empty novelty map walks the shuffle exactly.
- `measure-home-rotation.mts` output before and after, in the PR.
- The query: `.toSQL()` test plus `EXPLAIN ANALYZE` on staging, in the PR.
- A mutation per rule: pool back to 9, novelty order removed, the interleave removed, and the
  partner dropped from the played themes. The `page.tsx` wiring is one argument and is held by the
  type checker; a runtime read through the app's own `db` client returned 40 counts on local-dev.

## Not in scope

No shown-history table: a deterministic daily cycle needs no writes, and a write per Home render
would be a round trip. No change to the ranking itself, to `/discover`, or to `/commanders`.
