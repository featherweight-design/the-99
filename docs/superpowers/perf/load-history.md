# Load times — before/after history

`pnpm measure:load` output, one section per performance PR, newest last. Every figure is the
median of three runs against `next start` on a scratch Neon branch holding a `pull:staging` copy of
the reference account (19 decks, 3,250 collection rows), with every feature switch on as staging
runs. Milliseconds from navigation start, or from the press for the card rows. "DB exec warm" is
the database's own execution time for one warm load, from `pg_stat_statements`.

These are LOCAL figures: this machine's round trip to the database is ~33ms, where production's
functions (iad1) reach the database (us-west-2) across the continent. They are for comparing one
build with the next on the same machine, and say nothing absolute about production.

## Baseline — 2026-09-27, main at the performance lane's PR 1

Server spans on a warm load (`[perf]` lines, `PERF_TIMING=1`):

- `/` total 1,028: listDecks 395, shoppingRollup 372, collectionPool 222, availability 197, rankedList 127
- `/decks` total 692: listDecks 691, shoppingRollup 529, folders 39
- `/decks/[id]` total ~1,160: candidateFacts ~450, getDeckDetail ~330 (before any wave), availability ~310, listDecks ~330, completions ~270
- `getCardDetail` total ~215: loadCardDetail ~213
**1300** (median of 3)

| Route | TTFB cold / warm | Content cold / warm | Stream end warm | First image cold / warm | Soft first / revisit | DB exec warm |
|---|---|---|---|---|---|---|
| home | 294 / 65 | 1279 / 1045 | 1033 | 1634 / 1041 | 1022 / 1008 | 653ms |
| decks | 266 / 56 | 1022 / 751 | 740 | 1371 / 748 | 782 / 745 | 867ms |
| deck | 182 / 44 | 1524 / 1286 | 1256 | 1848 / 1279 | 1312 / 1165 | 1272ms |
| collection | 197 / 58 | 622 / 394 | 338 | 1003 / 376 | 388 / 366 | 77ms |
| commanders | 196 / 45 | 522 / 364 | 99 | 874 / 357 | 327 / 326 | 2ms |
| discover | 230 / 79 | 564 / 107 | 100 | 847 / 89 | 324 / 325 | 1ms |

Card press: cold 347ms to dialog, 359ms to art; warm 32ms; another cold card 305ms.

**390** (median of 3)

| Route | TTFB cold / warm | Content cold / warm | Stream end warm | First image cold / warm | Soft first / revisit | DB exec warm |
|---|---|---|---|---|---|---|
| home | 289 / 46 | 1240 / 1032 | 1021 | 1603 / 1029 | 1024 / 1041 | 640ms |
| decks | 179 / 54 | 896 / 754 | 739 | 1254 / 749 | 774 / 714 | 828ms |
| deck | 181 / 60 | 1423 / 1298 | 1276 | 1768 / 1288 | 1319 / 1183 | 1306ms |
| collection | 191 / 67 | 537 / 427 | 367 | null / null | 351 / 337 | 71ms |
| commanders | 192 / 53 | 514 / 369 | 113 | 865 / 361 | 324 / 325 | 3ms |
| discover | 231 / 92 | 565 / 119 | 118 | 917 / 102 | 326 / 324 | 1ms |

Card press: cold 391ms to dialog, 400ms to art; warm 32ms; another cold card 301ms.

