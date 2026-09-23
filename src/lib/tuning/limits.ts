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

/** One deadline across both attempts of a run's model call. */
export const MODEL_TIMEOUT_MS = 90_000;

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
 * Sized from the response schema's own caps rather than guessed. One suggestion at its longest is
 * 200 + 200 + 400 + 80 characters of text plus four 160-character citations: 1,520 characters,
 * about 400 tokens, and about 460 with its JSON keys. Five of those is about 2,300. The ceiling
 * leaves room over that worst case without inviting the model to pad.
 */
export const TUNING_MAX_TOKENS = 3_000;

/**
 * Whether a deck intent is over the cap, counted in code points as the column's
 * `char_length` check counts — `.length` would refuse 61 emoji as 122 characters.
 */
export function intentTooLong(intent: string): boolean {
  return countCharacters(intent) > deckTuningCopy.intent.maxLength;
}
