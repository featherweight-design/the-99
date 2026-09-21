# Deck Analysis Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Deck Profile — the app's first object for "what is this deck, characterized" — and prove it with two model-free consumers: a measured deck skeleton (`fitSkeleton`) and strict WotC bracket slotting (`slotDeck`, `bracketDelta`, `upgradePath`), fed by three new ingests (Scryfall `game_changer`, Commander Spellbook combos and card flags, the widened EDHREC parse) and one derivation (`format_staples` + `identity_composition`).

**Architecture:** Facts and verdicts split (spec §2.5). Ingests write local tables on scheduled jobs so slotting is a SQL question, never a render-time fetch. The profile is a pure builder (`buildDeckProfile`) plus a loader that gathers rows; every verdict — `slotDeck`, `fitSkeleton`, `bracketDelta`, `upgradePath` — is a pure function over the profile, unit-testable with no database. Three oracle-text classifiers (mass land denial, extra turns, tutor targets) live in one production module that the committed measure scripts import, so the measured rule and the shipped rule are one rule. **No UI ships in this sub-project** (Tier A only, spec §11).

**Tech Stack:** Next.js 16 (App Router), Drizzle ORM on Neon Postgres, Vitest, tsx scripts, GitHub Actions. No new dependencies — the Spellbook bulk parser is hand-rolled and mutation-tested, like every other parser in this repo.

**Spec:** `docs/superpowers/specs/2026-09-19-deck-analysis-foundation-design.md` (same branch). The spec's §13 lists what it deliberately left to this plan; the **§13 resolutions** section below is where each is settled.

**Design brief:** already emitted — `docs/superpowers/design-briefs/2026-09-19-where-deck-analysis-lives.md` (Round 0). No plan task re-emits it.

---

## Global Constraints

Every task's requirements implicitly include this section.

**Workflow.**

- All work in a worktree under `.worktrees/<branch>`; the main checkout stays on `main`.
- Pre-push gate, every push: `pnpm typecheck && pnpm lint && pnpm test`, plus the stub-DB build (`DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`), then `git fetch origin && git rebase origin/main`.
- Stage files by name — never `git add -A`.
- Migrations are generated with `pnpm db:generate`, never handwritten. The highest existing migration is `drizzle/0039_harsh_lord_hawal.sql`; the numbers below assume the six PRs land in order and shift if they do not.
- Scripts read secrets through `requireEnv` from `scripts/lib/env.mjs`, first import, own line (the convention `env.test.mts` enforces).
- Every probe and seed fixture: per-run `user_id`, deleted in a `finally`, pointed at `local-dev` or a scratch Neon branch, **never production**. No `process.exit` in a `finally` — it swallows the exception (three probes have paid for this).
- Scripted sweeps assert every replacement applied — a `str.replace` whose target drifted must fail loudly, not report clean.

**Spec rulings that bind every task (§2, restated once here):**

- **Report, never weight** (§2.1). No invented threshold anywhere. Tutors have NO bracket rule — `ruleless`, never `unquantified`.
- **Never a single power number** (§2.2). Every list carries card references, never counts alone; every count carries its denominator.
- **Every threshold is measured and reproducible** (§2.4a). A classifier ships only after its measure script confirms the committed figures.
- **The profile is facts; verdicts are pure functions over it** (§2.5).
- **Default false under-claims** — the correct direction for every flag column (§4.1). A partial ingest must never silently un-flag (§13.4, resolution R12).
- **No `all` condition in the staples floor; membership unweighted; `weighted_rank` orders display only** (§4A.1, §4A.2).
- **`ProfileThemes` stays null** (§5.3, #724). Filling it with commander tags is the one forbidden shortcut.
- **`declared` is never inferred and never defaulted** (§6.1a).
- **Bracket 5 is never derived; Bracket 1 and 5 are declared** (§6.1a).
- **`bracketTag` never moves the slot** (§5.2). Stored, reported, never a rule.

**Client-safety.** A module a `"use client"` component could value-import must never touch the database or `node:crypto`. Pure modules (`src/lib/bracket/*` EXCEPT `flags-read.ts`, `src/lib/profile/types.ts`, `build.ts`, `fit.ts`, `src/lib/spellbook/combo-features.ts`) import no DB. Server-only: `src/lib/bracket/flags-read.ts` (DB), `src/lib/profile/fingerprint.ts` (node:crypto), `src/lib/profile/load.ts` (DB), all of `src/lib/spellbook/` except `combo-features.ts`.

**Commanders are cards of the deck.** Every bracket fact folds BOTH commanders in — Game
Changers (Kinnan is one), mass land denial (Hokori matches the untap clause), extra turns,
tutors, combos (§4.3b rule 3 already says so for combos; the rule is general). A flag read or
classifier pass whose input is `deck_cards` alone under-slots every deck led by a flagged
commander — the direction §4.2 names as dangerous. Tasks 12, 14, 17, 19 and 20 each carry a
commander-held case.

**About entry: none, deliberately.** Sub-project 1 ships no UI, so there is nothing for a reader to discover; the entry and the `ABOUT_VERSION` bump are a named task in the Tier B plan that ships the deck-analysis surface (spec §11.1, stated there so it cannot be missed).

**PR discipline.** Six PRs, boundaries named below (pr-review §10: nothing over ~20 files / ~800 lines without named boundaries). Each PR: pre-push gate, §10b pre-open subagent, Copilot cycle per the `pr-review` skill. This is backend work — no design-review, no feature-acceptance contact sheet (no UI changed; `probe:bracket` is the acceptance instrument).

---

## Spec findings (the plan is the spec's last test)

Recorded here because the prompt for this plan asked for them; none blocks a task, and each is
resolved in place below. Line numbers checked on `spec/deck-analysis-foundation` @ `ebd0ab0e`.

1. **§12 does not exist** — the spec numbers §11 → §13. Cosmetic.
2. **Two stale citations in §4A.4a:** `commander_support.commanderOracleId` `.primaryKey()` is
   `schema.ts:810` (spec says `:800`) and `edhrec_cache.commanderOracleId` is `schema.ts:567`
   (spec says `:557`). The claims themselves are correct; the lines drifted.
3. **§5.4 names the wrong function.** "It reads the deck's draft state (`loadDraftState`)" —
   `loadDraftState` (`src/lib/decks/draft-state.ts:377`) returns a **diff**: `version`,
   `adds`, `removes` (`draft-shape.ts:26`), not the deck's contents. The draft's contents ARE
   `deck_cards` plus the live commander columns. The principle (draft, never the committed
   version) stands; the loader reads `deck_cards` + `decks` directly (Task 14).
4. **§6.1a's table contradicts §6.3 on one row.** Row 3 shows "≤3 Game Changers, a late
   two-card combo" permitting `[3]` — but lateness is not computable (§6.3's whole point), and
   row 4 RESOLVES any two-card infinite at an otherwise-B3 deck on tutor coverage. §6.3 is the argued
   section and wins: **any** assembled two-card infinite on a deck whose only other B3 state is
   clean widens the range. Row 3 is implemented as "≤3 Game Changers, no combo → `[3]`".
5. **§4A.6b overclaims its window.** "It covers every deck during the window before the first
   widened index run" — the identity aggregate is a `GROUP BY` over the same `avg_*` columns
   that run populates, so before the first widened run every deck reads `basis: "none"`. The
   real mitigation is §4A.8's manual dispatch, which is a named close-out step (Task 21).
6. **`DetectionCoverage` has two shapes.** §5.2 gives two keys of `"complete" | "partial"`;
   §6.5 gives three keys of provenance objects. §6.5 is later, argued, and richer — adopted
   (Task 13). §5.2's shape is treated as superseded.
7. **`RoleFit` is a ghost.** §13.1 lists it; no other line of the spec uses it (checked by
   grep). Not defined, nothing built against it.
8. **§4.3b's own summary line mislabels rule 1's direction** — rule 1 causes UNDER-slotting
   (a real three-piece combo goes uncounted), not over-slotting. §6.5 already records this;
   noted so the probe's comments state the true direction.
9. **The Commander index does not stamp `catalog_refreshes` today** (grep: `stampCatalogRefresh`
   appears only in the Scryfall seeds, `stamp-catalog.ts`, and its probe) — §13.3 suspected
   this; confirmed. Resolved by R9.

---

## §13 resolutions

Each entry names the task that implements it.

- **R1 (§13.1) — every named type is defined** in `src/lib/profile/types.ts` and
  `src/lib/bracket/types.ts` (Tasks 12, 17). `Violation` stays ONE type doing both jobs — a
  delta's `rule` is exactly the violation the add would create, so two types would drift.
  `ProfileColours.producibleColors` is derived as the union of colour identities over the
  deck's land rows — an approximation (colour identity includes activation costs), documented
  as such in the type's jsdoc.
- **R2 (§13.2) — `upgradePath` chooses nothing.** It returns, per violated rule at the target,
  the full candidate set and the count that must leave; picking which card is the reader's
  (or a later sub-project's). §7.3's "a card the deck holds and a rule it violates" is true of
  every candidate it lists, not of a chosen set (Task 19).
- **R3 (§13.2) — the chain-or-loop flag ships in its measurable half only** (ruled by Hugh
  2026-09-19 in the plan walkthrough). §6.3's own "demonstrable chain or loop" names two
  shapes, and they differ in evidence: **an assembled combo producing infinite turns is
  Spellbook's measured data** — the profile already holds the combo and its `produces` — so
  at B2/B3 that flags the loop clause as violated, with the combo as the receipt (at B2 the
  combo rule already fires; B3 is where it bites: a resolved `[3]`/`[4]` becomes `[4,5]`). **The
  self-recurring-card half (Nexus of Fate looping alone) does not ship**: no published
  definition, no fixture of undisputed cases to measure against, so §2.4a bars authoring it —
  it becomes buildable the honest way once declared brackets accumulate beside decklists
  (§6.1b's own mechanism). The bare extra-turn count at B2/B3 stays under `unquantified`
  with no verdict; the single-card-loop miss is named in `detection` copy and AGENTS.md.
  (Tasks 8, 17, 18, 19, 20)
- **R4 (§13.2) — the `produces` vocabulary is developer-run, not cron-run.**
  `pnpm build:combo-features` regenerates `src/lib/spellbook/produces-kinds.generated.ts`
  from the ingested `spellbook_variants.produces` vocabulary — the `tag-kinds.generated.ts`
  pattern, which is a developer-run regeneration whose diff is the review. The runtime rule is
  `/^Infinite /i` on the feature name (so a NEW infinite family member needs no regeneration)
  plus membership in the generated `GAME_ENDING` list; the ingest logs how many distinct
  feature names fall outside the committed vocabulary, which is the visibility §5.2 wanted
  from "its size is logged" (Task 8).
- **R5 (§13.2) — the sweep keys responses back through `buildNameIndex`**
  (`src/lib/edhrec/index-build.ts:42`) — full lowercased name plus front face, full name wins —
  the exact precedent §13.2 names. Requests are built from `cards.name` for commander-legal
  cards; an entry resolving to no row (or two) is dropped and counted, reducing measured
  coverage, exactly as the EDHREC ingest treats unresolvable names. The response entry's card
  identity path is verified live before the module is written (Task 5, step 1).
- **R6 (§13.2) — the fingerprint** is sha256-hex over canonical JSON:
  `{ v: PROFILE_VERSION, commander, partner, declared, cards: [[oracleId, qty]…] }` with rows
  sorted by oracle id. `auto` is excluded (provenance, not membership), `deck_proxies` is
  excluded (ownership is a later fact-group and changes no fact this profile holds),
  `declared_bracket` is INCLUDED (an input to the verdict — a new declaration must retire a
  cached profile). `PROFILE_VERSION` lives in its own module, bumped when the builder's
  meaning changes — the `prompt-version.ts` precedent from the tuning plan (Task 13).
- **R7 (§13.2) — the `requires` shape is verified before it is believed.** Task 4 step 1
  captures three real bulk records with non-empty `requires`, pins the observed path in a
  committed fixture, and `check:spellbook` asserts the key's presence and array-ness daily.
  Nothing about the shape is assumed from the OpenAPI schema.
- **R8 (§13.3) — the classifiers' production home is `src/lib/bracket/oracle-rules.ts`.**
  `measure-mld.mts` and `measure-extra-turns.mts` delete their local pattern consts and import
  the production module, then both are re-run to confirm the committed figures (22/24 recall,
  40 flagged, zero false positives against a 22-card negative set; 21/21, 52-of-56 sweep)
  before anything consumes the module (Task 2).
- **R9 (§13.3) — three writers stamp `catalog_refreshes`,** all non-fatally through the
  existing `stampCatalogRefresh`: `db:seed:combos` (Task 6), `db:build:staples` (Task 11), and
  the widened index build (Task 9 — finding 9 above: it never stamped, and it now writes
  profile inputs).
- **R10 (§13.3) — chaining is by clock and by step, never by `workflow_run`.** `Combo refresh`
  carries its own cron, Mondays 13:00 UTC — four hours after `Catalog refresh` (09:00), which
  completes in about a minute; the gap absorbs its 30-minute download-timeout worst case
  (Task 7). `db:build:staples` runs as a STEP inside the `Commander index` workflow, after
  `db:build:index`, per matrix leg — which sidesteps the `workflow_run` cannot-tell-which-leg
  problem entirely and needs no `db:copy:staples`, because unlike prose the derivation costs
  nothing to re-run (Task 11).
- **R11 (§13.3) — the derived floor's first value is measured during implementation, PER
  SOURCE.** Task 6 runs the ingest against local-dev, records the sweep-claimed and
  rule-claimed counts separately for each flag, and commits four floors at 50% of each,
  rounded down, with the measurement date and raw counts in the comment. Per source because a
  union floor cannot catch the collapse it exists for: the oracle rule alone flags 51 MLD
  cards, so a sweep that silently zeroes still clears half the union. A resolution-ratio
  refusal rides beside them: sweep entries that resolve to a `cards` row, as a share of
  entries returned, below half the first run's measured share is the same collapse arriving
  as a name-index regression — dropped-and-counted, so no batch ever throws for it.
- **R12 (§13.4) — a partial sweep publishes nothing, and the flags never wait on the bulk.**
  TWO transactions, deliberately: `card_bracket_flags` is cleared and refilled in its own
  transaction once every batch succeeded and the per-source floors passed — BEFORE the bulk
  streams — so a failed 656 MB download exits non-zero with fresh flags already standing,
  which is what §4.4's sweep-first ordering is FOR. The two variant tables then clear and
  refill in a second transaction. Any failure inside either leaves that publish's previous
  rows standing — the #704 pattern, cited in the module header (Task 6). Inserts inside both
  are chunked at 500 rows (the house limit — `seed.ts:45`, `seed-index.ts:84-86`; a single
  `.values()` over ~10⁵ variant-card rows blows Postgres's 65,535-parameter cap). Memory
  bound: the sweep responses are ~9 MB, but the buffered variant rows dominate and the real
  ceiling is the workflow's `NODE_OPTIONS --max-old-space-size=4096`.
- **R13 (§13.4) — concurrency needs no lock.** Each workflow has a concurrency group per
  target (the house pattern), and each publish being one transaction means two overlapping
  manual runs end with one complete, self-consistent set per table — whichever way the
  interleaving resolves (clean overwrite or a loud unique-violation exit), no torn state is
  reachable. The header claims that outcome, not a specific failure mechanism. Stated in the
  ingest's header rather than defended by machinery.
- **R14 (§13.4) — an empty deck and an over-100 import are ordinary inputs.** No special
  cases: an empty deck violates nothing and permits `[1, 2]` with every skeleton delta
  negative; an oversized deck reports its real counts. Both pinned by unit test (Tasks 12, 17).
- **R15 (§13.4) — a `degraded` fetch yields null composition.** The widened header carries the
  `avg_*` fields only on an `ok` parse; on `degraded` the write layer skips the row entirely
  (`seed-index.ts:160`, preserving the previous row), so the null rule is a fact about
  `toSupportRows`' header, and null reads as absent, never zero (Task 9).
- **R16 (§13.4) — declared-vs-permits drift is a first-class field:**
  `BracketVerdict.declaredOutsidePermits: boolean` (Task 17).
- **R17 (§13.4) — `compositionOf` cannot dangle:** the skeleton's composition is restructured
  as `composition: { of: "commander" | "pair" | "identity" | "count"; targets; averageCurve } | null`
  — the discriminant travels with the data it describes, and it carries all four sources of the
  §4A.6b chain, not the spec's two (Task 12).
- **R18 (§13.5) — the cache-retirement proof is deferred to the first consumer.**
  `cacheForUser` wraps `unstable_cache`, a Next runtime primitive no tsx probe can execute.
  `loadDeckProfile` ships as an uncached gather + pure build (what `probe:bracket` calls);
  `cachedDeckProfile` is a four-line wrapper carrying the exact spec key
  (`["deck-profile", deckId, fingerprint]`). Proving a stamp retires a cached profile lands
  with the first route that calls the wrapper (Tier B / sub-project 1b), and this plan says so
  where that plan will be written. The probe DOES measure the serialised profile against the
  2 MB ceiling (§5.4) — that needs no server (Tasks 14, 20).
- **R19 (§13.5) — `gisa.json` is re-captured live, never hand-edited.** The parse test's
  fixture gains the composition fields by re-fetching the same commander's page and replacing
  the file wholesale; a hand-added field is a fabricated payload (Task 9).
- **R20 (§4A.4a) — the pair demand path gets its own cache table.** `edhrec_cache`'s PK is a
  single oracle id with an FK to `cards`, so a pair row cannot exist in it; re-keying the live
  table would rewrite every existing row for the sake of dozens. `edhrec_pair_cache`
  (commander, partner, canonical order enforced by a CHECK) carries the demand-fetched pair
  payloads; `resolvePairEdhrecData` follows the 67-byte `{"redirect": …}` stub before caching
  (Task 10).
- **R21 — `permits` is computed as §6.3 argues** (finding 4): violations per bracket from the
  countable rules alone; a two-card infinite violates B1/B2 outright and resolves `[3]` or `[4]` at B3;
  extra turns count only at B1 (Task 17).
- **R22 (§7.1) — the widened card read is `loadCardDetail` plus one shared helper.**
  `loadBracketFlags(oracleIds): Map<string, CardBracketFlags>` joins the flags table for any
  caller; `loadCardDetail` carries `gameChanger` (free, on `cards`) and the two joined flags on
  its card shape. The browse list is deliberately NOT widened — its payload is cached under a
  2 MB ceiling with headroom measured in hundreds of KB, and no shipped surface draws the
  marks yet (Task 3).
- **R23 (§5.2a) — the tutor-target classifier** parses the search clause into a predicate
  `{ kinds, colors, maxManaValue, basicOnly }`, measured by `scripts/measure-tutor-targets.mts`
  before anything reads it. Colour constraints test against `colorIdentity` (the only colour
  column the catalog holds) — an over-claim in the strong direction, documented in the module
  and visible in the measure script's eyeball sweep (Task 16).

---

## PR boundaries

| PR | Tasks | Contents | New migrations |
|---|---|---|---|
| **1 — card facts: game_changer** | 1–2 | `cards.game_changer`, `check:scryfall` assertion, oracle-rule classifiers moved to their production home | 0040 |
| **2 — Spellbook ingest** | 3–8 | three tables, flags read, bulk streamer, sweep, `db:seed:combos`, `check:spellbook`, `Combo refresh` workflow, produces vocabulary | 0041 |
| **3 — EDHREC widening + pairs** | 9–10 | widened parse + fixture, `avg_*` columns, pair tables, pair fetch in the index build, `edhrec_pair_cache`, `suggestions-read` preference | 0042, 0043 |
| **4 — the measured floor** | 11 | `identityCondition` vocabulary, `db:build:staples`, `format_staples` + `identity_composition`, the workflow step | 0044 |
| **5 — the Deck Profile** | 12–15 | profile types, `buildDeckProfile`, fingerprint, loader + cached wrapper, `decks.declared_bracket` (the gather reads it), `fitSkeleton` | 0045 |
| **6 — the bracket verdicts** | 16–21 | tutor classifier, `slotDeck` + lean, `bracketDelta`, `upgradePath`, `probe:bracket`, docs + #10 amendment | — |

PRs 1–2 and 3–4 are independent chains; 5 needs 2, 3 and 4 merged; 6 needs 5. Each PR passes
the full gate alone — no stacking, every intermediate state shippable.

> **SUPERSEDED IN PLACE, 2026-09-20.** Every task below that named `[3, 4]` has been corrected
> rather than annotated, because this file is the EXECUTION plan and an implementer follows its
> steps rather than its footnotes. A ratification recording the new rule while the steps still
> said the old one would have rebuilt exactly what the amendment removes. Tasks 14–16's shapes,
> the `permitsFor` sketch and the worked test names are the ones that moved.

**Walkthrough ratifications (Hugh, 2026-09-19), so no round re-litigates them:** the R3 split
(combo-half ships, authored half waits for evidence); R18's Tier-B cache proof; R2's
candidates-not-picks `upgradePath`; `bracketDelta`'s range-to-range shape; and execution as an
autonomous epic-run through the standard gates.

**Sixth ratification, added 2026-09-20 — it was made during planning and never written down,
which is why the build shipped the opposite.** ONLY 1/2 AND 4/5 ARE EVER RANGES. Those two
boundaries are questions the rules hand to the player; the 3-vs-4 boundary is a question about
the deck, and answering it with a range asks too much of the reader and makes the ranking look
indecisive. The combo clause therefore RESOLVES on §6.1b's tutor-coverage signal rather than
widening to `[3, 4]`.

The signal itself WAS documented (§6.1b, as reach) — what was missing is that it decides rather
than advises, and §6.3 said the opposite in as many words. Spec §6.1a, §6.3 and §6.1b are
amended, `permitsFor` and `slotDeck` follow, and Round 2's designs already drew it this way and
had asked for the amendment.

---

## File structure

**New — pure (no DB, no network, client-safe):**

| File | Responsibility |
|---|---|
| `src/lib/bracket/oracle-rules.ts` | The MLD and extra-turn classifiers (patterns moved verbatim from the measure scripts) |
| `src/lib/bracket/tutor-targets.ts` | `classifyTutor(oracleText)` → target predicate; `tutorReaches(predicate, piece)` |
| `src/lib/bracket/types.ts` | `Bracket`, `RuleId`, `Violation`, `BracketVerdict`, `BracketLimitReport`, `BracketLean`, `BracketDelta`, `UpgradePath` (imports `CardRef`, `FlaggedCardRef`, `ComboRef`, `DetectionCoverage`, `BracketPopulation` from `profile/types.ts` — one definition each, Task 12) |
| `src/lib/bracket/rules.ts` | The bracket limits table (§6.2 transcription), `permitsFor`, detection provenance strings |
| `src/lib/bracket/slot.ts` | `slotDeck(profile)` |
| `src/lib/bracket/delta.ts` | `bracketDelta(profile, candidate)` |
| `src/lib/bracket/upgrade.ts` | `upgradePath(profile, target)` |
| `src/lib/spellbook/combo-features.ts` | `isInfiniteOrGameEnding(features)`; imports the generated vocabulary |
| `src/lib/spellbook/produces-kinds.generated.ts` | Generated `GAME_ENDING` list + vocabulary snapshot (committed) |
| `src/lib/profile/types.ts` | `DeckProfile` and every fact-group type |
| `src/lib/profile/version.ts` | `PROFILE_VERSION = 1` |
| `src/lib/profile/build.ts` | `buildDeckProfile(input)` — pure assembly |
| `src/lib/profile/fit.ts` | `fitSkeleton(profile)` |
| `src/lib/staples/condition.ts` | `identityCondition(colors)` — the ONE spelling of the condition vocabulary |

**New — server-only:**

| File | Responsibility |
|---|---|
| `src/lib/profile/fingerprint.ts` | `profileFingerprint(input)` via `node:crypto` |
| `src/lib/profile/load.ts` | `loadDeckProfile(deckId, userId)` (uncached gather) + `cachedDeckProfile` (the `cacheForUser` wrapper) + `loadCandidateFacts` |
| `src/lib/bracket/flags-read.ts` | `loadBracketFlags(oracleIds)` |
| `src/lib/spellbook/bulk.ts` | `streamVariants(url)` — incremental array parser over the 656 MB document |
| `src/lib/spellbook/transform.ts` | bulk record → table rows; the commander-legal filter |
| `src/lib/spellbook/sweep.ts` | batched `POST /estimate-bracket` client + name resolution |
| `src/lib/spellbook/seed.ts` | the ingest: sweep → oracle-rule union → bulk → one-transaction publish → stamp |
| `src/lib/edhrec/pair.ts` | `canonicalPair` (the one order normalisation, writes AND reads), pair slug candidates, `fetchPairUncached` (index-pass fetch, redirect-following), `resolvePairEdhrecData` (demand fetch, redirect-following), `toPairRows` |

**New — scripts & workflows:**

| File | Responsibility |
|---|---|
| `scripts/seed-combos.ts` | `pnpm db:seed:combos` |
| `scripts/check-spellbook-contract.ts` | `pnpm check:spellbook` |
| `scripts/build-staples.ts` | `pnpm db:build:staples` |
| `scripts/build-combo-features.mts` | `pnpm build:combo-features` |
| `scripts/measure-tutor-targets.mts` | measures the tutor classifier before it is believed |
| `scripts/probe-bracket.ts` | `pnpm probe:bracket` |
| `.github/workflows/combo-refresh.yml` | weekly, both envs, plan→matrix |

**Modified:**

| File | Change |
|---|---|
| `src/db/schema.ts` | `cards.game_changer`; `spellbook_variants` + `spellbook_variant_cards` + `card_bracket_flags`; `commander_support` `avg_*` columns; `commander_pair_support` + `commander_pair_support_cards` + `edhrec_pair_cache`; `format_staples` + `identity_composition`; `decks.declared_bracket` |
| `src/lib/scryfall/transform.ts` | `toCardRow` reads `game_changer` |
| `scripts/check-scryfall-contract.ts` | `game_changer` joins the oracle_cards REQUIRED list |
| `scripts/measure-mld.mts`, `scripts/measure-extra-turns.mts` | import the production classifiers instead of local consts |
| `src/lib/edhrec/parse.ts` | composition counts + `mana_curve` join `EdhrecData` |
| `src/lib/edhrec/index-build.ts` | `SupportHeader` carries the ten counts + curve; pair row projection |
| `src/lib/edhrec/seed-index.ts` | writes the new columns; pair pass over distinct pairs in `decks`; stamps `catalog_refreshes` |
| `src/lib/decks/suggestions-read.ts` | prefers the pair support list over `mergeEdhrecData` |
| `src/lib/collection/card-detail.ts` | card shape carries `gameChanger` + joined flags |
| `.github/workflows/commander-index.yml` | `db:build:staples` step after the index build, per leg |
| `docs/superpowers/plans/2026-09-07-deck-tuning-suggestions.md` | the two #10 amendments (§10) |
| `AGENTS.md` | entries for the new job, checks, probe and workflow |
| `package.json` | five new script entries (`db:seed:combos`, `check:spellbook`, `build:combo-features`, `db:build:staples`, `probe:bracket` — the measure script runs via `pnpm tsx`, like its siblings) |

---

### Task 1: `cards.game_changer`

**Files:**
- Modify: `src/db/schema.ts` (the `cards` table, `schema.ts:31`)
- Modify: `src/lib/scryfall/transform.ts` (`toCardRow`, `:15`)
- Modify: `scripts/check-scryfall-contract.ts` (REQUIRED list)
- Test: `src/lib/scryfall/transform.test.ts`
- Create: `drizzle/0040_*.sql` via `pnpm db:generate`

**Interfaces:**
- Produces: `CardRow.gameChanger: boolean`; `cards.game_changer boolean not null default false`. Task 14's loader and Task 3's card-detail read consume the column.

- [ ] **Step 1: failing tests.** In `transform.test.ts`, beside the existing `commanderLegal` cases:

```ts
// The file's fixture is `solRing`, not `base` — build on it:
it("reads game_changer as a strict true", () => {
  expect(toCardRow({ ...solRing, game_changer: true })!.gameChanger).toBe(true);
});
it("defaults game_changer false when absent or non-boolean", () => {
  expect(toCardRow(solRing)!.gameChanger).toBe(false);
  expect(toCardRow({ ...solRing, game_changer: "yes" })!.gameChanger).toBe(false);
});
```

(`raw.game_changer === true` is defensive parsing of an untyped bulk: anything absent or non-boolean reads false, which under-claims — the right direction, same as `commanderLegal`'s `=== "legal"`. Note the EXISTING first test `toEqual`s the full `solRing` row (`transform.test.ts:15-25`), so its expected object gains `gameChanger: false` in the same edit.)

- [ ] **Step 2:** `pnpm test src/lib/scryfall/transform.test.ts` — FAIL (`gameChanger` not on `CardRow`).
- [ ] **Step 3: implement.** `CardRow` gains `gameChanger: boolean`; `toCardRow` returns `gameChanger: raw.game_changer === true,`. Schema, beside `commanderLegal`:

```ts
// WotC's Game Changers list, republished by Scryfall per card and refreshed weekly by the
// catalog job — never transcribed (§4.1). Default false UNDER-claims: a row written before
// the re-seed loses a mark rather than inventing one. Same reasoning as `layout`.
gameChanger: boolean("game_changer").notNull().default(false),
```

`seed.ts` needs no change — it inserts what `toCardRow` returns; confirm the upsert's `set` list includes the new column (it enumerates columns; add `gameChanger`). **Read the upsert before assuming** — if it spreads, say so in the commit body instead.
- [ ] **Step 4:** `pnpm db:generate` → 0040. Inspect the SQL: one `alter table "cards" add column`.
- [ ] **Step 5:** In `check-scryfall-contract.ts`, add `"game_changer"` to `REQUIRED.oracle_cards` with the comment: the count is deliberately NOT pinned — the list is meant to change, and a test that fails when WotC updates it punishes the ingest for working (§4.1).
- [ ] **Step 6:** `pnpm test` (suite), `pnpm typecheck`, `pnpm lint`. Run `pnpm check:scryfall` once live — it must pass today, proving the field is real, not just expected.
- [ ] **Step 7:** Commit `feat: ingest Scryfall's game_changer flag onto cards`.

---

### Task 2: the oracle-rule classifiers move into production

**Files:**
- Create: `src/lib/bracket/oracle-rules.ts`
- Test: `src/lib/bracket/oracle-rules.test.ts`
- Modify: `scripts/measure-mld.mts`, `scripts/measure-extra-turns.mts`

**Interfaces:**
- Produces: `isMassLandDenial(oracleText: string | null): boolean` and `matchedMldClauses(text): string[]`; `isExtraTurn(oracleText: string | null): boolean` and the `{ hit, why, blockedBy }` classifier shape. Task 6's ingest and Task 5's union consume both.

- [ ] **Step 1: failing tests.** One case per named card from the measured fixtures — the cards ARE the spec:

```ts
// Recall anchors (each measured caught, §4.2) — one it() per card, inline oracle text:
["Armageddon", "Winter Orb", "Stasis", "Ruination", "Back to Basics", "Global Ruin"] → true
// The two documented misses stay misses — pinned so a "fix" that tunes patterns against
// the fixture is visible as the test change it would be (§4.2's trap):
expect(isMassLandDenial(CATACLYSM_TEXT)).toBe(false);   // sacrifice-clause wording
expect(isMassLandDenial(WAVE_OF_VITRIOL_TEXT)).toBe(false);
// Precision anchors:
["Strip Mine", "Path to Exile", "Beast Within", "Scapeshift"] → false
// Extra turns: grants true; the four measured preventions caught BY THE NEGATION CLAUSE
// (assert classifyExtraTurn(...).blockedBy is non-empty — that is the clause earning it):
expect(isExtraTurn(TIME_WARP_TEXT)).toBe(true);
["Stranglehold", "Trouble in Pairs", "Gerrard's Hourglass Pendant", "Ugin's Nexus"]
  → hit false AND blockedBy non-empty
// False by matching no grant at all (no extra-turn mention; blockedBy empty):
["Obeka, Brute Chronologist", "Sundial of the Infinite"] → hit false, blockedBy empty
```

Oracle texts inline in the test file (short, stable strings — a DB read in a unit test is the thing this repo never does).
- [ ] **Step 2:** run — FAIL (module absent).
- [ ] **Step 3: implement.** Move `PATTERNS` and `GRANTS`/`NEGATIONS` out of the measure scripts into the module **exactly as they stand on this branch** — including the guards added 2026-09-19 (§4.2a), which are the difference between flagging 40 cards and flagging 51. Re-running both scripts after the move must reproduce **22/24** and **21/21**; a different figure means the move changed a pattern.

  **Do not "simplify" a guard while moving it.** Each one is a clause of WotC's definition and each was paid for by a card that shipped wrong without it: `\b` before `lands don't untap` (else `Islands`), `target` excluded (else a three-land one-turn effect), `you` excluded (else a self-drawback), narrowing adjectives and land-naming exception clauses on `destroy all permanents` (else `Scourglass`, whose text spares lands outright). The `Worldslayer` case is the one that shows the guards are not interchangeable — see §4.2a.

```ts
export function isMassLandDenial(text: string | null): boolean {
  return matchedMldClauses(text).length > 0;
}
export function matchedMldClauses(text: string | null): string[] { /* PATTERNS filter */ }
export function classifyExtraTurn(text: string | null):
  { hit: boolean; why: string[]; blockedBy: string[] } { /* negations first */ }
export const isExtraTurn = (t: string | null) => classifyExtraTurn(t).hit;
// The §6.5 detection provenance strings live HERE, beside the classifiers they describe —
// not in bracket/rules.ts (PR 6), because buildDeckProfile (PR 5) populates `detection`
// and one definition must serve both. rules.ts re-exports them later. The combo string
// lives in spellbook/combo-features.ts (PR 2) on the same principle.
export const MLD_DETECTION = { sources: 2, basis: "23 of 24 on a curated set",
  knownMiss: "Wave of Vitriol" } as const;
export const EXTRA_TURN_DETECTION = { sources: 2,
  basis: "no misses among the 56 cards whose text mentions one" } as const;
```

- [ ] **Step 4:** tests PASS.
- [ ] **Step 5:** Rewire both measure scripts to import from `../src/lib/bracket/oracle-rules` and delete their local consts. Re-run both against local-dev: `pnpm tsx scripts/measure-mld.mts` must print **recall 22/24, 40 flagged, false positives 0 against the 22-card set**; `pnpm tsx scripts/measure-extra-turns.mts` must print **21/21, 0 false positives, 52 of 56 claimed, and `fixtures actually exercising the negation clause: 1 of 4`**. Any drift = stop, find the edit. That last line is deliberately part of the expected output: it is the one number that says the precision set measures the clause rather than passing over it.
- [ ] **Step 6:** Suite + gate. Commit `refactor: oracle-text bracket classifiers get one production home`.

---

### Task 3: the Spellbook schema + the flags read

**Files:**
- Modify: `src/db/schema.ts`
- Create: `src/lib/bracket/flags-read.ts`
- Modify: `src/lib/collection/card-detail.ts`
- Test: `src/lib/collection/card-detail.test.ts` (shape only)
- Create: `drizzle/0041_*.sql`

**Interfaces:**
- Produces: three tables below; `loadBracketFlags(oracleIds: string[]): Promise<Map<string, { massLandDenial: boolean; massLandDenialSources: string[]; extraTurn: boolean; extraTurnSources: string[] }>>`; `BrowseCard.bracketFlags?: { gameChanger: boolean; massLandDenial: boolean; extraTurn: boolean } | null` on the card-detail read.

- [ ] **Step 1: schema.** Exactly §4.3, with three constraints the spec implies and the plan makes explicit:

```ts
export const spellbookVariants = pgTable("spellbook_variants", {
  variantId: text("variant_id").primaryKey(),          // e.g. "742-1295"
  bracketTag: text("bracket_tag").notNull(),           // Spellbook's table opinion — stored,
                                                       // reported, NEVER a rule (§5.2)
  cardCount: integer("card_count").notNull(),          // length of `uses` only (§4.3b rule 1)
  identity: text("identity").notNull(),
  popularity: integer("popularity"),
  produces: text("produces").array().notNull(),
  requiresTemplateIds: integer("requires_template_ids").array().notNull(),
  computedAt: timestamp("computed_at").notNull().defaultNow(),
}, (t) => [
  check("spellbook_variants_bracket_tag_check",
    sql`${t.bracketTag} in ('R','S','P','O','C','E','B')`),
]);

export const spellbookVariantCards = pgTable("spellbook_variant_cards", {
  variantId: text("variant_id").notNull()
    .references(() => spellbookVariants.variantId, { onDelete: "cascade" }),
  oracleId: uuid("oracle_id").notNull().references(() => cards.oracleId),
  mustBeCommander: boolean("must_be_commander").notNull().default(false),
}, (t) => [
  primaryKey({ columns: [t.variantId, t.oracleId] }),
  // Sub-project 3 traverses the other way — one card, which combos — and the PK's
  // leading column cannot serve it (§4.3a).
  index("spellbook_variant_cards_oracle_idx").on(t.oracleId),
]);

export const cardBracketFlags = pgTable("card_bracket_flags", {
  oracleId: uuid("oracle_id").primaryKey().references(() => cards.oracleId),
  massLandDenial: boolean("mass_land_denial").notNull().default(false),
  massLandDenialSources: text("mass_land_denial_sources").array().notNull().default([]),
  extraTurn: boolean("extra_turn").notNull().default(false),
  extraTurnSources: text("extra_turn_sources").array().notNull().default([]),
  computedAt: timestamp("computed_at").notNull().defaultNow(),
}, (t) => [
  // A flag and its provenance cannot disagree: true iff at least one source claims it.
  // §5.2's promise — a reader disputing a verdict is owed which classifier made the claim —
  // is unkeepable the moment a row can say "true, sources: {}".
  check("card_bracket_flags_mld_sources_check",
    sql`${t.massLandDenial} = (cardinality(${t.massLandDenialSources}) > 0)`),
  check("card_bracket_flags_et_sources_check",
    sql`${t.extraTurn} = (cardinality(${t.extraTurnSources}) > 0)`),
  check("card_bracket_flags_source_values_check",
    sql`${t.massLandDenialSources} <@ array['spellbook_sweep','oracle_rule']
        and ${t.extraTurnSources} <@ array['spellbook_sweep','oracle_rule']`),
]);
```

`banned` is deliberately absent — legality is `cards.commander_legal` (§4.3a).
- [ ] **Step 2:** `pnpm db:generate` → 0041. Inspect — specifically the `text[]` defaults: `.default([])` has NO in-repo precedent (zero array defaults in `schema.ts` today) and the spec writes `default '{}'`; if the emitted SQL is anything but a working `'{}'::text[]` default, write the default as `sql\`'{}'\`` instead and re-generate.
- [ ] **Step 3: the read.** `flags-read.ts`: one `inArray` select over `card_bracket_flags`, returns the Map, empty input → empty Map without a query (the `readEdhrecCache` shape). `card-detail.ts`: `BrowseCard.bracketFlags` is **optional and null-defaulted** — `catalogCard` stays pure and never sets it (it is the browse list's shared type, and R22 keeps browse un-widened); `loadCardDetail` ATTACHES the field after synthesis, the way it already attaches `availability`/`prices`/`proxiedBy`: `gameChanger` selected off `cards`, the other two from one `loadBracketFlags` call, missing row reads all-false (default-false direction, in a comment). Quiet failure matches the file's own convention: a failed flags read leaves `bracketFlags` null and the modal omits the block. **No component changes** — where marks are drawn is Design's (§7.1, §11 Round 1).
- [ ] **Step 4: shape test.** `card-detail.test.ts` (or the nearest pure synthesis test — `catalogCard` is the tested layer): a card row carrying flags surfaces them; a card with no flags row reads `{ gameChanger, massLandDenial: false, extraTurn: false }`.
- [ ] **Step 5:** Suite + gate. Commit `feat: spellbook tables, card bracket flags, and the flags read`.

---

### Task 4: the bulk streamer

**Files:**
- Create: `src/lib/spellbook/bulk.ts`
- Create: `src/lib/spellbook/transform.ts`
- Test: `src/lib/spellbook/bulk.test.ts`, `src/lib/spellbook/transform.test.ts`
- Create: `src/lib/spellbook/__fixtures__/variants-head.json` (captured, not written)

**Interfaces:**
- Consumes: nothing in-repo. Produces: `streamVariants(url: string): AsyncGenerator<Record<string, unknown>>`; `toVariantRows(raw, nameless: buildNameIndex output? — no: oracle ids come straight off the record, see step 3): { variant, cards } | null` plus a `dropReason` counter shape.

- [ ] **Step 1: capture the real shape before writing any code (R7).** A throwaway fetch (not committed) streams the first ~50 records of `https://json.commanderspellbook.com/variants.json`; keep three records with non-empty `requires` and two with `legalities.commander: false` in `__fixtures__/variants-head.json` VERBATIM. Record in the fixture's sibling README line: capture date, the observed `requires[].template.id` path (or whatever the real path is — if it differs from `template.id`, §4.3's projection line in the spec gets a correction note in the PR body). Every field §4.3 projects was already verified present on a real record (spec §4.2); this pins the two the spec could not: `requires` and `uses[].mustBeCommander`.
- [ ] **Step 2: failing tests — the streamer.** `variants.json` is ONE document with a `variants` array (`streamBulkEntries` is JSONL and cannot be reused — spec §4.4 records this). The parser: scan the byte stream for `"variants"` + `[`, then bracket-count each top-level element — tracking string state and escapes — and `JSON.parse` each complete object. Test cases, each the shape that would defeat a naive scanner:

```ts
it("yields each variant object once", ...)                    // 3-object happy path
it("survives braces and brackets inside strings", ...)        // oracle text with "{T}: Add {G}"
it("survives escaped quotes inside strings", ...)             // name with \" 
it("survives an object split across chunk boundaries", ...)   // feed 7-byte chunks
it("ignores keys before the variants array", ...)             // preamble object
it("throws on truncated input rather than yielding a partial", ...)
```

- [ ] **Step 3: failing tests — the transform.** Against the captured fixture records:

```ts
it("projects id, bracketTag, cardCount from uses length, identity, popularity (null kept), produces feature names, requires template ids", ...)
it("drops a commander-illegal variant and counts it", ...)     // legalities.commander === false
it("carries mustBeCommander per card", ...)
it("returns null with a counted reason when a uses card has no oracleId", ...)
```

`cardCount` counts `uses` ONLY — a template-gated 2-`uses` variant stores `cardCount: 2` with non-empty `requiresTemplateIds`, and the combo join excludes it there (§4.3b rule 1; the direction is UNDER-slotting, finding 8).
- [ ] **Step 4:** implement both; tests PASS. Streamer holds at most one record in memory.
- [ ] **Step 5:** Commit `feat: spellbook bulk streamer and variant projection`.

---

### Task 5: the sweep client

**Files:**
- Create: `src/lib/spellbook/sweep.ts`
- Test: `src/lib/spellbook/sweep.test.ts`

**Interfaces:**
- Consumes: `buildNameIndex` (`src/lib/edhrec/index-build.ts:42`), `isMassLandDenial` / `isExtraTurn` (Task 2).
- Produces: `sweepCardFlags(cards: {oracleId, name}[], fetcher): Promise<{ flags: Map<string, SweptFlags>; resolved: number; unresolved: number; batches: number }>` where `SweptFlags = { massLandDenial: boolean; extraTurn: boolean; gameChanger: boolean }`; and `unionFlagRows(swept, oracleRuleInput): CardBracketFlagsRow[]` — the per-flag source arrays.

- [ ] **Step 1: verify the endpoint live before writing the module** (R5). One 3-card `POST https://backend.commanderspellbook.com/estimate-bracket` (User-Agent set — required, no auth) with a known trio (`Armageddon`, `Time Warp`, `Lightning Bolt`); record in the module header: the exact request body shape that worked, the response entry's identity path (the field the name comes back on), and the four flag fields. **Do not write the client from the OpenAPI schema alone** — §4.2's measurements prove the endpoint behaves; this step proves the field spellings.
- [ ] **Step 2: failing tests** (fetcher injected, no network):

```ts
it("batches at 600 and reports batch count", ...)              // 1,250 names → 3 calls
it("resolves entries through the name index, front face included", ...)
it("counts an unresolvable entry and drops it", ...)
it("throws on a failed batch rather than returning partial flags", ...)  // R12's input half
it("unions sweep and oracle-rule per flag with per-flag sources", () => {
  // Cataclysm: sweep-only MLD → sources ['spellbook_sweep']
  // Back to Basics: rule-only → ['oracle_rule']
  // Armageddon: both → ['spellbook_sweep','oracle_rule']
  // a card neither claims → NO row at all (absence, not a false row)
});
it("keeps a flag-true row only when a source claims it", ...)   // the check constraint's mirror
```

- [ ] **Step 3:** implement. Batching 600/request, ~54 requests over the ~31,830 commander-legal cards, sequential with a small delay — comfortably inside 80 req/min, and sequencing is what keeps it there (a `Promise.all` over 54 would not be). `gameChanger` from the sweep is compared against `cards.game_changer` and **logged on disagreement, never written** — Scryfall is authoritative (§4.1); the log is a free cross-check.
- [ ] **Step 4:** tests PASS. Commit `feat: spellbook estimate-bracket sweep client`.

---

### Task 6: `pnpm db:seed:combos`

**Files:**
- Create: `src/lib/spellbook/seed.ts`, `scripts/seed-combos.ts`
- Modify: `package.json` (`"db:seed:combos": "tsx scripts/seed-combos.ts"`)
- Test: `src/lib/spellbook/seed.test.ts` (publish arithmetic; the transaction shape is probe territory)

**Interfaces:**
- Consumes: Tasks 2–5. Produces: populated `spellbook_variants`, `spellbook_variant_cards`, `card_bracket_flags`; the floor constants; the stamp.

- [ ] **Step 1: the ingest, in order.** (1) Load commander-legal `{oracleId, name}` from `cards`; build the name index. (2) **Sweep first.** (3) Run the oracle rules over the same rows; union per flag (Task 5). (4) **Floors, per source (R11):**

```ts
// Measured against local-dev on the first clean run of this ingest (2026-09-XX, task 6
// step 4). One floor PER SOURCE per flag, at HALF the measured count, rounded down — a
// union floor cannot catch a sweep collapse, because the oracle rule alone clears it
// (51 MLD cards from the rule; the union barely moves when the sweep dies). Collapse
// detection, not drift detection (§4.5).
export const MIN_MLD_FROM_SWEEP = ...;      // measured NNN
export const MIN_MLD_FROM_RULE = ...;       // measured NNN
export const MIN_EXTRA_TURN_FROM_SWEEP = ...;
export const MIN_EXTRA_TURN_FROM_RULE = ...;
// And the same collapse arriving as a name-index regression: sweep entries resolving
// to a cards row, as a share of entries returned, at half the first run's share.
export const MIN_SWEEP_RESOLUTION_SHARE = ...;
```

Below any floor: print every figure, write NOTHING, exit non-zero (the #704 refusal pattern, named in the header). (5) **Publish the flags in their OWN transaction now** — before the bulk — chunked at 500-row inserts (R12): a bulk failure must not cost the card flags, and under a single shared transaction it would have, which is the contradiction the plan review caught. (6) Stream the bulk through Task 4, filter commander-legal, resolve `uses[].card.oracleId` against `cards` (an FK violation would abort anyway; resolving first counts the drops instead), collect rows. (7) **Second transaction:** delete-and-refill the two variant tables (`spellbook_variant_cards` cascades from `spellbook_variants`), inserts chunked at 500 — a refused or failed bulk leaves yesterday's variants standing while today's flags are already live, which is a coherent state: the two stores answer different questions. (8) `stampCatalogRefresh()` non-fatally (R9). (9) Print: batches, resolved/unresolved sweep entries and the resolution share, per-source flag counts, union counts, variants kept/dropped-by-reason, distinct `produces` names outside the committed vocabulary (R4's visibility).
- [ ] **Step 2: unit tests** on the pure pieces: per-source floor refusal (below any → throws with every figure named), the resolution-share refusal, drop-reason accounting, the disagreement log shape.
- [ ] **Step 3: run against local-dev.** Record the per-source counts and the resolution share; fill the five constants; re-run; confirm green and the row counts stable. This run also populates local-dev for Tasks 8 and 20.
- [ ] **Step 4:** run the REFUSAL path once: temporarily set a floor above the measured count, run, confirm non-zero exit and untouched tables (`select count(*)` before/after). Revert. (Run the guard's failure path before believing it.)
- [ ] **Step 5:** Suite + gate. Commit `feat: db:seed:combos — sweep, oracle-rule union, bulk ingest`.

---

### Task 7: `pnpm check:spellbook` + the workflow step

**Files:**
- Create: `scripts/check-spellbook-contract.ts`
- Modify: `package.json`, `.github/workflows/scryfall-contract.yml`

**Interfaces:** none downstream — a canary.

- [ ] **Step 1: the five assertions** (§4.5), no database:
  1. Bulk index reachable, `last-modified` within **2 days** (the file rebuilds daily; the first draft's 8-day window could only fire after the weekly ingest had already eaten a stale file).
  2. First bulk entry carries every §4.3-projected field — including `requires` as an array and `uses[0].card.oracleId` (the Task 4 capture's spellings).
  3. A small live `POST /estimate-bracket` still returns entries carrying `massLandDenial`, `extraTurn`, `gameChanger`, `banned` (`banned` asserted-present because a shape change there still signals drift, even though the ingest ignores it).
  4. `BracketTagEnum` still has exactly the seven members the check constraint encodes.
  5. The five anchors still classify through a live sweep call: `Armageddon`, `Ravages of War`, `Jokulhaups` as MLD; `Time Warp`, `Temporal Manipulation` as extra-turn. These are a TEST FIXTURE, asserted never read — a card leaving the index makes this check fail, and that failure is the correct outcome (§4.5's own tension note, kept in the file header).
- [ ] **Step 2: run each failure path against a mutated fixture before believing it** — stub the fetch per case: stale `last-modified`, a dropped field, a renamed flag key, an eighth tag, an anchor gone quiet. Each must FAIL loudly. This is a run-once verification during development (like `copy-drift.test.mts`'s history), plus the stub cases kept as unit tests where they need no network.
- [ ] **Step 3: workflow.** In `scryfall-contract.yml`, after the ManaPool step:

```yaml
      - name: Check the Commander Spellbook contract
        if: always()      # a Scryfall failure must not hide a Spellbook one
        run: pnpm check:spellbook
```

- [ ] **Step 4:** run live once — green. Commit `feat: daily Commander Spellbook contract canary`.

---

### Task 8: the `produces` vocabulary

**Files:**
- Create: `scripts/build-combo-features.mts`, `src/lib/spellbook/produces-kinds.generated.ts`, `src/lib/spellbook/combo-features.ts`
- Modify: `package.json` (`"build:combo-features": "tsx scripts/build-combo-features.mts"`)
- Test: `src/lib/spellbook/combo-features.test.ts`

**Interfaces:**
- Produces: `isInfiniteOrGameEnding(features: string[]): boolean` — the two-card-infinite test's second half (§5.2) — and `producesInfiniteTurns(features: string[]): boolean` (R3's loop test; Task 17's slot imports it), plus `COMBO_DETECTION` — the §6.5 provenance string for `twoCardCombos` ("Spellbook's index, excluding template-gated variants"), living here so PR 5's `detection` never reaches into PR 6. Task 14's combo read consumes all three.

- [ ] **Step 1: failing tests:**

```ts
it("claims the Infinite family without regeneration", () =>
  expect(isInfiniteOrGameEnding(["Infinite mana of any color"])).toBe(true));
it("claims a generated game-ending name", () =>
  expect(isInfiniteOrGameEnding(["Win the game"])).toBe(true));
it("refuses a bounded product", () =>
  expect(isInfiniteOrGameEnding(["Two 1/1 tokens"])).toBe(false));   // §5.2's synergy case
it("refuses on bracketTag alone — there is no bracketTag input at all", ...)
  // structural: the function takes feature names only; the Gilder Bairn case
  // (unambiguously infinite at tag E) is why (§5.2).
it("producesInfiniteTurns claims 'Infinite turns' and its wording variants, refuses
    'Infinite mana' and every non-turn family", ...)   // R3's combo-loop half: the B2/B3
  // loop flag reads this, so a false positive here is a false loop accusation.
```

- [ ] **Step 2: the generator** (tag-kinds precedent, R4): reads distinct `produces` names from the ingested `spellbook_variants` (local-dev, populated by Task 6 step 3), buckets by `/^Infinite /i`, by `/\bwins? the game\b|\bloses? the game\b/i`, and the turn-loop family by `/^infinite (extra )?turns?\b/i` into an `INFINITE_TURNS` array (`producesInfiniteTurns` reads it plus the live regex, same belt-and-braces as the Infinite family), writes the generated file: the `GAME_ENDING` and `INFINITE_TURNS` arrays plus a full vocabulary snapshot with counts as comments — **the committed diff is the review** (an allowlist, so an unknown new name defaults to NOT game-ending: under-claims, the right direction, same argument as tag-kinds' allowlist).
- [ ] **Step 3:** run the generator against local-dev; eyeball the emitted `GAME_ENDING` list against the vocabulary snapshot in the same file; commit the generated file. Tests PASS.
- [ ] **Step 4:** Commit `feat: produces vocabulary and the two-card-infinite feature test`.

---

### Task 9: the widened EDHREC parse

**Files:**
- Modify: `src/lib/edhrec/parse.ts`, `src/lib/edhrec/index-build.ts`, `src/lib/edhrec/seed-index.ts`, `src/db/schema.ts`
- Replace: `src/lib/edhrec/__fixtures__/gisa.json` (re-captured live, R19)
- Test: `src/lib/edhrec/parse.test.ts`, `src/lib/edhrec/index-build.test.ts`
- Create: `drizzle/0042_*.sql`

**Interfaces:**
- Produces: `EdhrecData.composition: CompositionCounts | null` (`{ land, basic, nonbasic, creature, instant, sorcery, artifact, enchantment, planeswalker, battle }`), `EdhrecData.manaCurve: Record<string, number> | null`; `commander_support.avg_land … avg_battle integer` + `avg_curve jsonb`, all nullable (§4A.7); `SupportHeader` carries them; the index build writes them and **stamps `catalog_refreshes`** (R9, finding 9).

- [ ] **Step 1: re-capture the fixture.** Fetch the same commander's live page (`json.edhrec.com/pages/commanders/<gisa's slug>.json`), replace `gisa.json` wholesale. Run the EXISTING parse tests first — they must stay green over the fresh payload before anything is widened (if upstream moved under them, that is its own finding, fixed first).
- [ ] **Step 2: failing tests:**

```ts
it("reads the ten composition counts from the payload top level", ...)
it("reads panels.mana_curve", ...)
it("yields null composition and null curve when the fields are absent — never zeros", ...)
  // §4A.7: null reads as absent where a zero reads as "this deck runs no lands"
it("keeps non-finite counts out", ...)                          // house finiteness rule
```

Plus `index-build.test.ts`: header carries the fields on `ok`; **on `degraded`/`absent` the HEADER carries nulls** (R15 — note the write layer's own rule: `seed-index.ts:160` SKIPS the write entirely on `degraded` to preserve the previous row, so "writes nulls" is a fact about `toSupportRows`' output, and the test asserts the header, never a row).
- [ ] **Step 3: implement.** `parse.ts`: read the counts and curve **at whatever nesting the step-1 recaptured fixture actually shows** — the spec says top level and `panels.mana_curve`, but this file's existing reads are mixed-shape (`bracket_counts` top-level, `deckCount` under `container.json_dict.card`, `parse.ts:56-70`), so the fixture is the authority, with the same finiteness discipline as every other numeric here. Schema: ten nullable `integer` columns + `avg_curve jsonb` on `commander_support`, comment block quoting §4A.7's null rule. `SupportHeader` (+10 fields + curve), `writeToDb`'s upsert `set` list gains each (it enumerates columns — every one must be added, and this is exactly the silent-no-op shape the global constraints warn about: after editing, grep the `set` block for all eleven names and fail the task if any is missing). The stamp goes in `scripts/build-commander-index.ts`'s success branch, NOT inside `buildCommanderIndex` — every I/O edge of that function is injectable (`write`, `clearScores`, `fetch`; `seed-index.ts:18-29`) because it is unit-tested, and a direct call would fire a real DB write in tests.
- [ ] **Step 4:** `pnpm db:generate` → 0042. Tests PASS. Suite + gate.
- [ ] **Step 5:** Commit `feat: the EDHREC parse keeps the composition and the curve`.

---

### Task 10: partner pairs

**Files:**
- Modify: `src/db/schema.ts`; `src/lib/edhrec/seed-index.ts`; `src/lib/decks/suggestions-read.ts`
- Create: `src/lib/edhrec/pair.ts`
- Test: `src/lib/edhrec/pair.test.ts`, `src/lib/decks/suggestions-read.test.ts` (extend)
- Create: `drizzle/0043_*.sql`

**Interfaces:**
- Produces: `commander_pair_support` + `commander_pair_support_cards` + `edhrec_pair_cache` (shapes below); `pairSlugCandidates(nameA, nameB)`, `resolvePairEdhrecData(pair, cached)`; `readPairSupport(commanderOracleId, partnerOracleId)`. Tasks 14 (composition basis "pair", population) and `suggestions-read` consume.

- [ ] **Step 1: schema.**

```ts
export const commanderPairSupport = pgTable("commander_pair_support", {
  commanderOracleId: uuid("commander_oracle_id").notNull().references(() => cards.oracleId),
  partnerOracleId: uuid("partner_oracle_id").notNull().references(() => cards.oracleId),
  synergyState: text("synergy_state", { enum: ["ok", "absent", "degraded"] }).notNull(),
  edhrecTotal: integer("edhrec_total"),
  deckCount: integer("deck_count"),
  rank: integer("rank"),
  bracketCounts: jsonb("bracket_counts").$type<Record<string, number>>().notNull(),
  avgLand: integer("avg_land"), /* … the other nine … */ avgCurve: jsonb("avg_curve"),
  computedAt: timestamp("computed_at").notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.commanderOracleId, t.partnerOracleId] }),
  // Canonical order IS the schema, not a convention: the lexicographically smaller
  // oracle id is first, so (A,B) and (B,A) cannot both exist. Nothing else in the
  // repo normalises this (§4A.4a).
  check("commander_pair_support_order_check",
    sql`${t.commanderOracleId} < ${t.partnerOracleId}`),
]);
// commander_pair_support_cards: (pairPK columns → FK composite, cascade) + oracleId,
// inclusion real, synergy real, AND position integer not null — the list's own order.
// suggestions-read ranks by LIST POSITION (`rankOf`, suggestions-read.ts:103-108), so a
// table that stored only inclusion/synergy could not rebuild topCards without silently
// changing the ranking semantics. PK (commander, partner, oracle); index on (oracle_id).
// edhrec_pair_cache: same key + order check; payload jsonb not null; fetched_at.
```

- [ ] **Step 2: failing tests — `pair.ts`.** `canonicalPair(a, b)` returns the two oracle ids with the lexicographically smaller FIRST — **the one normalisation, used by every write AND every read**: `decks` stores the pair in a meaningful order (`schema.ts:263-267`, the primary is first), so an un-normalised lookup silently misses every row where the primary carries the larger id, and the CHECK constrains storage only. `pairSlugCandidates` returns `[slugA-slugB]` with the two `commanderSlug` halves joined in alphabetical order, and the reverse as the fallback candidate. `resolvePairEdhrecData`: **a 200 whose body is `{"redirect": "/commanders/<slug>"}` is followed, and the STUB is never cached as a payload** (§4A.4a — the 67-byte trap); TTL and 4xx/5xx behaviour mirror `resolveEdhrecData` (fetcher injected). Pair composition sums to **98**, and any invariant check uses `deckBodySize(hasPartner)` (`deck-size.ts:7`), never a literal. `readPairSupport` and the Task 14 pair reads go through `canonicalPair` — pinned by a test whose fixture deck stores the larger id as primary.
- [ ] **Step 3: the index pass.** `seed-index.ts` gains a pair pass after the singles: `select distinct commander_oracle_id, partner_oracle_id from decks where partner_oracle_id is not null` (through `canonicalPair`), fetched by **`fetchPairUncached(pair)` in `pair.ts`** — a NEW primitive, because no existing one can serve it: `fetchEdhrecUncached(commanderName)` slugifies ONE name (`client.ts:108`) and cannot build a `slugA-slugB` slug, and redirect-stub following must live in this fetch too or the index pass hitting the wrong-order slug parses the 67-byte stub as an absent page — the exact §4A.4a trap, this time in the monthly job. Same no-cache-read/no-cache-write reasoning as `fetchEdhrecUncached`, same politeness: inside the existing serial walk, never a second stream. Project through `toPairRows` (header + cards WITH position, against the same name index), delete-then-insert per pair. Dozens of pages, growing with what the group plays — never a sweep of the 2,847 possible pairs (§4A.4a names the cost).
- [ ] **Step 4: the demand path + the preference.** In `suggestions-read.ts` (`:149` today): for a pair deck, first `readPairSupport` (through `canonicalPair`); if a pair row with cards exists, rebuild `topCards` **ordered by `position`** and the `inclusionByName`/`synergyByName` maps — which needs a `cards` join for NAMES, because the pair table stores oracle ids and every consumer here keys on lowercased name. Serving from the table sets `degraded: false` (stored index data — same standing as the single-commander support the scoring engine trusts) and leaves the `shoppingFigures` path exactly as it computes today. Else `resolvePairEdhrecData` through `edhrec_pair_cache` (demand, TTL'd, `degraded` from its result as the live path does). Else the existing `mergeEdhrecData` fallback — **the merge is not deleted**; a pair EDHREC has no page for keeps today's behaviour (§4A.4a). Extend the existing tests: pair-preferred (order preserved by position), cache-fallback, merge-fallback.
- [ ] **Step 5:** Also correct `merge.ts`'s false premise comment ("a pair has no joint rank" — it has: the pair page carries `num_decks` and `rank`; the merge is the no-page fallback and says so).
- [ ] **Step 6:** `pnpm db:generate` → 0043. Tests PASS. Suite + gate. Commit `feat: partner pairs get their own support, composition and demand cache`.

---

### Task 11: `pnpm db:build:staples`

**Files:**
- Create: `src/lib/staples/condition.ts`, `scripts/build-staples.ts`
- Modify: `src/db/schema.ts`, `package.json`, `.github/workflows/commander-index.yml`
- Test: `src/lib/staples/condition.test.ts`
- Create: `drizzle/0044_*.sql`

**Interfaces:**
- Produces: `identityCondition(colors: string[]): string` — THE condition spelling, used by the derivation and the profile reader both (one vocabulary, §4A.7); `format_staples` and `identity_composition` populated; the workflow step.

- [ ] **Step 1: the vocabulary.**

```ts
/** The staples floor's condition spelling, and the fit's. One definition (§4A.7):
 *  alphabetical colour letters joined ('BG', 'RW', …), 'C' for colourless —
 *  the exact spelling measure-staples.mts derived the ratified floors under
 *  (array_to_string over Scryfall's alphabetical arrays). */
export function identityCondition(colors: readonly string[]): string {
  return colors.length === 0 ? "C" : [...colors].sort().join("");
}
export const countCondition = (n: number) => `count:${n}`;
```

Tests: `[] → 'C'`, `['W'] → 'W'`, `['U','W'] → 'UW'`, `['G','B'] → 'BG'`, union-of-pair input.
- [ ] **Step 2: schema** — `format_staples` exactly §4A.7 (PK `(oracle_id, condition)`, FK to cards, five figure columns, comments carrying the three rules: no `all`, unweighted membership, `weighted_rank` display-only); `identity_composition`:

```ts
export const identityComposition = pgTable("identity_composition", {
  condition: text("condition").primaryKey(),      // same vocabulary as format_staples
  avgLand: real("avg_land").notNull(), /* … ten avg_* … */ avgCurve: jsonb("avg_curve"),
  commanders: integer("commanders").notNull(),    // bucket size — the sample bar's witness
  withComposition: integer("with_composition").notNull(), // how many carried avg_* rows
  computedAt: timestamp("computed_at").notNull().defaultNow(),
});
```

An average-of-averages, weighted by `deck_count`, and labelled the weaker claim it is via `basis: "identity"` at read time (§4A.6b).
- [ ] **Step 3: the derivation script.** SQL mirrors `measure-staples.mts` section 5 (the ratified cut): per exact-identity bucket with ≥100 `ok` commanders — breadth ≥ 0.50 of the bucket, avg inclusion ≥ 20, basics excluded by `type_line` (never threshold), `weighted_rank` from `deck_count`-weighted share ordering display only. `count:` buckets for commanders whose exact identity failed the bar, same cut, written only where the count bucket itself clears 100. `identity_composition` derived in the same run over the same bucket definitions from the `avg_*` columns (weighted mean over commanders whose composition is non-null) — **including the `count:` buckets that clear 100 commanders**, stated because Task 12's basis chain, Task 15 and Task 20's `basis` mutation all depend on count-conditioned composition rows existing. Then a **single-transaction** clear-and-fill of both tables and `stampCatalogRefresh()` (R9). The script PRINTS its full derivation — breadth distribution, both sides of every cut boundary, weighted-vs-unweighted deltas, per-condition floor sizes — because that output is the argument sub-project 2 disputes BEFORE building (§4A.8, the `measure-gap-line` role).
- [ ] **Step 4: run against local-dev** (needs Task 9's columns but tolerates them empty — `identity_composition` simply gets `withComposition: 0` rows refused; the floor half runs today). Acceptance: re-run `scripts/measure-staples.mts` in the same sitting and diff the derivation's floors against its section-5 output under the ratified cut — the spec publishes the 27-card 25% list, the count 46 at 20% and four named additions (`Akroma's Will`, `Teferi's Protection`, `Lightning Greaves`, `Smothering Tithe` admitted; `Cut a Deal` and `Flowering of the White Tree` refused), so assert those six by name and the rest against the re-run. Any difference: stop and find out which side is wrong before proceeding.
- [ ] **Step 5: the workflow step.** In `commander-index.yml`, after the `db:build:index` step, same env, per leg:

```yaml
      - name: Derive the staples floor and identity composition
        run: pnpm --silent db:build:staples | tee -a "$GITHUB_STEP_SUMMARY"
```

(A step, not a `workflow_run` chain: `workflow_run` cannot tell which matrix leg it heard — the prose workflow's documented problem — and unlike prose this derivation is free, so both legs just run it. R10.)
- [ ] **Step 6:** Suite + gate. Commit `feat: db:build:staples — the measured floor and the identity composition`.

---

### Task 12: profile types + `buildDeckProfile`

**Files:**
- Create: `src/lib/profile/types.ts`, `src/lib/profile/build.ts`
- Test: `src/lib/profile/build.test.ts`

**Interfaces:**
- Consumes: `classifyRoles` (`src/lib/recs/roles.ts`), `CURVE_MAX` (`src/lib/decks/stats.ts:153`) and `manaCurve` (`stats.ts:190`), `identityCondition` (Task 11).
- Produces: every type below, and `buildDeckProfile(input: ProfileInput): DeckProfile` — pure; Task 14's loader assembles `ProfileInput` from rows.

- [ ] **Step 1: the types** (§13.1 resolved — R1, R16, R17; `CardRef`/`FlaggedCardRef`/`ComboRef` live in `src/lib/bracket/types.ts` from Task 17's PR? No — they are needed here first, so they live HERE and `bracket/types.ts` imports them; one definition):

```ts
export type CardRef = { oracleId: string; name: string };
export type FlagSource = "spellbook_sweep" | "oracle_rule";
export type FlaggedCardRef = CardRef & { sources: FlagSource[] };
export type ComboRef = {
  variantId: string;
  cards: CardRef[];                 // the uses — 2 for everything the slot counts
  produces: string[];
  bracketTag: string;               // Spellbook's opinion — reported, never a rule (§5.2)
  usesCommander: boolean;           // at least one piece is in the command zone
};
export type ProfileCounts = { total: number; nonland: number; land: number; basics: number };
export type ProfileRoles = {
  // classifyRoles over the 99 plus both commanders (they are castable and counted,
  // matching the stats loader's fold — probe:stats). counts and receipts together:
  // a count with no cards is an assertion the reader cannot check (§2.2).
  counts: Record<Role, number>;
  cards: Record<Role, CardRef[]>;
};
export type ProfileColours = {
  identity: string[];               // commander ∪ partner, alphabetical
  /** Union of colour identities over the deck's LAND rows — an approximation of what
   *  the mana base can produce (colour identity includes activation costs; Exotic
   *  Orchard reads as colourless). Labelled approximate wherever drawn. */
  producibleColors: string[];
  /** Colours the deck's nonland MANA COSTS ask for that no land can produce — the
   *  disagreement. "Needs" = the WUBRG letters in nonland `manaCost` pips, NOT colour
   *  identity (an activation-cost-only colour is not a cast-time need). A HYBRID pip is
   *  unproducible only when NO half is producible — {W/U} in a Plains deck needs
   *  nothing, and reporting U there would manufacture a disagreement. */
  unproducible: string[];
};
export type CompositionTargets = {
  land: number; basic: number; nonbasic: number; creature: number; instant: number;
  sorcery: number; artifact: number; enchantment: number; planeswalker: number; battle: number;
};
export type ProfileSkeleton = {
  composition: {
    of: "commander" | "pair" | "identity" | "count";   // R17: discriminant travels with data
    targets: CompositionTargets;
    averageCurve: Record<string, number> | null;
  } | null;
  condition: string;                 // the floor bucket actually used; always present (§5.1)
  staples: StapleRef[];
  commanderDeckCount: number | null;
};
export type StapleRef = CardRef & {
  commanders: number; commanderTotal: number;          // never a rate without its denominator
  avgInclusion: number; weightedRank: number;
};
export type ProfileLegality = { banned: CardRef[]; identityViolations: CardRef[] };
export type ProfileThemes = { themes: { slug: string; label: string }[] };  // null today, §5.3
export type ComboReach = {
  tutors: CardRef[];
  reaches: { tutor: CardRef; combo: ComboRef; piece: CardRef }[];
};
export type BracketPopulation = {
  counts: Record<"1" | "2" | "3" | "4" | "5", number>;
  declaredTotal: number;             // the sum — ~22.4% of deckCount, carried explicitly (§6.3a)
  deckCount: number | null;
  of: "commander" | "pair";          // §6.3a: a pair's population is the pair page's
};
export type DetectionCoverage = {   // §6.5's shape (finding 6); strings live beside their
                                    // classifiers (oracle-rules.ts, combo-features.ts)
  massLandDenial: { sources: number; basis: string; knownMiss?: string };
  extraTurn: { sources: number; basis: string };
  twoCardCombos: { sources: number; basis: string };
};
export type ProfileBrackets = {
  gameChangers: CardRef[];
  massLandDenial: FlaggedCardRef[];
  extraTurns: FlaggedCardRef[];
  twoCardCombos: ComboRef[];
  comboReach: ComboReach;
  population: BracketPopulation | null;   // absent, not zero, for the 27 count-less commanders
  detection: DetectionCoverage;
  declared: 1 | 2 | 3 | 4 | 5 | null;     // decks.declared_bracket — never inferred (§6.1a)
};
export type DeckProfile = {
  deckId: string;
  fingerprint: string;
  counts: ProfileCounts; roles: ProfileRoles; curve: ManaCurve; colours: ProfileColours;
  skeleton: ProfileSkeleton; brackets: ProfileBrackets; legality: ProfileLegality;
  themes: ProfileThemes | null;      // ALWAYS null in sub-project 1 (§5.3, #724)
};
```

Everything a plain object/array/scalar — no `Map`, no `Date` (§5.4's round-trip rule, stated in the module header).
- [ ] **Step 2: failing tests.** The §8 unit list plus the R14 edges:

```ts
it("folds both commanders into counts, roles and the curve", ...)
it("folds both commanders into EVERY bracket list: a Game Changer commander is in
    gameChangers, a flagged commander in massLandDenial/extraTurns, a tutor commander in
    comboReach.tutors", ...)   // the global commanders-are-cards rule; under-slotting
                               // a Kinnan-led deck is the failure this pins
it("reads basics by type line", ...)
it("unproducible reads mana-cost pips, not colour identity — an activation-cost-only
    colour is not a need", ...)
it("a hybrid pip is unproducible only when NO half is producible — {W/U} with Plains
    reports nothing", ...)
it("reports identity violations and banned cards as legality, never as bracket facts", ...)
it("computes unproducible as needed-minus-producible", ...)
it("an empty deck: zero counts, permits nothing to violate, no crash", ...)
it("an over-100 import reports its real total", ...)
it("themes is null even when commander tags are supplied in input", ...)  // the #724 gate
it("composition basis chain: pair row → pair; commander avg → commander; identity row →
    identity; count row → count; nothing → composition null, condition still present", ...)
it("population is null when the commander has no counts — absent, not zero", ...)
```

- [ ] **Step 3: implement** `buildDeckProfile`. Input shape (`ProfileInput`) mirrors what the loader can cheaply gather: deck rows (`{oracleId, name, typeLine, oracleText, keywords, cmc, colorIdentity, quantity, commanderLegal}`), commander + partner rows, `declared`, flag rows, GC set, combo rows, staples rows, composition candidates (pair/commander/identity/count, pre-fetched), population row, tutor rows (Task 16 wires reach; until then `comboReach` computes from inputs given — the builder takes `tutors` pre-classified so it stays pure).
- [ ] **Step 4:** tests PASS. Suite. Commit `feat: the Deck Profile — types and the pure builder`.

---

### Task 13: the fingerprint

**Files:**
- Create: `src/lib/profile/version.ts`, `src/lib/profile/fingerprint.ts`
- Test: `src/lib/profile/fingerprint.test.ts`

**Interfaces:**
- Produces: `PROFILE_VERSION`, `profileFingerprint(input): string`. Task 14's cache key consumes it.

- [ ] **Step 1: failing tests:**

```ts
it("is stable across card-row order", ...)
it("moves with quantity, commander, partner, declared, and PROFILE_VERSION", ...)
it("ignores auto and anything not named", ...)      // R6: provenance is not membership
it("is 64 lowercase hex chars", ...)
```

- [ ] **Step 2: implement** (R6):

```ts
import { createHash } from "node:crypto";           // server-only, the tuning-plan precedent
import { PROFILE_VERSION } from "./version";
export function profileFingerprint(input: {
  commanderOracleId: string; partnerOracleId: string | null;
  declaredBracket: number | null;
  cards: { oracleId: string; quantity: number }[];
}): string {
  const rows = [...input.cards]
    .sort((a, b) => (a.oracleId < b.oracleId ? -1 : 1))
    .map((c) => [c.oracleId, c.quantity]);
  return createHash("sha256")
    .update(JSON.stringify({ v: PROFILE_VERSION, commander: input.commanderOracleId,
      partner: input.partnerOracleId, declared: input.declaredBracket, cards: rows }))
    .digest("hex");
}
```

Deliberately NOT the catalog generation — `cacheForUser` injects that into the key itself, and repeating it files one input twice (§5.1's jsdoc, kept).
- [ ] **Step 3:** PASS. Commit `feat: profile fingerprint and version`.

---

### Task 14: `loadDeckProfile`

**Files:**
- Create: `src/lib/profile/load.ts`
- Modify: `src/db/schema.ts` (`decks.declared_bracket` — moved HERE from PR 6 so the gather reads a real column; the plan review caught PR 5 consuming a PR 6 migration)
- Create: `drizzle/0045_*.sql`
- Test: `src/lib/profile/load.test.ts` (rendered SQL via `PgDialect.sqlToQuery`; assembly is probe territory)

**Interfaces:**
- Consumes: everything above. Produces: `loadDeckProfile(deckId, userId): Promise<DeckProfile | null>` (null = not the reader's deck — the same refusal `loadDeckStats` makes); `cachedDeckProfile(deckId, userId)` (R18); `loadCandidateFacts(profileDeckIds, commanderIds, oracleId)` for Task 18.

- [ ] **Step 1: the gather.** (finding 3: `deck_cards` + `decks` columns ARE the draft.) One deck+ownership check; `deck_cards` joined to `cards`; the two commander rows **appended to the card rows BEFORE any flag or classifier pass** — `loadBracketFlags` takes the union of deck and commander ids, GC reads the joined `cards.game_changer` over the same union, and the oracle-text classifiers walk it too (the commanders-are-cards constraint; the combo query below already unions them per §4.3b rule 3); staples + composition per the basis chain (pair row → `commander_support` avg → `identity_composition` exact → `identity_composition` count — first hit wins, each a cheap keyed read); population (pair row's `bracket_counts`+`deck_count` for pairs, else `commander_support`'s); tutors via `classifyTutor` over the deck's texts (Task 16 — until that task merges this returns `{ tutors: [], reaches: [] }` behind a named `TODO(task 16)` the probe fails on if left).

  **The combo query** — the three §4.3b rules IN the SQL, commanders included (rule 3):

```ts
// Every any() takes sql.param(...)::uuid[] — the house convention (candidates.ts:396,
// availability-query.ts:589, price-query.ts:92); an uncast JS array against a uuid
// column fails at runtime.
const ids = [...deckIds, commanderId, ...(partnerId ? [partnerId] : [])];
const commanders = [commanderId, ...(partnerId ? [partnerId] : [])];
const rows = await db.execute(sql`
  select v.variant_id, v.bracket_tag, v.produces,
         array_agg(vc.oracle_id order by vc.oracle_id) as pieces,
         bool_or(vc.oracle_id = any(${sql.param(commanders)}::uuid[])) as uses_commander
  from ${spellbookVariants} v
  join ${spellbookVariantCards} vc on vc.variant_id = v.variant_id
  where v.card_count = 2
    and cardinality(v.requires_template_ids) = 0            -- §4.3b rule 1
    and exists (select 1 from ${spellbookVariantCards} vc2   -- prune before the group
                where vc2.variant_id = v.variant_id
                  and vc2.oracle_id = any(${sql.param(ids)}::uuid[]))
  group by v.variant_id, v.bracket_tag, v.produces
  having bool_and(case when vc.must_be_commander              -- §4.3b rule 2
                       then vc.oracle_id = any(${sql.param(commanders)}::uuid[])
                       else vc.oracle_id = any(${sql.param(ids)}::uuid[]) end)`);
```

then `isInfiniteOrGameEnding(produces)` in TS (Task 8) — card count alone is never the test (§5.2). (No index serves the `card_count = 2 and cardinality(...) = 0` filter; fine at Spellbook's scale, and a partial index is the one-line insurance if `probe:bracket`'s timing says otherwise.)
- [ ] **Step 2: rendered-SQL tests** via `PgDialect.sqlToQuery` — the repo's method for pinning emitted SQL (AGENTS.md's correlated-subquery section); a bare `sql` template has no `.toSQL()`. This query is handwritten with manual aliases, so the test pins the text itself: `must_be_commander`, both `any` arms, and the `::uuid[]` casts present.
- [ ] **Step 3: the wrapper** (R18):

The fingerprint's inputs are one cheap read — the deck row plus `deck_cards` `(oracleId, quantity)` — so the wrapper reads THOSE, computes the key, and puts everything expensive (flags, combos, staples, composition, population, classifiers, the build) inside the cached closure:

```ts
export async function cachedDeckProfile(deckId: string, userId: string) {
  const head = await loadProfileHead(deckId, userId);   // deck row + deck_cards ids/qtys
  if (!head) return null;
  const fingerprint = profileFingerprint(head);
  return cacheForUser(userId, ["deck-profile", deckId, fingerprint],
    () => loadDeckProfileFromHead(head));               // the expensive gather + pure build
}
```

`loadDeckProfile` = `loadProfileHead` + `loadDeckProfileFromHead`, so the probe calls the uncached whole and the wrapper shares every line. **The body builds FROM the head's rows and never re-reads `deck_cards`** — a re-read inside the cached closure could see an edit made after the head read and file a profile built from the new contents under the old fingerprint; the head already holds `(oracleId, qty)`, so the body joins `cards` by those ids. The `decks.declared_bracket` schema step lands here (integer, nullable, `check between 1 and 5`, never inferred or defaulted; written by no surface until Tier B's Round 3 ask) → `pnpm db:generate` → 0045. Honest comment kept: no shipped route calls the wrapper yet; the first Tier B consumer proves stamp-retirement end to end, and its plan carries that as a named task (R18).
- [ ] **Step 4:** Suite + gate. Commit `feat: loadDeckProfile — the gather, the combo join, the cache wrapper`.

---

### Task 15: `fitSkeleton`

**Files:**
- Create: `src/lib/profile/fit.ts`
- Test: `src/lib/profile/fit.test.ts`

**Interfaces:**
- Consumes: `DeckProfile`, `CURVE_MAX`. Produces (§6A, with R17's basis derivation):

```ts
export type TypeFit = { type: keyof CompositionTargets; have: number; target: number; delta: number };
export type CurveFit = { buckets: { cmc: number; have: number; average: number; delta: number }[] };
export type SkeletonFit = {
  basis: "commander" | "pair" | "identity" | "count" | "none";
  types: TypeFit[]; curve: CurveFit | null;
  missingStaples: StapleRef[]; presentStaples: StapleRef[];
  coverage: { commanderDeckCount: number | null; thin: boolean };
};
```

- [ ] **Step 1: failing tests** (§8's skeleton list):

```ts
it("basis follows the profile's composition source, none when null", ...)
it("no functional roles exist anywhere on the type", ...)   // structural — §6A / §4A.5:
  // a fit that mixed measured type targets with asserted role constants would launder
  // the second through the first's credibility. ROLE_TARGETS is not imported here.
it("folds EDHREC's literal tail keys ('8','9') into the 7+ bucket before comparing", ...)
  // §6A: unaligned comparison reports a phantom gap at the top of every curve
it("missingStaples carries rate AND denominator per card", ...)
it("thin coverage is reported, and the floor still serves", ...)
it("a deck holding every floor card has empty missingStaples and full presentStaples", ...)
```

- [ ] **Step 2: implement.** Type deltas from `CompositionTargets` vs profile counts by type line (the same bucketing the composition uses — land/creature/instant/sorcery/artifact/enchantment/planeswalker/battle, basic/nonbasic within land); `curve` only when `averageCurve` non-null; `thin` from `commanderDeckCount` under a named const: read the `deck_count` distribution off the shipped index (one query) and set `THIN_DECK_COUNT` at the bottom decile — and the comment ADMITS the decile is a convention, not a measurement: the VALUE is read off real data, the PERCENTILE is a chosen round number, and dressing it as derived would be the exact §2.4a sin with better clothes. Record percentile, measured value and date. Null `commanderDeckCount` is `thin: true` — no page is the thinnest data there is.
- [ ] **Step 3:** PASS. Commit `feat: fitSkeleton — the deck against its measured skeleton`.

---

### Task 16: the tutor-target classifier

**Files:**
- Create: `src/lib/bracket/tutor-targets.ts`, `scripts/measure-tutor-targets.mts`
- Test: `src/lib/bracket/tutor-targets.test.ts`
- Modify: `src/lib/profile/load.ts` (wire `comboReach`)

**Interfaces:**
- Produces: `classifyTutor(text): TutorTarget | null` where `TutorTarget = { kinds: "any" | string[]; colors: string[] | null; maxManaValue: number | null; basicOnly: boolean }`; `tutorReaches(t, piece: { typeLine; colorIdentity; cmc })`; `comboReach` populated on the profile.

- [ ] **Step 1: failing tests** — the fixture IS the measured set (R23):

```ts
// any-card:      Demonic Tutor, Vampiric Tutor, Diabolic Tutor, Gamble
// typed:         Mystical (instant|sorcery), Worldly (creature), Enlightened
//                (artifact|enchantment), Idyllic (enchantment), Fabricate (artifact),
//                Crop Rotation (land), Sylvan Scrying (land)
// coloured:      Green Sun's Zenith → { kinds:['creature'], colors:['G'] }
// mana value:    Trinket Mage mv≤1, Tribute Mage mv=2 (parse "with mana value 2" and
//                "mana value N or less" — an exact-N clause stores maxManaValue N with
//                exact:true? NO — keep ONE field and treat exact-2 as max 2; the
//                over-claim direction, documented)
// basics:        Evolving Wilds → basicOnly, and basicOnly reaches nothing the combo
//                test cares about (no basic is a combo piece; Dark Depths is nonbasic
//                and stays reachable by Crop Rotation, Sylvan Scrying)
// negations:     Stranglehold ("can't search") is NOT a tutor; Aven Mindcensor is not
// reach:         Demonic reaches Thassa's Oracle; Worldly does not reach an instant;
//                GSZ does not reach a colourless piece
```

- [ ] **Step 2: implement.** Search-clause regex (`search(es)? (your|their) library for … card`), negation checked first, kind words from a fixed list (creature, artifact, enchantment, instant, sorcery, land, planeswalker, battle, legendary), colour adjectives mapped to letters, `basic` flag, mana-value clauses. Colour reach tests against `colorIdentity` — the over-claim documented in the module header (R23). `reaches` on the profile: every tutor × every `twoCardCombos` piece where `tutorReaches` — pieces resolved from the combo's card refs against the deck's own rows (already loaded).
- [ ] **Step 3: measure before believing.** `measure-tutor-targets.mts` (read-only, `requireEnv`, local-dev): recall/precision over the fixture names read from the real catalog, then the eyeball sweep — every card whose text matches the search clause, with the parsed predicate, first 60 printed. Recorded figures land in the module header comment. A surprise in the sweep (a big tutor family misparsed) is fixed as a CLAUSE, never by tuning against the fixture (the §4.2 trap).
- [ ] **Step 4:** PASS + measure run recorded. Commit `feat: tutor-target classifier, measured, and comboReach`.

---

### Task 17: `slotDeck`

**Files:**
- Create: `src/lib/bracket/types.ts`, `src/lib/bracket/rules.ts`, `src/lib/bracket/slot.ts`
- Test: `src/lib/bracket/slot.test.ts`
- (No migration — `decks.declared_bracket` moved to Task 14 / PR 5, which reads it.)

**Interfaces:**
- Produces:

```ts
export type Bracket = 1 | 2 | 3 | 4 | 5;
export type RuleId = "gameChangers" | "massLandDenial" | "extraTurns" | "twoCardCombos";
export type Violation = {
  rule: RuleId; bracket: 1 | 2 | 3;
  cards: CardRef[];                  // receipts, never counts alone (§2.2)
  combos?: ComboRef[];               // when the RECEIPT is a combo: the twoCardCombos rule,
                                     // and the B3 extraTurns LOOP violation (R3) — the
                                     // combo is the evidence B3 fell, so the violations
                                     // array must be able to say so, not only the limits row
  have: number; limit: number;       // limit 0 where the bracket forbids outright
};
export type BracketLimitReport = {
  bracket: 1 | 2 | 3;
  gameChangers: { have: number; limit: number; violated: boolean; cards: CardRef[] };
  massLandDenial: { have: number; violated: boolean; cards: FlaggedCardRef[] };
  extraTurns:
    | { counted: true; have: number; violated: boolean; cards: FlaggedCardRef[] }   // B1
    | { counted: false; have: number; cards: FlaggedCardRef[];    // B2/B3 — the COUNT is
        // reported with no verdict; the LOOP clause is violated only by measured evidence:
        loopCombos: ComboRef[]; violated: boolean };  // an assembled combo producing
      // infinite turns (R3 — Spellbook's own data, the combo is the receipt). The
      // self-recurring-card loop is NOT detected and detection copy says so.
  twoCardCombos:
    | { policy: "forbidden"; have: number; violated: boolean; combos: ComboRef[] }   // B1/B2
    | { policy: "earlyGameOnly"; have: number; combos: ComboRef[] };  // B3 — widens, never
      // violates: lateness is not computable (§6.3; finding 4).
};
export type BracketLean = {
  likely: 3 | 4;
  reason: "reachable" | "drawOnly";
  receipts: { combo: ComboRef; tutors: CardRef[] }[];   // every card behind it (§6.1b)
};
export type UnquantifiedFacts = { extraTurns: FlaggedCardRef[] };
export type BracketVerdict = {
  permits: Bracket[];                // [1,2] | [2] | [3] | [4] | [4,5]
  declared: Bracket | null;
  declaredOutsidePermits: boolean;   // R16 — drift is its own finding (§6.1a)
  lean: BracketLean | null;          // why the combo boundary landed where it did
  limits: Record<"bracket1" | "bracket2" | "bracket3", BracketLimitReport>;
  violations: Violation[];
  unquantified: UnquantifiedFacts;
  detection: DetectionCoverage;
};
export function slotDeck(profile: DeckProfile): BracketVerdict;
```

`rules.ts` transcribes §6.2's quoted text as the limits table and RE-EXPORTS the detection strings, which live beside their classifiers (`oracle-rules.ts`, `combo-features.ts` — PRs 1–2, because `buildDeckProfile` in PR 5 populates `detection` and one definition must serve both; re-measured whenever a classifier changes, mutation-covered by the probe).
- [ ] **Step 1: `rules.ts`.** The §6.2 limits transcription; `permitsFor`; re-exports of `MLD_DETECTION` / `EXTRA_TURN_DETECTION` (Task 2) and `COMBO_DETECTION` (Task 8) so verdict consumers import one module while the definitions live beside their classifiers. One comment the reasoning review earned: **B2's `loopCombos` flag is always redundant** — any infinite-turns combo already violates B2's combo clause — and it stays anyway, so nobody later "fixes" the redundancy by deleting the B3 half, which is the one that bites.
- [ ] **Step 2: failing tests** — §8's slot list verbatim plus the boundary table:

```ts
it("permits [1,2] on a clean deck — the lowest bracket is never silently floored", ...)
it("permits [2] on extra turns alone; the same card at B1 is a violation and at B2 is
    not — the split a single shared rule gets wrong at one end (§6.3, §8)", ...)
it("permits [3] at exactly 3 Game Changers and no combo; Underworld Breach as the 4th
    names the excess and permits [4,5]", ...)
it("permits [3] on a two-card infinite the deck can only draw into, [4] when its tutors cover it:
    reachable when a tutor reaches a piece, drawOnly when none does, receipts naming
    combo, pieces and tutors", ...)
it("permits [4,5] when the assembled combo produces INFINITE TURNS — the loop clause
    violates B3 outright where a generic infinite only widens, with the combo as the
    receipt on the B3 extraTurns row (R3); an infinite-mana combo does NOT trip it", ...)
it("a template-gated 2-uses variant does not slot (it never entered twoCardCombos)", ...)
it("a mustBeCommander piece in the 99 does not slot; the commander as a piece does", ...)
it("MLD from each source carries its provenance; detection stays partial", ...)
it("declaredOutsidePermits: declared 2 with permits [4,5] → true; null declared → false", ...)
it("the slot is the LOWEST satisfied bracket — a deck satisfying B4 trivially never
    reads 4 unless 1–3 are violated (§6.1's earlier-draft trap)", ...)
it("a Game Changer COMMANDER counts against every GC limit — a Kinnan-led deck with a
    clean 99 permits [3], never [1,2]", ...)   // commanders-are-cards
it("empty deck permits [1,2] (R14)", ...)
```

- [ ] **Step 3: implement.** The whole decision:

```ts
const turnLoops = combos.filter((c) => producesInfiniteTurns(c.produces));
const b1 = gc.length > 0 || mld.length > 0 || extraTurns.length > 0 || combos.length > 0;
const b2 = gc.length > 0 || mld.length > 0 || combos.length > 0;
const b3 = gc.length > 3 || mld.length > 0 || turnLoops.length > 0;  // R3: looping extra
  // turns is stated as out at B3, and an assembled infinite-turns combo is a loop by
  // Spellbook's measured data — so it VIOLATES B3 where a generic infinite only widens.
const permits: Bracket[] =
  !b1 ? [1, 2] : !b2 ? [2] : !b3 ? (assemblesCombo ? [4] : [3]) : [4, 5];
```

Violations, limits and unquantified assembled from the same inputs; lean wherever a combo decided the bracket, from `profile.brackets.comboReach`.
- [ ] **Step 4:** PASS. Suite + gate. Commit `feat: slotDeck — the permitted range, the limits table, the combo lean`.

---

### Task 18: `bracketDelta`

**Files:**
- Create: `src/lib/bracket/delta.ts`
- Modify: `src/lib/profile/load.ts` (`loadCandidateFacts`)
- Test: `src/lib/bracket/delta.test.ts`

**Interfaces:**
- Produces:

```ts
export type CandidateFacts = {
  card: CardRef;
  gameChanger: boolean; massLandDenial: boolean; extraTurn: boolean;
  tutor: boolean;
  completesCombos: ComboRef[];       // variants one-card-away that this card closes
};
export type BracketDelta =
  | { kind: "moves"; from: Bracket[]; to: Bracket[]; rule: Violation }
  | { kind: "counts"; rule: "gameChangers"; now: number; limit: number; to: Bracket[] }
  | { kind: "unquantified"; rule: "extraTurns"; now: number; bracket: Bracket }
  | { kind: "ruleless"; fact: "tutors"; now: number }
  | { kind: "none" };
export function bracketDelta(profile: DeckProfile, candidate: CandidateFacts): BracketDelta;
```

(`from`/`to` are ranges, not single brackets — `[1,2] → [2]` and `[3] → [4]` both need the array shape; a §13.1 type decision this plan makes and names.)
- [ ] **Step 1: failing tests** — §7.2's four sentences as four cases, plus the two traps:

```ts
it("Armageddon on a [3] deck: moves, rule massLandDenial, to [4,5]", ...)
it("a 4th Game Changer: counts, now 4, limit 3, to [4,5] — counts even though it moves;
    the count IS the sentence (§7.2's second example)", ...)
it("a 2nd Game Changer on a [3] deck: counts, now 2, limit 3, to [3]", ...)
it("a 3rd extra-turn card on a [3] deck: unquantified — NEVER moves at B2/B3", ...)
it("an extra-turn card on a [1,2] deck: MOVES to [2] — B1 counts (§7.2's parenthetical)", ...)
it("an 8th tutor: ruleless — never unquantified, never moves (§8's three-variants trap:
    they read alike in prose and mean different things)", ...)
it("a card completing a combo the deck cannot tutor for: moves nothing", ...)
it("a card completing an INFINITE-TURNS combo on a [3] deck: moves to [4,5] — the loop
    clause, not the widening (R3)", ...)
it("a second combo on a deck already at [4]: none", ...)
```

- [ ] **Step 2: implement.** Recompute `permitsFor` with the candidate folded in, then classify by an EXPLICIT precedence, because one card can fire several rules (Underworld Breach is a Game Changer that completes combos) and the four shapes must never be blurred: (1) permits changed by MLD, an extra turn at a B1-permitting deck, or a completed combo → `moves` with THAT rule and its receipts (a completed infinite-turns combo names the loop rule, R3); (2) the candidate is a Game Changer → `counts` with `to` = the new range, and any co-fired combo completion carried in the rule's `combos` receipts so the Tier B sentence explains the true reason; (3) extra turn at an unmoved range → `unquantified`; (4) tutor → `ruleless`; (5) else `none`. Pure, cheap per row — the property later sub-projects need (§7.2).
- [ ] **Step 3: `loadCandidateFacts`.** Flags from `cards.game_changer` + `card_bracket_flags` + `classifyTutor`; `completesCombos` = the Task 14 combo query with the candidate unioned in, minus the combos already assembled — one-away detection as a diff of two runs of the same rule, never a second predicate that can drift.
- [ ] **Step 4:** PASS. Commit `feat: bracketDelta — the push check, four shapes never blurred`.

---

### Task 19: `upgradePath`

**Files:**
- Create: `src/lib/bracket/upgrade.ts`
- Test: `src/lib/bracket/upgrade.test.ts`

**Interfaces:**
- Produces (R2 — candidates, never choices):

```ts
export type UpgradeItem =
  | { rule: "gameChangers" | "massLandDenial" | "extraTurns";
      removeCount: number;           // how many must leave (excess over the target's limit)
      candidates: CardRef[] }        // every card the count could come from — no pick made
  | { rule: "twoCardCombos";
      combos: { combo: ComboRef; candidates: CardRef[] }[] };  // ≥1 piece per combo
export type UpgradePath = {
  target: 1 | 2 | 3;
  items: UpgradeItem[];              // empty = already satisfied
  blocked: boolean;                  // some violation cannot be cleared by removals alone
};
// A COMMANDER is never a candidate, on ANY rule — you cannot cut the commander (the
// commanders-are-cards constraint has a converse: they are cards you cannot remove). A
// count rule whose excess cannot be met from the 99 (the flag sits on the commander), or
// a combo whose every piece is a commander, sets blocked: true with the shortfall visible
// in candidates.length < removeCount / an empty per-combo candidate list.
export function upgradePath(profile: DeckProfile, target: 1 | 2 | 3): UpgradePath;
```

- [ ] **Step 1: failing tests:**

```ts
it("4 GC to target 3: removeCount 1, candidates all 4 — determined in cardinality,
    undetermined in identity, and it stays that way (§13.2)", ...)
it("to target 2: every GC, every combo (per-combo piece sets), MLD listed", ...)
it("to target 1: extra turns join — B1 is the only bracket where the COUNT is an item", ...)
it("to target 3: an infinite-turns combo is an item (break the loop — per-combo piece
    candidates), where a generic infinite combo is not (it only widens at B3)", ...)
it("a commander-piece combo at target 2: empty candidates for that combo, blocked true", ...)
it("a Game Changer COMMANDER at target 2: the commander is not a candidate, and with no
    other GC the removeCount cannot be met — blocked true", ...)
it("already at target: items empty, blocked false", ...)
```

- [ ] **Step 2: implement** off the same per-bracket facts `slotDeck` computes (share the internal tally helper in `rules.ts` — two copies of the counting drift). A consequence, not a recommendation: every candidate is a card the deck holds against a rule the target states (§7.3, amended by R2's honesty about count rules).
- [ ] **Step 3:** PASS. Commit `feat: upgradePath — the consequence, with its full candidate sets`.

---

### Task 20: `pnpm probe:bracket`

**Files:**
- Create: `scripts/probe-bracket.ts`
- Modify: `package.json`

**Interfaces:** none — the acceptance instrument.

- [ ] **Step 1: preconditions.** `requireEnv(["DATABASE_URL"])`; refuse loudly when `spellbook_variants` is empty ("run pnpm db:seed:combos against this branch first") — a probe over empty tables passes while measuring nothing, this repo's most-paid-for trap. `report()` counts its own failures (the `probe:commander-availability` lesson); no `process.exit` in `finally`.
- [ ] **Step 2: fixture.** Per-run `user_id`; a brew (no version) whose cards are chosen FROM THE CATALOG BY QUERY at run time — flagged rows queried by flag, a GC by `game_changer = true`, a combo pair by querying a 2-card variant whose pieces exist locally — never hard-coded names that rot with the catalog. The probe FAILS when its fixture cannot reach a rule it claims to test (§8: a fixture with no Game Changer proves nothing about the Game Changer rule).
- [ ] **Step 3: the six database answers** (§8, minus the cache one — R18, stated in the header with where it went):
  1. A draft-staged add moves the slot before any commit (insert a `deck_cards` row, reload, verdict moved).
  2. The combo detected across the join; then the three §4.3b rules one case each: template-gated pair present → not slotted; `mustBeCommander` piece in the 99 → not slotted; the commander as a piece → slotted (the false-NEGATIVE half, the most consequential of the three). Plus the R3 loop case: an assembled variant producing infinite turns (found by QUERY over the ingested table; FAIL if none is buildable from the local catalog) reads `[4,5]` with the combo on the B3 extraTurns row — and its mutation (drop `producesInfiniteTurns` from the B3 test) must fail the run.
  3. The skeleton join picks the right condition: a mono-white commander resolves `W` and receives Swords to Plowshares; a three-colour one falls back to `count:3` with `basis: "count"`; a missing staple carries the STORED denominator, not a recomputed one. **The fallback states need rows local-dev will not have until a widened index run** (`identity_composition`, pair rows, a commander's `avg_*`) — the probe WRITES sentinels for each, with TWO cleanup shapes kept distinct: a commander's `avg_*` is an UPDATE to an existing `commander_support` row, so it is capture-before-write and RESTORE (the `probe:commander-art` pattern); the `identity_composition` and `commander_pair_support` sentinels are NEW rows, so they are insert-and-DELETE, fabricating the not-null `bracket_counts` on the pair row. Both cleanups in the same `finally` as the fixture user's rows, handles populated before each write. The probe FAILS rather than skips when a state it claims to test is unreachable — no conditional "when the row exists" checks, the silent-pass trap this repo keeps paying for.
  4. Partial detection reported on a fixture holding a known MLD card, **and a flagged COMMANDER case: a deck led by a Game Changer legend (queried by flag, not by name) must slot [3]+ with the commander in the receipts** — the CRITICAL the plan review caught.
  5. Population carries its declared-total denominator, and `of: "pair"` against a pair deck through a sentinel pair row (same capture-restore).
  6. The serialised profile: `JSON.stringify(profile).length` printed and asserted under 2 MB with the fixture's realistic worst case (§5.4 — measured, not assumed).
- [ ] **Step 4: mutation runs, each must fail** (§8's list): drop the `game_changer` read; combo join on card count without the infinite check; remove the `detection` partial report; `bracketDelta` returns `moves` for a tutor; the extra-turn count rule applied at B2; `basis` dropped so a count-conditioned target presents as per-commander. Record each mutation → which checks failed in the probe's header comment. Mutate by pattern, never by line number.
- [ ] **Step 5:** Clean run against local-dev, fixture deleted in `finally`, `finally` populated before each write it covers. Commit `feat: probe:bracket — the slot proven against a real database`.

---

### Task 21: docs, the #10 amendment, close-out

**Files:**
- Modify: `docs/superpowers/plans/2026-09-07-deck-tuning-suggestions.md`, `AGENTS.md`, `docs/superpowers/design-pipeline-status.md` (if it tracks this line)

- [ ] **Step 1: the #10 amendment note** (§10), prepended to the tuning plan under its header:

> **Amended 2026-09-19 by the deck-analysis foundation (spec §10, this PR):** (1) Task 7's
> evidence pack is assembled FROM the Deck Profile (`src/lib/profile`) rather than built
> privately — two deck-characterisation objects is a reconciliation we can see coming.
> (2) The `PATTERN_MIN` game gate on suggestions is removed: the profile alone is sufficient
> input, a deck built tonight gets an answer tonight, and games enter the evidence pack when
> they exist, with the panel stating which it had. No other #10 ruling is re-opened.

- [ ] **Step 2: AGENTS.md entries**, house style (what it is, why it exists, the trap it carries): `db:seed:combos` (sweep-before-bulk, the one-transaction refusal, floors, the stamp), `check:spellbook` (five assertions, the fixture-not-data tension), `db:build:staples` (runs as a Commander-index step per leg and why not `workflow_run`, prints its derivation as the disputable argument), `Combo refresh` (plan→matrix, kill-switch var `COMBO_REFRESH_ENABLED`, Monday 13:00 UTC and why), `probe:bracket` (fixture-by-query, refuses empty tables, the deferred cache proof and where it lands), `build:combo-features` (developer-run, diff is the review), and one line under the classifiers: the B2/B3 chain-or-loop flag does not exist yet and why (R3).
- [ ] **Step 3: close-out operations** (after PR 6 merges): dispatch `Combo refresh` (staging, then production) and `Commander index` (both — populates `avg_*`, pairs, then staples via the step; finding 5 makes this dispatch the thing that turns composition on). Confirm via each job's printed summary; `probe:bracket` against local-dev one final time on `main`.
- [ ] **Step 4:** Commit `docs: deck-analysis foundation — jobs, probe, and the #10 amendment`.

---

## The `Combo refresh` workflow (Task 7's sibling, PR 2)

`.github/workflows/combo-refresh.yml`, cloned from `price-refresh.yml`'s shape (the closest
sibling: one bulk-ish ingest, no per-commander request stream, so no `max-parallel: 1`):

- cron `'0 13 * * 1'` — Monday 13:00 UTC, four hours after `Catalog refresh` (09:00), because a
  variant naming a card the catalog has not ingested is unresolvable and the catalog moves
  first (§4.4); the gap absorbs the printings download's 30-minute timeout worst case (R10).
- `plan` job → matrix over `["staging","production"]`; scheduled runs fan out over BOTH, a
  dispatch takes only the environment it names — never an expression on `environment` (the
  bug found three times in this repo, §4.4).
- Kill switch `vars.COMBO_REFRESH_ENABLED == 'true'` for the cron; dispatch always runs.
- `concurrency: combo-refresh-${{ matrix.target }}`, `cancel-in-progress: false`; `fail-fast: false`.
- `NODE_OPTIONS: --max-old-space-size=4096` — the streamer holds one record at a time but the
  sweep holds 54 responses (~9 MB) plus the row buffers; the ManaPool canary's precedent.
- The step tees `db:seed:combos` output into `$GITHUB_STEP_SUMMARY` — the printed counts are
  the run's argument.

---

## Self-review checklist (run before the plan is believed)

- Every §3 in-scope line has a task: game_changer (1), Spellbook ingest + contract (3–8),
  staples floor (11), widened parse (9), two classifiers (2), legality group (12), pairs (10),
  profile (12–14), fitSkeleton (15), slotDeck + declared (17), tutor classifier (16),
  identity composition (11), pair tables + re-keying (10), bracketDelta (18), upgradePath
  (19), design brief (already emitted — none), tests/probe/#10 amendment (2–20, 21).
- Every §13 item has an R-entry and a task.
- No task references a type another task does not define.
- The three §2.4a-bound classifiers each have a measure script run recorded before a consumer
  reads them (Tasks 2, 16).
