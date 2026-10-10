# Proposed cuts, model tier: recall against the cuts Hugh made

Outputs of `pnpm eval:cuts-model` on 2026-10-10 against staging (read-only), Sonnet 5 at effort medium, batch prices, three trials per deck, scored against the same ground truth as the free tier's baseline (`metrics-cuts.md`: 10 of 58, 17%, 1.1x chance). The model sees the facts and the card names, no Key cards, and by default no intent.

Reading: per trial the model finds about 11.7 of 58 cuts (20%), 1.26x chance; the free tier found 10 of 58 (1.1x). Showing the model the deck's own v2 note (240 characters, a leakage diagnostic: the note names cards it cut) lifts that to 15 of 58 (26%), 1.7x chance. On this ground truth the model tier is a small step above the free tier, not a large one; most of Hugh's v1 to v2 changes are swaps whose reason sits in the replacement, which no cut list can see.

Measured cost, not estimated: 15 answers cost $0.22 at batch prices ($0.015 each, 3,000 output tokens at most on a 19-cut deck); the plan's $5.70 estimate for the whole eval was about ten times too high. Ledger after both rounds: $0.50 of the $15 ceiling.

## Round 1, no intent

Run 2026-10-10T08-22-17-616Z-round1. Model claude-sonnet-5 at effort medium, batch, 3 trial(s) per deck, no intent, no Key cards.

**35 of 174 cuts found** across 15 answers (15 answered), 20% against the free tier's 17% (10 of 58) and chance 27.8. Swaps 10 of 51, net reductions 25 of 123. Cost $0.224; ledger total $0.24 of $15.

| Deck | Trial | Cut (K) | Asked | Kept | Hits | Dropped | Cost | Out tokens |
|---|---|---|---|---|---|---|---|---|
| HD - Avatar Aang | 0 | 19 | 19 | 19 | 7 | none | $0.0223 | 3164 |
| HD - Avatar Aang | 1 | 19 | 19 | 19 | 8 | none | $0.0217 | 3040 |
| HD - Avatar Aang | 2 | 19 | 19 | 19 | 2 | none | $0.0188 | 2467 |
| HD Tune - Counter Intelligence | 0 | 17 | 17 | 17 | 3 | none | $0.0187 | 2364 |
| HD Tune - Counter Intelligence | 1 | 17 | 17 | 17 | 3 | none | $0.0197 | 2562 |
| HD Tune - Counter Intelligence | 2 | 17 | 17 | 17 | 6 | none | $0.0183 | 2272 |
| HD Tune - Prismari Artistry | 0 | 15 | 16 | 16 | 1 | none | $0.0207 | 2841 |
| HD Tune - Prismari Artistry | 1 | 15 | 16 | 16 | 1 | none | $0.0207 | 2824 |
| HD Tune - Prismari Artistry | 2 | 15 | 16 | 16 | 4 | none | $0.0158 | 1863 |
| HD - Gods | 0 | 6 | 6 | 6 | 0 | none | $0.0106 | 938 |
| HD - Gods | 1 | 6 | 6 | 6 | 0 | none | $0.0097 | 762 |
| HD - Gods | 2 | 6 | 6 | 6 | 0 | none | $0.0098 | 774 |
| HD - Wizards | 0 | 1 | 1 | 1 | 0 | none | $0.0056 | 95 |
| HD - Wizards | 1 | 1 | 1 | 1 | 0 | none | $0.0056 | 101 |
| HD - Wizards | 2 | 1 | 1 | 1 | 0 | none | $0.0056 | 93 |

## Round 1, leakage diagnostic (the v2 note shown as intent)

**45 of 174 cuts found** across 15 answers (15 answered), 26% against the free tier's 17% (10 of 58) and chance 25.9. Swaps 9 of 51, net reductions 36 of 123. Cost $0.263; ledger total $0.50 of $15.

| Deck | Trial | Cut (K) | Asked | Kept | Hits | Dropped | Cost | Out tokens |
|---|---|---|---|---|---|---|---|---|
| HD - Avatar Aang | 0 | 19 | 19 | 18 | 5 | cardExists | $0.0261 | 3908 |
| HD - Avatar Aang | 1 | 19 | 14 | 13 | 2 | cardExists | $0.0268 | 4049 |
| HD - Avatar Aang | 2 | 19 | 19 | 18 | 8 | cardExists | $0.0220 | 3078 |
| HD Tune - Counter Intelligence | 0 | 17 | 17 | 17 | 5 | none | $0.0184 | 2267 |
| HD Tune - Counter Intelligence | 1 | 17 | 17 | 17 | 2 | none | $0.0268 | 3941 |
| HD Tune - Counter Intelligence | 2 | 17 | 17 | 17 | 5 | none | $0.0219 | 2975 |
| HD Tune - Prismari Artistry | 0 | 15 | 16 | 16 | 4 | none | $0.0205 | 2778 |
| HD Tune - Prismari Artistry | 1 | 15 | 16 | 16 | 3 | none | $0.0246 | 3612 |
| HD Tune - Prismari Artistry | 2 | 15 | 16 | 16 | 1 | none | $0.0179 | 2259 |
| HD - Gods | 0 | 6 | 6 | 4 | 3 | cardExists, cardExists | $0.0131 | 1422 |
| HD - Gods | 1 | 6 | 6 | 4 | 1 | cardExists, cardExists | $0.0147 | 1739 |
| HD - Gods | 2 | 6 | 6 | 6 | 3 | none | $0.0123 | 1261 |
| HD - Wizards | 0 | 1 | 1 | 1 | 1 | none | $0.0062 | 207 |
| HD - Wizards | 1 | 1 | 1 | 1 | 1 | none | $0.0060 | 159 |
| HD - Wizards | 2 | 1 | 1 | 1 | 1 | none | $0.0061 | 173 |
