# eval:tuning-v2 — M1 results (2026-10-28)

Suggested changes v2 (prompt v11, the two-call engine `runV2`) run on three of Hugh's decks at N = 3, 10, 20, three reps
each, under the HARD $4 cap (`pnpm eval:tuning-v2 --spend`). Raw data: `rows.jsonl` (one row per run) and
`../ledger-tuning-v2.jsonl` (every call reserved and settled).

## Setup

- Database: Neon scratch branch `br-dawn-boat-a6z6w62j` (scratch-tuning-v2), confirmed by `neon.branch_id` before every
  write and by `connectScratch` at run time. Production, staging and local-dev were not written.
- Seed: a fresh `pull:staging` of account `user_3GkZ…` (staging, 21 decks, 3,510 collection rows) into the scratch
  branch. The scratch needed migrations 175 to 184 first. The pull does not copy `collection_history`, so one deck's
  `precon_add_entry_id` was nulled in a temporary, uncommitted copy of the script. The three decks (Mutant Menace 100
  cards, Goblins 99, Avatar Aang 99) were then re-owned to `user_eval_count_mechanism` with their per-deck user rows.
  The collection and uploads moved too, because the eval reads `owned` and the collection generation by user.
- Requests: one per deck, as `REQUESTS` in `scripts/eval/tuning-v2.mts`. Mutant Menace and Goblins have no logged games;
  Avatar Aang has one, a loss with a note.

## Completion and spend

- **23 of 27 runs completed.** The cap stopped the run before `HD-Avatar-Aang-10-r3`'s cut call ($3.745 spent, a $0.279
  worst case left). Not run: Avatar Aang N=10 r3 and all three N=20 r3. Its additions call was made and settled ($0.038)
  but no row was written.
- **Ledger total: $3.745** (47 calls, every reservation settled). That is an upper bound, not the bill. 7 calls had a
  malformed attempt (8 malformed attempts in all), and the eval settles those at their worst case: **$2.294 of the
  $3.745**. The 40 calls with no failed attempt metered **$1.45**. The true spend is between about $1.45 plus one real
  attempt per failed call and $3.745.
- The malformed attempts were mostly on Avatar Aang: additions at N=3 r2, N=10 r2, N=20 r1 and N=20 r2, and cuts at
  N=10 r1, where both attempts failed. The other two were Goblins N=3 r1 additions and Mutant Menace N=20 r1 cuts.
  Without them, a run costs about what the prototype measured.

## Per N

"Filled" means the list reached its target. The engine asks ceil(1.5N) and keeps every valid line up to the ask, so
kept counts above N are by design. The cut target is min(N, additions kept).

| | N=3 | N=10 | N=20 |
|---|---|---|---|
| Runs | 9 | 8 | 6 |
| Additions filled | 9/9 | 8/8 | 6/6 |
| Cuts filled | 9/9 | 7/8 (Aang r1: cut call malformed twice) | 6/6 |
| Additions kept | 3 to 5 | 11 to 15 | 20 to 30 |
| Cost a run, mean / max | $0.078 / $0.198 | $0.136 / $0.321 | $0.319 / $0.530 |
| Cost a run, min (no failed attempt) | $0.037 | $0.065 | $0.117 |
| Total latency p50 / p90 | 22.1s / 30.7s | 46.6s / 56.9s | 74.7s / 96.8s |
| Additions call p50 / p90 | 15.1s / 23.6s | 26.0s / 38.6s | 43.9s / 71.4s |
| Cut call p50 / p90 | 7.0s / 8.8s | 16.2s / 25.4s | 26.9s / 30.7s |
| Refills taken | 0 | 0 | 0 |
| Calls a run | 2 every run | 2 every run | 2 every run |
| Addition drops by rule | citation 4, quotedNote 2 | citation 11, denominator 3, noResultClaim 1 | citation 16, denominator 5, noResultClaim 1, colourIdentity 1, cardExists 1 |
| Cut drops by rule (app's rule, narrowed) | citation 6 | citation 5 | citation 9 |
| Charge outcome | spent 9 | spent 7, refunded 1 | spent 6 |
| Budget reached | 0 | 0 | 0 |

The worst-case settlements raise the means and maxima. Each max is a run with a malformed attempt.

**Caveat: time to first line is not measured.** The eval's transport waits for each reply to finish, then hands it to
the engine whole, so `firstLine` equals `listIn` here. The additions call time is the time to the WHOLE first list. M2
measures streaming and the time to the first line.

## Q9: `noResultClaim` on cuts, strict and narrowed

Every stored cut line (329 across 23 runs) was re-scored from the same replies under both variants (`--score`). Every
text was checked: the rationale, the short form and every citation, masked against the run's quotables.

- **Today's rule drops 12 cut lines; the narrowed rule (`allowStronger`) drops 0.** All 12 are dropped only for
  "stronger", and each one compares cards, not game outcomes. For example: "a stronger finisher serves the wide board
  better", "makes room for stronger counter or mutant cards", "It is replaceable by stronger bending cards", "With
  removal over target, it can be cut for a stronger option".
- **17 cut lines pass the narrowed rule and contain a game-result word.** None contains "stronger", so the strict rule
  passes all 17 as well. My read of each:
  - **15 use "win" for the deck's plan, not for a result:** "does not help a wide board win", "a narrow, unreliable way
    to win", "gives no new way to win beyond attacking", "does little to turn a wide board into a win". These are
    Goblins lines (14) and one Avatar Aang line, Water Whip: "The deck can lose it in favour of more reliable plays",
    where "lose" means "cut". They describe what a card does for the plan and claim nothing about results. Fine.
  - **2 cite the one logged game, a loss:** Avatar Aang N=3 r2, Brainstorm ("the player lost to a clunky opening"), and
    N=10 r2, Enlightened Tutor ("a deck whose game was lost to a stumbling start"). These are claims about a game result,
    but about a PAST, recorded one, and they match the note ("Had a hard time getting an opening hand with mana... I was
    out played"). The rule forbids PREDICTING a result ("would win", "win more", "lose less"), not reporting the record,
    so neither variant catches them, and neither should. Both are faithful to the record.
- **Verdict:** narrowing takes the cut drops from 12 to 0 on these replies and lets no predicted game-result claim
  through. The difference between the rules is exactly the 12 "stronger" lines, all card comparisons. Additions keep
  today's rule: their 2 `noResultClaim` drops are unaffected.

## Also noted

- Citations cause most drops on both sides: 31 of 45 addition drops and all 20 cut drops.
- No refill ran in 23 runs. Every run made exactly 2 calls: the ask's 1.5N headroom always covered the drops.
- Avatar Aang with N=3 kept exactly 3 every time. The other decks kept 5 of 5.
