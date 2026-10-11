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
`fetchDeckProfile` (Analyze), which returns `ProfileFetch`, and `fetchStoredDeckProfile` (the
tab's open), which returns `StoredProfileFetch`. The benchmarks join both returns as an optional
`benchmarks` field, computed in
the same action from the profile it returns, so the block arrives in the same frame as the
verdict (no second fetch, nothing popping in after the tab paints).

- **Not stored.** `deck_profiles.profile` is untouched (no `PROFILE_VERSION` bump, no migration).
  The list is stored with the reading (`DeckProfile.cards` is persisted), so a held or stale
  reading recomputes from its own list, which is the lock. Labels are read fresh at the draw.
- **Switch off means not computed:** the action skips the reads entirely and returns no field.
- **Cost:** three reads per fetch, each keyed on the reading's oracle ids: the cards' text
  columns (`oracle_text`, `keywords`, `mana_cost`, `type_line`), `readLabels`, and the any-size
  combo rows (the any-size combo read, below). Measured with `pnpm measure:profile-cost`, which
  times this path (`measure:load` never opens the Analysis tab), before PR 3 merges. It is
  UNCACHED by default, because a list fingerprint alone would serve a stale grade after a label
  publish or a combo-index refresh, neither of which moves the list. If it adds more than ~50ms
  to a warm open, a cache keys on every mutable input: the list fingerprint, the newest
  `card_labels.labelled_at` among the list's cards, and the catalog generation
  (`catalog_refreshes`, which a combo copy stamps).
- **Always a whole deck.** A reading exists only for a legal deck (`deckLegality` requires
  `built === deckBodySize`, `src/lib/profile/stored.ts`), so every `DeckProfile.cards` totals
  100. The handoff's tiny-list state (3a) cannot occur and is **not built**; there is no
  `TINY_LIST_FLOOR` and no `tinyHead`/`tinyLine` string.

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
- **One membership rule with the strip.** Whether a card is ramp or draw at all is decided by
  `isRampJob` and `isDrawJob` in `src/lib/labels/role-sets.ts` (exported for this), the readers
  the role strip and the Jobs card already use, which already carry the labels check's
  follow-ups (land-to-hand fetches and self-only discounts are not ramp; a `target player draws`
  card labelled `opponents` still draws). The benchmarks only WEIGH what those readers admit, so
  the strip and a ledger never disagree about which cards are ramp or draw (lock 7).
- **Velocity** (`velocity.ts`): every card `isRampJob` admits, weighted by mana value: 1 at 2 or
  less, 0.5 at 3, 0 above; a card whose only ramp job is `burstMana` counts half again, and a card
  whose only ramp job is `costReduction` scores 0 (the brief's definition: a discount is not mana
  ahead of curve, though the strip counts a general one as ramp). Index =
  (lands × 7 / 99 + points) / average nonland mana value. Its ledger carries every card weighed,
  with "Read, not counted" for the zeros (cost reducers and ramp above 3 mana), so the strip's
  ramp cards and the ledger's cards are the same set. It also returns the commander's
  `expectedCastTurn`, called with the SAME input the Overview fact passes
  (`profile.roles.excludingCommanders.ramp`, `src/lib/synopsis/facts.ts`), so the ledger and the
  Overview never state different turns.
- **Card flow** (`flow.ts`): every card `isDrawJob` admits; 2 when a draw job is `repeatable`,
  1 when `oneShot`, doubled for a commander.
- **Interaction** (`interaction.ts`): the ONE shared reader (audit rule 1). Removal, wipes and
  counterspell jobs; 1 + instant speed (instant or flash) + mana value 2 or less; cheap instant
  as the figure. The Overview's facts move onto it in PR 1b (below), so the Overview prompt and
  the block cannot disagree.
- **Win speed** (`win-speed.ts`): EVERY assembled line, uncapped. It reads the any-size combo
  rows (`anySizeComboQuery`'s rule: 2 to 6 pieces, template-free, infinite or game-ending) and
  keeps the variants whose every piece is held, grouped by variant WITHOUT `shapeComboFacts`,
  whose cap of 6 (`MAX_COMBO_FACTS`) would cut Counter Intelligence's 17 lines and understate the
  odds. The query is extended to select what the ledger draws: piece oracle ids, `mana_needed`
  and `mana_value_needed`, `steps` and `notable_prerequisites`, so each line becomes a
  `ComboModal` (`src/lib/bracket/combo-modal.ts`) for `ComboBody`'s plates. The figure is the
  odds that at least one line has every non-commander piece in the first 14 cards, where a tutor
  seen stands in for a missing piece ONLY when it can find that piece, and each tutor finds one
  piece (a matching of seen tutors to missing pieces). Reach is the bracket's own:
  `classifySearches` and `tutorReaches` (`src/lib/bracket/tutor-targets.ts`, as
  `src/lib/profile/load.ts` pairs them), read from oracle text, so an unlabeled tutor counts and a
  creature-only tutor never finds an artifact. Each line also carries its own odds (`byT8`).
  **Deterministic:** a fixed-seed PRNG (mulberry32, a constant seed), 4,000 shuffles. No line
  returns `null`, which draws *No combo line*.
- **Dependencies** (`dependencies.ts`): the six rows exactly as the brief's section defines them
  (graveyard, artifacts, enchantments, creatures, activated abilities, combat reliance), each
  returning its figure, its strength (`heavy | light | null`) and its ledger groups. The
  artifacts and enchantments ledgers list a card once, under its first group (audit rule 11).
  **Graveyard lands stay out** on both sides of the figure (audit rule 7, decided here: the
  brief measured without them, and counting them means counting lands on both sides); the
  ledger note `landsLeftOut` names them. Combat Heavy returns no ledger (audit rule 3).
- **Grades** (`grade.ts`): `step(value, cuts) → 1..5` and `strength(row, cuts)`, both taking
  the cuts as an argument, so PR 1 is tested with injected cuts and carries no constants. The
  constants file `src/lib/benchmarks/cuts.ts` arrives in PR 2, printed by the measure script.
- **`computeBenchmarks(cards, combos)`** composes them. The server half,
  `loadBenchmarks(profile)` in `src/lib/benchmarks/load.ts`, does the three reads and calls it,
  returning null on a failed read (the block then draws nothing, and the reading still draws).

## The cut points (`pnpm measure:benchmarks`)

`scripts/measure-benchmarks.mts`, read-only, modelled on `measure-role-targets.mts`: it imports
the model rather than restating it, and prints its whole derivation.

- **Population:** every commander in `commander_support` on staging whose `synergy_state` is
  `ok`. Two derivations, because one figure is not linear:
  - **As built (PR 2): every figure is sampled**, the linear ones too. A sampled figure keeps
    each commander's deck-to-deck spread, which an expectation averages away, and the app
    grades one real list rather than an average; it also lets every figure come from the
    shipped function. Ten samples per commander, the population ordered by commander id, so
    a fixed seed reproduces a run against the same data. The expectation path below is the
    plan as first written.
  - **Expectation, for the linear figures** (velocity points, flow points, interaction weight,
    each dependency count): each card in `commander_support_cards` contributes its weight times
    `inclusion / 100` (the column is a percent, as `role-targets.ts` reads it), and the
    COMMANDER contributes as a fixed card at weight 1, exactly as the app counts it (its flow
    doubled, its graveyard or activated ability forcing its row), including its mana value in
    the nonland average. Velocity's index takes lands and average mana value from `avg_land` and
    `avg_curve`; a commander with either null is left out of the velocity population and counted
    in the printout.
  - **Sampled decks, for win speed and combat reliance**, which need assembled lines: per
    commander, a fixed number of legal decks: the commander in the command zone, `avg_land`
    lands, and the rest of a 99-card body drawn from its card list without replacement in
    proportion to inclusion (a fixed seed), so every sample has the exact body size the odds
    function draws 14 cards from. Lines are found against the whole Spellbook variant table held
    in memory, and the odds are the same function the app runs. This keeps win speed's bands derived
    from the index, as lock 4 and audit rule 12 require, rather than set by hand.
- **Null policy, `db:build:staples`' own:** `coalesce(deck_count, 1)` as the weight; a card with
  a null `inclusion` carries no weight, through a FILTER on the sum and never a `where`.
- **Grade cuts:** the population's quintiles of each graded figure, weighted by `deck_count`.
- **Dependency cuts,** so a row names what is unusual for the format rather than what every deck
  has:
  - graveyard, creatures and activated abilities: light at the population's 75th percentile of
    the row's figure, heavy at the 90th;
  - artifacts and enchantments, two figures each (the cards, and the payoffs): a cut per figure
    at the same percentiles, and the row takes the stronger of the two, as the brief's draft cut
    joined them with OR;
  - combat reliance, where FEWER routes is heavier: heavy when a deck has no route outside
    combat and no line at all (the brief's draft, kept fixed, since zero is a fact rather than a
    cut); light when it has no line and its routes sit at or under the population's 10th
    percentile of the sampled decks.
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
| 1 | Model and switch | `src/lib/benchmarks/` (types, text fallback, velocity, flow, interaction, win speed with its extended combo read, dependencies, grade, compose, load), `isRampJob` and `isDrawJob` exported from `role-sets.ts`, `benchmarks-flag.ts`, `.env.example`, `docs/deployment.md`. Unit tests per module, with injected cuts. No UI, and nothing on any existing surface moves. | ~18 |
| 1b | The Overview on the shared reader | The Overview's facts loader (`src/lib/synopsis/generate.ts`, `facts.ts`) reads fresh labels for the fact cards and `deckStatsFact` calls the shared interaction reader; `interactionCounts` is deleted. **Gated on `DECK_BENCHMARKS_ENABLED`**: with the switch off the facts are exactly today's, so no production Overview moves before the block ships, and turning the switch on moves both together. | ~5 |
| 2 | Cut points | `scripts/measure-benchmarks.mts` + `package.json` script; `cuts.ts` with the printed constants; the derivation pasted into the PR body. | ~4 |
| S | Spot check | Task S's board file (outside the repo); any read-side fixes as a small PR. | 0-4 |
| 3 | The block | `benchmarks` on `ProfileFetch` and `StoredProfileFetch`, through `use-deck-profile.ts` and `builder-shell.tsx` to `AnalysisPanel`; `benchmarks-block.tsx` (tiles, meter, `STEP_INK` tokens, the Dependencies box, no-combo, none and stale states, `layout="rows"` per audit rule 10); `src/lib/copy/deck-benchmarks.ts` from the handoff's strings after `/copy-review`; the Deck stats `InfoTip` lifted to `src/components/ui/info-tip.tsx` with a 44px hit area at 390 (audit rule 5); the 1300 stale banner's note stacked under its line (audit rule 9). Openers drawn inert until PR 4. | ~16 |
| 4 | The ledger | `benchmark-ledger.tsx` on `ModalChrome` 760: the shared card row (`ROW_SHELL`, `CostTrack`, `CostPips`), `HoverPreviewProvider`, `CardDetailTrigger` with the ledger's rows as siblings; win speed from `ComboBody`'s plates, exported from `receipt-modal.tsx` (audit rule 4); the Stats link (audit rule 6): switch to Your deck, open the Stats panel, scroll to `[data-stats-card="curve" or "jobs"]`, new wiring in `builder-shell.tsx` and `decklist.tsx`. | ~10 |
| 5 | About, at the line's close | The `deck-benchmarks` entry (chapter 03, after `deck-analysis`, `width: 'plate'`, specimen the block in `layout="rows"` for a Scrappy Survivors fixture) with `switch: 'DECK_BENCHMARKS_ENABLED'`, the switch added to `AboutSwitch` (`src/lib/copy/about.ts`) and to `SWITCHES` (`src/lib/about/visible.ts`) (audit rule 8). Batched with the Overview claim tap-through's entry under the evidence line's one `ABOUT_VERSION` bump; whichever of the two lines closes last carries the bump. | ~4 |

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
  tutor stands in for a piece it reaches and not for one it cannot (a creature tutor and an
  artifact piece); one tutor never fills two pieces; an unlabeled tutor counts; seven assembled
  lines are all kept (no cap).
- **The shared reader (1b):** with the switch on, `deckStatsFact` returns the new reader's
  counts; with it off, exactly today's figures.
- **One membership rule:** a card the strip counts as ramp or draw is in the matching ledger,
  and the reverse, on a fixture holding a land-to-hand fetch, a general discount and a
  `target player draws` card.
- **Switch:** off, `loadBenchmarks` is never called and `ProfileFetch` carries no field.
- **The block and the ledger:** each STATES §B to §D row that can render with a fixture
  (no combo, none, four rows, stale caption, Combat Heavy without an opener); the meter's
  `aria-label`; a ledger row is a `CardDetailTrigger` with the ledger as siblings.
- **The banner:** the stacked note at 1300, unchanged at 390.

## Rollout

- **Before the switch goes on, one paid v8 corpus pass** (about $0.51, inside the Overview
  accuracy line's approved October budget), because PR 1b moves an Overview input when the switch
  is on and the free check can only re-check stored answers, not show how a new Overview reads the
  new figures (f0, 2026-10-10; Hugh may override). The harness reads the switch from the
  environment (`factsFor` defaults it), so the run sets it, or it measures the classifier's figures:
  `DECK_BENCHMARKS_ENABLED=true pnpm eval:corpus run --prompt v8 --out <file.jsonl>`. `env.mjs` loads
  `.env` over the shell, so the worktree's `.env` must not set the switch.
- `DECK_BENCHMARKS_ENABLED` on staging after PRs 1 to 4 and Task S; on production after Hugh has
  read it on staging and `LABEL_ROLE_COUNTS_ENABLED` is live there (the benchmarks read labels,
  and the role strip should not disagree with them on the same page).
- The About entry (PR 5) ships at the evidence line's close and follows the switch.

## Open items for Hugh

None. Everything the audit left to engineering is decided above: the cut derivation, the
graveyard lands (out), the tiny-list state (unreachable, not built), win speed's bands (derived
from sampled decks), and where the block computes.
