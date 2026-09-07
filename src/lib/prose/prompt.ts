import { createHash } from "node:crypto";
import type { EdhrecTag } from "../edhrec/parse";
import { CLAIM_BY, HARD_MAX, OK_MAX, OK_MIN } from "./accept";

/**
 * Bumped whenever the wording below changes. It is stored beside every sentence, so a
 * row generated under an older prompt is identifiable without re-reading this file's
 * history, and it is hashed into the input hash so a prompt change marks every row stale.
 */
export const PROSE_PROMPT_VERSION = 1;

/** How many tags the prompt is given, and how many the hash covers. */
const TAG_LIMIT = 8;

const topTags = (tags: EdhrecTag[]): string[] =>
  [...tags]
    .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug))
    .slice(0, TAG_LIMIT)
    .map((t) => t.label);

/**
 * The identity of the inputs a sentence claims to be about: the commander, the themes the
 * index says its decks are built around, and the prompt that turned those into a sentence.
 *
 * A row whose stored hash differs from the hash its current inputs produce is stale. The
 * generator regenerates it; readers still serve it, because a slightly stale sentence is
 * better than no sentence.
 */
export function proseInputHash(oracleId: string, tags: EdhrecTag[]): string {
  const payload = JSON.stringify([oracleId, topTags(tags), PROSE_PROMPT_VERSION]);
  return createHash("sha256").update(payload).digest("hex");
}

/**
 * The rules the mechanical predicates cannot check live here: say something specific to
 * this commander, open with the subject, name no cards, make no rules claims.
 *
 * The length band and the hedge are stated too even though `acceptProse` enforces them,
 * because a model told the target hits it far more often than one corrected after the fact,
 * and every rejection costs a whole generation.
 */
export function buildProsePrompt(commanderName: string, tags: EdhrecTag[]): string {
  const themes = topTags(tags);
  return [
    `Write one sentence about how ${commanderName} decks tend to play.`,
    "",
    themes.length > 0
      ? `The themes players build around, most common first: ${themes.join(", ")}.`
      : "No theme data is available for this commander; write from its name and colours alone.",
    "",
    "Rules:",
    `- Exactly one sentence, between ${OK_MIN} and ${OK_MAX} characters, and never over ${HARD_MAX}.`,
    `- Open with the subject — "${commanderName} decks tend to ..." — and land the claim`,
    `  within the first ${CLAIM_BY} characters, before the first comma, semicolon or dash.`,
    '- Hedge: "tend to", "usually", "mostly". Never "will" or "can". The data is a distribution.',
    "- Name no cards. Not one.",
    "- State no rules text and no card interactions as fact.",
    '- Do not address the reader. No "you", no "your".',
    "- Say something true of this commander in particular. A sentence that would fit any",
    "  deck in these colours is a failure, not a safe answer.",
    "",
    "Reply with the sentence and nothing else.",
  ].join("\n");
}
