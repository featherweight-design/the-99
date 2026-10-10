# Labels everywhere — implementation plan

Plan, 2026-10-10. Priority 4a on the board (Hugh, 2026-10-09). **Approved by Hugh, 2026-10-09**,
with three rulings folded in below: the flat fallback is re-stated from the label means, every
other reader of the role targets moves to labels in this same line, and `DECK_STATS_ENABLED` stays
off on production until the strip switch is live there. This plan records a read-only
measurement and sequences the work into PRs.

**The problem.** One deck page counts the same four roles two ways. The Recommended mix strip
counts with the text classifier (`classifyRoles`), and Deck stats' Jobs card counts from
`card_labels`. On HD - Gishath the two read 12 and 23 ramp. A reader sees two numbers for one
question on one page, and nothing tells them which is right.

## Findings

All figures are read-only, from staging (`br-polished-pond-a6e63y0b`, confirmed by
`neon.branch_id`), on 2026-10-10, in one repeatable-read, read-only transaction. No writes, no model
calls. Labels are read through the app's own `freshLabels`, so stale or emptied rows count as
unlabeled exactly as they do on the page: 28,569 of the 32,099 `card_labels` rows are fresh.

### (a) The targets are built from the classifier

The strip compares a deck against `skeleton.roleTargets` (`src/lib/decks/mix.ts:114-131`), picked
by `pickRoleTargets` (`src/lib/profile/build.ts:80-91`): pair, then commander, then identity, then
count bucket, then the flat `ROLE_TARGETS` (`src/lib/recs/roles.ts:6-8`, 10/10/8/3).

The measured rungs come from the classifier:

- `deriveAndWriteRoleTargets` reads every `ok` commander's `commander_support_cards` with each
  card's text (`src/lib/edhrec/seed-index.ts:737-781`) and hands it to `deriveRoleTargets`.
- `deriveRoleTargets` (`src/lib/edhrec/role-targets.ts:74-117`) classifies each distinct card once
  with `classifyCards` (`:56-72`), which calls `classifyRoles` on the front face
  (`castFaceText`). It then sums `inclusion / 100` into every role the card satisfies. The result
  is written to `commander_support.avg_ramp/draw/removal/wipes` (schema `:1167-1170`), and the same
  for pairs (`seed-index.ts:827-839`, `commander_pair_support`, schema `:1256-1259`).
- `db:build:staples` averages those columns into `identity_composition.avg_*`
  (`scripts/build-staples.ts:183-185`, schema `:1428-1431`), which serve the identity and count
  rungs.

So every target the strip can show is either a classifier sum or the asserted flat figure.
Recomputing the classifier sums from staging's own rows reproduced the stored figures on all
3,467 `ok` commanders (none differ by more than 0.05), so the stored targets are current.

Two more facts about today's strip, both found while measuring:

- **The strip counts one role per card.** `card.role` is `primaryRole` (`src/lib/decks/read.ts:96-99`),
  the first role `classifyRoles` pushes (land, then ramp, draw, wipes, removal). The targets count
  every role a card satisfies. An instant that destroys and draws counts once in the deck and
  twice in the target, so the strip already reads short against its own target.
- **The Jobs card counts every role, nonland cards only** (`src/lib/decks/job-rows.ts:9`,
  `src/components/decks/decklist.tsx:403-405`), and lists unlabeled cards separately rather than
  guessing for them (`src/lib/decks/job-tally.ts:51-55`).

### (b) Where labels and the classifier disagree

Two populations. Counts are distinct cards; "mass" is the summed EDHREC inclusion across every
`ok` commander, which is what moves a target.

**Every freshly labeled card (28,569):**

| role | both | classifier only | labels only |
|---|---|---|---|
| ramp | 1,379 | 54 | 1,281 |
| draw | 2,986 | 512 | 716 |
| removal | 2,480 | 611 (394 labeled counterspell) | 2,352 |
| wipes | 290 | 121 | 520 |

**The commander-index population** (cards an `ok` commander lists):

| role | both | classifier only | labels only | mass, classifier | mass, labels |
|---|---|---|---|---|---|
| ramp | 1,293 | 54 | 1,229 | 27,275 | 47,606 |
| draw | 2,736 | 468 | 665 | 28,518 | 30,552 |
| removal | 2,051 | 527 (347 labeled counterspell) | 2,001 | 17,780 | 22,500 |
| wipes | 254 | 104 | 463 | 2,418 | 5,124 |

Ten examples per direction, taken from the index population and ordered by inclusion mass:

- **Ramp, labels only:** Myriad Landscape; Exotic Orchard; Evolving Wilds; Nykthos, Shrine to Nyx;
  Nature's Lore; Terramorphic Expanse; Three Visits; Farseek; Fabled Passage; Cabal Coffers.
- **Ramp, classifier only:** The Soul Stone; Imprisoned in the Moon; Tablet of Discovery; Bilbo's
  Gambit; Elves of Deep Shadow; Vraska, Betrayal's Sting; The Irencrag; The Warring Triad;
  Blitzball; Glistening Sphere.
- **Draw, labels only:** Sign in Blood; Return of the Wildspeaker; Rishkar's Expertise; Windfall;
  Herald's Horn; Geier Reach Sanitarium; Valakut Awakening // Valakut Stoneforge; Midnight Clock;
  Sylvan Library; Terrasymbiosis.
- **Draw, classifier only:** Psychosis Crawler; Forgotten Cave; Teferi's Ageless Insight;
  Laboratory Maniac; Dawn's Truce; Chasm Skulker; Ozolith, the Shattered Spire; Secluded Steppe;
  Lonely Sandbar; Ominous Seas.
- **Removal, labels only:** Chaos Warp; Cyclonic Rift; Otawara, Soaring City; Aetherize; Sink into
  Stupor // Soporific Springs; Loran of the Third Path; Eiganjo, Seat of the Empire; Reprieve;
  Snap; Hullbreaker Horror.
- **Removal, classifier only:** Counterspell; Bojuka Bog; An Offer You Can't Refuse; Negate;
  Arcane Denial; Swan Song; Mana Drain; Fierce Guardianship; Dovin's Veto; Tibalt's Trickery.
- **Wipes, labels only:** Blasphemous Act; Vandalblast; Toxic Deluge; Chandra's Ignition; Chain
  Reaction; Living Death; Blasphemous Edict; All Is Dust; The Meathook Massacre; Damn.
- **Wipes, classifier only:** Scavenger Grounds; Abstergo Entertainment; Hex Magic; Lae'zel's
  Acrobatics; Settle the Wreckage; Rest in Peace; Demonic Consultation; Ob Nixilis, the Ascended;
  Jace, Reality Sculptor; Jace, the Mind Sculptor.

What the disagreement is made of:

- **Ramp is the labels being right.** The classifier's patterns miss land search that names a basic
  type (`Nature's Lore`, `Farseek`, `Three Visits`), treasure, cost reduction and extra land drops.
  The labels-only ramp cards by `rampKind`: fetchesLand 408, costReduction 295, makesTreasure 203,
  burstMana 138, extraLandDrop 123, tapsForMana 80, multiplies 56.
- **Labels call 163 lands ramp** (fetch lands, Exotic Orchard, Cabal Coffers). The classifier never
  does, and the Jobs card already drops every land face before it counts. This plan keeps that rule
  everywhere: a land is counted as a land, never as ramp.
- **Removal moves both ways.** The labels separate `counterspell` from removal (the vocabulary
  plan's Task 3), and that accounts for 347 of the 527 classifier-only cards. In the other direction
  the classifier misses bounce, `Chaos Warp`-style text and channel lands.
- **Wipes is the classifier's narrowest pattern** (`destroy all`, `exile all`, `all creatures get
  -N`), so it misses damage sweepers, `Toxic Deluge`, artifact wipes and edicts. Its false hits are
  planeswalker ultimates and graveyard hate that say "exile all".
- **Draw is close.** The classifier only misses wheels, `Sign in Blood` and card-advantage engines,
  and it wrongly counts cycling lands.

### (c) What switching changes for a reader

**Targets.** Rebuilt from labels with the Jobs card's rules, the mean target across 3,467 `ok`
commanders moves. The rules: nonland only, and a card with no fresh label counts toward no role,
the same as the Jobs card counts it. Fresh labels cover 97.3% of the inclusion mass.

| role | today (classifier) | from labels | per-commander change, whole cards (p10 / median / p90) |
|---|---|---|---|
| ramp | 7.87 | 11.60 | +1 / +3 / +6 |
| draw | 8.31 | 8.39 | -1 / 0 / +2 |
| removal | 5.15 | 6.20 | -1 / +1 / +3 |
| wipes | 0.71 | 1.47 | 0 / +1 / +2 |

Counting lands as ramp would raise the ramp mean to 13.73. That is the gap the nonland rule closes.
A first pass let an unlabeled card fall back to the classifier. It moved the draw, removal and
wipes means by 0.08 or less, and every verdict count below came out identical under both rules.

**Verdicts on Hugh's real decks.** Staging holds 21 decks on one account, 18 committed at least
once and 6 with a logged game. Twenty have a commander-rung target. (HD - Gods is a pair and was
left out of the shift counts; its counts are 11/12/5/0 today and 11/12/6/1 from labels.) The strip
cell is binary, met or short (`roleCellState`, `src/lib/decks/mix.ts:169-187`).

Switching **counts and targets together**:

| role | met to short | short to met | unchanged |
|---|---|---|---|
| ramp | 5 | 3 | 12 |
| draw | 0 | 6 | 14 |
| removal | 0 | 6 | 14 |
| wipes | 5 | 0 | 15 |

Switching **counts only**, with the classifier targets left in place:

| role | met to short | short to met | unchanged |
|---|---|---|---|
| ramp | 0 | 4 | 16 |
| draw | 1 | 6 | 13 |
| removal | 0 | 6 | 14 |
| wipes | 0 | 1 | 19 |

The counts-only switch moves 17 cells to "met" and one the other way. Labels find more of every
role than the classifier does, so measuring them against the classifier's bars flatters every deck.
**Counts and targets have to move together, or not at all.**

A sample of the per-deck change (today's count/target, then labels count/target):

- HD - Gishath: ramp 11/9 met, then 22/17 met. Wipes 1/1, then 7/2. This is the deck from the
  report. The report read 12 and 23. Both figures here are one lower, and they come from staging's
  snapshot of the deck (84 rows, 99 copies), so a deck one ramp card apart from the one the
  report read would account for it. That was not confirmed. The strip's 11 includes
  `Shatterskull Smashing`, because its land back reads as ramp on whole text. The verdict figures are directions on a snapshot, and PR 2's acceptance check
  re-reads them through the page itself.
- HD - Wizards: removal 15/19 short, then 6/4 met. The count and the bar both fall, because the
  labels stop counting counterspells as removal.
- HD - Goblins: ramp 6/6 met, then 7/9 short.
- HD - Eldrazi: draw 3/10 short, then 13/11 met.
- HD - Omnath: wipes 0/0 met, then 0/1 short. That is the commanders whose classifier wipes target
  rounded to 0 now asking for one.

## The plan

### Keep the classifier targets standing beside the label ones

The role targets have far more readers than the strip. `pickRoleTargets` feeds the skeleton, the
create path, the fit score, Role Coverage, the thinnest role, the fill, Discover's ranking and the
tuning evidence (`src/lib/profile/*`, `src/lib/recs/*`, `src/lib/decks/fill.ts`,
`src/lib/discovery/list.ts`, `src/lib/tuning/evidence.ts`, and three `src/components/commanders/*`
sections). Each of those counts a deck with the classifier. Replacing `avg_*` in place would set
every one of them against a bar a classifier count rarely reaches. The median commander's ramp
target rises by three cards, so the fill would place about three more ramp cards in a typical deck,
and every commander's fit score and coverage figures would move.

So the label targets are **new columns beside the old ones**: `label_ramp`, `label_draw`,
`label_removal` and `label_wipes`, on `commander_support`, `commander_pair_support` and
`identity_composition`. All are nullable, on `identity_composition` too, although its `avg_*` are
`not null default 0` (schema `:1428-1431`). A bucket none of whose commanders carries a label
figure has no measurement, which happens on a database the labelling job has not reached, and a 0
there would read as "this identity plays no ramp" to a reader taking the labels basis. A reader moves to them when its own count moves to labels, and never
before. When the last reader has moved, a cleanup migration drops `avg_ramp/draw/removal/wipes`.

### Rebuild the targets from labels in the index build (compute only)

- `deriveRoleTargets` takes a role lookup instead of calling the classifier itself. The build
  calls it twice over the same rows. The first call uses `classifyCards` and writes `avg_*` as
  today. The second uses the labels and writes `label_*`.
- The label lookup reads `card_labels` through `freshLabels`, the page's own freshness rule, so a
  stale label behaves the same in the build and on the page. Roles are the `role`-space kinds
  ramp, draw, removal and wipes. A land face counts toward none of the four. `counterspell` is not
  removal. A card with no fresh label counts toward no role, the same as in the deck's own count,
  so counts and targets share one rule. That is 2.7% of the inclusion mass today, and the build
  report prints the share so it stays visible.
- The floors stay as they are. `roleTargetsPublishable` applies to the label pass too, for
  commanders and for pairs.
- `db:build:staples` averages `label_*` into `identity_composition` beside `avg_*`. A bucket with
  no label figure stays null.
- `pickRoleTargets` takes a `basis: "classifier" | "labels"` argument, so a reader asks for the set
  that matches its own count. Nothing calls it with labels until PR 2.
- No model call. The labels already exist. The only cost is one more pass over 892k rows the build
  already holds in memory.

**The flat fallback is re-stated from the label means** (Hugh, 2026-10-09). `ROLE_TARGETS`
(10/10/8/3) was asserted for the classifier. The label set is the measured means, rounded, about
12/8/6/1. It goes in `roles.ts` as its own constant beside the old one, with a comment saying how
it was measured, and the labels basis reads it. Re-measure it from the stored `label_*` after the
staging build, not from this plan's figures.

### Switch the strip, behind one switch

- `card.role` stays as it is. Its other readers (grouping, search, the swaps) are not part of
  this line. The deck page adds the label rows it already loads for the Jobs card
  (`loadJobRows`), and the strip's four role cells count from those through `jobTally`, so the strip
  and the Jobs card share one tally function and cannot disagree. Land still counts with
  `isLandFace`, as it does today.
- The strip takes `label_*` targets through `pickRoleTargets(..., "labels")`.
- Every `computeRoleCounts` reader on the deck page moves with the strip, or the page disagrees
  with itself again. There are six: the strip's before figure (`wasCounts`,
  `src/app/decks/[id]/page.tsx:249`), the Changed strip (`changed-strip.tsx:137-138`), the
  Shopping view's `from → to` gap clauses (`decklist.tsx:637`, which the reader checks against the
  strip on the same screen), the resolve role clause (`unresolved-group.tsx:136`), the Consider
  panel's coverage shelves (`consider-panel.tsx:48`) and the builder's role toast
  (`builder-shell.tsx:870`). PR 2 finds them by grep for `computeRoleCounts(` rather than by this
  list.
- A card with no fresh label is not counted in a role, which is the Jobs card's rule. The strip's
  disclosure says how many of the deck's cards are unlabeled when that number is above zero. The
  wording goes to `/copy-review`.
- Gated by a server-read switch, `LABEL_ROLE_COUNTS_ENABLED`, read the way `analysisTabEnabled()`
  reads its own. Off renders exactly what ships today. Turning it off is the rollback, and no data
  has to move back.

### Switch the Colors ramp (Deck stats PR 4b)

Deck stats PR 4b has not been built. Its plan
(`docs/superpowers/plans/2026-10-08-deck-stats.md:88-106`) finds non-land mana sources by extending
`classifyRoles`'s ramp pattern. Instead, **which cards are sources** comes from the labels: a
nonland card whose label carries `ramp` with `rampKind` `tapsForMana` or `fetchesLand`.
`makesTreasure`, `costReduction`, `extraLandDrop`, `multiplies` and `burstMana` make no lasting
source and stay out. **Which color** still comes from the card's text, which is what the mana
addendum's rule 1 says (`design/design_handoff_the99_deck_stats_mana/README.md:68`). Labels carry
no color. The Colors card excludes Treasure, Powerstone and Lander tokens (one-shot or restricted mana, as the
mana addendum's counting table has it), landcycling and look-at-the-top effects (orchestrator ruling,
2026-10-10). A card with no fresh label falls back to the classifier's ramp pattern, so the card always
draws something.

This changes the input of `manaSupply()`, not what the card draws. The addendum still applies as
written, and needs no new Design round. The addendum's "measure the unreadable-color share" step
runs on the label-selected sources.

### What it costs a reader

- The deck page already reads labels for the Jobs card while `DECK_STATS_ENABLED` is on
  (`loadJobRows`, `src/app/decks/[id]/page.tsx:128-129`). The strip makes that read unconditional:
  one indexed join of `card_labels` to `cards` over about 100 ids. It is not cached. `readLabels`
  is a plain query on every render, so a label publish shows on the next page load with no cache
  to retire. The targets are different: they arrive in the cached `mix` payload, keyed on the
  index generation, so a new index copy retires them the way it already does.

## Risk to the copy-to-production pipeline

The build reads labels, so a commander's label targets now depend on **which labels the build
saw**, and the copy harness's fingerprint does not cover that. The catalog input fingerprint
(`src/lib/catalog/fingerprint.ts`) hashes `cards` columns only. Today's targets read only
`cards`, so the fingerprint vouches for them completely. Label targets would not be vouched for.

The failure is quiet. Staging builds `label_*` from staging's labels, `db:copy:index` installs them
on production, and production's deck pages count from **production's** labels. Production only
receives a label after `db:copy:labels` finds it fresh against production's own card text. If
production is missing labels that staging used, production's counts and targets come from two
different label sets, and the same gap this line exists to close comes back.

The fix, in PR 1:

1. **The build records a label fingerprint over what it USED.** The index build's ledger row
   stores an md5 over each card the index lists, paired with the role set the build derived from
   its fresh labels: the sorted role kinds, after the land and counterspell rules, or "unlabeled".
   It sits in the report beside the catalog fingerprint, and the staples row inherits it the way
   it inherits the catalog fingerprint. It hashes the output and not the label's `input_hash`.
   A `list:` relabel can replace a row's jobs under the same model, version and card text, and
   then the input hash does not move, so a hash of inputs would vouch for roles the build never
   saw.
2. **`db:copy:index` refuses on a label mismatch.** Inside the target transaction it derives the
   same role sets from the target's own fresh labels and hashes them the same way. If that differs
   from the build's, the copy rolls back and exits 2. The remedy is a moved catalog's remedy:
   bring the labels level, rebuild on staging, then copy. It fails closed, like every other check
   in the harness.
3. **The copy job does NOT copy labels itself.** A `list:` run is a prompt trial, and its labels
   stay on staging until the trial is judged (`.github/workflows/card-labels.yml:408-411`).
   `db:copy:labels` installs every staging label that is fresh on production, so running it from
   the index copy would publish an unjudged trial. Labels keep reaching production only through
   the `Card labels` workflow's own `copy` job. The cost is that an index copy refuses while a
   trial is open on staging and the build read its rows. That is the guard working: the targets
   would have been derived from labels production does not hold. The copy then waits for the trial
   to be judged and copied, or for a rebuild after the trial is reverted.
4. **New columns copy without new copy code.** `index-copy.ts` selects
   `getTableColumns(commanderSupport)` less the prose columns (`scripts/lib/index-copy.ts:39-48,86`),
   so `label_*` travel and are verified with no change. The migration has to reach production
   before the first copy that carries them. Production migrates in its Vercel build, so the order
   is: merge, then the production deploy reports 200 on `/api/health`, then a `copy-only`
   dispatch.

Unchanged by this plan: the prose input hash (themes only, not roles), the `commander_scores`
clear inside the copy, and `readIndexGeneration`, which keys on `max(computed_at)` and retires
cached pages after every copy.

## PR boundaries

No stacked PRs. Each PR lands on `main` on its own, and each is well under 20 files and 800 lines.

| # | PR | Scope | Depends on |
|---|---|---|---|
| 1 | Label role targets in the build | Migration adding `label_*` to the three tables. `deriveRoleTargets` takes a role lookup. Label pass in `deriveAndWriteRoleTargets` with its floors. `db:build:staples` averages it. `pickRoleTargets` basis argument. Role-set fingerprint in the ledger, and the copy's refusal on a mismatch. Tests: the nonland rule, the counterspell rule, an unlabeled card counting toward nothing, the floor, the fingerprint refusal, including a relabel under an unchanged `input_hash`. No reader changes. | — |
| — | Staging build and production copy | Dispatch `Commander index` with `build+copy`, `prose=skip` once PR 1 is on production. Confirm `label_*` on every `ok` commander on both sides. Re-run this plan's measurement against the stored figures. | 1 |
| 2 | The strip counts and compares on labels | `LABEL_ROLE_COUNTS_ENABLED`. The strip, Changed strip, Consider shelves and the builder toast count through `jobTally`. Label targets through `pickRoleTargets`. The unlabeled line in the disclosure (copy through `/copy-review`). The re-stated flat fallback in `roles.ts`. | the build |
| 3 | Deck stats PR 4b on labels | **Owned by the Deck stats lane (lane 73), not this line.** `manaSupply()` picks non-land sources by label `rampKind` and colors them from text. Replaces the 4b row in the deck-stats plan. | Deck stats PR 4, the mana addendum |

| 4 | The fill on labels | The fill counts placed and candidate cards by label and fills to `label_*` targets. **A card with no label yet**, such as a new set before the weekly label job, **falls back to the classifier for that card and is never skipped** (Hugh, 2026-10-09). The fill must still place it, and a skipped card would vanish from the deck the fill builds. | 2 |
| 5 | The fit score on labels | `src/lib/profile/fit.ts` and its callers count roles by label against `label_*`. | 2 |
| 6 | Role Coverage and the thinnest role on labels | `src/lib/recs/weakest-role.ts` and the commander page's coverage and why sections. | 2 |
| 7 | Discover's ranking on labels | `src/lib/discovery/list.ts`, `src/lib/recs/recommend.ts`, `free-ranking.ts` and `score.ts`. | 5 |
| 8 | The tuning evidence on labels | `src/lib/tuning/evidence.ts`. This changes the Suggested changes model's INPUTS, so it shares ONE paid eval re-run with the roadmap's sub-project 8, one run covering both lists. **Hugh's cost OK comes before that run.** | 2, and Hugh's cost OK |
| 9 | Drop `avg_*` | The cleanup migration closes the line: drop `avg_ramp/draw/removal/wipes` on the three tables, the classifier pass in the build, and the `basis` argument. Only once a grep finds no reader of `avg_*` or of the classifier basis. | 4 to 8 |

**Every reader PR from 4 to 8 carries before/after numbers in its PR body**, measured read-only on
Hugh's 20 staging decks the way this plan's verdict table was (Hugh, 2026-10-09). The fill reports
what it would place in each deck. The fit score, coverage, thinnest role and Discover report each
deck's commander's figure or rank. The tuning evidence reports the inputs that change for each deck.
Each is a ranking change Hugh sees measured on its own.

`card.role` (`primaryRole`) also feeds deck grouping, the deck's card search and the swaps
(`src/lib/swaps/fits.ts`). Those name a card's job rather than count against a target, so they are
not readers of the targets, and moving them is not this line's acceptance condition. PR 9's grep
lists any that remain, so their status is recorded before the line closes.

**About entry.** None. The strip and the Jobs card already have entries. This line changes what a
number on a known surface counts, which is the cosmetic case in AGENTS.md. If the strip's
disclosure gains the unlabeled line, the existing entry's key line is edited at the next version.

## The rule on `DECK_STATS_ENABLED`

**`DECK_STATS_ENABLED` is not turned on for production until PR 2 has shipped with
`LABEL_ROLE_COUNTS_ENABLED` on in production.** Until then, turning Deck stats on puts the
Jobs card's label count next to the strip's classifier count on every deck page, which is the bug
this plan exists to fix. Staging can keep it on so both can be measured. The rule goes into the
deck-stats plan's rollout section in PR 2, and its close-out checks it.

## Tests and proof

- Pure: the label lookup (land face, counterspell, stale, fallback), `deriveRoleTargets` with each
  lookup, `pickRoleTargets` by basis, the label fingerprint and the copy's refusal on a changed
  label (`index-copy.test.mts`).
- The build: a staging scratch-branch build reproduces the means in §(c) within rounding before
  PR 1 merges.
- The page: with the switch on, the strip and the Jobs card show equal ramp, draw, removal and
  wipes counts on every deck on a `pull:staging` copy. That is the acceptance check for the line.
