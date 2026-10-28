# Suggested changes v2: build plan

Spec: `docs/superpowers/specs/2026-10-27-suggested-changes-v2-design.md` (#2295, approved by Hugh 2026-10-27/28, §12 answered).
Builds on the shipped v10 run (`runTuning` in `src/app/decks/tuning-actions.ts`, `src/lib/tuning/`), the count-mechanism
prototype (`scripts/eval/count-mechanism.mts`, #2291) and the citation fix (#2289).

**Backend PRs (1 to 4) start now. UI PRs (5 to 7) wait for Design's handoff for prompt 23 and its addendum (the wait,
the incremental arrival, "taking a while"), with a READINESS verdict.** One PR at a time, each cut from fresh `main`, no
stacking. Every PR is under ~20 files and ~800 lines; the estimates are below each.

## Status (2026-10-28)

- Plan approved by d9; P1 to P4 confirmed (P2's budget overrun path is for a pathology only).
- Design's handoff merged: `design/design_handoff_the99_suggested_changes_v2/` (#2302, Hugh "This all LGTM", READINESS
  Green), audited against the rebased tree. Its additions to the spec are folded in below as H1 to H6, approved by d9.
- P5 approved by Hugh: `SUGGESTED_CHANGES_V2_ENABLED`, needs `TUNING_ENABLED`, staging on, production unset, removed once
  v2 is everywhere; it enters the registry in the first PR that reads it (PR 5).
- M1 approved by Hugh: 27 runs, a HARD $4 cap enforced in code, scratch branch only, Q9 from the same replies.
- About (Hugh, "whichever lands first"): see PR 7.

## What the handoff adds (H1 to H6, engineering calls approved by d9)

- **H1. Line by line (G1).** The reply is parsed as it streams; each line is validated and saved as it completes, and a
  list is "in" when its call ends. PR 2 builds the incremental parser and per-line validation; PR 3 the per-line saves,
  the per-list "in" state and the live counts the wait draws ("11 to add and 4 to cut so far"), with a refill signal for
  the 45-second note.
- **H2. When the cuts start.** The cut call starts as soon as call 1 settles, alongside any additions refill: it asks
  ceil(1.5N), "Coming in" is what call 1 kept (spec §5.1's table), and its target is min(N, additions finally kept).
  Supersedes §5.1a's "ceil(1.5K)" sizing for the parallel case; a call 1 that kept nothing still skips the cut call.
- **H3. The bracket choice is Keep (default), Down or Up** (README item 2, STATES). Keep drops any line that takes the
  deck out of its bracket; Down keeps additions inside the target; Up flags additions that reach it. A drop for the
  choice is the player's own restriction: charged, and named by the short-run sentence. A deck read as a range keeps
  inside what it permits now. Down also drops an addition whose card alone bars the target (`cardFloor`, the lowest
  bracket a deck holding it can be; PR 3 derives it from the card's bracket facts), since a second Game Changer moves no
  permits yet still blocks the way down. Supersedes the 2026-09-23 "shown, flagged, never dropped" rule for v2 runs only.
- **H4. Picks are kept** across leaving mid-run, a return and an Undo: a `picked` flag per item (PR 1), written by a
  cheap action (PR 4). Undo returns the set's item ids.
- **H5. Type and role per line (G2)** come from the shipped grouping (`cardTypeGroup`) and the role counter
  (`roleCounterFor`), read in PR 3's panel read with the deck's per-group counts. The chips (G3) use the handoff's
  sources: worst role gap, focus, newest dated game note, second role gap (PR 5). The same-request check (G4) also
  carries the bracket choice and returns the matching run's id and date (PR 3).
- **H6. Build work the handoff draws as shipped but the code lacks:** `ModalChrome`'s min(640px, 100dvh − 96px) and 88%
  sheet caps, the phone halves through `SegmentedSwitch`, the inert tile under 99 with its Top off / Proposed cuts link
  (UI 5 and 6). Checking the bracket for up to ~60 lines per run (`withBracketAfter` builds one profile per line, sized
  for 10) is measured and, if slow, made incremental in PR 3. Retired controls (Additional notes, Apply all, Reject,
  Suggest again) leave in UI 5 and 6, with the About lines that quote them (copy-drift).

## Rulings this plan builds on

From the spec, not re-opened: N from 1 to 20; ask ceil(1.5N) per list, one refill per short list (arm C); cuts made for the
kept pool in ONE pass; every valid line kept up to the ask, schema cap at twice the ask; `notes` renamed `request`; the
request stored (500 characters, through `playerText`); a structured bracket target in release 1; one apply and one undo for
the picked set; 1 credit at any N; the refund follows the cause of a shortfall (§9); the owned-only fallback removed; no
unchanged-deck gate, identical inputs confirm once; `noResultClaim` narrowed on cuts only; v10 runs readable as they were;
Proposed cuts untouched.

## Decisions this plan makes (for d9 to confirm)

- **P1. Production keeps v10, untouched, until the switch flips.** v2 is reached only when the caller sends a count
  (`requestedCount`), which nothing in production sends until the UI ships behind P5's switch. Everything v10 reads stays
  as it is: v2 is priced under its OWN feature key, `suggested_changes_v2` in `FEATURE_CALLS`/`ModelFeature`, so v10's
  `retryable` (half its worst case), `reserveModelCall`'s owner-share check and `callMicroFor("tuning")` keep v10's figures;
  v2 stamps its own `PROMPT_VERSION_V2 = 11` (`prompt-version.ts`), and `modelVersionMoved` compares a run against the
  version of its own path (a run with `requested_count` set is v2); v10's reply schema is not touched (v2 gets its own
  schema factory, with `request` in its citation enum); the reaper cutoff and the client's wait limit become per caller,
  so Proposed cuts and v10 keep 5 minutes and 130s. Each backend PR names, in its body, what it proves v10 still does.
  The v10 path is deleted in a follow-up after launch.
- **P2. The time limit: one `after()`, a run budget, and the deck page's `maxDuration` raised to 600s.** Next runs `after`
  for the route's configured `maxDuration`, and a Server Action takes its page's. A v2 run gets a total budget
  (`V2_RUN_BUDGET_MS`, the limit less a margin for the writes); each streamed call's deadline is the smaller of its own cap
  and what the budget has left. 600s is several times the prototype's p90 (114s for two calls at N=20, no refills), so a
  real run never meets it. The platform's ceiling is absolute: a run that somehow reaches its budget finishes with what it
  has, says so, and is refunded, rather than being killed mid-write and reaped. That is the one place "never cut short"
  meets a wall, and it is a pathology, not a policy. PR 3 confirms the Vercel project allows 600s before merging (else the
  highest it allows). A function only bills while it runs; M1 and M2 report what a real run uses, against the
  2026-10-23 cost audit. Streaming the reply (`client.ts` already supports `stream: true`) is for a reply of up to 22,000
  tokens inside its deadline; what the PLAYER sees early is P3's persisted additions.
- **P3. The additions are written and readable the moment call 1 settles.** Call 1 and its refill's kept additions are
  inserted while the run is still `pending`; `readTuningPanel` (and history, `okRunWhere`, `history-read.ts`,
  `hub-read.ts`) learn a v2 run that is pending with additions (`phase: "cuts"`), and the panel's existing poll draws them.
  Items of a pending run, and every v2 item, refuse per-card apply (`applyItem` today never checks run status).
- **P4. A cut call that fails ends the run `ok` with no cuts, refunded.** Its additions were already shown and stay
  readable; with no cuts the player can apply nothing (M is at most the shorter list), so the run is history. Status `ok`
  (not `failed`) because every reader draws items only from ok runs, and `persistRun` already settles an ok run as
  refunded. The report carries `cutsFailed` and its error class. Spec §9 already refunds this case. A v2 run the reaper
  finds pending with additions is settled the same way, not as `failed`.
- **P5. APPROVED (Hugh, via d9): a new switch.** The UI replaces the panel's intake and results across three PRs while production must
  keep v10 until launch (spec §10), so it needs a switch: proposed `SUGGESTED_CHANGES_V2_ENABLED`, `kind: "model"`,
  `needs: "TUNING_ENABLED"`, staging on, production unset, out of All features until close-out. Off, the panel is v10 as
  shipped. The spec leaves a new switch to Hugh; your brief routes it through you, so I ask you and you take it to him if
  needed. Without it the three UI PRs would land as one, which breaks the size rule. PRs 1 to 4 do not need it.

## Backend

### PR 1: data and the pure rules (no caller yet beyond tests; PR 2 is the first)

- Migration `0182_suggestion_v2.sql`: on `deck_suggestion_runs`, `requested_count smallint null` (check 1 to 20),
  `request_text text null` (check length at most 500), `bracket_choice text null` (`keep`/`down`/`up`) with
  `bracket_target smallint null` (1 to 5, both or neither); on `deck_suggestion_items`, `picked boolean` (H4) and
  `apply_set uuid null` with a partial index on (`run_id`, `apply_set`). No backfill: a v10 run's count
  stays null (spec §10). The restrictions snapshot, `call_count`, per-list `refilled`, `cutsFailed` and the request hash go
  in `validation_report` jsonb. Items cascade from runs, and `PURGE_ORDER` lists the runs table.
- `src/lib/tuning/v2/count.ts`, pure: `askFor(n)` = ceil(1.5n); `schemaCapFor(ask)` = 2 × ask; `cutAskFor(kept)`
  (ceil(1.5K); 0 skips call 2, spec §5.1a); `keepUpTo(lines, ask)`; `dropAcross(kept, refill)`.
- `src/lib/tuning/v2/refill.ts`, pure: whether a list refills and the refill's reasons, each rejected card with its rule's
  own words (`suggestionRules`).
- `src/lib/tuning/v2/charge.ts`, pure: spec §9's rule, table-driven over every row of §9's list, plus P4's case; the
  bracket choice's drops count as a restriction (H3).
- `src/lib/tuning/v2/bracket-aim.ts`, pure: H3's drop and flag rules over the shipped `bracketAfter` permits.
- `src/lib/tuning/v2/request-hash.ts`, pure: a hash of N, the request and the bracket target. The deck's fingerprint
  (`tuningFingerprint`) is NOT changed: `stale` compares a run's fingerprint to one `tuningInputs` computes from the deck
  alone, so folding the request into it would make every v2 run read stale. "Same request as your last run" is the deck
  fingerprint AND this hash both matching.
- `validate.ts`: a v2 `shortReason` names the restriction that bound a short list (spec §5.5: `overCap`, `offSet`,
  `notOwned`, `bracketAim`), from the list's own drops; v10's `RefusalDetail` and `chooseRefusal` are unchanged. The `request` citation kind at
  every site `notes` has today: the intent/notes relabel repair (:211), the `universalStaple` exemption (:284), the quote
  check (:401).
- `presentation.ts`: `noResultClaim` takes `{ narrowOnCuts }`. On a cut with it set, "stronger" and "more focused" pass;
  every game-result pattern still fails on both lists. v10 and Proposed cuts call it without the option.
- `response-schema.ts`: a v2 factory, `suggestedChangesV2Schema(ask)`, with the loose cap and `request` in its citation
  enum; v10's `tuningResponseSchema` unchanged. `TuningCitation` gains `request` and keeps `notes`.

Estimate: ~13 files, ~700 lines (half tests).

### PR 2: prompt v11 and the two-call engine

- `prompt.ts`: a v2 builder, `buildPromptV2`, with `PROMPT_VERSION_V2` 11: the count and two-call wording, the `request`
  citation kind, the signal-trust order (spec §4), the bracket goal line (up favors additions that move the deck there,
  down favors cuts that hold it higher; the model never names a bracket, `noBracketClaim`), the cut stage's "Coming in",
  and the refill's question. The request goes through `playerText` at 500 with `PLAYER_TEXT_SYSTEM_RULE`. `buildPrompt`
  (v10) unchanged.
- `src/lib/tuning/v2/engine.ts`: `runV2({ callModel, pack, n, request, bracketTarget, limits, budgetMs, onAdditions })`.
  Call 1, its refill, `onAdditions(kept)`, call 2 sized by `cutAskFor`, its refill, and the report. Each call streams, its
  reply ceiling scaled with the ask (max(8,000, 600 per line + 4,000), the eval's figure), its deadline bounded by the
  budget (P2). Tests against a fake `callModel`: fills, both refills, short additions, K = 0, a malformed reply, a failing
  cut call (P4), the budget reached, duplicates across a refill, an over-long reply.
- `prices.ts` and `allowance-rule.ts`: the `suggested_changes_v2` feature (P1), its `steps` pricing four streamed calls at
  N=20's ceiling, so a run never spends past its reservation. `allowance.test.ts` covers the new key; v10's figures
  pinned unchanged.
- `scripts/lib/prompt-identity.mjs`: `buildPromptV2` under BUILDERS; the eval under CALLERS.
- `scripts/eval/tuning-v2.mts` (`pnpm eval:tuning-v2`): drives `runV2` itself on the count-mechanism scratch branch and
  decks (`scripts/eval/lib/scratch.mts`, `count-mechanism-seed.mts`). Own ledger, hard cap, `--dry-run` calls nothing.
  Stores every raw reply, so the Q9 check is a re-score, not a second spend. The instrument for M1.

Estimate: ~11 files, ~800 lines. If it runs over, the eval script moves to its own PR ahead of M1.

### PR 3: the run action, early additions and the time limit

- `runTuning`, v2 path when `requestedCount` is present: refuses a deck whose total is not 100 BEFORE reserving, from a
  count read of the list (the profile is only built inside `after()` today); no `unchanged` gate; returns
  `confirm: "same_request"` when the deck fingerprint and the request hash both match the newest ok v2 run, unless the call
  says `confirmed`; no `ownedNone` fallback (spec §4); `startRun` reserves `suggested_changes_v2` and stores
  `requested_count`, `request_text`, `bracket_target`, `PROMPT_VERSION_V2`; the work calls `runV2` with the budget.
- `run-store.ts`: `persistAdditions` (P3); `persistV2` writes the cuts and the report, flips the run, settles by
  `charge.ts`, and takes P4's path on a failed cut call. The reaper settles a pending v2 run with additions as P4 does.
- Readers (P3): `readTuningPanel`, `okRunWhere`, `history-read.ts`, `hub-read.ts` and `modelVersionMoved` (P1).
  `applyItem` refuses a pending run's item and any v2 item.
- P2's limits: `maxDuration = 600` on `src/app/decks/[id]/page.tsx` (its comment rewritten), `V2_RUN_BUDGET_MS`,
  `limits.test.ts` pinning budget < limit and v10's deadline unchanged, a v2 reaper cutoff past the limit, and a wait
  limit passed per caller to `awaitRunSettled` (Proposed cuts and v10 keep theirs).
- A staged stub, `stagedStubOutcome` (non-production only, beside `heldStubOutcome`, which stays as it is for Proposed
  cuts and `probe:run-after`): canned call-1 and call-2 answers with a delay, so a probe can watch the additions arrive
  before the cuts.

Estimate: ~15 files, ~750 lines.

### PR 4: apply and undo the picked set, and the probe

- `verdicts.ts` and two actions: `applyPicks(runId, addIds, cutIds, actionId)` writes M additions and M cuts in ONE
  transaction under one `apply_set`; refuses unequal counts, M above N or the shorter list, a deck not at size, and a
  stale run (`readVersion`). `undoSet(applySet)` reverts the whole set. More from the pool later is a new set (spec §7a).
  Unpicked items stay `pending`. v10 runs keep per-card apply exactly as shipped; making an open v10 run read-only is a
  cutover behavior and lands with the UI, behind P5's switch (PR 6).
- `pnpm probe:tuning-v2` (local-dev, its own per-run user and deck, the staged stub): the additions are readable while the
  run is pending, then the cuts; every charge and refund row of §9 and P4 settles as the rule says; a deck at 99 or 101 is
  refused before any reserve; the same-request confirm; an owned-only run comes back short, never with cards to buy; apply
  3 + 3 then undo returns the exact list; unequal refused; a second set from the same pool; a v10 run still applies per
  card.

Estimate: ~9 files, ~650 lines.

### M1: measure the real engine (needs d9's OK on the spend)

After PR 2 merges, before PR 5 opens: `pnpm eval:tuning-v2` on the scratch branch, Hugh's decks, N = 3, 10, 20, three runs
each on three decks (27 runs, about $0.10 each at N=20). Per N: the count filled, cost per run, p50 and p90 latency per
stage and in total, refills taken, cut drops by rule. **The Q9 check is in the same data:** every stored cut reply scored
under today's `noResultClaim` and the narrowed one; the narrowing ships only if the drop falls and no game-result claim
passes. **Cap: $4** (approved), hard, enforced in code on the eval's own ledger, scratch branch only. Results in `docs/superpowers/eval/tuning-v2/summary.md`,
committed with the next PR. A figure that breaks an assumption (p90 near the budget, cost far above the prototype's) stops
the line and goes to d9.

### M2: end to end on staging, before production

After PR 6, switch on in staging: three timed runs at N=20 on Hugh's staging decks through the real panel, recording time
to the additions, time to the cuts, and the function duration Vercel logs. This is the figure the post-launch credit
revisit reads (Q2). It writes only the run's own rows and spends three of his credits; I ask d9 first.

## UI (waits for prompt 23's handoff and addendum, READINESS verdict, and P5)

Each runs design-review before opening, ships phone and desktop together, and runs `feature-acceptance` with an inventory
(`docs/superpowers/inventories/suggested-changes-v2.json`) and a contact sheet. Copy goes through `/copy-review`.
File counts are estimates until the handoff exists; `tuning-panel.tsx` (1,585 lines) is split along the handoff's screens
rather than grown.

- **PR 5: intake.** The three steps (count 1 to 20, the request box never pre-filled, the restrictions box); the suggestion
  chips beside the box, from a new read of what the app knows (two short on removal, the focus, a recent game note, a role
  gap); the bracket choice; a deck not at 99 pointed to Top-off or Proposed cuts; the same-request confirm; the credit line.
- **PR 6: running and results.** The wait and the incremental arrival (additions, then cuts) and the "taking a while"
  fallback, per the addendum; the two lists of about 1.5N; picking N from each; the equal-counts rule and the one apply;
  undo the set; a short run's count and the restriction that bound it; a refunded run; P4's run with no cuts; an open v10 run read-only once the switch is on (the cutover, spec §10).
- **PR 7: history, About, close-out.** History rows (request, N, restrictions, bracket choice, date, pool and picks; a
  stale run read-only); the feature's close-out walk and contact sheet. **About (Hugh, "whichever lands first"):** if the
  visual About (#2299, plan `2026-10-27-about-visual.md`) has merged its page model, v2 adds its drawn card there with the
  `ABOUT_VERSION` bump; if v2 lands first, PR 7 only removes the text entry's mentions of retired controls
  (about-entries.ts, "Additional notes", "up to five"), with no bump, and the drawn card arrives with the About rebuild.
  Coordinate with lane 58 through d9 before touching about-entries or about-pages. Then the production switch goes to Hugh.

## After launch (named, not built here)

- Delete the v10 path: its prompt version, `ASK_PER_LIST`/`MAX_SUGGESTIONS` for Suggested changes, `sizeLists`, the
  `unchanged` gate and "Suggest again anyway", per-card apply for Suggested changes.
- Revisit the 1-credit price against M2 (Hugh, Q2).

## Housekeeping

- Scratch branches: M1 reuses the count-mechanism scratch branch if it still exists, else a new 0.25 CU branch of local-dev
  named `scratch-tuning-v2`, listed to d9 for deletion when M1 is done. Production and staging are never written.
- No paid call runs without d9's OK and a cap (M1, M2).
