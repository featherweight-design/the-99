import { countCharacters, deckTuningCopy } from "../copy/deck-tuning";

/**
 * Deck tuning's fixed numbers, in one place. Pure and client-safe.
 *
 * No hourly ceiling here: the per-player allowance is shared with the deck synopsis and lives
 * in `src/lib/model/allowance-rule.ts`.
 */

/** At most five swaps (Hugh, 2026-09-23, as Design drew). Fewer is legitimate; zero that survive
 *  checking is `ungrounded`. */
export const MAX_SUGGESTIONS = 5;

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
 * The model a run calls, recorded per run in `deck_suggestion_runs.model`.
 *
 * The current Sonnet (Hugh confirmed, 2026-09-23), chosen for a structured-output task checked
 * by strict validation, at $2 / $10 per MTok against the current Opus's $5 / $25.
 */
export const TUNING_MODEL = "claude-sonnet-5";

/**
 * The intent the app writes when it fills a deck, marked `intent_seeded` so the chip can say
 * who wrote it. Always within the intent's cap, counted in code points as the column counts:
 * the full sentence, then the short one, then the short one with the names cut and closed with
 * an ellipsis. A pair is named as a pair.
 */
export function seededIntent(commanderNames: readonly string[]): string {
  const names = commanderNames.join(" and ");
  const { seededBrief, seededBriefShort, maxLength } = deckTuningCopy.intent;
  for (const sentence of [seededBrief(names), seededBriefShort(names)]) {
    if (countCharacters(sentence) <= maxLength) return sentence;
  }
  const room = maxLength - countCharacters(seededBriefShort("\u2026"));
  return seededBriefShort(`${[...names].slice(0, room).join("")}\u2026`);
}

/**
 * The answer's own worst case, from the response schema's caps rather than guessed. One suggestion
 * at its longest is 200 + 200 + 400 + 80 characters of text plus four 160-character citations:
 * 1,520 characters, about 400 tokens, and about 460 with its JSON keys. Five of those is 2,300.
 */
export const ANSWER_TOKENS_WORST_CASE = 2_300;

/**
 * The output ceiling, which must hold ADAPTIVE THINKING as well as the answer. `callModel` sends
 * no `thinking` field, so Sonnet 5 thinks adaptively, and that thinking is counted inside
 * `max_tokens`. At the old 3,000, sized for the answer alone, the eval harness (2026-09-24, n=4)
 * saw 2 of 4 decks hit the ceiling on the first try AND the retry: a mean output of 2,691 tokens
 * against about 450 visible, one reply all thinking, and the player got nothing.
 *
 * 8,000 is a STOPGAP, the harness's baseline cell `sonnet@max8000`. Whether to cap thinking with
 * an effort setting instead is the harness's call and is not made here.
 */
export const TUNING_MAX_TOKENS = 8_000;

/** The room the ceiling must leave over the answer for thinking: the longest reply measured was
 *  all thinking at the old 3,000, so at least that again. */
export const THINKING_HEADROOM_TOKENS = 3_000;

/**
 * Whether a deck intent is over the cap, counted in code points as the column's
 * `char_length` check counts — `.length` would refuse 61 emoji as 122 characters.
 */
export function intentTooLong(intent: string): boolean {
  return countCharacters(intent) > deckTuningCopy.intent.maxLength;
}
