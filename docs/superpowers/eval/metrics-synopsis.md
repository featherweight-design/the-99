# Automatic metrics: synopsis

Recomputed from 423 rows in 7 runs, one per set, cell, variant, deck and trial (12 later repeats set aside). Costs at real-time prices.

| set | cell | variant | n | all 4 pass | overview | primer | keyCards | weaknesses | malformed | upstream | outside names | in tok | out tok (p95) | latency p50/p90/max s | $/answer | $/accepted |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| dev | haiku@max8000 | base | 12 | 0% | 75% | 17% | 0% | 75% | 0% | 0% | 17% | 6138 | 1034 (1252) | 14/17/17 | $0.0113 | – |
| dev | haiku@max8000 | budgets | 12 | 0% | 50% | 17% | 0% | 58% | 0% | 0% | 33% | 6277 | 1004 (1137) | batch | $0.0113 | – |
| dev | haiku@max8000 | budgets-plus | 12 | 17% | 67% | 25% | 25% | 67% | 0% | 0% | 42% | 6418 | 924 (1181) | batch | $0.0110 | $0.0662 |
| dev | sonnet-low@max8000 | base | 12 | 0% | 67% | 17% | 8% | 58% | 0% | 0% | 0% | 8185 | 1479 (1619) | 18/19/19 | $0.0312 | – |
| dev | sonnet-low@max8000 | budgets | 12 | 0% | 83% | 8% | 75% | 83% | 0% | 0% | 0% | 8357 | 1468 (1569) | batch | $0.0314 | – |
| dev | sonnet-low@max8000 | budgets-plus | 12 | 17% | 67% | 25% | 83% | 83% | 0% | 0% | 0% | 8541 | 1510 (1761) | batch | $0.0322 | $0.1931 |
| dev | sonnet@max8000 | base | 12 | 8% | 42% | 33% | 17% | 33% | 25% | 0% | 0% | 8072 | 6453 (8000) | 72/74/74 | $0.1143 | $1.3714 |
| dev | sonnet@max8000 | budgets | 12 | 33% | 50% | 50% | 83% | 58% | 8% | 0% | 8% | 8265 | 6823 (8000) | batch | $0.1271 | $0.3814 |
| dev | sonnet@max8000 | budgets-plus | 12 | 17% | 50% | 42% | 67% | 75% | 25% | 0% | 0% | 8526 | 7279 (8000) | batch | $0.1497 | $0.8984 |
| heldOut | haiku@max8000 | base | 45 | 0% | 84% | 4% | 0% | 51% | 0% | 0% | 7% | 6608 | 1079 (1205) | batch | $0.0120 | – |
| heldOut | haiku@max8000 | budgets-plus | 45 | 0% | 73% | 11% | 4% | 76% | 0% | 0% | 20% | 6888 | 988 (1174) | batch | $0.0118 | – |
| heldOut | haiku@max8000 | trim | 45 | 0% | 80% | 9% | 0% | 60% | 0% | 0% | 9% | 5931 | 1027 (1143) | batch | $0.0111 | – |
| heldOut | sonnet-low@max8000 | base | 45 | 0% | 62% | 31% | 22% | 76% | 0% | 0% | 0% | 8746 | 1489 (1585) | batch | $0.0324 | – |
| heldOut | sonnet-low@max8000 | budgets-plus | 45 | 11% | 73% | 24% | 62% | 82% | 0% | 0% | 0% | 9102 | 1481 (1599) | batch | $0.0330 | $0.2971 |
| heldOut | sonnet-low@max8000 | trim | 45 | 4% | 60% | 29% | 27% | 76% | 0% | 0% | 2% | 7868 | 1491 (1635) | batch | $0.0313 | $0.7048 |
| heldOut | sonnet@max8000 | base | 45 | 2% | 33% | 24% | 13% | 56% | 33% | 0% | 2% | 8708 | 6896 (8000) | batch | $0.1363 | $6.1324 |

## Refusals by section, and the budgeted lines

- **dev / haiku@max8000 / base**: refusals keyCards:over_budget 12, primer:over_budget 6, primer:uncomputed_figure 2, overview:unknown_card 2, primer:strength_claim 2, weaknesses:over_budget 2, overview:strength_claim 1, weaknesses:strength_claim 1. Key-card job line: median 80, p90 98, 83 of 94 over 60. Mulligan line: median 72, 12 of 51 over 80.
- **dev / haiku@max8000 / budgets**: refusals keyCards:over_budget 10, primer:over_budget 7, weaknesses:unknown_card 3, overview:unknown_card 2, overview:strength_claim 2, primer:strength_claim 2, overview:unmarked_card 2, weaknesses:over_budget 1, keyCards:job_unsupported 1, primer:uncomputed_figure 1, keyCards:unknown_card 1, weaknesses:strength_claim 1. Key-card job line: median 65, p90 78, 57 of 94 over 60. Mulligan line: median 75, 19 of 51 over 80.
- **dev / haiku@max8000 / budgets-plus**: refusals primer:tip_not_in_deck 5, keyCards:over_budget 5, weaknesses:unknown_card 4, primer:over_budget 4, keyCards:job_unsupported 3, overview:strength_claim 2, keyCards:unknown_card 1, overview:unknown_card 1, overview:unmarked_card 1. Key-card job line: median 50, p90 60, 9 of 94 over 60. Mulligan line: median 65, 4 of 50 over 80.
- **dev / sonnet-low@max8000 / base**: refusals keyCards:over_budget 11, primer:over_budget 4, weaknesses:strength_claim 4, primer:uncomputed_figure 4, overview:unmarked_card 3, primer:strength_claim 2, weaknesses:unmarked_card 1, overview:over_budget 1. Key-card job line: median 54, p90 67, 25 of 96 over 60. Mulligan line: median 67, 8 of 71 over 80.
- **dev / sonnet-low@max8000 / budgets**: refusals primer:uncomputed_figure 6, primer:strength_claim 5, overview:over_budget 2, weaknesses:unmarked_card 2, keyCards:over_budget 1, keyCards:partial_sentence 1, keyCards:job_unsupported 1. Key-card job line: median 48, p90 56, 2 of 96 over 60. Mulligan line: median 62, 2 of 70 over 80.
- **dev / sonnet-low@max8000 / budgets-plus**: refusals primer:strength_claim 4, primer:uncomputed_figure 4, overview:over_budget 3, weaknesses:unmarked_card 2, keyCards:over_budget 2, overview:strength_claim 1, primer:over_budget 1. Key-card job line: median 45, p90 54, 2 of 96 over 60. Mulligan line: median 63, 2 of 72 over 80.
- **dev / sonnet@max8000 / base**: refusals keyCards:over_budget 7, overview:unmarked_card 4, weaknesses:unmarked_card 3, primer:over_budget 2, weaknesses:strength_claim 2, primer:unmarked_card 1, primer:uncomputed_figure 1, primer:strength_claim 1. Key-card job line: median 56, p90 69, 18 of 72 over 60. Mulligan line: median 65, 4 of 42 over 80.
- **dev / sonnet@max8000 / budgets**: refusals overview:unmarked_card 4, weaknesses:unmarked_card 4, primer:unmarked_card 3, overview:over_budget 1, keyCards:unknown_card 1, primer:over_budget 1, primer:uncomputed_figure 1. Key-card job line: median 46, p90 53, 0 of 87 over 60. Mulligan line: median 69, 1 of 44 over 80.
- **dev / sonnet@max8000 / budgets-plus**: refusals overview:unmarked_card 2, primer:tip_not_in_deck 1, keyCards:over_budget 1, primer:strength_claim 1, primer:uncomputed_figure 1, primer:over_budget 1, overview:over_budget 1. Key-card job line: median 42, p90 49, 1 of 70 over 60. Mulligan line: median 64, 4 of 38 over 80.
- **heldOut / haiku@max8000 / base**: refusals keyCards:over_budget 45, primer:over_budget 32, weaknesses:over_budget 15, weaknesses:strength_claim 6, primer:uncomputed_figure 4, primer:tip_not_in_deck 3, overview:unknown_card 2, overview:unmarked_card 2, primer:unmarked_card 2, overview:strength_claim 2, overview:over_budget 1, weaknesses:unknown_card 1, primer:wrong_count 1, primer:strength_claim 1. Key-card job line: median 81, p90 103, 327 of 356 over 60. Mulligan line: median 71, 52 of 185 over 80.
- **heldOut / haiku@max8000 / budgets-plus**: refusals keyCards:over_budget 29, primer:over_budget 27, primer:tip_not_in_deck 9, keyCards:job_unsupported 8, weaknesses:over_budget 8, keyCards:unknown_card 6, overview:strength_claim 4, overview:unknown_card 4, overview:unmarked_card 4, primer:strength_claim 3, weaknesses:strength_claim 3, primer:uncomputed_figure 1. Key-card job line: median 55, p90 67, 99 of 353 over 60. Mulligan line: median 71, 35 of 185 over 80.
- **heldOut / haiku@max8000 / trim**: refusals keyCards:over_budget 45, primer:over_budget 31, weaknesses:over_budget 11, weaknesses:strength_claim 5, overview:strength_claim 4, overview:unknown_card 3, primer:tip_not_in_deck 3, primer:strength_claim 3, primer:uncomputed_figure 2, weaknesses:unknown_card 2, overview:unmarked_card 1, primer:unmarked_card 1, primer:wrong_count 1, overview:over_budget 1. Key-card job line: median 74, p90 95, 293 of 355 over 60. Mulligan line: median 68, 40 of 189 over 80.
- **heldOut / sonnet-low@max8000 / base**: refusals keyCards:over_budget 34, overview:unmarked_card 14, primer:strength_claim 14, weaknesses:unmarked_card 9, primer:over_budget 8, primer:uncomputed_figure 6, primer:unmarked_card 3, overview:over_budget 3, weaknesses:over_budget 1, weaknesses:strength_claim 1, keyCards:partial_sentence 1. Key-card job line: median 55, p90 66, 92 of 359 over 60. Mulligan line: median 65, 11 of 268 over 80.
- **heldOut / sonnet-low@max8000 / budgets-plus**: refusals primer:strength_claim 17, primer:uncomputed_figure 10, keyCards:over_budget 6, keyCards:job_unsupported 6, overview:over_budget 6, overview:unmarked_card 6, keyCards:partial_sentence 5, weaknesses:unmarked_card 4, primer:over_budget 4, weaknesses:strength_claim 3, primer:unmarked_card 2, primer:tip_not_in_deck 1, weaknesses:wrong_count 1. Key-card job line: median 47, p90 55, 15 of 357 over 60. Mulligan line: median 65, 8 of 270 over 80.
- **heldOut / sonnet-low@max8000 / trim**: refusals keyCards:over_budget 31, primer:over_budget 11, overview:unmarked_card 11, weaknesses:unmarked_card 8, primer:uncomputed_figure 8, primer:unmarked_card 7, overview:over_budget 6, primer:strength_claim 6, weaknesses:strength_claim 2, keyCards:job_unsupported 1, overview:unknown_card 1, keyCards:wrong_count 1, weaknesses:partial_sentence 1. Key-card job line: median 54, p90 65, 76 of 353 over 60. Mulligan line: median 63, 17 of 267 over 80.
- **heldOut / sonnet@max8000 / base**: refusals keyCards:over_budget 22, overview:unmarked_card 11, primer:over_budget 10, primer:unmarked_card 7, weaknesses:unmarked_card 4, overview:over_budget 4, primer:strength_claim 2, keyCards:job_unsupported 1, weaknesses:over_budget 1, keyCards:unknown_card 1. Key-card job line: median 56, p90 70, 87 of 236 over 60. Mulligan line: median 70, 17 of 137 over 80.

## The decision rule

Baseline S = `sonnet@max8000 / base`: held-out all four 2%, $6.1324 per accepted answer.

| candidate | cheaper | all four ≥ S−10 | every section ≥ S−5 | malformed ≤ 5% | outside ≤ S+5 | eligible |
|---|---|---|---|---|---|---|
| `haiku@max8000 / base` (no accepted answer) | **no** | yes | **no** | yes | yes | no |
| `haiku@max8000 / budgets-plus` (no accepted answer) | **no** | yes | **no** | yes | **no** | no |
| `haiku@max8000 / trim` (no accepted answer) | **no** | yes | **no** | yes | **no** | no |
| `sonnet-low@max8000 / base` (no accepted answer) | **no** | yes | yes | yes | yes | no |
| `sonnet-low@max8000 / budgets-plus` ($0.2971) | yes | yes | yes | yes | yes | **eligible** |
| `sonnet-low@max8000 / trim` ($0.7048) | yes | yes | yes | yes | yes | **eligible** |
