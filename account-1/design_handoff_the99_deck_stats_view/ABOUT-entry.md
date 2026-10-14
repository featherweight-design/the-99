# About entry: `deck-stats`

A filled template in the format of `design_handoff_the99_analysis_tab/ABOUT-entry.md`. Artboard: canvas **1i**.
Copy is **queued for /copy-review**. No em dashes; apostrophes are `’`.

**The bump.** `ABOUT_VERSION` is 9 on `main`. The deck-description handoff (H35) takes it to 10. This entry takes it to **11** if H35 has landed, else **10**, with one re-pin of `about.version.json`'s hash. Same caveat as H35: a switched entry is announced by its switch. If `DECK_STATS_ENABLED` is off when this ships, drop the bump or ship the switch on.

| Slot | Value |
|---|---|
| **id** | `deck-stats` |
| **Title** | Stats: the deck, drawn |
| **Route** | `/decks` |
| **Opens** | opens a deck’s Your deck tab, on Stats |
| **Chapter** | 04 · Playing and tuning, after `suggested-changes` |
| **Width** | plate |
| **switch** | `DECK_STATS_ENABLED` |
| **since** | 11 (or 10, see above) |

**Caption**

> Your deck has two views, the list and Stats. Stats draws the deck from what is already stored: its curve and card types, the colors its costs ask for against the colors its lands make, its jobs, how it compares with the average deck for its commander, its value and what is left to buy, and the games you have logged, overall and by version. Stats states facts. Where Analysis has a finding about a figure, a link takes you to it.

**Key lines** (3 of 4)

1. Stats draws whether or not the deck has been analyzed, and never uses a credit.
2. Land sources count the colors a land can add. Mana sources that aren’t lands are counted, but their colors aren’t.
3. Games with no version on record, from before versioning or from a version since deleted, sit together under Version not recorded.

**Edits to existing entries.** `deck-analysis` needs none. If the Games entry says the record lives only in Games, add “and in Stats” (check at build).

**Specimen.** The curve card at plate width with Creature lit.

**Fixture props**: `fixtures.deckStats`

```
curve      buckets [1,9,14,13,11,8,4,4] · lands 36 · selected "creature"
types      creature 26 · instant 8 · sorcery 12 · artifact 10 · enchantment 6 · planeswalker 1 · battle 1
```

**Phone reduction.** Chips wrap at 44px. Must not crop the `7+` column or drop the Land chip.

**Strings from**: `deck-stats · copy strings.ts` (`about` strings are the three above plus title and caption).
