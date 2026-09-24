# Deck tuning v2: S at medium effort, the strategy prompt, and the rationale rules

Built by the eval-harness session under `boards/lanes/tuning.md`, "v2 phase". The evidence is the
eval report (`docs/superpowers/eval/report.md`, #946): tuning rounds 3 and 4.

## Rulings (Hugh, 2026-09-24)

1. **The setup.** Round 4 passed 7 to 0, so v2 is S (`claude-sonnet-5`) at `effort: "medium"`,
   8,000 output tokens, on the round 4 prompt (`strategy-terse-b`):
   - the deck's own strategy and Key cards, from its stored overview; Key cards are never cut;
   - universal staples are never cut to fix a role count (`src/lib/staples/universal.ts`,
     imported, never restated);
   - 4 to 5 suggestions, sized to each gap, grounded in the decklist over pure role-count swaps;
   - a rationale never restates a figure its citation chips already show;
   - no two rationales open on the same role or the same count;
   - a cited game note is quoted word for word.
2. **The timeout across a retry: fail fast and refund.** The single 110s deadline across both
   attempts stays (`MODEL_TIMEOUT_MS`), and so does the deck page's `maxDuration` of 120. A retry
   starts only when at least R of the deadline remains; otherwise the run fails at once and its
   unit is refunded. R is the measured p95 of one S-medium attempt, rounded up to 5s. Raising the
   limit to 180s was considered and rejected: a three-minute wait for a suggestion.
3. **Credits: charge only a delivered answer.** Already the rule in `run-store.ts`: every failure
   refunds (timeout, malformed, upstream_busy, ungrounded, Stop), and only `persistRun` spends. v2
   adds a test that a run refused a retry by the floor refunds. The spend cap is unchanged.

## Why the retry floor

`callModel` spends at most one retry inside the one deadline and never retries a timeout. On the
round 4 decks, Eldrazi's first attempt failed after about 43s and its retry needed about 68s, which
reaches past 110s: in the app that run times out and refunds, after making the player wait the full
110s for nothing, and the doomed retry still bills its tokens. The floor stops a retry that cannot
finish. A per-attempt budget was rejected because two of them outrun `maxDuration`.

**The measured R: 70s.** Eight S-medium attempts on the round 4 decks, run in real time
(2026-09-24, $0.31), took 17.2 to 47.6s at 79 to 95 output tokens a second. Eight is too few for a
p95 on its own, so R is read from the output tokens of all 21 S-medium attempts measured (the dev
check, the round 4 blind run and this one: 1,365 to 5,571) at the SLOWEST measured rate, 79 tokens
a second: p50 32.2s, p90 57.4s, p95 69.0s, rounded up to 70s. So a retry starts only when the first
attempt ended within 40s. Eldrazi's first attempt ended at about 43s, so under v2 it fails at once
and refunds instead of timing out at 110s.

## PR boundaries

**PR 1, the engine** (`src/lib/tuning/**`, `src/lib/model/**`, the contract check):
- `limits.ts`: `TUNING_EFFORT = "medium"` and `TUNING_RETRY_FLOOR_MS = R`.
- `model/client.ts`: an optional `retryFloorMs` on the request; omitted, nothing changes, so the
  synopsis is unaffected.
- `prompt.ts`: the rules above, and the strategy block when the deck has an overview.
- `validate.ts`: a suggestion cutting a Key card is dropped, and so is one cutting a universal
  staple whose citations are role counts alone. Both were prompt-only in the harness, and round 4
  broke neither, so enforcing them costs nothing measured. The chip and opening rules stay
  prompt-only: enforcing them would drop whole suggestions over wording.
- `PROMPT_VERSION` moves.
- `tuning-actions.ts`: the run's call passes the effort and the floor. Three lines, moved here from
  PR 2 while building: the prompt change ships the moment PR 1 merges, and without them the app
  would run the new rules at default effort, a setup the dev check saw malform 1 of 4, until PR 2
  landed. The swap lane agreed to the file on 2026-09-24.
- Proof the prompt is the one Hugh rated: with round 4's 8 decks' overviews and the universal
  staples, `buildPrompt` reproduces all 8 system and user messages round 4 sent, byte for byte.
- Mutations: the floor removed, the Key-card drop removed, the universal-staple drop removed, the
  effort dropped.

**PR 2, the wiring** (`src/app/decks/tuning-actions.ts`, the swap lane agreed 2026-09-24):
- the run reads the deck's shown overview (`readShownSynopsis`) and the universal staples into
  the pack;
- with no overview for the live list, the newest shown one is used, keeping only Key cards still
  in the deck; with none at all, the strategy block is left out and every other rule stays;
- `probe:tuning-run` proves a real run on local-dev: effort medium, no Key card cut, and the refund
  on a forced failure.

It ships behind the Analysis tab's existing switch. There is no new About entry: this line batches
its entries at launch.
