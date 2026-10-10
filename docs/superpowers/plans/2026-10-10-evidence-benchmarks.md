# Evidence benchmarks: implementation plan

Plan, 2026-10-10, priority 4c. It builds the brief
`docs/superpowers/design-briefs/2026-10-10-evidence-benchmarks.md` (with its Dependencies
revision) to the Green handoff `design/design_handoff_the99_analysis_tab/addendum_evidence_benchmarks/`
(R4, merged as #1393) and that handoff's `READINESS-audit.md`. Nothing in the brief's "What eng
locks" or the handoff's design calls is reopened here.

## Standing rulings (not re-litigated)

- **No model calls.** Everything is computed from the list, `cards`, `card_labels` and the
  Spellbook index.
- **Players never see the word "label".** A card with no fresh label is read from its rules
  text, silently; no surface groups or marks cards by how they were read (audit rule 2).
- **Counterspells are interaction, never removal** (Hugh, 2026-10-10).
- **Dependencies is a risk, never a score**: rows, a Heavy or Light word, the fixed hate list, a
  ledger. No total, no row count, no meter.
- **The block belongs to the reading**: computed from `DeckProfile.cards` of the reading on
  screen, drawn with it, stale with it, absent before a first Analyze.

## Where it computes

The reading reaches the client through two server actions in `src/app/decks/profile-actions.ts`:
`fetchDeckProfile` (Analyze) and `fetchStoredDeckProfile` (the tab's open). Both return
`ProfileFetch`. The benchmarks join that return as an optional `benchmarks` field, computed in
the same action from the profile it returns, so the block arrives in the same frame as the
verdict (no second fetch, nothing popping in after the tab paints).

- **Not stored.** `deck_profiles.profile` is untouched (no `profileVersion` bump, no migration).
  The list is stored with the reading (`DeckProfile.cards` is persisted), so a held or stale
  reading recomputes from its own list, which is the lock. Labels are read fresh at the draw.
- **Switch off means not computed:** the action skips the reads entirely and returns no field.
- **Cost:** three reads per fetch, each keyed on the reading's oracle ids: the cards' text
  columns (`oracle_text`, `keywords`, `mana_cost`, `type_line`), `readLabels`, and the any-size
  combo rows (`anySizeComboQuery`, already run for the Overview facts). Measured with
  `measure:load`'s server log before PR 3 merges; if it adds more than ~50ms to a warm open, the
  result is cached on the reading's list fingerprint (the `cachedDeckProfile` pattern).

## The model (`src/lib/benchmarks/`)

Pure, one module per benchmark, all over one input type:

```ts
type BenchCard = {
  oracleId: string; name: string; quantity: number; commander: boolean;
  typeLine: string; manaValue: number; manaCost: string | null;
  oracleText: string | null; keywords: readonly string[];
  jobs: readonly Job[];        // fresh label jobs, or jobs read from the text (below)
};
```

- **The text fallback, `jobsFromText(card)`.** For a card with no fresh label: `classifyRoles`'
  roles become jobs with fixed fields, as the brief locks. Draw is `oneShot` and counts only when
  the controller draws ("you draw", or a bare "Draw" instruction); ramp scores by mana value
  alone (no `rampKind`); "counter target" reads as `counterspell` and never as `removal`.
  Theme jobs have no text reading and are simply absent. `classifyRoles` is left alone for its
  own callers (audit rule 1).
- **Velocity** (`velocity.ts`): the brief's draft definition, with the ramp follow-ups applied:
  `costReduction` scores 0, a `fetchesLand` card scores 0 when its text has no "onto the
  battlefield", a `burstMana`-only card counts half. Index = (lands × 7 / 99 + points) / average
  nonland mana value. Its ledger carries every card weighed, with "Read, not counted" for the
  zeros (cost reducers, ramp above 3). It also returns the commander's `expectedCastTurn`.
- **Card flow** (`flow.ts`): draw jobs not `affects: opponents`; 2 repeatable, 1 one-shot,
  doubled for a commander.
- **Interaction** (`interaction.ts`): the ONE shared reader (audit rule 1). Removal, wipes and
  counterspell jobs; 1 + instant speed (instant or flash) + mana value 2 or less; cheap instant
  as the figure. `deckStatsFact` in `src/lib/synopsis/facts-extra.ts` calls it in place of
  `interactionCounts`, which is deleted, so the Overview prompt and the block cannot disagree.
- **Win speed** (`win-speed.ts`): the assembled combo set from `anySizeComboQuery` +
  `shapeComboFacts`' rule (every piece held). The odds that at least one line has every
  non-commander piece in the first 14 cards, each tutor seen standing in for one missing piece.
  **Deterministic:** a fixed-seed PRNG (mulberry32, seed a constant), 4,000 shuffles, so the same
  list gives the same figure. No combo returns `null`, which draws *No combo line*.
- **Dependencies** (`dependencies.ts`): the six rows exactly as the brief's section defines them
  (graveyard, artifacts, enchantments, creatures, activated abilities, combat reliance), each
  returning its figure, its strength (`heavy | light | null`) and its ledger groups. The
  artifacts and enchantments ledgers list a card once, under its first group (audit rule 11).
  **Graveyard lands stay out** on both sides of the figure (audit rule 7, decided here: the
  brief measured without them, and counting them means counting lands on both sides); the
  ledger note `landsLeftOut` names them. Combat Heavy returns no ledger (audit rule 3).
- **Grades** (`grade.ts`): `step(value, cuts) → 1..5` and the constants file
  `src/lib/benchmarks/cuts.ts`: the grade cut points, the per-row light and heavy cuts, and
  `TINY_LIST_FLOOR`. **Win speed's steps are fixed odds bands** (the odds are already an
  absolute figure), stated in the constants file with the measure script printing the
  population beside them.
- **The tiny list:** fewer than `TINY_LIST_FLOOR` (60, as drawn) cards in the reading's list,
  commanders included, draws the tiny state instead of grades and rows.
- **`computeBenchmarks(cards, combos)`** composes them. The server half,
  `loadBenchmarks(profile)` in `src/lib/benchmarks/load.ts`, does the three reads and calls it,
  returning null on a failed read (the block then draws nothing, and the reading still draws).

## The cut points (`pnpm measure:benchmarks`)

`scripts/measure-benchmarks.mts`, read-only, modelled on `measure-role-targets.mts`: it imports
the model rather than restating it, and prints its whole derivation.

- **Population:** every commander in `commander_support` on staging whose `synergy_state` is `ok`. Its "average deck" is
  the expectation over its `commander_support_cards`: each card contributes its benchmark weight
  times its `inclusion`, lands and average mana value from `avg_land` and `avg_curve`. Every
  linear figure (velocity points, flow points, interaction weight, each dependency count) has an
  exact expectation this way; no deck is sampled.
- **Grade cuts:** the population's quintiles of each graded figure, weighted by `deck_count`.
- **Dependency cuts:** light at the population's 75th percentile of each row's figure, heavy at
  the 90th, so a row names what is unusual for the format rather than what every deck has.
- **It prints** the distribution, each cut with both sides of it, and where each of the 21
  reference decks lands (read-only, the brief's account), so the cuts can be argued with.
- The constants it prints are committed in `cuts.ts` by hand; the script runs in no workflow.
  Re-run it when the index is rebuilt and the figures move.

## Task S: the pre-switch spot check (free, read-only, named)

Before `DECK_BENCHMARKS_ENABLED` goes on anywhere Hugh reads (staging included), the label
readings the new rows depend on get the same check `labels-accuracy-check-2026-10-10` gave the
roles: the `recursion` and `mill` jobs, the `cardsInGraveyard` and `artifacts` thresholds,
`tribal`, `pump`, `tokens`, `drain`, `poison`, the `activated` trigger, and `tutor`. For every
card in the 21 decks those readings put in a ledger, judge it from its rules text (right, wrong,
defensible), report per row, and list the read-side fixes. Output: a board file beside the
labels check. Fixes are read-side, free, in `src/lib/benchmarks/` or `role-sets.ts`, as their own
small PR if any. No model call, no relabel (a relabel is a spend and goes to Hugh first).

## PR boundaries

No stacked PRs; each cuts from fresh `main` and merges before the next opens. Each is under ~20
files and ~800 lines.

| # | PR | Scope | Files (approx.) |
|---|---|---|---|
| 1 | Model and switch | `src/lib/benchmarks/` (types, text fallback, velocity, flow, interaction, win speed, dependencies, grade, compose, load), `cuts.ts` with the brief's draft cuts marked provisional, `benchmarks-flag.ts`, `deckStatsFact` on the shared interaction reader, `.env.example`, `docs/deployment.md`. Unit tests per module. No UI. | ~18 |
| 2 | Cut points | `scripts/measure-benchmarks.mts` + `package.json` script; `cuts.ts` replaced by the printed constants; the derivation pasted into the PR body. | ~4 |
| S | Spot check | Task S's board file (outside the repo); any read-side fixes as a small PR. | 0-4 |
| 3 | The block | `ProfileFetch.benchmarks` in both actions, through `use-deck-profile.ts` and `builder-shell.tsx` to `AnalysisPanel`; `benchmarks-block.tsx` (tiles, meter, `STEP_INK` tokens, the Dependencies box, no-combo, none, tiny and stale states, `layout="rows"` per audit rule 10); `src/lib/copy/deck-benchmarks.ts` from the handoff's strings after `/copy-review`; the Deck stats `InfoTip` lifted to `src/components/ui/info-tip.tsx` with a 44px hit area at 390 (audit rule 5); the 1300 stale banner's note stacked under its line (audit rule 9). Openers drawn inert until PR 4. | ~16 |
| 4 | The ledger | `benchmark-ledger.tsx` on `ModalChrome` 760: the shared card row (`ROW_SHELL`, `CostTrack`, `CostPips`), `HoverPreviewProvider`, `CardDetailTrigger` with the ledger's rows as siblings; win speed from `ComboBody`'s plates, exported from `receipt-modal.tsx` (audit rule 4); the Stats link (audit rule 6): switch to Your deck, open the Stats panel, scroll to `[data-stats-card="curve" or "jobs"]`, new wiring in `builder-shell.tsx` and `decklist.tsx`. | ~10 |
| 5 | About, at the line's close | The `deck-benchmarks` entry (chapter 03, after `deck-analysis`, `width: 'plate'`, specimen the block in `layout="rows"` for a Scrappy Survivors fixture) with `switch: 'DECK_BENCHMARKS_ENABLED'`, the switch added to `AboutSwitch` and `SWITCHES` in `src/lib/about/visible.ts` (audit rule 8). Batched with the Overview claim tap-through's entry under the evidence line's one `ABOUT_VERSION` bump; whichever of the two lines closes last carries the bump. | ~4 |

## Copy

All strings start from the handoff's `evidence-benchmarks · copy strings.ts` and go through
`/copy-review` before PR 3 opens, including the two the audit flags:

- `noComboLine` claims "This deck wins through combat", which is false for Thorin and Sultai
  Arisen (no combo, and other routes). It says only that there is no combo line, or branches on
  the combat row.
- About key 4 claims every grade and dependency opens its cards; no combo and Combat Heavy draw
  no opener.

The fixtures' straight apostrophes ship as `’`. No string mentions labels.

## Route × viewport inventory (feature-acceptance)

One route and the About page, both widths. The fixtures are the reference account's decks,
copied to a local branch with `pull:staging`.

| Surface | 390 | 1300 |
|---|---|---|
| `/decks/[id]` Analysis, populated reading (1a Gishath: a combo line, 0 cheap instant) | yes | yes |
| 1b Elves (no combo; three Heavy rows, commander activated) | yes | yes |
| 1c Sultai Arisen (graveyard Heavy, commander) | yes | yes |
| 1d Counter Intelligence (artifacts Heavy) | yes | yes |
| 1e Scrappy Survivors (four rows) | yes | yes |
| 1f Thorin (creatures Heavy) | yes | yes |
| 1g Soldiers (combat Heavy, no opener) | yes | yes |
| 1h Wizards (no dependencies panel) | yes | yes |
| 1i stale reading under the banner (note stacked at 1300) | yes | yes |
| 1j never analyzed (unchanged, no block) | yes | yes |
| 3a tiny list (under the floor) | yes | yes |
| Ledgers: velocity, flow, interaction, win speed, and each of the six dependency rows that draws one | yes | yes |
| A ledger name opening its card, Prev/Next walking the ledger | yes | yes |
| The Stats link landing on Curve and on Jobs | yes | yes |
| Switch off: no block, no reads (asserted by test) | yes | yes |
| Deck stats Colors card with the lifted `InfoTip` (no regression) | yes | yes |
| `/about` `deck-benchmarks` entry (PR 5) | yes | yes |

Each UI PR carries a contact sheet of its rows (`scripts/contact-sheet.mjs`, an inventory under
`docs/superpowers/inventories/`) and passes `design-review` against the handoff's property tables
before it opens.

## Tests

- **Pure modules:** one case per boundary. Velocity at mana value 2, 3 and 4, a burst-only card,
  a land-to-hand fetch, a cost reducer. Flow with an opponent draw and a commander draw.
  Interaction with a counterspell (counted as interaction, in the counterspell figure, never as
  removal), a flash creature, a 2-versus-3-mana answer. Each dependency row on both sides of its
  light and heavy cut; the artifacts ledger listing a card once; graveyard lands out; Combat
  Heavy with no ledger.
- **The text fallback:** an unlabeled Counterspell reads as a counterspell; an unlabeled
  Thought-Knot Seer scores no flow; a labeled card never takes the text path.
- **Win speed:** the same list twice gives the same odds (the seed); no combo returns null; a
  tutor stands in for a missing piece.
- **The shared reader:** `deckStatsFact` returns the new reader's counts (the Overview facts
  test pinned on it).
- **Switch:** off, `loadBenchmarks` is never called and `ProfileFetch` carries no field.
- **The block and the ledger:** each STATES §B to §D row that can render with a fixture
  (no combo, none, four rows, tiny, stale caption, Combat Heavy without an opener); the meter's
  `aria-label`; a ledger row is a `CardDetailTrigger` with the ledger as siblings.
- **The banner:** the stacked note at 1300, unchanged at 390.

## Rollout

- `DECK_BENCHMARKS_ENABLED` on staging after PRs 1 to 4 and Task S; on production after Hugh has
  read it on staging and `LABEL_ROLE_COUNTS_ENABLED` is live there (the benchmarks read labels,
  and the role strip should not disagree with them on the same page).
- The About entry (PR 5) ships at the evidence line's close and follows the switch.

## Open items for Hugh

None. Everything the audit left to engineering is decided above: the cut derivation, the
graveyard lands (out), the tiny-list floor (60), win speed's fixed odds bands, and where the
block computes.
