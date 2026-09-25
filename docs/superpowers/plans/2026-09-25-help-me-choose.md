# Help me choose (sub-project 8): intake to deck

Run by the eval-harness session (the-99-1f) under `boards/lanes/help-me-choose.md`. Sources, in
precedence:
1. Hugh's rulings: the brief `docs/superpowers/design-briefs/2026-09-24-intake-to-deck.md` (§2's ten
   rulings, §3.0's readings, §6's engineering), and the audit
   `design/design_handoff_the99_help_me_choose/READINESS-audit.md` (#947, Green, rulings H1 and H2).
2. The R1 handoff, with the audit's F1 to F12 built to.
3. The playbook's budget rules.

## Rulings (Hugh, 2026-09-25)

1. **The plan is approved**, and the deeper read is settled as written below: `claude-sonnet-5` at
   `effort: "low"`, 3,000 output tokens, one credit per read, refunded on failure, on Stop and when
   nothing valid comes back.
2. **The optional Haiku check is declined.** It is not run and nothing is spent on it.
3. **Migration 0061**, not 0060, which is pinned to the notices lane's Locked work. If this
   migration is ready before 0060 is on main, the orchestrator is told first, so the journal keeps no
   gap. Whichever lands second regenerates and re-stamps the ledger.
4. **The fence is approved** and recorded in `boards/lanes/help-me-choose.md`. Shared files need their
   owner's go first:
   - `actions.ts` and `fill.ts`: the swap lane, and later the notices lane for its Locked sweep;
   - `synopsis/read.ts`: the notices lane (the-99-d8).
   `tuning/limits.ts`, `tuning-read.ts` and the credits copy are already this session's from v2.
   `src/lib/recs/**` is import only.

## What ships

A player who doesn't know what to build answers optional questions (their own words, colors,
themes, budget, bracket) and gets single commanders (ruling 10) ranked in one order, owned and
unowned together. They then start a deck from one.

- **The free match.** Their words are matched literally, at no cost, against:
  - theme tag labels;
  - catalog card names;
  - dollar figures;
  - "bracket N".
- **Look deeper** is a one-credit model read. It is offered whenever words were typed (H2) and
  charged only when pressed. It is refunded when it fails (H2), and when it is stopped or finds
  nothing valid (F4).
- **Answers after the search.** After *Find commanders* the answers become read-only chips.
  *Change answers* and *Start over* are how the player edits them (H1).
- **No AI wording.** The UI never says AI, model or LLM (audit's wording rule).
- **One switch.** It is all behind `HELP_ME_CHOOSE_ENABLED`, ON in staging and OFF in production.
  One reader gates the route (not-found when off) and both doors (F3).

## The deeper read: model, effort, cost (settled)

The read maps the player's leftover words onto chips from vocabularies the app already holds: theme
tags, catalog card names, a budget and a bracket.

- It never names a commander (brief §1).
- Every chip is checked against the tag vocabulary or the catalog before it counts.
- It is a small classification task, closer to the synopsis than to tuning.

**`claude-sonnet-5` at `effort: "low"`, 3,000 output tokens.** 3,000 is the synopsis's ceiling at
that effort, the one precedent for low. Sonnet 5's adaptive thinking counts inside `max_tokens`,
and tuning's replies ran out of room at 3,000 at default effort. So the room is not cut below the
synopsis's.

- **Measured input** (staging, 2026-09-25, read-only): the theme tags number 401 in all, with labels
  totalling 3,315 characters, about 830 tokens. The picker's vocabulary floor only shrinks that, so
  the vocabulary is at most about 1,000 tokens with separators. The prompt is then about 1,800 tokens
  in total: about 600 of instructions, up to 1,000 of vocabulary and up to 200 of the player's
  words. The catalog is not sent: the model writes card names and the validator resolves them, as
  tuning's does.
- **Cost per read: about $0.010** (1,800 × $2/M in, plus about 600 out × $10/M). At the ceiling it is
  $0.034. A read spends one unit of the shared allowance (owner 10, friends 3, rolling 24h). At full
  use, reads cost everyone about $0.27 a day, against tuning's $1.37.
- **One optional check, which could only have lowered that cost (declined, ruling 2).** A 20-phrasing hand-written dev fixture
  (themes, card names, a budget, a bracket, and words that map to nothing), run on `sonnet-low` and
  `haiku`. It measures valid chips, words a reader would map that stay unmapped, truncation at the
  ceiling, and $/read. Haiku replaces Sonnet only if it is as valid and never truncates, which would
  halve the cost. About $0.25 of the eval budget's remaining $1.28, with the worst case checked
  against the ledger first. Whatever cell ships, its input ceiling is measured with count_tokens for
  `FEATURE_CALLS`.

## Decisions the brief and audit leave open

1. **A read gets its own row.** It happens before any deck exists, and Stop must refund (F4). With a
   request-scoped reservation a Stop is only a client abort, and the server would settle `spent`
   for an answer nobody saw. So a read gets a row, `intake_reads`:
   - it holds the user, a hash of the words, its status, its `model_call_id` and its chips;
   - it settles in the same transaction as its unit, the way tuning's run does;
   - Stop cancels it, and a late answer writes nothing;
   - the reaper frees a read stranded past the model deadline;
   - validation runs before the settle, so a read with no valid chip is refunded (F4).
2. **Control beats words for the deeper read too.** Reading 2 states the rule for the free match.
   A model chip for budget or bracket that disagrees with a set control goes under *Not used*.
3. **Answers are stored as data (F1).**
   - Budget, bracket and the build-around card become columns on `decks`, plus an "intent not yet
     written" marker.
   - `createDeck` writes them on both paths.
   - A failed fill's retry, `fillDeck`, reads them and places the build-around card.
   - The intent sentence gets a new copy key, and an answers variant of `seededIntent` with the same
     fallback chain under the 120-character cap (F2).
4. **"Paused" is judged per feature.** `allowance.ts:104-106` compares what remains against the
   CHEAPEST feature's call, so adding a cheap read would show tuning and the overview as available
   when their own larger call would be refused. The check is made per feature, and its two readers
   (`tuning-read.ts`, `synopsis/read.ts`) ask for their own.
5. **Too narrow means fewer than 4 (F7).** The brief's superseded wording is not built: "Read it
   properly", "editable before any results", and the offer only on leftover words (H1, H2).
6. **The floors are measured, never asserted.**
   - The theme-fit sample floor (with `THEME_FLOOR_RATIO` as precedent) and the picker's vocabulary
     floor (across commanders, deduplicated by slug) are measured on staging in PR 2.
   - Each is printed with its derivation.

## PR boundaries (each 20 files or fewer)

**PR 1: plumbing.**
- Migration 0061 (ruling 3). It adds:
  - `intake_reads`;
  - the answer columns on `decks`;
  - the card-first index on `commander_support_cards`, if the brief's index is not already there.
    It is: `commander_support_cards_oracle_idx` on `oracle_id`, so the migration adds none.
- The per-feature paused check and its two readers.
- Tests, and `probe:help-me-choose-plumbing` for the migration and the paused check. It runs on a
  scratch branch rather than local-dev, because the paused case writes an app-wide spend sentinel
  that would pause every dev server reading local-dev's ledger.
- **Moved to PR 4 while building:** the model feature (`'intake'` in `ModelFeature`, its
  `FEATURE_CALLS` entry, and `src/lib/intake/limits.ts`). `FEATURE_CALLS` holds each feature's
  measured input ceiling, and that is measured with count_tokens on the prompt, which PR 4 writes.
  Registered here, it would be a guessed ceiling pricing every reservation. `'intake'` in
  `model_calls_feature_check` moves with it, in PR 4's own migration: the ledger may hold only
  features the code can price, since one unpriced row the code cannot price makes `readAllowance`
  throw for every player.
- **Moved to PR 5:** the flag reader, `.env.example` and `docs/deployment.md`. The route and the
  doors it gates arrive there, and a flag with no reader would tell an operator to set a variable
  that changes nothing.

**PR 2: the search engine (brief §6).**
- The literal matcher. Engineering owns its stop words.
- The candidates: single commanders only, commander-legal and unbuilt, owned and unowned in one order.
  Discover's `discoverCandidates` excludes owned commanders, so this gets its own WHERE.
- The orders:
  - **Theme fit** is `count / deck_count`. A commander with no tag, a null `deck_count`, or fewer
    decks than the sample floor is excluded.
  - **Card fit** is `inclusion`, found through the card-first index.
  - **The no-theme order** is `overlapOwned` from `src/lib/recs/score.ts`.
- The pass/fail filters: colors, and the bracket tested on the commander plus the build-around card.
  The commander's own price, and an unowned build-around card's, are tested against the budget.
- The too-narrow counter, which re-runs the filters with each answer removed in turn and runs no
  fills.
- The floors, measured.
- A probe against local-dev, and mutations.

**PR 2 as built (2026-09-25).**
- **The floors are measured on staging, and both reuse existing rules** rather than adding new
  numbers. Staging has 3,380 commanders; none has a null `deck_count`, and 108 have no tags.
  - The theme sample floor is `THIN_DECK_COUNT` (27, still staging's p10).
  - A tag counts on a commander only at `themeFloorFor`'s 0.5%.
  - The picker's vocabulary is tags that at least `TOO_NARROW_BELOW` (4) commanders back, with
    formats excluded. Fewer, and choosing the tag can only produce the too-narrow state. That keeps
    307 of staging's 401 tags; 370 back at least one commander.
- **The free match's rules** are engineering's:
  - the longest phrase wins, and a theme beats a card on the same phrase;
  - a theme answers to its singular forms;
  - a one-word card name needs a capital, so a player typing "a fog of a deck" doesn't get `Fog`;
  - basic lands are never build-around cards;
  - stop words are dropped, and every other unmatched word is leftover.
- **A price never stocked passes the budget**, since it can't be tested; the row says the price
  is unknown (PR 5 draws that).
- **`inclusion` is a percentage.** `commander_support_cards` stores EDHREC's 0–100. The loader
  divides it to a share so it can meet a theme's share in the weaker-figure order. The probe
  caught it reading 100.
- **`violationsFor` in `bracket/rules.ts`** (orchestrator's go) is now the one statement of the
  limits. `slotDeck`, `bracketDelta` and the intake filter all call it.

**PR 3: the fill constraints and the stored answers.**
- `PlanFillArgs` / `buildFillPlan`:
  - **Budget** is a running cap at the cheapest printing stocked now. A never-stocked card is left
    out of a budgeted fill. An owned copy claimed by committed decks is priced as a buy. The
    build-around card is always placed and priced first. Basics finish the body.
  - **Bracket** applies the limits of `src/lib/bracket/rules.ts`, counting the commander and the
    build-around card. At brackets 1 and 2 a pairwise check stops the fill completing a two-card
    combo. At bracket 3 it skips a tutor that would make `comboLandsEarly` hold.
- `createDeck` writes the answers on both paths.
- `fillDeck` reads them and places the build-around card (F1).
- The answers intent sentence (F2).
- The per-row trial fill, which runs for on-screen rows only, drives the row's ownership figures,
  and filters nothing.
- `probe:fill`-style proof, and mutations.

**PR 3 as built (2026-09-25).**
- **`planFill` takes a gate**, an optional `FillGate` with `admits` and `place`. It is checked at
  every placement point: the floor loop, its tie-break scan, each land pass through `takeLand`,
  and the residual. Absent, every caller fills as before; the probe checks that a bracket-4 ask
  with no budget returns the plain plan row for row.
- **The budget gate** (`fill-gate.ts`) is a running cap over buys, where a buy follows the
  Shopping list's rule: a basic never; an unowned card; an owned card whose every copy is claimed.
  A card never stocked is left out. The build-around card is charged first.
- **The bracket gate** counts the commander and the build-around card, then every placement, through
  `violationsFor`.
  - At 1 and 2 it refuses the second half of any counted two-card combo.
  - At 3 it refuses what would let the deck assemble one (`comboLandsEarly`, with the profile
    builder's reach rules).
- **The answers are written at create, on both paths**, the brief included. At creation nobody has
  edited the intent yet, and it is the only moment the themes are known. `fillDeck` reads the
  stored budget, bracket and card, places the card first and fills under the gates, but writes no
  intent, by the rule that path already keeps (a cleared line reads like one never written). So
  **`answer_intent_pending` is unused**; PR 4's migration drops it.
- **The trial fill** (`trial.ts`) gives a row its figures: owned of the body, and the Shopping-list
  buy total. A never-stocked build-around card is flagged rather than priced at $0 (F8).
- The stale "up to five" comment in `decks-builder.ts` now says six (orchestrator's note).

**PR 4: the deeper read.**
- The model feature, moved from PR 1: `ModelFeature`, `FEATURE_CALLS` with its measured input
  ceiling, `src/lib/intake/limits.ts`, and a migration adding `'intake'` to
  `model_calls_feature_check` and dropping the unused `decks.answer_intent_pending` (see PR 3).
- The prompt, the response schema, and the validator: vocabulary and catalog, with control beating
  words.
- The run store and the reaper.
- The Server Actions to press and to Stop.
- `probe:help-me-choose-read` against local-dev. It proves that a read's unit is:
  - spent only on valid chips;
  - refunded on failure, on Stop, and when nothing valid came back;
  - left untouched by a late answer, which writes nothing.
- Mutations.

**PR 5 is split in two (orchestrator-approved, 2026-09-25).** Measured against the handoff it ran
well past 800 lines, so the boundary sits between the data the screens read and the screens:
- **PR 5a, the data (no UI):** the URL's answers, the words' resolution, the page slices, the
  decorations of the rows on screen, the too-narrow facts, and the catalog memo.
- **PR 5b, the screens:** everything listed under PR 5 below, the flag, and migration 0064.

**PR 5a as built.**
- **The URL carries RESOLVED answers** (`src/lib/intake/params.ts`): `t` theme slugs, `a` card,
  `b`, `k`, `c`/`m` in the lanes' own encoding, `w` the words (for display only), `r` (PR 6) and
  `v=results`. The form resolves the words once, on submit (`resolveWords`). The results never
  match again, so any single answer, a typed card included, is dropped by removing its param.
- **The first card, budget and bracket in the words count**, and the rest go under *Not used*, as
  does a figure a set control overrides.
- **`MatchResult.phrases`**: each run of unmatched words, verbatim, split at a match, a figure or
  a clause break, with stop words trimmed from its ends. This is the *Not used* line's source.
- **A page is 12 rows** (`loadResultsPage`). Only those rows are decorated: the owned printing's
  art, the commander's own mark (free, held in a named deck, or its buy price state), and the
  support total the owned order's figure needs. The search runs again for each slice.
- **Too narrow gains two facts**: `widen`, the count if exact colors became any of them, and
  `cardOverBracket`, set when the build-around card is a Game Changer at bracket 1 or 2. Capping
  the options to three and hiding empty ones is presentation, so it is left to 5b.
- **The vocabulary and phrase index are memoized in memory**, per server instance and catalog
  generation, for at most ten minutes. The index is about 30,000 card names, past the data cache's
  2 MB entry limit.

**PR 5: the intake and results screens.**
- The flag reader, `.env.example` and `docs/deployment.md`, moved from PR 1.
- `/decks/new/choose`:
  - the form (2a, 2b);
  - the results: the bar, the order line, 12 rows then *Show 12 more*, and the best-fit cards;
  - too narrow, none fit, searching, search failed, and a row loading or failed;
  - the answer chips with *Change answers* and *Start over*.
- The copy module (F6, F12).
- Its gates: design-review, a probe at 390 and 1300 that presses *Find commanders*, *Change
  answers* and *Start over*, mutations, and feature-acceptance.

**PR 6: Look deeper, the doors and the hand-off.**
- The panel's seven states plus owner share, derived from the paused frame (F11), and the deeper
  chips with their tag.
- The doors:
  - the create picker's box;
  - Discover's link, carrying `c` and `m`, through `filter-rack.tsx`'s `resultTrailing` (F5).
- `CreatePreFilled`: the *Built from your answers* block, its back links, and its inline strings
  moved into copy (F10).
- The widened credit strings (F9: `creditsCopy.spent`, `PAUSED_REASON`, `createPicker.sub`).
- Its gates: design-review, a probe that presses both doors, *Look deeper* (stubbed model, as the
  synopsis's probes do) and a result into deck creation, mutations, and feature-acceptance, run
  again at the line's close.

**Copy review.** The copy for F6, F8 (the unpriced row's buy figure leaves the card out) and F9 goes
to /copy-review with pictures, through the orchestrator, before PR 5 and PR 6 merge. The word in
`creditsCopy.spent` is Hugh's.

## About entry (batched)

No entry ships with these PRs. The analysis line batches its About entries at launch (ruled
2026-09-21), so this feature's entry and its share of the `ABOUT_VERSION` bump are a named task in
the line's launch batch. Brief §7 gives no spec for it, so Design draws it then on the per-entry
artboard.

## Fence

The lane's proposed fence, plus:
- `src/lib/model/**`
- `src/db/schema.ts`
- `drizzle/**`
- `src/app/decks/actions.ts`
- `src/lib/decks/fill.ts`
- `src/lib/decks/tuning-read.ts`
- `src/lib/synopsis/read.ts`
- `src/lib/recs/**` (for `overlapOwned`, imported, not changed)
- `src/lib/tuning/limits.ts` (the answers variant of `seededIntent`)
- `src/lib/copy/deck-tuning.ts`
- `src/lib/copy/credits.ts`
- `src/lib/copy/decks-builder.ts`
- `src/components/decks/create-pre-filled.tsx`
- `src/components/decks/create-picker.tsx`
- `src/components/commanders/rack/filter-rack.tsx`
- `package.json` (the probe scripts)
- `scripts/eval/**` (the dev fixture)

## Asks of the-99-d9 before any code

Settled by rulings 3 and 4.
