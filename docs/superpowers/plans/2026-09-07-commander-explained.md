# Commander Explained — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the fit score on `/commanders/[slug]` explain itself. The headline figure becomes auditable by addition, the legend prints points over each segment's weight, an inline key defines the three segments, a generated paragraph says in prose why this commander suits the collection, and every card already committed to a deck is marked so the owned counts stop over-promising.

**Architecture:** Three layers, in dependency order. (1) `src/lib/recs/score.ts` stops rounding segments to one decimal and starts rounding each to an integer, which makes `fitPool + fitRoles + fitSynergy === score` exactly; the three weights become named exported constants; a `measurableTotal` and a `rankScore` join the score type so display and ordering stop being the same number. (2) `src/components/commanders/detail.tsx`'s `FitHero` renders that arithmetic — real denominator, points-over-weight legend, an inline disclosure key — and deletes `segPct`, the function that invented a share-of-achieved-total percentage. (3) A stored paragraph on `commander_support`, versioned by input hash and prompt version, read by both the detail page and the home hero card; and a deck-membership aggregate that marks committed cards across the coverage and synergy panels.

**Tech Stack:** Next.js 16 (App Router, server actions), React 19, Tailwind 4, Drizzle ORM on Neon Postgres, Clerk auth, Vitest, pnpm.

**Design handoff:** `design/design_handoff_the99_commander_explained/` — `README.md` (nine decisions and the engineering notes), `PROSE-one-string-two-surfaces.md` (the generator contract and both measured columns), `STATES-key-denominator-committed.md` (the hero × synergy matrix, four paragraph states, the mark across ten surfaces), `commander-explained · copy strings.ts` (every string, production-final), `READINESS.md` (Design's own self-assessment).

**Issues:** #342 (the score does not explain itself), #366 (`segPct` prints a percentage of an achieved total), #346 and #347 (owned counts do not exclude cards already committed to a deck), #345 (no prose).

---

## Readiness verdict — 🟡 Yellow, audited 2026-09-07 (R3)

All six R2 findings are closed. Three residual findings remain, **all eng-resolvable** — none needs a Design round-trip, and all three are recorded here because this is the document that gets read during the build.

**Finding 1 — the wipes baseline in the handoff prose is wrong.** `README.md` §4 and the paragraph worked example both draw the board-wipes target as `2/10`. `src/lib/recs/roles.ts:1-6` sets `ROLE_TARGETS = { ramp: 10, draw: 10, removal: 8, wipes: 3 }`, and `src/lib/decks/mix.ts:52-74` agrees (it adds `land: 37`). The wipes target is **3**, not 10. This matters twice: the drawn example figure is wrong, and — because ruling 5 makes the weakest role the largest *proportional* shortfall — a wrong target would pick the wrong role. **Resolution: take every target from `ROLE_TARGETS`. Never inline a target figure, in code or in a test fixture.**

**Finding 2 — "read with the commander, no fetch" is false.** `README.md`'s engineering notes assume the paragraph rides along on a read the page already does. It does not: `src/app/commanders/[slug]/page.tsx` calls `scoreOneCommander`, `resolveCommanderSlug`, `getRankedList` and `readSynergyCards`, and none of them selects from the `commander_support` **header** row — only `commander_support_cards`. **Resolution: the detail page gains one explicit read of the header row. It is one indexed primary-key lookup, so the cost is real but small; the plan states it rather than hiding it.**

**Finding 3 — the home card has no carrier for the paragraph.** The home hero list is built from `commander_scores` with no join to `commander_support`. **Resolution: the home read joins `commander_support` for the prose column. See Task 12.**

**Finding 4 — the paragraph has no storage at all.** Grepping `src/db/schema.ts` for `prose`, `paragraph` or `promptVersion` returns nothing. The handoff describes the column as though it exists. **Resolution: Task 10 creates it.**

**Finding 5 — #385 landed while this was in design, and it took half of Decision 1 with it.** `One fit denominator, and an EDHREC slug that resolves (#333)` (merged 2026-09-06) removed the `/40 → /100` rescale, so a no-synergy commander now scores out of 40 honestly. That is Decision 1's denominator, already shipped. What it did **not** ship is Hugh's locked ruling 4: the ordering was not preserved, so no-synergy commanders silently dropped in rank when that PR merged. **Task 2 restores the ordering via `rankScore`. This is now a regression fix, not a precaution.**

---

## Locked rulings — do not re-litigate

These were settled by Hugh on 2026-09-06/07. A task that appears to contradict one of them has misread the task.

1. **The legend prints raw points over the segment's weight** — `Pool 12/15 · Roles 20/25 · Synergy 42/60`. Not a share of the achieved total (the `segPct` bug), not a percent of ceiling. `12 + 20 + 42 = 74` must equal the headline, by addition, with no rounding slack.
2. **Each segment rounds to an integer, and the score is their sum.** Not: round each to a decimal and round the total separately. This moves stored scores by up to ±1.5 and requires a `commander_scores` rebuild.
3. **No-synergy commanders keep their rank.** Sort on the rescaled value (`rankScore`), print and draw the honest `/40 measurable`. Two numbers, two jobs.
4. **The weakest role is the largest proportional shortfall** — `(target − have) / target`, ties broken by `ROLE_ORDER`. Not the largest absolute gap.
5. **Bad prose recourse is a checked-in suppression list of oracle ids.** No admin surface, no feedback widget, no per-user override.
6. **The key is an inline disclosure inside the hero, below the legend.** Not a tooltip, not a modal, not per-label popovers.
7. **The Role Coverage sort control has exactly two options** (`Most played`, `Availability`) and ships **whole, with Slice B**. `Availability` is absent — not disabled — until the committed data exists, and a control with one option is not a control.
8. **A sort never re-caps or re-counts.** `COVERAGE_CAP` slices *after* the sort, and the counts beside a panel are of the same set whatever the order.

---

## Global constraints

- Package manager is **pnpm**. Never npm or yarn.
- The schema file is `src/db/schema.ts` — **not** `src/lib/db/schema.ts`.
- Migrations are whatever `pnpm db:generate` emits. **Never hardcode a migration number**, in code or in a comment.
- This repo has **no `pgEnum`**. A constrained string column is `text` plus a `check()` written with the raw `sql` template.
- **Every role target comes from `ROLE_TARGETS`** (`src/lib/recs/roles.ts`). No target figure is inlined anywhere, including in tests and copy fixtures.
- **`segPct` is deleted with nothing replacing it.** No percentage of an achieved total is computed anywhere in this feature, at any breakpoint.
- The three weights are named constants exported from `src/lib/recs/score.ts`: `POOL_WEIGHT = 15`, `ROLES_WEIGHT = 25`, `SYNERGY_WEIGHT = 60`. The literals `15`, `25` and `60` appear nowhere else in scoring or display code.
- Copy lives in `src/lib/copy/commander-explained.ts`, taken verbatim from the handoff's copy file. **No string is invented at a call site.** Wording changes go through `/copy-review`, not through this plan.
- **A failing prose string is rejected, never truncated.** A commander whose generated string fails `acceptProse` has no prose and falls to the prose-absent state (the section unmounts entirely).
- Mobile and desktop parity ship in the same PR. Every UI task states both sets of figures.
- Every UI PR passes the design-review skill (property-table enumerate → verify → confirm) before `gh pr create`.
- Pre-push gate, every push: `pnpm typecheck && pnpm lint && pnpm test` plus the stub-DB build (`DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`), then `git fetch origin && git rebase origin/main`.
- Stage files by name. Never `git add -A`.

---

## Slice split

The handoff's gap 12 is right: this is two features drawn as one page.

**Slice A — the score explains itself.** Tasks 1–13. Needs no new data beyond the prose column: the arithmetic, the denominator, the legend, the key, the paragraph, the home card. This is #342's complaint, #366's bug and #345.

**Slice B — the committed mark and the sort.** Tasks 14–19. Needs a deck-membership aggregate the page does not currently compute, plus a field on each of two carrier types, plus the sort control that only becomes two-optioned once that data exists. This is #346 and #347.

Slice A ships first and independently. Slice B does not block it.

---

## File structure

**Created:**

| Path | Responsibility |
|---|---|
| `src/lib/copy/commander-explained.ts` | `ROLE_SUBJECTS`, `explainedCopy`, `heroNoteEdits`, and the private `spellOut`. Verbatim from the handoff. |
| `src/lib/copy/commander-explained.test.ts` | Guards the copy invariants: no `%` anywhere, one entry per role key, no em-dash outside the note bodies where it is an attribution. |
| `src/lib/recs/weakest-role.ts` | `weakestRole(roleCounts)` — the proportional-shortfall argmin, ties by `ROLE_ORDER`. Pure. |
| `src/lib/recs/weakest-role.test.ts` | Unit tests, including the wipes-target-is-3 case that a hardcoded 10 would get wrong. |
| `src/lib/prose/accept.ts` | `acceptProse` and its four thresholds, exactly as the contract states them. |
| `src/lib/prose/accept.test.ts` | The accept/reject table — length floor and ceiling, one terminal period, front-loading, hedge vocabulary. |
| `src/lib/prose/suppressed.ts` | The checked-in oracle-id suppression list (ruling 5) plus `isSuppressed`. |
| `src/lib/prose/read.ts` | `readCommanderProse(oracleId)` and `readCommanderProseMany(oracleIds)` — the header-row reads findings 2 and 3 make explicit. |
| `src/components/commanders/fit-key.tsx` | The inline disclosure: the dashed trigger, the three definitions, the sum line. Client component. |
| `src/components/commanders/why-section.tsx` | The "Why this commander" section — sentence 1 generated, sentences 2–3 templated, the role link. |
| `src/components/commanders/why-section.test.tsx` | The four paragraph states, including state 4 unmounting the section. |
| `src/components/commanders/fit-key.test.tsx` | Open/close, the two-definition state when synergy is absent, the sum line's arithmetic. |
| `scripts/generate-commander-prose.ts` | The offline generator. Reads the inputs, calls the model, runs `acceptProse`, writes accepted strings only. |

**Modified:**

| Path | Change |
|---|---|
| `src/lib/recs/score.ts` | Named weight constants; integer segment rounding; `score` as their exact sum; `measurableTotal`; `rankScore`. |
| `src/lib/recs/format.ts` | `fitSegments` returns `pct = 100 * score / measurableTotal`; the `Math.min(score, 100)` cap goes. |
| `src/lib/recs/store.ts` | Persist and order by `rankScore`; the rank window uses it too. |
| `src/lib/recs/recommend.ts` | `byScoreThenOracleId` orders by `rankScore`; `CommanderListItem` carries `measurableTotal`. |
| `src/db/schema.ts` | `commander_scores` gains `rank_score`; its rank index moves to it. `commander_support` gains `prose`, `prose_input_hash`, `prose_prompt_version`. |
| `src/components/commanders/detail.tsx` | The hero: real denominator, points-over-weight legend, the key, the two note clause edits; `segPct` and the `Synergy —` placeholder chip deleted. The paragraph section placed at both widths. |
| `src/components/commanders/rec-card.tsx` | Reads `measurableTotal` for the printed denominator and the drawn bar. |
| `src/components/home/hero-commander.tsx` | Prints sentence 1, CSS-clamped to two lines, full string in the DOM. |
| `src/app/commanders/[slug]/page.tsx` | Reads the `commander_support` header row for the prose; Slice B adds the deck-membership aggregate. |
| `src/components/commanders/coverage-section.tsx` | Slice B: the sort control, the panel legends, its own `aria-live` node. |
| `src/components/commanders/coverage-chip.tsx` | Slice B: the dot-fill swap and the aria suffix. |
| `src/components/commanders/synergy-row.tsx` | Slice B: the dot-fill swap. |

---

## Slice A

### Task 1 — Name the weights and make the segments integers

- [ ] Export `POOL_WEIGHT = 15`, `ROLES_WEIGHT = 25`, `SYNERGY_WEIGHT = 60` from `src/lib/recs/score.ts`.
- [ ] Replace the three `Math.round(x * w * 10) / 10` expressions with `Math.round(x * WEIGHT)`.
- [ ] `score = fitPool + fitRoles + (fitSynergy ?? 0)` — a plain sum, no second rounding.
- [ ] Add `measurableTotal: number` to `CommanderScore`: `POOL_WEIGHT + ROLES_WEIGHT + (edhrecTotal == null ? 0 : SYNERGY_WEIGHT)`.
- [ ] Test: for a synthetic commander, `fitPool + fitRoles + fitSynergy === score` exactly, and every segment is an integer.
- [ ] Test: a no-synergy commander has `measurableTotal === 40` and `fitSynergy === null`.
- [ ] Keep #385's regression test green — a no-synergy commander at saturation still scores 40, not 100.

**Why the sum and not a rescale:** the headline must be auditable by adding the three legend figures. Rounding the total independently of its parts breaks that by up to 1.5 points, which is exactly what the legend would expose.

### Task 2 — `rankScore`, and the ordering #385 lost

- [ ] Add `rankScore: number` to `CommanderScore`: `Math.round((100 * score) / measurableTotal)`. Equals `score` whenever synergy is present.
- [ ] `src/db/schema.ts`: `commander_scores` gains `rankScore: real("rank_score").notNull()`; `commander_scores_rank_idx` moves from `t.score.desc()` to `t.rankScore.desc()`.
- [ ] `pnpm db:generate`. The generated migration must also `delete from commander_scores` — the table is a derived cache with nothing to mark it stale, and both the score arithmetic and the new column changed. #385's `0016` migration is the precedent and carries the reasoning; do not use `TRUNCATE` (its `ACCESS EXCLUSIVE` lock blocks readers during the production build).
- [ ] `store.ts`: persist `rankScore`, order by `desc(commanderScores.rankScore), oracleId`, and change the `row_number() over (...)` rank window to match.
- [ ] `recommend.ts`: `byScoreThenOracleId` compares `rankScore`.
- [ ] Test: a no-synergy commander scoring 32/40 sorts alongside a synergy commander scoring 80/100, not below one scoring 33/100.

**This is a regression fix.** Before #385 the rescaled value was both the display figure and the sort key. #385 corrected the display and, as a side effect, changed the order. Ruling 3 says the order was right; only the number printed beside it was wrong.

### Task 3 — `fitSegments` stops capping at 100

- [ ] `format.ts`: `pct = (100 * s.score) / s.measurableTotal`, and `fitSegments` takes `measurableTotal` in its `Pick`.
- [ ] Delete the `Math.min(s.score, 100)` cap and the docstring sentence describing it.
- [ ] Test: a commander at 32/40 draws `pct === 80`; a commander at 74/100 draws `pct === 74`.

**Design Decision 3b, and R1/R2 both got it wrong:** the bar's drawn geometry is unchanged *only if this changes*. Under the old cap a 32/40 commander drew a 32%-full bar beside a note saying its whole score is 40.

### Task 4 — Copy file

- [ ] Copy the handoff's `commander-explained · copy strings.ts` verbatim to `src/lib/copy/commander-explained.ts`. Adjust only the import path, if any.
- [ ] Add the invariant test: no `%` character in any exported string; `ROLE_SUBJECTS` has exactly the four `ROLE_ORDER` keys.

### Task 5 — The hero's denominator

- [ ] `FitHero` reads `c.measurableTotal`.
- [ ] The `/100` span at `detail.tsx:83-88` renders `explainedCopy.score.denominator` when `measurableTotal === 100`, and `denominatorMeasurable(measurableTotal)` otherwise. Type, size and colour unchanged: 16px mono, `var(--fg-faint)`.
- [ ] The score's accessible name uses `scoreAria(score, measurableTotal)`.
- [ ] `scoreDisplay` becomes `c.score` — no rounding, because Task 1 made it an integer.
- [ ] Test: the `absent` and `degraded` states both print the measurable denominator; `ok` prints `/100`.

### Task 6 — The legend prints points over weight

- [ ] Delete `total` and `segPct` (`detail.tsx:53-56`) outright.
- [ ] Each legend figure renders `explainedCopy.legend.segment(points, weight)` with `points` from the segment and `weight` from the matching constant. Its accessible name uses `segmentAria`.
- [ ] Delete the `Synergy —` placeholder chip (`detail.tsx:159-178`) — states 2 and 3 show two segments, not two plus a greyed third.
- [ ] Test: the three rendered figures parse to numbers that sum to the headline.

### Task 7 — The two hero note clause edits

- [ ] Replace both note bodies with `heroNoteEdits.absent` / `heroNoteEdits.degraded`, which append the denominator clause. The note's geometry is unchanged: `var(--elevated-hover)`, `1px solid var(--border-strong)`, `borderLeft: 2px solid var(--fg-faint)`, `rounded-[8px] mt-[16px]`, `padding: 9px 13px`, `⚠` at 13px `--fg-faint`, body 12.5px `--fg-muted` `lineHeight: 1.45`.
- [ ] Mobile uses `bodyMobile`, desktop uses `body`.
- [ ] **No Retry button in the hero.** The page's only Retry stays at `coverage-section.tsx:411`.

### Task 8 — The inline key

- [ ] New `src/components/commanders/fit-key.tsx`, a client component holding one boolean.
- [ ] Trigger sits in the legend row: dashed underline, `explainedCopy.key.open` / `.close`, `openAria`. Desktop a 28px chip; phone a 44px full-width row.
- [ ] Open state renders one definition per **present** segment — so two when synergy is absent, never three with one greyed — then the sum line (`sum` / `sumWithGloss`).
- [ ] Desktop definitions use `body`, phone uses `bodyMobile`.
- [ ] `FitHero` is rendered twice (mobile `detail.tsx:345`, desktop `:581`); the key's two instances hold **independent** state. Do not lift it.
- [ ] Test: closed by default; opening shows two definitions in the absent state; the sum line's parts add to its total.

### Task 9 — `weakestRole`

- [ ] `weakestRole(roleCounts)` returns the role with the largest `(ROLE_TARGETS[r] − roleCounts[r]) / ROLE_TARGETS[r]`, clamped at 0, ties broken by `ROLE_ORDER`.
- [ ] Returns `null` when every role meets its target — the gap clause is then omitted.
- [ ] Test the wipes case explicitly: `{ ramp: 8, draw: 8, removal: 6, wipes: 1 }` is weakest at `wipes` (2/3 short) under the real target of 3, and would be weakest at `draw` under a mistaken target of 10.

### Task 10 — Prose storage

- [ ] `commander_support` gains `prose: text("prose")` (null = no accepted string), `proseInputHash: text("prose_input_hash")`, `prosePromptVersion: integer("prose_prompt_version")`.
- [ ] `check`: all three null together or all three set.
- [ ] `pnpm db:generate`. No backfill — a null prose column is the prose-absent state, which the design already draws.
- [ ] `src/lib/prose/read.ts` exposes the single-row and many-row reads.

**The input hash** is over the inputs the sentence claims: the commander's oracle id, its EDHREC tag list, and the prompt version. When the hash a row stores differs from the hash its inputs now produce, the string is stale — the generator regenerates it; readers still serve it, because a slightly stale sentence beats no sentence.

### Task 11 — The generator and its contract

- [ ] `src/lib/prose/accept.ts` carries `OK_MIN = 110`, `OK_MAX = 160`, `HARD_MAX = 190`, `CLAIM_BY = 55` and `acceptProse` exactly as the contract states it: length within `[OK_MIN, HARD_MAX]`, exactly one terminal sentence, first clause boundary inside `CLAIM_BY`, and one of the hedge words present.
- [ ] `scripts/generate-commander-prose.ts` generates, validates and writes **accepted strings only**. A rejection is logged and the row keeps its null.
- [ ] The suppression list is consulted before generation, not after — a suppressed oracle id is never asked for.
- [ ] Test `acceptProse` against a table of accept and reject cases, one per rule.

### Task 12 — The "Why this commander" section

- [ ] New `src/components/commanders/why-section.tsx`, placed between `FitHero` and "The Pool" at **both** widths.
- [ ] Heading `explainedCopy.prose.heading`. Sentence 1 is the stored string at `--fg-body`; sentences 2–3 are templated at `--fg-muted`.
- [ ] Paragraph type matches The Pool's, character for character: `fontSize: 13.5`, `lineHeight: 1.6`, `margin: "8px 0 0"`, `maxWidth: 640`.
- [ ] Sentence 2 is `standing(owned, total)`, or `standingWithDeck(owned, total, committed, deck)` once Slice B has the committed count. The deck named is the **first** deck.
- [ ] Sentence 3 is `gap(ROLE_SUBJECTS[weakest])` + `gapFigures(owned, target)`, joined by `gapJoin`. The role name is the section's **only** link: an ordinary `<a href="#{role}">` with `gapLinkAria`, a matching `id` and `scroll-margin-top` on the target, and a one-shot `:target` ring in `--accent-dim`.
- [ ] **`ROLE_SUBJECTS`, not `coverage-section.tsx:26-31`'s `ROLE_NOUNS`.** The latter is singular attributive (`wipes: "board wipe"`), which reads as "board wipe are where you are thinnest".
- [ ] Figures in prose spell out via the copy file's `spellOut`.
- [ ] Section gaps: mobile `gap-[16px]`, desktop `gap-[32px]`.
- [ ] Test the four states, including state 4 — no accepted prose unmounts the whole section, heading included.

### Task 13 — The home hero card

- [ ] The home read joins `commander_support` for `prose` (finding 3).
- [ ] `hero-commander.tsx` prints sentence 1 between the commander name and the completeness row: `margin-top: 10px`, 13px/1.55, `--fg-muted`, `max-width: 420`.
- [ ] Clamp is **CSS only** — `display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden` — with the full string in the DOM and in the accessible name (`explainedCopy.home.cardAria`).
- [ ] At 375px the card's column is ~183px and holds ~58 characters, so the clamp is load-bearing at phone width. Do not substitute a JS truncation.

---

## Slice B

### Task 14 — The deck-membership aggregate

- [ ] `/commanders/[slug]` computes, once, the set of oracle ids the user has already committed to a deck, with the **first** such deck's name per id.
- [ ] The aggregate reads deck membership, not `coveredOracleIds` — `page.tsx:39-41` flattens `roleCards`, which is role lists, not decks.
- [ ] Test: a card in two decks reports the first deck by the deck ordering the deck list already uses.

**It is not free.** Decision 6b is explicit: one aggregate query plus one field on each of two carrier types.

### Task 15 — The carrier fields

- [ ] `RoleCard` gains `committedTo: string | null`; the synergy card type gains the same.
- [ ] Both are populated from the Task 14 aggregate.

### Task 16 — The mark, across ten surfaces

- [ ] The mark is the **existing** ownership dot's fill swapped to `--avail-hard-fg`, with the chip border to `color-mix(in srgb, var(--avail-hard) 40%, var(--bg))`. **Zero added width** — nothing new is inserted.
- [ ] `CoverageChip` 6px dot desktop; `CoverageRow` 7px dot phone; `SynergyRow` 7px dot. Five panels × two widths = ten rendered surfaces, and each is checked.
- [ ] The synergy panel's **hollow unowned dot at 1px is untouched.**
- [ ] The chip's accessible name gains `ariaSuffix(deck)` as a **suffix appended to** whichever of the three shipped branches it computed — not a replacement.

### Task 17 — The panel legends

- [ ] A legend renders only where a **visible** chip carries the mark.
- [ ] **Both figures count visible chips**, not the role total. `legend(marked, visible)`, with the all-marked and two-item variants from the copy file, and their mobile forms.

### Task 18 — The Role Coverage sort

- [ ] One control for all four panels, two options: `Most played`, `Availability`. Trigger `Order:` prefix, `triggerAria`.
- [ ] The sort is a **client-side reorder**. It never re-caps and never re-counts: `COVERAGE_CAP` slices **after** the sort, and the counts beside a panel are unchanged by it.
- [ ] `CoverageSection` gets its **own** `aria-live="polite"` node and announces `coverageSort.announce(label)`.
- [ ] Preserve the existing all-null guard at `score.ts:143-145` — a panel where no card carries an inclusion figure stays in pool order rather than being shuffled.

### Task 19 — Slice B's height budget

- [ ] §7's ledger is +355px on a 2,246px body at 375px (+16%). No addition is a container. Confirm the shipped page against the ledger before the PR.

---

## Verification

- [ ] `pnpm typecheck && pnpm lint && pnpm test`, plus `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`.
- [ ] design-review skill: enumerate → verify → confirm, against `docs/superpowers/design-tables/commander-explained.md`.
- [ ] `/copy-review` for wording. Copy content is out of scope for the design gate and never a reason to return to Design.
- [ ] Copilot rounds to the bar in `~/.claude/CLAUDE.md`.
