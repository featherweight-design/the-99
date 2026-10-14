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

**Closed by Hugh (2026-10-12)**
1. **Switch name.** It stays `LINEUP_ENABLED`, and `lineup` for every code-side name. Players see "Stats". No `ABOUT_VERSION` bump: the entry is gated on the switch.
2. **Proposals.** Both ship: "What each deck is worth" and "Jobs, deck by deck". The build drops the badge and the dashed border, and the canvas is unchanged.
3. **Folders.** A folder never scopes Stats. Stats is filtered only by All decks / Finished only, and the shelves leave.
4. **Widths.** Drawn at 900 / 390. At 1300 it's the same column.

**Design table: at R2** (`design-tables/lineup.md`), closing audit finding 3.

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
