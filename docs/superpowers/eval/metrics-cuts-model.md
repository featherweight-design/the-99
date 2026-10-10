# Proposed cuts, model tier: recall against the cuts Hugh made

Outputs of `pnpm eval:cuts-model` on 2026-10-10 against staging (read-only), Sonnet 5 at effort medium, batch prices, three trials per deck, scored against the same ground truth as the free tier's baseline (`metrics-cuts.md`: 10 of 58, 17%, 1.1x chance). The model sees the facts and the card names, no Key cards, and by default no intent.

These rounds ran before the facts sorted cards by name, so the card list reached the model in the database's row order. The app sends it alphabetically; recall was not re-measured under that order.

Reading: per trial the model finds about 11.7 of 58 cuts (20%), 1.26x chance; the free tier found 10 of 58 (1.1x). Showing the model the deck's own v2 note (240 characters, a leakage diagnostic: the note names cards it cut) lifts that to 15 of 58 (26%), 1.7x chance. On this ground truth the model tier is a small step above the free tier, not a large one; most of Hugh's v1 to v2 changes are swaps whose reason sits in the replacement, which no cut list can see.

Measured cost, not estimated: 15 answers cost $0.22 at batch prices ($0.015 each, up to about 4,000 output tokens on a 19-cut deck); the plan's $5.70 estimate for the whole eval was about 25 times too high against that round, and ten times too high against the $0.50 spent on both rounds. Ledger after both rounds: $0.50 of the $15 ceiling.

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

## Round 2: card text, and Opus

Three trials per deck, no intent, batch prices. "Held-out" is Gods plus Wizards (7 cuts, 21 over three trials); the other three decks are where the one prompt change (mana value, type and oracle text per card) was looked at.

| Configuration | All five decks | Three decks | Held-out two | Cost |
|---|---|---|---|---|
| Sonnet 5, names and facts only (round 1) | 35 of 174 (20%) | 35 of 153 | 0 of 21 | $0.22 |
| Sonnet 5, plus type, mana value, text | 43 of 174 (25%) | 43 of 153 | 0 of 21 | $0.34 |
| Opus 5.5, names and facts only | 47 of 174 (27%) | 47 of 153 | 0 of 21 | $0.55 |
| Opus 5.5, plus type, mana value, text | 46 of 174 (26%) | 46 of 153 | 0 of 21 | $0.77 |

Chance is about 27 per 174, so Sonnet is 1.3x and the better rows 1.6x to 1.7x. The free tier was 1.1x. Card text helps Sonnet a little and Opus not at all; Opus is a little better than Sonnet either way. Spend on this ledger: $2.17 of the $15 ceiling. The Opus rows are priced at an ASSUMED Opus 5.5 rate ($5 and $25 per million tokens, the Opus 5 rate), so those two costs are an estimate until the bill is checked.

The "Dropped" columns count the harness's own name resolution, which sees only the offered cards; the app does the same, so a name outside the deck drops as `cardExists` in both.

**The held-out decks are not a test.** Seven cuts, none found by any configuration. Gods is a theme change ("removing mana intensive mana rocks and increasing mana pool to skew towards mountains") and Wizards is one card moved to another deck for its utility there. Neither reads off a list.

## Why this ground truth may not measure the feature

Proposed cuts is "this list is over 100, which cards come out". The truth set here is "which cards did Hugh swap out between v1 and v2", and the two differ:

- **Most removals are swaps or theme changes.** Every deck added as many cards as it cut (the notes: a proliferate rebuild, a five-colour mana fix, a mountain skew, upgrades to a precon), and 17 of the 58 cuts have a replacement of the same role. The reason a card left lives in the card that came in, which a cut-only call is never shown.
- **No deck was over 100.** The "pre-cut list" is v1 plus the cards v2 added, a list Hugh never held. The model is asked to cut `|added|` cards from it, and some of the added cards are ones Hugh chose on purpose.
- **Intent is the signal the product has and this truth withholds.** A player pressing Look deeper on an over-100 deck can say what the deck is for. Showing the model Hugh's v2 note moved Sonnet from 20% to 26%, and those notes name cards.
- **It cannot tell a defensible cut from a different one.** A model that proposes a sensible cut Hugh did not make scores a miss.

A better truth set, in order of cost:

1. **Hugh trims two or three real over-100 lists by hand**, writing nothing but the final 100 (a few minutes a deck). The scored question becomes what the product asks. Any deck over 100 on staging or a new one he pads on purpose with 8 to 12 cards he would cut.
2. **Blind read.** The model proposes cuts for his over-100 lists and Hugh marks each one fine, close or wrong, as for the tuning prompt (`report.md`). No ground truth needed, and it measures reasons too.
3. **Decks with a net-reduction history.** By the same-role pairing 41 of the 58 cuts have no replacement of the same role, but every deck here added about as many cards as it cut, so none is a clean trim.

The recall numbers above are a floor for the free-versus-model comparison and no more.
