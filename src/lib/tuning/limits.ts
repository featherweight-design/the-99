import { countCharacters } from "../copy/deck-tuning";
import { deckDescriptionCopy } from "../copy/deck-description";

/**
 * Deck tuning's fixed numbers, in one place. Pure and client-safe.
 *
 * No hourly ceiling here: the per-player allowance is shared with the deck synopsis and lives
 * in `src/lib/model/allowance-rule.ts`.
 */

/** At most five cards SHOWN in EACH list, Additions and Cuts (Hugh, 2026-09-23 for five swaps; the
 *  two lists of sub-project 8 keep five apiece, as Design's B10 draws them). Fewer is legitimate;
 *  zero that survive checking in both lists is `ungrounded`. The model is asked for more than this
 *  (`ASK_PER_LIST`) so a run with some invalid candidates still has enough survivors to fill five. */
export const MAX_SUGGESTIONS = 5;

/**
 * How many candidates the model is ASKED for in each list (H35, PR 4a set 8 swaps; the two lists
 * ask six apiece, sub-project 8). One more than are kept is enough buffer for the hard filters,
 * and eight apiece would double the answer's tokens for a buffer the eval did not need.
 * `validateSuggestions` drops the invalid ones and `runTuning` keeps the first `MAX_SUGGESTIONS`
 * survivors of each list in whatever order the validator already gives — no second ranking pass,
 * no retry, no second model call.
 */
export const ASK_PER_LIST = 6;
/** The `deck_suggestion_runs.tool` value Suggested changes writes and every one of its readers scopes to,
 *  so a run another tool wrote on the same deck is never read as one of these. */
export const SUGGESTED_CHANGES_TOOL = "suggested_changes";

/** The `deck_suggestion_runs.tool` value Proposed cuts writes and its readers scope to. */
export const PROPOSED_CUTS_TOOL = "proposed_cuts";

/** A pending run older than this was abandoned, and the read-time reaper fails it. */
export const REAPER_CUTOFF_MS = 5 * 60 * 1000;

/**
 * One deadline across both attempts of a run's model call: the schema-fail retry runs inside it.
 *
 * 110s, up from 90 (the-99-d9's harness latency, 2026-09-24). With `TUNING_MAX_TOKENS` at 8,000
 * the timed attempts ran p50 36s, p90 56s, max 60s, but the slowest answer that needed its retry
 * took 82.9s of the 90, and one batch answer reached the full 8,000 output tokens, about 100s at
 * ~80 tokens a second. At 90s those runs time out.
 *
 * It has to fit under the deck page's `maxDuration` of 120s, since that bounds the Server Action.
 * Everything else a run does fits in the ~10s left, measured on local-dev against three whole
 * decks: the inputs read, the gate read and `startRun`'s reserve before the call; the name read,
 * the five bracket-after profiles and `persistRun`'s settle after it. The worst deck took 3.0s
 * in total, most of it the five profiles (1.8s). `limits.test.ts` pins the ordering.
 */
export const MODEL_TIMEOUT_MS = 110_000;

/**
 * The model a run calls, recorded per run in `deck_suggestion_runs.model`, for BOTH tools (Suggested
 * changes and Proposed cuts).
 *
 * Sonnet 5.5 (Hugh, 2026-10-12, model tiering: `docs/superpowers/eval/model-tiering-2026-10-12.md`),
 * at the same $2 / $10 per MTok as the Sonnet 5 it replaced and the same effort. Measured on his
 * twelve staging decks it answered in about a third of the time, at about two thirds of the cost,
 * and found as many of his cuts. Chosen for a structured-output task checked by strict validation.
 */
export const TUNING_MODEL = "claude-sonnet-5-5";

/**
 * The answer's own worst case, from the response schema's caps rather than guessed. One line at its
 * longest is 200 + 400 + 80 characters of text plus four 160-character citations: 1,320 characters,
 * about 350 tokens, and about 400 with its JSON keys. `ASK_PER_LIST` (6) of those in each of the two
 * lists is 4,800 — the schema's own ceiling, not `MAX_SUGGESTIONS` (5 a list, what is kept): a
 * reply sized for the worst case the schema allows, not the worst case the panel shows.
 */
export const ANSWER_TOKENS_WORST_CASE = 4_800;

/**
 * The output ceiling, which must hold ADAPTIVE THINKING as well as the answer. `callModel` sends
 * no `thinking` field, so Sonnet 5 thinks adaptively, and that thinking is counted inside
 * `max_tokens`. At the old 3,000, sized for the answer alone, the eval harness (2026-09-24, n=4)
 * saw 2 of 4 decks hit the ceiling on the first try AND the retry: a mean output of 2,691 tokens
 * against about 450 visible, one reply all thinking, and the player got nothing.
 *
 * 8,000 held at default effort too rarely: S used most or all of it thinking, and lost 2 of 15
 * held-out answers that way. v2 keeps the ceiling and caps the thinking instead (`TUNING_EFFORT`).
 */
export const TUNING_MAX_TOKENS = 8_000;

/**
 * The reasoning effort a run asks for (Hugh's ruling, 2026-09-24). Round 4 of the eval, a blind
 * read on 8 held-out decks, preferred S at "medium" over S at its default on 7 of 7 rated, at about
 * half the time and cost: 4.00 suggestions kept per answer against 2.50, and no answer lost to a
 * ceiling. Default effort spent 6,000 to 8,000 tokens thinking, about 100s an attempt.
 */
export const TUNING_EFFORT = "medium";

/**
 * The least of `MODEL_TIMEOUT_MS` a retry needs to START (Hugh's ruling, 2026-09-24: fail fast
 * and refund). A retry that cannot finish still bills its tokens and keeps the player waiting the
 * whole deadline for a certain failure. 70s is the p95 of one S-medium attempt, read from the
 * output tokens of all 21 attempts the eval measured at the slowest real-time rate it saw, 79
 * tokens a second (p95 69.0s), rounded up to 5s. So a retry starts only after a first attempt that
 * ended within 40s.
 */
export const TUNING_RETRY_FLOOR_MS = 70_000;

/** The room the ceiling must leave over the answer for thinking: the longest reply measured was
 *  all thinking at the old 3,000, so at least that again. */
export const THINKING_HEADROOM_TOKENS = 3_000;

/**
 * Whether a deck description is over the cap (240, H35), counted in code points as the column's
 * `char_length` check counts — `.length` would refuse 61 emoji as 122 characters.
 */
export function intentTooLong(intent: string): boolean {
  return countCharacters(intent) > deckDescriptionCopy.description.maxLength;
}
