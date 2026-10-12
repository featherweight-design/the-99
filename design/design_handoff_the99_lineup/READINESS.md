# READINESS: Stats on /decks (R2, approved)

**Approved (LGTM, Hugh, 2026-10-12):**
- placement as a view (`Tiles · Stats`);
- the filter, with two positions;
- the five chart families and their copy, after the sweep;
- clustered pips;
- folding;
- This deck among yours, as lines with a rank;
- the bracket marks and the mana key;
- all six themes;
- the thin states T1–T5.

**Still open for Hugh, none of them blocking**
1. **Switch name.** Keep `LINEUP_ENABLED`, or rename it to `DECKS_STATS_ENABLED`, which sits one letter from `DECK_STATS_ENABLED`.
2. **Proposals.** Jobs, deck by deck and What each deck is worth are drawn and marked PROPOSAL. Ship them, or cut them.
3. **Folders.** Should a shelf scope Stats? As drawn, the shelves leave in Stats.
4. **Widths.** Drawn at 900 / 390. At 1300 it's the same column.

**Needs engineering.** G1–G8 are in the README's R1 section. These are load-bearing:
- **G3:** the label generation in the /decks cache key, for the strips' and the jobs grid's jobs.
- **G4:** jobs and owned value in a fixed number of reads.
- **G1:** per-game pod size through `resultsStats`.

New in R2:
- **G9 · The commanders' list per deck.** The deck select needs `commander_support_cards` per deck, or the pair list for a partner deck, which is already in G4's one index read. The cut counts are per deck.
- **G10 · Fold state.** It's remembered per device, in the `useStoredView` shape. On a first visit only the first card is open.

**Unverified**
- Every illustrative figure is listed in the README's Fixture note. The Gods wanted list and its 4 / 11 counts are made up.
- The shipped items in the tile's `…` menu weren't read.
