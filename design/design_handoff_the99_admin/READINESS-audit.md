# READINESS audit: Admin (R2)

Audited 2026-10-11 against `docs/superpowers/design-briefs/2026-10-11-admin-ui.md` (main), the code
at `origin/main` a201f9048, and staging read-only (Neon `misty-rain-01681654`, branch
`br-polished-pond-a6e63y0b`, `neon.branch_id` checked). Build from `The 99 - Admin (R2).dc.html` +
`Admin R2.dc.html`.

## Verdict: GREEN

Every ruling and lock is honored, all nine open questions are answered, and every deliverable is
drawn at 900 and 390. The findings below are engineering corrections (logic, data sources, fixture
arithmetic, copy owed to /copy-review). None changes a layout, so none goes back to Design. Two
product questions for Hugh carry a recommended default and do not block the build.

## What was checked

- **Rulings 1 to 6.** Env var stays the default and the kill switch (A7, `=off`); precedence
  Account > Group > App-wide > Env var, drawn as the ladder on every switch page (A3 to A7); the five
  cost readings (A13, A14); the model outline (A15); Hugh only, with the existing 404 (A16, string for
  string against `shellCopy.notFound`, `src/lib/copy/shell.ts:84-90`); phone and desktop.
- **Locked rules 1 to 13.** Compound children cannot raise a parent (A6, "Overrides here can't turn
  the parent on"); no "inherit" value, `Not set` deletes the row; kill switch refuses overrides, Clear
  stays live; history is `admin_events`, newest first, UTC; "within 30 seconds", never "instantly"
  (STATES Must-not); What's new warned on every on-flip (A5, A9, F12); door is a server boolean
  `adminDoor`, list never in the client; costs read only, caps outside code in a settings table;
  environment chip on every head (rule 12); effort reads `not recorded` and no composite is split
  (rule 13).
- **Frames.** A1 to A16 each drawn at 900 and 390 by the canvas loop
  (`The 99 - Admin (R2).dc.html:50`, `:53`), plus TH in six themes. Groups editor shows selected,
  selected-not-saved and unselected members (A9).
- **Design table against the R2 scene** (spot-checked): page head pad 14 16 0 / 26 28 0, title 23 /
  28, chips h36 / h30, search h44 / h38, column head `minmax(0,1fr) 92 76 112 116` sticky, Check an
  account select 100% / 200 at h44 / h36, confirm dialog 540 with facts `74 1fr`, tile figure 19 / 22,
  trend h130 / h160, tab h42 / h40. All match. No frame mismatch found.
- **Copy.** `selected` / `unselected` throughout, never ticked; switches `on` / `off`; credits use
  `creditsCopy.standing`'s form (`7 of 10 left`, `reset at 2:20 PM`); the pause mirrors
  `creditsCopy.paused`. One British spelling (`centred`, design table) fixed to `centered` in this PR.
- **Fixture arithmetic**, both cost frames, recomputed: sparse $1.135 / 26 runs, $0.884 player, system
  $135.96, 99.4% system, pace $3.20 and $2.49, by-model $0.972 + $0.163, refunds 17%, reservation
  6.6% and 19%, ledgers $14.76 / 383 requests; busy $8.46 / 193 runs / 206 calls, by-feature rows
  (mean x runs), by-model $18.38, 57% system, account cap $36.78, per-account sums $7.84 / 182 / 160,
  pace to $11.76 crossing $10 on day 26. All consistent.

## Data sources: every figure, and the column it reads

| Figure | Source |
|---|---|
| Runs, dollars, refunds, player vs system, per account, per day | `model_calls.status`, `.origin`, `.feature`, `.user_id`, `.created_at`, `.cost_micro_usd` (`src/db/schema.ts:2088-2117`) |
| Model per run | `model_calls.model` (composite `a+b` on pre-parts Look deeper rows) |
| Effort, model per provider call, Look deeper's two rows | `model_call_parts` (locked rule 13; new table) |
| Mean and p90 per run | `percentile_cont` over `cost_micro_usd`, priced rows |
| Credits now, `reset at` | `model_calls` rows `reserved`/`spent` in the last 24h, `allowance-rule.ts` |
| Reservation | `featureWorstCaseMicroUsd` (code constant, `prices.ts`) |
| Card label runs | `card_label_batches.run_id`, `.model`, `.in_tokens`, `.out_tokens`, `.cache_*_tokens`, `.intended_at` (`schema.ts:2512-2580`); dollars are tokens x batch rate, NOT a stored column |
| Eval ledgers | `docs/superpowers/eval/ledger*.jsonl` fields `at`, `usd`, `requests`, `pending` / `settles` |
| Account cap, system ceiling, elsewhere | the settings table (locked rule 11; new) |
| Names, emails | Clerk Backend API, server-side |
| Job switch values | GitHub repository variables API, server-side |

No drawn figure needs a column that is not stored or already planned by a locked rule. Two need
care: finding 3 (where label spend lives) and finding 6 (the account universe).

## Findings

1. **Three switches have landed since the brief: the app has 24, not 21.** `env.*_ENABLED` across
   `src` on origin/main adds `ALL_DECKS_CART_ENABLED` (`src/lib/decks/all-decks-cart-flag.ts:10`),
   `DECK_NOTES_ENABLED` (`src/lib/decks/notes-flag.ts:7`) and `PRECONS_ENABLED`
   (`src/lib/precons/flag.ts:6`). All three are plain features, none compound, none model. (The
   task's grep pattern `[A-Z_]+` misses `OVERVIEW_V2_ENABLED` for the digit, and catches three
   comment-only job names.) *Resolved:* the list renders from the switch registry; chip counts
   follow it (`All 24`, `Features (21)`). Same row shape; no Design change.
2. **`ANALYSIS_TAB` spends money and is not tagged a model feature.** It gates every Overview press
   (`src/app/decks/synopsis-actions.ts:24`, `:30`, `:36`), the most expensive reservation ($0.832),
   and it is the parent of `TUNING` and `PROPOSED_CUTS`. The money confirm (A5, G3) fires only on the
   four tagged switches, so turning the Analysis tab on for a group would spend with no confirm.
   *Resolved:* tag `ANALYSIS_TAB` `model` (chip `Model features 5`), and compute G3's trigger as "the
   number of accounts for whom any model-spending capability resolves on rises", evaluated through
   the flag functions (Overview = `analysisTabEnabled`, Suggested changes = `tuningEnabled`, and so
   on), so a parent flip is caught too.
3. **On production, label and prose spend is not in production's tables.** The `Card labels`
   `label` job and the `Commander index` `prose` job run only in `catalog-staging`
   (`.github/workflows/card-labels.yml:91`, `commander-index.yml:150`); production receives copies
   and never calls a model. With locked rule 12 (no cross-database reads), production's
   `card_label_batches` holds no new runs, so A14's `Labels $3.12 (3 weekly runs)` and its Card label
   runs table cannot be computed on production. *Resolved:* each admin draws what its own database
   holds. Staging's Costs is where labels and prose appear; production's Card label runs block is
   replaced by one line naming staging, and production's system ceiling counts evals and its own
   free rewrites. Production's account cap reaches staging's spend through `elsewhere`, as A14
   already says. See Hugh question 1.
4. **The sparse trend's per-day split is wrong by $0.133.** A13 draws day 6 at $0.319 and day 11 at
   $0.178. Staging has every 10-06 row as player ($0.452, 10 calls) and the three system rewrites on
   10-11, so the player series is day 6 $0.452 and day 11 $0.045 (still $0.884 in total). Fixture
   only; the build reads live rows.
5. **Staging has moved since the brief.** October is now 30 calls and $1.318: 10-11 gained two
   Suggested changes ($0.067), one Overview on Sonnet 5.5 ($0.086) and the first Proposed cuts press
   ($0.030). So A13's `Proposed cuts · no press yet` is now `$0.030 a run`. The brief allows drift;
   no change needed.
6. **There is no table of accounts.** `N of 7 on`, `7 accounts · N in no group`, the Accounts list and
   G3's on-count all need the set of accounts, and the app stores only Clerk ids on its own rows.
   *Resolved:* enumerate with Clerk's `users.getUserList` (Q4's call already needs it); when Clerk is
   unreachable, fall back to the distinct `user_id`s of `user_data_stamps` and `model_calls`, with the
   `Names didn't load from Clerk.` line (STATES A3). `user_id = 'system'` is never an account.
7. **`admin_events` cannot record two writes the drawings make.** Locked rule 5's kinds cover a
   rename but not a description edit (G2), and none covers the settings table (`Enter elsewhere`,
   `Change the cap`, `Change the ceiling`, STATES C7). *Resolved:* add `group_described` and
   `setting_set` (key, old, new, note) to the kind check constraint, so every admin write stays in
   the trail.
8. **Two label writers, one sum.** The workflow path (`db:build:labels`, `scripts/lib/card-labels-build`)
   writes `card_label_batches` only; the manual `scripts/label-cards-collect.mts:209` writes a
   `model_calls` `labels` system row only. *Resolved:* label spend is the sum of both; they never
   describe the same batch. Prose is `model_calls` `feature = 'prose'`.
9. **Label dollars are computed, not stored.** Pricing lives in `scripts/lib/card-labels-pricing.mjs`,
   outside `src`. *Resolved:* move the Sonnet 4.5 batch rates into `src/lib/model/prices.ts` (one
   source for both). Recomputed from staging tokens: 10-03 13.86M / 5.16M = $59.47, 10-04 14.40M /
   5.32M = $61.48. A13 shows `—` for 10-04's tokens, which are stored. Group a run by `run_id`:
   staging files the brief's 10-07 batch under the 10-04 run (2,679 batches), so A13's separate
   `7 Oct` row folds into it.
10. **Credits read "a day"; players are told a rolling 24 hours.** `Friend. 5 credits a day.` and the
    confirm's `one of the account's 5 credits a day` against About's `each one comes back 24 hours
    after you use it` (`src/lib/copy/about.ts:1168`). For /copy-review, with the rest of the
    placeholder strings.
11. **The job switches miss `PROSE_MAX_COMMANDERS`.** `vars.*` in `.github/workflows` also reads it
    (commander-index). *Resolved:* list every `vars.*` the workflows read.
12. **The outline's file:line strings will drift.** A15 prints `synopsis/model.ts:15` and the like.
    *Resolved:* read model ids from the imported constants and print module paths without line
    numbers.
13. **One group per account amends locked rule 4.** R2 delta 4 (attributed to Hugh's R1 notes) adds a
    unique constraint on `flag_group_members(user_id)` and moves on select. It tightens the schema and
    keeps rule 2's off-wins as a backstop, so it is compatible. The plan must carry the amendment, and
    the fixture changes (`friends` is no longer every non-owner). R1's Q1 answer and STATES F2, G1, G6
    and A5 describe disagreement and are superseded by the R2 deltas.

## Open questions: Design's answers

1. **Group disagreement.** R1: show the result with both groups named. R2: moot, one group per
   account (finding 13). Accepted.
2. **Infrastructure switches.** Listed under a `Plumbing` head, app-wide only; the action refuses a
   non-app scope. Accepted.
3. **Job switches.** Read-only on Models, values from GitHub's API; `—` without a token. Accepted;
   see Hugh question 2.
4. **Finding an account.** Names and emails from Clerk, server-side, beside the id; no nickname.
   Accepted.
5. **What a cap does.** `BUDGET_USD`, `OWNER_SHARE_USD`, alarms and `HARD_STOP_USD` stay code
   constants, tagged `IN CODE`; the settings table holds the account cap, system ceiling and
   elsewhere. Recommended; Design notes moving them is Hugh's call (Hugh question 3).
6. **The sheet on a flip.** Warn, never silent (A5, A9, F12). Accepted.
7. **Concert Crawl.** Draw the account cap now with a hand-entered `elsewhere`, stamped with who and
   when; replace with Anthropic's Usage and Cost API later. Accepted.
8. **Labels in the ledger.** Read both tables, no backfill. Accepted (findings 8 and 9).
9. **Periods.** UTC month only, daily trend, step months, one-line comparison. Accepted.

## (a) Questions for Hugh

1. **Where do you want to read the system bill?** Card labels and commander prose run on staging, so
   only staging's admin can show them; production's admin would show your friends' presses and the
   evals, with staging's spend inside the hand-entered `elsewhere`. Recommended default: yes, read
   the system ceiling on staging's admin.
2. **Is a read-only GitHub token on Vercel acceptable** so Models can show the job switches' current
   values? Without one the table shows names and locations only. Recommended default: add a
   fine-grained token with Variables read on this repository.
3. **Do you want to change the $10 plan and your $5 testing share from the admin**, or keep them as
   a reviewed commit? Recommended default: keep them in code (Design's recommendation).

## (b) Engineering calls resolved

- The switch list renders from the registry: 24 switches today (finding 1).
- `ANALYSIS_TAB` is a model feature; the confirm fires on a rise in resolved model capability
  (finding 2).
- Each environment's Costs draws only its own tables; production points to staging for labels and
  prose (finding 3).
- Accounts enumerate from Clerk, falling back to distinct `user_id`s; `system` is never an account
  (finding 6).
- `admin_events` gains `group_described` and `setting_set` (finding 7).
- Label spend sums `card_label_batches` and `model_calls` `labels` rows; batch rates move into
  `prices.ts`; runs group by `run_id` (findings 8, 9).
- Job switches list every `vars.*`; the outline drops line numbers (findings 11, 12).
- The Tuning hub tile's tools (G6) are confirmed: `hubTools` is Suggested changes, Mana Balance and
  Proposed cuts, drawn at two or more (`src/lib/tuning/flag.ts:48-63`).
- One group per account is adopted as an amendment to locked rule 4 (finding 13).
