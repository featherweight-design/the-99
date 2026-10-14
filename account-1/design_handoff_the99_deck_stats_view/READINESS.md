# READINESS: Deck Stats (R2, approved by Hugh)

**Self-assessment: 🟡 amber.** Buildable for a, c, e, f, g as drawn. b and d each carry one data question.

## Slices
| # | Slice | Needs |
|---|---|---|
| 1 | `deckStatsEnabled()` beside `analysisTabEnabled()`; All · Shopping \| Stats as one segmented control, phone toolbar reflowed (STATES §E) | nothing |
| 1b | Palette tokens: 8 card-type hues, 6 job hues, fewer/more pair, in all six themes (canvas values are the Low Sun reference, in oklch) | nothing |
| 2 | Curve + types card (a) | `typeBreakdown()` in `stats.ts` (brief: no new read) |
| 3 | Jobs card (e) | `readLabels()` tally; unlabeled count |
| 4 | Results card (f + g) | trend from `listDeckGames()`; new `group by (versionId, result)` |
| 5 | Money card (c) | per-card price join (deck value, priciest five) |
| 6 | Average card (d) | `loadSkeletonForCommanders` read; see Q2 |
| 7 | Colors card (b) | pip counts per color; land sources; see Q1 |
| 8 | About entry, version bump | see ABOUT-entry.md |

## Open questions
**Q1 · Color supply (b).** The card states land sources as a fact, so it needs what a land can **add**, not `colorIdentity` (which counts a white ability on a colorless land). Counting policy drawn: dual = each color; fetch = the basic types it fetches; any-color land = each of the deck's colors. Non-land sources: count only (`classifyRoles` ramp ∩ not land), drawn hollow. If the mana-ability parse can't land in round 1, ship b without the right-hand side rather than with the heuristic.

**Q2 · One count per job (d, e).** The Average card's ramp/draw/removal/wipes rows print the **label** counts so the page never shows two ramp numbers. The commander averages (`avgRamp` etc.) were built from text classification, not labels. If the two diverge badly, Engineering should say so before build; the alternative is dropping the job rows from d.

**Q3 · The starting-mix fallback.** Drawn assuming flat `ROLE_TARGETS` holds lands and the four roles but no curve or types. If it holds more, more rows draw.

## Check before merge
- [ ] Switch off: no switch, no fetch.
- [ ] No success or danger token in Stats. `--warning` only where it means Shopping (To buy, its squares, the Shopping link).
- [ ] Type and job palettes each hold equal lightness and chroma; re-check 3:1 against `--surface-sunken` in all six themes.
- [ ] A draw bead is half-filled, never a flat grey.
- [ ] `$0.00`, `0–0–0` and `avg 0` cannot render.
- [ ] One square per card, never rescaled; the square count comes from the same array as the printed count.
- [ ] `7+` ceiling; lands never a column.
- [ ] Null `versionId` → “Version not recorded”, last. Never “v1”, never dropped.
- [ ] `finding ⟶` only when a reading has a finding on that figure; never the finding's title.
- [ ] Every string from `deck-stats · copy strings.ts`.
