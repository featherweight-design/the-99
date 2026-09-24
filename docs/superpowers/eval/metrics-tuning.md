# Automatic metrics: tuning

Recomputed from 505 rows in 15 runs. Costs at real-time prices.

| set | cell | variant | n | survived | ungrounded | malformed | upstream | kept/run | returned/run | outside names | in tok | out tok (p95) | visible out (est.) | cache r/w | $/answer | $/accepted |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| dev-overlay | haiku | base | 12 | 100% | 0% | 0% | 0% | 2.08 | 4.08 | 25% | 3606 | 703 (901) | 579 | 0/0 | $0.0077 | $0.0077 |
| dev-overlay | haiku | cite-menu | 12 | 92% | 0% | 8% | 0% | 2.92 | 3.58 | 8% | 4113 | 735 (958) | 568 | 0/0 | $0.0097 | $0.0106 |
| dev-overlay | haiku | cite-names | 12 | 100% | 0% | 0% | 0% | 3.42 | 3.92 | 17% | 3887 | 638 (890) | 518 | 0/0 | $0.0071 | $0.0071 |
| dev-overlay | haiku | cite-rules | 12 | 100% | 0% | 0% | 0% | 3.42 | 3.83 | 8% | 3830 | 674 (865) | 538 | 0/0 | $0.0096 | $0.0096 |
| dev | haiku | base | 28 | 93% | 7% | 0% | 0% | 3.25 | 4.21 | 4% | 3416 | 686 (858) | 551 | 0/0 | $0.0068 | $0.0074 |
| dev | haiku | cite-menu | 12 | 92% | 0% | 8% | 0% | 3.42 | 3.58 | 0% | 3805 | 614 (887) | 497 | 0/0 | $0.0074 | $0.0081 |
| dev | haiku | cite-names | 12 | 100% | 0% | 0% | 0% | 3.17 | 3.92 | 0% | 3706 | 613 (757) | 490 | 0/0 | $0.0068 | $0.0068 |
| dev | haiku | cite-rules | 12 | 92% | 8% | 0% | 0% | 3.42 | 4.25 | 8% | 3632 | 678 (897) | 538 | 0/0 | $0.0076 | $0.0083 |
| dev | sonnet-low | base | 24 | 100% | 0% | 0% | 0% | 2.33 | 2.92 | 0% | 4394 | 737 (1004) | 350 | 0/0 | $0.0162 | $0.0162 |
| dev | sonnet@max8000 | base | 20 | 95% | 5% | 0% | 0% | 2.60 | 2.95 | 0% | 4377 | 3126 (4834) | 380 | 0/0 | $0.0460 | $0.0484 |
| dev | sonnet | base | 16 | 63% | 6% | 31% | 0% | 1.25 | 1.69 | 0% | 4428 | 2501 (3000) | 318 | 0/0 | $0.0466 | $0.0745 |
| heldOut | haiku | base | 45 | 93% | 7% | 0% | 0% | 3.36 | 4.11 | 11% | 3368 | 669 (841) | 515 | 0/0 | $0.0070 | $0.0075 |
| heldOut | haiku | cite-rules | 45 | 100% | 0% | 0% | 0% | 3.78 | 4.22 | 7% | 3592 | 636 (866) | 493 | 0/0 | $0.0071 | $0.0071 |
| heldOut | sonnet-low | base | 45 | 98% | 2% | 0% | 0% | 2.69 | 3.27 | 0% | 4324 | 754 (1108) | 361 | 0/0 | $0.0165 | $0.0169 |
| heldOut | sonnet@max8000 | base | 45 | 98% | 2% | 0% | 0% | 2.80 | 2.93 | 0% | 4322 | 2871 (6348) | 330 | 0/0 | $0.0415 | $0.0425 |
| heldOut | sonnet | base | 45 | 82% | 4% | 13% | 0% | 2.16 | 2.38 | 0% | 4311 | 2278 (3000) | 321 | 0/0 | $0.0405 | $0.0492 |
| overlay | haiku | base | 18 | 78% | 17% | 6% | 0% | 1.78 | 3.44 | 0% | 3396 | 640 (974) | 518 | 0/0 | $0.0073 | $0.0094 |
| overlay | haiku | cite-rules | 36 | 97% | 3% | 0% | 0% | 3.03 | 3.89 | 14% | 3589 | 659 (941) | 540 | 0/0 | $0.0078 | $0.0081 |
| overlay | sonnet-low | base | 18 | 100% | 0% | 0% | 0% | 2.17 | 3.17 | 0% | 4375 | 993 (1502) | 402 | 0/0 | $0.0187 | $0.0187 |
| overlay | sonnet@max8000 | base | 18 | 94% | 6% | 0% | 0% | 2.89 | 3.28 | 0% | 4375 | 3300 (4903) | 435 | 0/0 | $0.0418 | $0.0442 |
| overlay | sonnet | base | 18 | 44% | 0% | 56% | 0% | 1.33 | 1.44 | 0% | 4381 | 2860 (3000) | 430 | 0/0 | $0.0643 | $0.1448 |

## Drops by rule, and stability across trials

- **dev-overlay / haiku / base**: survived by trial 100%, 100%, 100%; drops citation 17, cardExists 3, quotedNote 1, noResultClaim 1, duplicate 1, denominator 1.
- **dev-overlay / haiku / cite-menu**: survived by trial 75%, 100%, 100%; drops citation 4, quotedNote 2, denominator 1, cardExists 1.
- **dev-overlay / haiku / cite-names**: survived by trial 100%, 100%, 100%; drops citation 3, cardExists 2, denominator 1.
- **dev-overlay / haiku / cite-rules**: survived by trial 100%, 100%, 100%; drops quotedNote 2, addNotLegal 1, denominator 1, cardExists 1.
- **dev / haiku / base**: survived by trial 100%, 100%, 75%; drops citation 22, noResultClaim 2, colourIdentity 1, cardExists 1, duplicate 1.
- **dev / haiku / cite-menu**: survived by trial 75%, 100%, 100%; drops citation 2.
- **dev / haiku / cite-names**: survived by trial 100%, 100%, 100%; drops citation 8, quotedNote 1.
- **dev / haiku / cite-rules**: survived by trial 100%, 100%, 75%; drops citation 7, quotedNote 2, cardExists 1.
- **dev / sonnet-low / base**: survived by trial 100%, 100%, 100%; drops citation 12, duplicate 1, quotedNote 1.
- **dev / sonnet@max8000 / base**: survived by trial 100%, 88%, 100%; drops citation 7.
- **dev / sonnet / base**: survived by trial 63%, 50%, 75%; drops citation 7.
- **heldOut / haiku / base**: survived by trial 87%, 93%, 100%; drops citation 13, denominator 5, noResultClaim 5, cardExists 4, duplicate 4, cutInDeck 1, colourIdentity 1, addNotLegal 1.
- **heldOut / haiku / cite-rules**: survived by trial 100%, 100%, 100%; drops noResultClaim 5, duplicate 5, cardExists 3, denominator 3, colourIdentity 1, citation 1, noBracketClaim 1, addNotLegal 1.
- **heldOut / sonnet-low / base**: survived by trial 100%, 100%, 93%; drops colourIdentity 9, noResultClaim 6, addNotLegal 5, citation 4, noNet 1, quotedNote 1.
- **heldOut / sonnet@max8000 / base**: survived by trial 93%, 100%, 100%; drops citation 3, colourIdentity 1, denominator 1, noResultClaim 1.
- **heldOut / sonnet / base**: survived by trial 80%, 87%, 80%; drops citation 9, addNotLegal 1.
- **overlay / haiku / base**: survived by trial 67%, 83%, 83%; drops citation 28, duplicate 1, addNotLegal 1.
- **overlay / haiku / cite-rules**: survived by trial 92%, 100%, 100%; drops citation 8, quotedNote 7, cardExists 5, denominator 4, colourIdentity 3, duplicate 3, addNotLegal 1.
- **overlay / sonnet-low / base**: survived by trial 100%, 100%, 100%; drops quotedNote 7, citation 4, colourIdentity 3, addNotLegal 2, noResultClaim 1, duplicate 1.
- **overlay / sonnet@max8000 / base**: survived by trial 83%, 100%, 100%; drops quotedNote 3, citation 3, denominator 1.
- **overlay / sonnet / base**: survived by trial 33%, 50%, 50%; drops citation 1, quotedNote 1.

## The decision rule

Baseline S = `sonnet@max8000 / base`: held-out survived 98%, kept 2.80, $0.0425 per accepted answer.

| candidate | cheaper | survived ≥ S−10 | kept ≥ 80% of S | overlay survived ≥ S−10 | malformed ≤ 5% | outside ≤ S+5 | eligible |
|---|---|---|---|---|---|---|---|
| `haiku / base` ($0.0075) | yes | yes | yes | **no** | yes | **no** | no |
| `haiku / cite-rules` ($0.0071) | yes | yes | yes | yes | yes | **no** | no |
| `sonnet-low / base` ($0.0169) | yes | yes | yes | yes | yes | yes | **eligible** |
| `sonnet / base` ($0.0492) | **no** | **no** | **no** | **no** | **no** | yes | no |
