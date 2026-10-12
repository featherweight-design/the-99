# Gap report: Mana Balance view (Tuning hub PR 3a)

Built against `design/design_handoff_the99_tuning_hub/`, R3b ("full view") as the build target, R3 for the
colorless and no-sources frames, and the 2026-10-11 rulings in
`docs/superpowers/design-briefs/2026-10-10-mana-balance-evidence.md`. Property table:
`docs/superpowers/design-tables/mana-balance-view.md` (design-review Agent 1). Agent 2 found 43 visual gaps
and 2 state gaps; 37 were fixed and Agent 3 confirmed 0 remaining; the rest are deviations below.

Scope split (named before the build, approved by the orchestrator 2026-10-11): **PR 3a** is the evidence
view, its hub wiring and History; **PR 3b** is the Improve my mana door, the color step, the help result and
the land cell's `balance mana →`.

## Approved deviations

| # | Design | Shipped | Why |
|---|---|---|---|
| 1 | Title `h3`, Metamorphous weight 400 | `h2`, `font-semibold`, 17/19 | Every Tuning tool's heading is an `h2.font-display font-semibold` (Suggested changes, Proposed cuts, History); the hub's focus and the page's landmark outline expect it (README other decisions 2). |
| 2 | Bars scaled against the widest PIP share | Scaled against the widest pip OR source share | The bars are the Colors card's own (`colorRows`, `SourceBar`, `PIP_STYLE`, now shared): R3 call 2 is "one number on both surfaces", so the two surfaces draw the same bar for the same deck. |
| 3 | `SourceBar` min-width 8, radius 3 + overflow hidden; pip ink `#F2F4F4` / `#0B0B0E` | The Colors card's own min-widths and theme pip-ink tokens | Same reason: shared with Deck stats, and the inks are theme tokens. |
| 4 | Phone chips `nowrap` with no scroll (R3b) | `nowrap` and scroll sideways | Five chips do not fit 390 otherwise (R3 drew the scroll). |
| 5 | M7 (no sources) draws no Hardest costs | Hardest costs drawn, folded | The build spec keeps pattern rows (`You have 0 · Needs N`): the figures stand when lands go in, which is what `thin.noSources` says. |
| 6 | A deck whose only sources are colorless (Wastes) | Keeps the generic lead and the colorless line | The lead swap uses the Colors card's own `noLands` test, so the two surfaces agree; the copy has no sentence for this cause (spec F17). |
| 7 | Tile cost `free · look deeper 1 credit` | `free` | Mana Balance has no Look deeper (tier 2 is a later sub-project); the pill advertised a pass that does not exist. Orchestrator approved. |
| 8 | History fixtures `green short by 3`, `every color covered` | `83 pips · 68 sources` (`deckStatsCopy.colors.denom`) | The fixtures are R1 verdicts that R3 retired; the summary states the Colors card's totals. Orchestrator approved. |
| 9 | Hub draws over a reading or a deck over 100 | Also whenever Mana Balance is on | Mana Balance needs no reading, so a never-read deck still gets the hub (Suggested changes then inert, saying why). Orchestrator approved. |
| 10 | The "without" line only when it differs (R3 open 2) | Under every color with a pip (R3b) | R3b wins its conflict with the R3 table. |

## Decisions where the handoff is silent (decided, recorded)

- **Copy (via /copy-review, 2026-10-11).** Karsten named only in the Needs line and the citation: the Lands
  clause reads `formula 42.2`, the sixth fact `Commander land formula`, and `thin.noSources` drops
  "Karsten’s". The land-only citation leads with "Frank Karsten’s" (the citation is an allowed place).
  Canvas-only strings became keys: `countOf`, the three tapped notes, `split` without lands (`5 other`),
  the zero-ramp caveat, the failed-count block (carried from the hub copy's R1 `mana.failed`), the chips'
  `Color` label. A color with pips and no published pattern reads `—` / `no published figure`.
- **The TCGplayer link** goes to the article itself (`KARSTEN_ARTICLE_URL`).
- **Needed sub-line** names the first card by name and counts the other DISTINCT cards (copies are not
  cards).
- **Default chip:** the color with the most pips, commander counted; a tie goes to W U B R G order.
- **Folds** persist per deck in `the99.mana.open.{deckId}` (OPEN keys; both start folded), through
  Consider's store, now `useStoredKeys`. A view preference, so it survives visits; the count itself is
  read fresh on every open.
- **The tile status** is the newest count's date (`last run Oct 7`), with no outcome: a free count has no
  verdict to report. Counts are recorded once per list version, so the date is the list's first count.
- **A double-faced commander** is named by its front face (`Avatar Aang`, not `Avatar Aang // Aang`).
- **Loading:** nothing for 400ms, then a busy frame with the title and no `#mana-heading` (the hub's focus
  waits for the stable heading). **Failed:** heading with the failure mark, body, `kept` line; no retry, as
  Proposed cuts.
- **Mana alone** (the only Tuning tool on) mounts directly on the Analysis tab, as the other tools do.
- **900 vs 1300:** no difference; content is capped at 660 (lead) and 700 (citation).

## Gaps found and fixed (Agent 2, confirmed by Agent 3)

Panel radius 12 at both widths; heading block gap 6; `text-wrap: pretty` on the lead, the Needs lines and
the citation; the colorless note's disc (10.5/600) and text (12.5, flex 1); table top rule at both widths,
head row rule `--border` and padding 8/2; rows aligned to the top; cell gap 4; pip bar min-width 8; the
colorless line as a label plus figure with its own rule; Needs trigger 8 below the table, header on the
baseline; the Source line's link renders `needs.sourceLink`; the link-out anchor inline-flex, gap 4,
nowrap; Lands sits 12 below Hardest costs; section header centered with no padding; chips 12px, unselected
weight 500, a plain color dot; pattern table top rule, head rule and padding, row gap 5, code cell gap 6,
dotted name rule as a border, commander tag 0.1em after a space, Needed figure nowrap, foot as a sibling;
land facts gap 8, top rule, the rule on the grid row, label line-height 1.4, no note on a tapped row of 0.

Found on the contact sheet, not by review: the five-color deck's sub-line read `without Avatar Aang //
Aang` (fixed, above).

## State reachability

Every in-scope state is reachable (Agent 2, pass 2): on open (both folded), Hardest costs open, chip
change, Lands open, tapped row open, folds restored, Needs closed/open/hidden, one color (no chips), a color
with sources and no pips, long name list (`+N more`), commander in a row, the three figure kinds, colorless,
no sources, failed. Contact sheet (scratch branch `scratch-tuning-hub`, 390 and 1300): M1, M2, M2b, M2c,
M2d, M4 (Aang), M5 (Eldrazi), M8 (History filtered to Mana Balance), every cell reached.

## Owed to PR 3b

The door, the color step (tightest first, nothing preselected), the help result (kept for the whole visit
to the deck through `lib/decks/visit.ts`, per Hugh's rule), `readManaHelpFor`, the land cell's
`balance mana →`, and their inventory rows (M3, M3b, M4 one-color, M6 no-sources, M7, M7b).
