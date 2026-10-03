# Build plan: deck description and tailored Suggested changes (H35)

Source: `docs/superpowers/design-briefs/2026-10-03-deck-description-and-tailored-suggestions.md`,
handoff `design_handoff_the99_deck_description` (merged, docs PR #1221). Readiness: GREEN
(audit fork, 2026-10-03), plus two orchestrator-resolved eng calls logged in the handoff's
`READINESS.md` (reduced-motion timer handling; announcement wording).

Hugh pre-approved this handoff directly with Design. No further plan approval needed before
building (orchestrator, 2026-10-03) — proceeding straight to PR 1.

## Current-code map (confirmed by direct read, 2026-10-03)

- `DeckIntentAsk` (`src/components/decks/deck-intent.tsx`) — the old in-panel ask, rendered by
  `TuningPanel` (`tuning-panel.tsx:414`) only while `neverRun && intent === null`. Deleted.
- `DeckIntentLine` (`deck-intent-line.tsx`) — editable tagline under the deck name, rendered by
  both `spine-desktop.tsx:383` and `spine-mobile.tsx:470`. Carries the seeded disc/chip and its
  own Save/Cancel. Becomes read-only; seeded disc/chip removed.
- `AnalysisEmpty` (`analysis-empty.tsx`) — the pre-reading body. The "second paragraph" is
  `copy.idle.bodyPersist` (amended to Hugh's wording); the field goes between that paragraph and
  the CTA-row `<div>`. Called once, from `AnalysisPanel` (`analysis-panel.tsx:183`), which is
  called once, from `BuilderShell` (`builder-shell.tsx:1510`).
- `useDeckRename` (`use-deck-rename.ts`) — name-only, blur-commits per field, used by
  `RenameForm` (decks list, stays untouched) AND by `spine-desktop`/`spine-mobile` (deck header
  pencil, which needs the new two-field shape). Built as a **separate** new hook
  (`use-deck-header-edit.ts`) for the header call sites rather than widening the shared one —
  lower risk than growing a hook three call sites depend on, same outcome. Logged as an eng call,
  not a design round (pure implementation choice, no visible difference).
- `TuningPanel` (`tuning-panel.tsx`, 658 lines) — `press()` (`:195-230`) runs the model call via
  `deps.run()` in the background while sequentially `await`ing `deps.evidence(deckId, step)`
  (`:210-214`) per step — **this is the "queued evidence server actions" to delete.**
  `readTuningEvidence` (`tuning-actions.ts`, `tuning-read.ts`'s `EvidenceStep` type) has exactly
  two callers (itself and this file) — safe to delete outright. `readSteps` / `manifestRows` /
  `known` / `labelOf` / `countOf` (`:588-652`) already derive every row from `facts` (the page's
  own figures) and are the right shape to extend with `description`/`limits`/`notes` rows; only
  the per-step **evidence read** is being replaced by a pure stagger, not this derivation.
- `decks.intent` (`schema.ts:322`), check constraint 120 chars (`:381`, widen to 240),
  `decks.intentSeeded` (`:328`). `seededIntent()` (`limits.ts:47`) is called once, from the
  deck-fill path (`actions.ts:560`), to auto-write a line on fill — this write stops (ruling 3);
  the function and its retired copy keys become dead and are deleted with it.
- `src/lib/synopsis/` reads no intent/description today (confirmed — zero matches). PR 4 adds it.
- `AnalysisBanner` (`analysis-banner.tsx`) takes `mode: "stale" | "failed"` only, no `variant`.
  The refusal sentence needs a new `variant: "note"` (sentence only, no button) alongside the
  existing banner render, sharing the same frame (`:38` wrapper classes/tokens).
- `MAX_SUGGESTIONS = 5` (`limits.ts:12`) is the existing five-swap ceiling, already enforced by
  `validateSuggestions`, already behind `refusal.tooMany`'s wording. **Ledger #1 resolved**:
  "the ceiling" in ruling 6 reads as the NEW per-card price cap (distinct limit, `capLabel: 'Most
  per card'`); `MAX_SUGGESTIONS` is untouched plumbing, not the thing being named.
- Reusable Set control: `src/components/intake/sets-field.tsx`'s `SetsField` wraps the shared
  `FilterPanel` + chip pattern over a `PrintedInSet[]`. The limits box's Set control copies this
  shape with the handoff's own trigger copy (`setTriggerAny: 'Set: Any'`) rather than the
  lanes'/intake's own trigger wording.
- `about.ts`: `ABOUT_VERSION = 9` (`:41`), content-hash-pinned via `about.version.json` and
  `about.test.ts`. `ANALYSIS_TAB_ENABLED` is read in `builder-shell.tsx`, `about/visible.ts`,
  `swaps/flag.ts`, `builder-view.ts`, `builder-tab-specs.ts`, `analysis-flag.ts`, `copy/about.ts`
  — the existing switch-gated-entry pattern (`deck-analysis`/`card-marks` entries) to copy.
- The-99-21's prompt-injection helper is not on `origin/main` yet, but their PR is about to open
  and will merge before PR 4 is reached (orchestrator, 2026-10-03). PR 4 sequences after it and
  uses `playerText` / `PLAYER_TEXT_SYSTEM_RULE` from `src/lib/model/player-text.ts` directly
  (plus `playerTextBody` for `validate.ts`'s quote matching) — no interim guard of this build's
  own. If that PR has not merged when PR 4 is reached, stop and tell the orchestrator rather than
  building around it.
- #1212 (`Suggested changes: full reasoning on phone, padding on the none-logged row`) already
  shipped orchestrator task D (phone reasoning + none-logged padding) — nothing to redo.

## PR boundaries (named up front, each independently mergeable)

**PR 1 — Description field, pencil, read-only tagline** (~16 files)
- Migration: widen `decks_intent_length_check` 120 → 240; backfill `intent = null` where
  `intent_seeded = true`.
- `src/app/decks/actions.ts`: remove the seeded-intent write in the deck-fill path.
- `src/lib/tuning/limits.ts`: delete `seededIntent` and its now-dead helpers.
- `src/lib/copy/deck-tuning.ts`: retire the listed `intent.*` keys; amend `bodyPersist`; sweep
  **every** `creditsCopy` "next one at" call site to "reset at" (not just this file's).
- New `src/lib/copy/deck-description.ts`: `deckDescriptionCopy` (ported from the handoff's copy
  file, PLACEHOLDER strings flagged for `/copy-review`).
- Delete `src/components/decks/deck-intent.tsx` (`DeckIntentAsk`).
- New `src/components/decks/deck-description-field.tsx`: the empty-state field (STATES §1,
  states 1-5): label, field, help text with the always-drawn `n / 240` counter, save-on-blur and
  on-press, `MutationError` on refusal, value kept through a refusal.
- `analysis-empty.tsx`: add `description`/`onSaveDescription` props; field sits between
  `bodyPersist` and the CTA row; the press awaits the save.
- `analysis-panel.tsx`, `builder-shell.tsx`: thread the two new props down from the deck's own
  `intent` value and a (renamed) save action.
- `deck-intent-line.tsx`: read-only tagline — drop the dashed rule, disc, chip, and its own
  Save/Cancel/edit; clamp two lines on phone (desktop never clamps).
- New `src/components/decks/use-deck-header-edit.ts`: two fields (name + description), one
  commit, blur-commits only when focus leaves the pair, Enter in name → description, Enter in
  description → save both, Esc cancels both.
- `spine-desktop.tsx`, `spine-mobile.tsx`: pencil opens both fields at one width; Save/Cancel
  replace Update/Export at both widths; corner buttons hide while editing; `pencilAria` copy.
- `tuning-panel.tsx`: remove the `<DeckIntentAsk>` block and its `intent === null` conditional —
  the dead door. Leave the rest of this file (manifest, run flow) untouched for PR 3.
- Tests for every new/changed file above; mutation-check the save-await-before-read ordering and
  the pair-blur commit rule.

**PR 2 — "Kept for this deck": limits storage and box** (~13 files)
- Migration: new nullable `decks` columns for the per-card cap (cents), the set codes, and
  owned-only (naming TBD at implementation — `cap_cents` / `sets` / `owned_only`, no seeding).
- `src/db/schema.ts`.
- `src/lib/decks/tuning-read.ts`: `tuningInputs` reads the three limits and folds them into
  `tuningFingerprint` (a limit change must mark the gate `changed`, same as an edit does today).
- `src/app/decks/tuning-actions.ts`: new `saveDeckLimits` action (cap/sets/ownedOnly), validated
  the same way `help-me-choose`'s budget field validates a cap.
- New `src/components/decks/tuning-limits-box.tsx`: "Kept for this deck" — Most per card, Set
  (reusing the `SetsField` shape with `setTriggerAny` copy), Cards to add (Any card / Only cards
  I own). Drawn always above the action row (STATES §3 states 1 and 3).
- `tuning-panel.tsx`: mount the box; no run-wiring yet (that's PR 4).
- Tests for the save action, the fingerprint change, and the box's three controls.

**PR 3 — The checklist rewrite: client-side stagger, Additional notes, writing row** (~14 files)
- Delete `readTuningEvidence` (`tuning-actions.ts`, re-exported type in `tuning-read.ts`) and the
  `deps.evidence` plumbing in `tuning-panel.tsx` — the real per-step DB reads.
- `tuning-panel.tsx`: rewrite `press()` to drive the checklist from a pure `setInterval`/timer
  (~350ms apart from the press, starting the moment `run()` is called), ticking `readSteps()` in
  order against the page's own figures via the existing `manifestRows`/`known`/`labelOf`/
  `countOf` helpers — extended to cover `description`, `limits`, `notes` rows alongside the
  existing `games`/`notes`(game)/`decklist`/`intent→description`/`collection`. **No run row
  carries secondary text except Your games' `none logged`** (strip the `countOf` text for every
  other row at both widths). A result landing before the stagger finishes ticks the remaining
  rows at once. Absent rows (Your games with zero games) never tick.
- A final **writing row** (`manifest.writing`), pending (accent pulse) from the moment every read
  row has ticked until the model call settles; past 20s a mono long-wait line appears
  (`manifest.writingLong`), Stop still spends no credit.
- `prefers-reduced-motion`: keep the stagger's timing (it's pacing), drop only the tick's own
  animation/transition (per the orchestrator's resolved eng call).
- Announcements: one at the run's start, one at its end — never per tick, with or without
  reduced motion (confirm `announced` state in `press()`/`stop()` only fires those two points).
- New `src/components/decks/tuning-notes-field.tsx`: "Additional notes", 500-char field, one
  press, never saved, placed above the action row; cleared once a result lands (STATES §3 state
  8) or on Cancel/Esc from describing-in-place.
- `manifest-rows.tsx`: extend `ManifestRow` kinds for the new steps if its shape needs it.
- Tests: the stagger's timing (fake timers), the reduced-motion branch, the single-announcement
  rule, the notes field's 500-char cap and clear-on-result.

**PR 4a — Limits as hard filters, 8-asked/5-kept, and the refusal sentence** (~9 files, ~500 lines)
- `src/lib/tuning/prompt.ts` / `evidence.ts`: `buildEvidencePack` takes the three limits;
  limits are **hard filters** — the validator drops any suggestion violating cap/sets/ownedOnly
  rather than asking the model to self-police them.
- **The paid sizing eval is CANCELLED (Hugh, via orchestrator, 2026-10-03).** Built straight
  instead, a normal task in this PR: the prompt asks for 8 candidates and drops the
  "fewer is better / an empty list is fine" language; after `validateSuggestions`, keep the
  first 5 survivors in whatever order the validator already gives (no new ranking pass, no
  retry, no second model call). Fewer than 5 survivors is shown as-is. If a run already writes
  a record/report row, add the asked-8/kept-N counts to it so real runs measure the drop rate
  for free — no migration for this alone.
- `AnalysisBanner`: add `variant?: "banner" | "note"` — `"note"` renders the refusal sentence
  alone in the same frame, no button, no busy/blocked branches.
- The refusal copy (`deckDescriptionCopy.refusal`): commander / locked / lockedMany / overCap /
  tooMany / nothingLeft — the app chooses the sentence from the validator's own drop reasons, the
  model never writes it.
- Results state: `ReadFrom`/`manifest.readFrom` gains `your limits`.
- Tests: the hard-filter drops (one case per limit), the refusal-sentence selection, the
  `AnalysisBanner` note variant.

**PR 4b — Description and notes into the prompt, through playerText** (~8 files, ~450 lines)
- Notes and the description go to the model through `playerText` / `PLAYER_TEXT_SYSTEM_RULE`
  (`src/lib/model/player-text.ts`, the-99-21's helper — confirm merged before starting this PR;
  if not, stop and tell the orchestrator) as quoted data, never instructions. `validate.ts`'s
  quote-matching against them uses `playerTextBody` from the same module.
- `presentation.ts` / the citation type (`Quotable`, the `kind` union): add a `notes` kind beside
  `intent`→`description`, both undated like today's `intent`; new `YOU ASKED` cite key beside the
  shipped `YOU SAID` in `SuggestionCard`.
- Results state: `ReadFrom`/`manifest.readFrom` gains `your description` / `your notes`; notes
  field clears once results land.
- Tests: the citation's new kind, the quote-matching against `playerTextBody`.

**PR 5 — About entry + launch (last)** (~6 files)
- Confirm `ANALYSIS_TAB_ENABLED` is on wherever this ships (per the handoff's own open item) —
  if off, drop the `switch` qualifier from the entry rather than ship a bump that hides it.
- New About entry `suggested-changes` (chapter 04, after `log-findings`), `ABOUT_VERSION` 9 → 10,
  re-pin `about.version.json`'s hash.
- `about.test.ts` re-pin; confirm `deck-analysis` and `locked-cards` captions need no edit (per
  the handoff's own note — they already say the right thing).

## Copy
Every new string lives in `deckDescriptionCopy` (PR 1) and routes to `/copy-review` before this
launches; none of it goes to Hugh directly.

## About timing
This ships across 5 PRs in one launch (not a multi-round line spanning weeks), so PR 5 is simply
"last", not "batched across rounds" — but the rule is the same: one bump, once, describing the
finished thing.
