# The overview under four contracts, after #913

Every stored overview answer, re-validated against facts rebuilt read-only from staging with the
`factsFor` that #913 shipped (contract v2). Only `sendBack`, `commanderManaValues` and `figures`
moved, on every deck, so the staging decks are unchanged since the runs. No model call was made
for this table. It is produced by `pnpm eval:rescore-lines --fresh-facts`.

## sonnet-low + budgets-plus, held-out, all four contracts

From `pnpm eval:repair --fresh-facts` (one repair call per answer with a refused section, sent
under contract v2), and reproduced exactly by its no-call `--rescore` mode. All four sections
render, and $ per accepted answer at real-time prices, with any repair call included:

| contract | all four | $/accepted |
|---|---|---|
| shipped | 18% (8 of 45) | $0.1857 |
| (A) drop the line, Design minimums | 58% (26 of 45) | $0.0571 |
| (B) one repair call | 62% (28 of 45) | $0.1008 |
| (A+B) | 96% (43 of 45) | $0.0510 |

A+B is DERIVED from the same repair run rather than sent a second time. A section passes when the
drop-line rule passes it on the first answer, or when it was repaired and passes on the repair,
and a repair is charged only to the 19 answers the drop-line rule still fails. That leans
slightly in A+B's favour: B's repair asked for every section the SHIPPED rule refused, while a
true A+B repair would ask only for the sections the drop-line rule refused, so its prompts would
be slightly narrower.

B adds a second sequential call, about 18 s p50 for sonnet-low, on the answers that need one.

The `trim` rows below were scored at settle under v2. They were sent under v1, like every other
first write here.


A what-if, measured on the stored answers, re-validated against facts rebuilt with the current `factsFor`. The line checks agree with `validateSynopsis` on every stored answer under the shipped rule (the self-test above passed). "Figure" counts primer sections refused for `uncomputed_figure`, then the mulligan lines naming a figure the facts do not carry.

| set | cell | variant | rule | n | all 4 render | overview | primer | keyCards | weaknesses | $/answer | $/all-4 answer | figure refusals / lines |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| dev | haiku@max8000 | base | shipped | 12 | 0% | 75% | 17% | 0% | 75% | $0.0113 | – | 0 / 0 |
| dev | haiku@max8000 | base | drop line, Design minimums | 12 | 0% | 75% | 42% | 0% | 92% | $0.0113 | – |  |
| dev | haiku@max8000 | base | drop line, minimum 2 | 12 | 8% | 75% | 42% | 8% | 92% | $0.0113 | $0.1357 |  |
| dev | haiku@max8000 | base | drop line, minimum 3 | 12 | 0% | 75% | 0% | 8% | 75% | $0.0113 | – |  |
| dev | haiku@max8000 | budgets | shipped | 12 | 0% | 50% | 17% | 0% | 58% | $0.0113 | – | 0 / 1 |
| dev | haiku@max8000 | budgets | drop line, Design minimums | 12 | 0% | 50% | 17% | 25% | 100% | $0.0113 | – |  |
| dev | haiku@max8000 | budgets | drop line, minimum 2 | 12 | 0% | 50% | 17% | 42% | 83% | $0.0113 | – |  |
| dev | haiku@max8000 | budgets | drop line, minimum 3 | 12 | 0% | 50% | 0% | 42% | 58% | $0.0113 | – |  |
| dev | haiku@max8000 | budgets-plus | shipped | 12 | 17% | 67% | 25% | 25% | 67% | $0.0110 | $0.0662 | 0 / 0 |
| dev | haiku@max8000 | budgets-plus | drop line, Design minimums | 12 | 25% | 67% | 42% | 75% | 100% | $0.0110 | $0.0441 |  |
| dev | haiku@max8000 | budgets-plus | drop line, minimum 2 | 12 | 25% | 67% | 42% | 75% | 100% | $0.0110 | $0.0441 |  |
| dev | haiku@max8000 | budgets-plus | drop line, minimum 3 | 12 | 8% | 67% | 8% | 75% | 67% | $0.0110 | $0.1324 |  |
| dev | sonnet-low@max8000 | base | shipped | 12 | 0% | 67% | 33% | 8% | 58% | $0.0312 | – | 2 / 4 |
| dev | sonnet-low@max8000 | base | drop line, Design minimums | 12 | 42% | 67% | 75% | 83% | 100% | $0.0312 | $0.0748 |  |
| dev | sonnet-low@max8000 | base | drop line, minimum 2 | 12 | 50% | 67% | 75% | 100% | 92% | $0.0312 | $0.0623 |  |
| dev | sonnet-low@max8000 | base | drop line, minimum 3 | 12 | 8% | 67% | 33% | 100% | 58% | $0.0312 | $0.3740 |  |
| dev | sonnet-low@max8000 | budgets | shipped | 12 | 17% | 83% | 42% | 75% | 83% | $0.0314 | $0.1884 | 2 / 6 |
| dev | sonnet-low@max8000 | budgets | drop line, Design minimums | 12 | 50% | 83% | 58% | 100% | 100% | $0.0314 | $0.0628 |  |
| dev | sonnet-low@max8000 | budgets | drop line, minimum 2 | 12 | 42% | 83% | 58% | 100% | 92% | $0.0314 | $0.0753 |  |
| dev | sonnet-low@max8000 | budgets | drop line, minimum 3 | 12 | 25% | 83% | 42% | 100% | 83% | $0.0314 | $0.1256 |  |
| dev | sonnet-low@max8000 | budgets-plus | shipped | 12 | 25% | 67% | 58% | 83% | 83% | $0.0322 | $0.1287 | 0 / 0 |
| dev | sonnet-low@max8000 | budgets-plus | drop line, Design minimums | 12 | 58% | 67% | 92% | 100% | 100% | $0.0322 | $0.0552 |  |
| dev | sonnet-low@max8000 | budgets-plus | drop line, minimum 2 | 12 | 58% | 67% | 92% | 100% | 100% | $0.0322 | $0.0552 |  |
| dev | sonnet-low@max8000 | budgets-plus | drop line, minimum 3 | 12 | 25% | 67% | 67% | 100% | 83% | $0.0322 | $0.1287 |  |
| dev | sonnet@max8000 | base | shipped | 12 | 8% | 42% | 42% | 17% | 33% | $0.1143 | $1.3714 | 0 / 0 |
| dev | sonnet@max8000 | base | drop line, Design minimums | 12 | 25% | 42% | 50% | 67% | 75% | $0.1143 | $0.4571 |  |
| dev | sonnet@max8000 | base | drop line, minimum 2 | 12 | 25% | 42% | 50% | 75% | 67% | $0.1143 | $0.4571 |  |
| dev | sonnet@max8000 | base | drop line, minimum 3 | 12 | 0% | 42% | 17% | 75% | 33% | $0.1143 | – |  |
| dev | sonnet@max8000 | budgets | shipped | 12 | 33% | 50% | 58% | 83% | 58% | $0.1271 | $0.3814 | 0 / 1 |
| dev | sonnet@max8000 | budgets | drop line, Design minimums | 12 | 33% | 50% | 58% | 83% | 92% | $0.1271 | $0.3814 |  |
| dev | sonnet@max8000 | budgets | drop line, minimum 2 | 12 | 33% | 50% | 58% | 83% | 83% | $0.1271 | $0.3814 |  |
| dev | sonnet@max8000 | budgets | drop line, minimum 3 | 12 | 0% | 50% | 0% | 83% | 58% | $0.1271 | – |  |
| dev | sonnet@max8000 | budgets-plus | shipped | 12 | 25% | 50% | 50% | 67% | 75% | $0.1497 | $0.5990 | 0 / 0 |
| dev | sonnet@max8000 | budgets-plus | drop line, Design minimums | 12 | 33% | 50% | 67% | 67% | 75% | $0.1497 | $0.4492 |  |
| dev | sonnet@max8000 | budgets-plus | drop line, minimum 2 | 12 | 33% | 50% | 67% | 67% | 75% | $0.1497 | $0.4492 |  |
| dev | sonnet@max8000 | budgets-plus | drop line, minimum 3 | 12 | 0% | 50% | 8% | 67% | 75% | $0.1497 | – |  |
| heldOut | haiku@max8000 | base | shipped | 45 | 0% | 84% | 4% | 0% | 51% | $0.0120 | – | 1 / 3 |
| heldOut | haiku@max8000 | base | drop line, Design minimums | 45 | 2% | 84% | 20% | 2% | 87% | $0.0120 | $0.5401 |  |
| heldOut | haiku@max8000 | base | drop line, minimum 2 | 45 | 4% | 84% | 20% | 7% | 80% | $0.0120 | $0.2700 |  |
| heldOut | haiku@max8000 | base | drop line, minimum 3 | 45 | 0% | 84% | 0% | 7% | 51% | $0.0120 | – |  |
| heldOut | haiku@max8000 | budgets-plus | shipped | 45 | 0% | 73% | 11% | 4% | 76% | $0.0118 | – | 1 / 1 |
| heldOut | haiku@max8000 | budgets-plus | drop line, Design minimums | 45 | 13% | 73% | 24% | 33% | 100% | $0.0118 | $0.0887 |  |
| heldOut | haiku@max8000 | budgets-plus | drop line, minimum 2 | 45 | 16% | 73% | 24% | 51% | 96% | $0.0118 | $0.0760 |  |
| heldOut | haiku@max8000 | budgets-plus | drop line, minimum 3 | 45 | 0% | 73% | 0% | 47% | 76% | $0.0118 | – |  |
| heldOut | haiku@max8000 | trim | shipped | 45 | 0% | 80% | 9% | 0% | 60% | $0.0111 | – | 2 / 5 |
| heldOut | haiku@max8000 | trim | drop line, Design minimums | 45 | 7% | 80% | 29% | 11% | 93% | $0.0111 | $0.1660 |  |
| heldOut | haiku@max8000 | trim | drop line, minimum 2 | 45 | 9% | 80% | 29% | 22% | 89% | $0.0111 | $0.1245 |  |
| heldOut | haiku@max8000 | trim | drop line, minimum 3 | 45 | 0% | 80% | 2% | 13% | 60% | $0.0111 | – |  |
| heldOut | sonnet-low@max8000 | base | shipped | 45 | 2% | 62% | 38% | 22% | 76% | $0.0324 | $1.4574 | 2 / 5 |
| heldOut | sonnet-low@max8000 | base | drop line, Design minimums | 45 | 44% | 62% | 78% | 78% | 98% | $0.0324 | $0.0729 |  |
| heldOut | sonnet-low@max8000 | base | drop line, minimum 2 | 45 | 49% | 62% | 78% | 100% | 98% | $0.0324 | $0.0662 |  |
| heldOut | sonnet-low@max8000 | base | drop line, minimum 3 | 45 | 18% | 62% | 40% | 98% | 76% | $0.0324 | $0.1822 |  |
| heldOut | sonnet-low@max8000 | budgets-plus | shipped | 45 | 18% | 73% | 47% | 62% | 82% | $0.0330 | $0.1857 | 0 / 1 |
| heldOut | sonnet-low@max8000 | budgets-plus | drop line, Design minimums | 45 | 58% | 73% | 87% | 93% | 98% | $0.0330 | $0.0571 |  |
| heldOut | sonnet-low@max8000 | budgets-plus | drop line, minimum 2 | 45 | 58% | 73% | 87% | 96% | 98% | $0.0330 | $0.0571 |  |
| heldOut | sonnet-low@max8000 | budgets-plus | drop line, minimum 3 | 45 | 27% | 73% | 49% | 96% | 82% | $0.0330 | $0.1238 |  |
| heldOut | sonnet-low@max8000 | trim | shipped | 45 | 4% | 60% | 29% | 27% | 76% | $0.0313 | $0.7048 | 8 / 11 |
| heldOut | sonnet-low@max8000 | trim | drop line, Design minimums | 45 | 31% | 60% | 71% | 76% | 98% | $0.0313 | $0.1007 |  |
| heldOut | sonnet-low@max8000 | trim | drop line, minimum 2 | 45 | 47% | 60% | 71% | 96% | 98% | $0.0313 | $0.0671 |  |
| heldOut | sonnet-low@max8000 | trim | drop line, minimum 3 | 45 | 16% | 60% | 24% | 93% | 76% | $0.0313 | $0.2014 |  |
| heldOut | sonnet@max8000 | base | shipped | 45 | 2% | 33% | 24% | 13% | 56% | $0.1363 | $6.1324 | 0 / 0 |
| heldOut | sonnet@max8000 | base | drop line, Design minimums | 45 | 9% | 33% | 29% | 33% | 67% | $0.1363 | $1.5331 |  |
| heldOut | sonnet@max8000 | base | drop line, minimum 2 | 45 | 13% | 33% | 29% | 53% | 60% | $0.1363 | $1.0221 |  |
| heldOut | sonnet@max8000 | base | drop line, minimum 3 | 45 | 0% | 33% | 0% | 47% | 56% | $0.1363 | – |  |
