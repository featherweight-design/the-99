# Readiness audit: Lineup / Stats on /decks (R1 + R2)

Audited 2026-10-11 against `docs/superpowers/design-briefs/2026-10-11-all-decks-stats.md` (main) and the
prompt Design was given (`boards/design-prompt-all-decks-stats.md`). Build source is R2:
`The 99 - Decks Stats (R2).dc.html`, `Decks Stats.dc.html`, `decks-stats · copy strings.ts`,
`about · lineup.ts`. Staging read-only (project `misty-rain-01681654`, branch `br-polished-pond-a6e63y0b`).

## Verdict: ORANGE (superseded: GREEN on re-audit, below)

One blocking gap: the design table is R1 only, and R2 replaced or added most of the components it would
specify (finding 3). Everything else is honored, answered, or an engineering call. The fix is a design-table
update, not a redraw.

## Naming

**Design renamed the feature, it did not merge it.** In R2 the player-facing name is "Stats", attributed to
Hugh (`decks-stats · copy strings.ts:1`, "R2: 'Lineup' renamed 'Stats' (Hugh, 2026-10-11)"; README R2
change 1). It is a second view of `/decks` (`Tiles · Stats`, `?view=stats`), with its own About entry
(`id: decks-stats`, "Stats: your decks, side by side") and its own copy file. The per-deck Deck stats
(`DECK_STATS_ENABLED`, `src/lib/decks/stats-flag.ts`, the deck page's `Stats` segment, About `deck-stats`) is
untouched. The code switch stays `LINEUP_ENABLED` (brief ruling 5); `DECKS_STATS_ENABLED` is offered as an
option (`READINESS.md`, open item 1).

## Findings

1. **Brief rulings: honored.** Side by side plus "This deck among yours" with no per-deck re-hash (ruling 1);
   never-played decks are always a group, and a folded recency card still counts them in its summary line
   (`summary.recency`, STATES must-not "never hidden or folded away") (ruling 2); per-copy totals, with
   20-against-17 only on the shared row (ruling 3); raw `won w of n · pods of a–b`, no rate (ruling 4, STATES
   must-nots); own switch, placed as a `/decks` view that leaves the doors row alone (ruling 5); no
   version evolution, hand odds or snapshot (ruling 6).
2. **Open questions Q1–Q6: all answered** (README R1 "Open questions, answered"; Q6 answered per deck and in
   total).
3. **BLOCKING: `design-tables/lineup.md` is the R1 table.** Its header reads "Design table: Lineup (R1)".
   R2 is what gets built, and the table has no rows for R2's components or still specifies the R1 form:
   - the fold head and summary line (README R2 change 3);
   - the clustered-pips identity mark (change 2);
   - the bracket chart as rows with mark-led chips, replacing slots and squares (changes 0b and 2);
   - AmongCard as 2×12 lines with a rank column. The table still says "Ties stack up 6px per deck", which
     R2 removed (change 4);
   - the "What each deck is worth" and "Jobs, deck by deck" proposal cards (changes 5 and 6);
   - the deck select on "wanted by your commanders" (change 7);
   - `?view=stats`. The table still names `LineupViewSwitch` and `?view=lineup`.

   Some of these values are in README prose (7px dots, 26px box, 44px head, 12px chosen dot), but most
   are not. The build's design-review enumerates from this table, so it needs R2 rows. STATES has the same
   lag in one place: R1's P1/L1 rows still read `Tiles · Lineup`, and no R2 delta row restates them.
4. **Frames: complete at 900 and 390.** Every R2 row (P1, S1, L2, F2, T1–T5, P0) renders at both
   (`The 99 - Decks Stats (R2).dc.html:89`, `:92`), plus six themes (TH). The brief asked for 1300. Design
   holds a 900 column at 1300 with no reflow (README R1 "Widths"). Engineering accepts this: it matches the
   cart and precons handoffs.
5. **About entry: present, and switched on its own `LINEUP_ENABLED`** (a new `AboutSwitch` member,
   `about · lineup.ts`). It has 760 and 390 frames. **Superseded, not a defect:** its "batches into the
   cart line's bump, `ABOUT_VERSION` 14 → 15, `since: 15`" (`about · lineup.ts:4`, the entry canvas, README R1
   "About entry"). A switched entry is seen by id when its switch turns on and takes no bump.
   `ABOUT_VERSION` is 14 on main (`src/lib/copy/about.ts:61`).
6. **Copy: compliant.** No "tick" and no "labels" in either copy file; US English (`colors`, `analyzed`); no
   em dash in copy strings. All strings are placeholders for `/copy-review`. Design asks copy-review to
   confirm the rank wording "most first".
7. **Data: every drawn figure is computable from stored data.** This includes pod size per game
   (`deck_games.pod_size`, `src/db/schema.ts:852`), last played (`deck_games.played_at`), brews (decks with no
   `deck_versions` row), the analyzed bracket set and declared bracket, the pair list
   (`commander_pair_support_cards`), and prices. Fold memory has its shape in
   `src/components/ui/use-stored-view.ts:30`. The engineering gaps G1–G10 are named, and G3 is the
   cache-key lock 5 already states.
8. **Fixture figures verified on staging (read-only):** 21 decks, 3 brews, 15 never played; 12 of 18 under
   Finished only; 7 games in pods 2×3, 4×4 and 1×5; 2 wins; last game 2026-10-05. Sol Ring is in 20 decks,
   and in 17 of the 18 finished decks, which matches F1/F2's "17 of 17". The fact line's 34% / 70% matches
   the brief's 1,344 / 3,924 copies and $2,134 / $934. Illustrative, as the README declares: per-game pods
   per lane, most Finished-only figures, the Gods 4 / 11 wanted counts, and every proposal number.
9. **Factual slip (not drawn, not blocking).** README R2 change 6 says "last changed against last played"
   needs a date per version "which the fixture doesn't carry". `deck_versions.committed_at` exists
   (`src/db/schema.ts:706`). The idea also sits close to ruling 6's excluded version evolution.
10. **Approval provenance.** `READINESS.md` and the README record "Approved (LGTM, Hugh, 2026-10-12)", but
    this drop arrived 2026-10-11. Nothing in the repo records Hugh's R1 or R2 notes, so this audit takes the
    rename and the R2 cuts as Design reports them.
11. **Unread shipped menu (G6).** The tile's `…` menu items were not read by Design. Engineering appends
    `See it among your decks` after whatever ships.

## Open for Hugh (product)

- Ship the two PROPOSAL cards ("Jobs, deck by deck" and "What each deck is worth"), or cut them?
- Should picking a shelf narrow Stats to that folder's decks? As drawn, the shelves leave when Stats is on.

## Engineering calls (resolved here)

- **Switch name: keep `LINEUP_ENABLED`.** Ruling 5 named it. `DECKS_STATS_ENABLED`, and the files
  `decks-stats.ts` and `decks-stats` beside `deck-stats`, are one letter from the per-deck feature's names.
  Recommend `lineup` for every code-side name and "Stats" only in player copy.
- **No `ABOUT_VERSION` bump.** The entry follows `LINEUP_ENABLED` (finding 5).
- **Hold 1300 to the 900 column** (finding 4).
- G1–G10 as listed in the README. G3 (a label generation in the `/decks` cache key) gates the strips and the
  jobs grid.

## Re-audit (2026-10-11, after Design's R2 table update)

### Verdict: GREEN

Finding 3 is closed: `design-tables/lineup.md` is now the R2 table. Hugh closed both product questions:
both cards ship, and a folder never scopes Stats. The code name stays `LINEUP_ENABLED` / `lineup`.

**Measured values checked against the frame component.** The sample was taken from
`Decks Stats.dc.html`, the component `The 99 - Decks Stats (R2).dc.html` imports. Every sampled value
matches.

| Component | Values checked |
|---|---|
| Fold head and Shell | head min-h 52 / 46, pad 6 0, border-bottom when open. Shell pads 6 14 16 open and 6 14 folded. `▴` / `▾` |
| Bracket rows | grid `56px 1fr 18px` / `88px 1fr 24px`, gap 10, min-h 30, dashed border on range rows. Not-analyzed row min-h 44, pad 9 0 4 |
| Range mark and chip | `DIM_OPACITY` .65. Chip h 34 / 30 |
| Decks per color | grid `24px 1fr 52px`. The chosen segment's inset is 2px `--accent` |
| IdentityMark | pip offsets 4.6, 5.6 and 6.8. Halo radii 5.5 / 4.5 |
| RecencyCard | `230px 1fr 150px` |
| SharedCard | `190px 1fr 96px` |
| AmongCard | `74px 1fr 72px` / `112px 1fr 110px`. The chosen dot's ring is 2px `--surface-sunken` |
| WorthCard | `1fr 70px` / `250px 1fr 76px` |
| JobsCard | `1fr repeat(4, 46px)` / `84px`, gap 3. Row min-h 32 / 28. Shading is `6 + t × 52`% |

**Design's notes, checked**

1. **Proposal styling.** The frames still draw the badge and the dashed brass border (`proposal(k)`
   in the shell). The table names the standard Shell with no badge and records the mismatch, and the
   table wins.
2. **About entry.** `since` and the bump are gone from `about · lineup.ts` and the README, which matches
   the switch-gated model. `isSeen` (`src/lib/about/visible.ts:98`) reads a switched entry by id
   alone and never by `since`. However, `since: number` is a required field on `AboutEntry`
   (`src/lib/copy/about.ts`), so the build sets `since: 14`, the current `ABOUT_VERSION`. This is the
   `deck-stats` precedent (`since: 11` at its own time). It is an engineering detail, not a design
   gap. The entry canvas still carries the old bump text, and the files win.
3. **New STATES row.** `?view=stats` with the switch off is drawn as P0: the param is ignored, and
   `?view=lineup` is not a route. P1 and L1 are restated as `Tiles · Stats`, which closes the STATES lag
   named in finding 3.
4. **Version dates.** README change 6 now cites `deck_versions.committed_at`, which closes finding 9.

**Engineering notes, not gaps**
- **Keep the About entry id `decks-stats`.** It renders as the `/about` anchor (`about-page.tsx:112`).
  Renaming it to `lineup` would put "Lineup" in a player-visible URL fragment, against the R2
  must-not.
- G1–G10 stand as the build's tasks. G3 (a label generation in the `/decks` cache key) gates the strips
  and the jobs grid.
