import { createHash } from "node:crypto";
import type { EdhrecTag } from "../edhrec/parse";
import { CLAIM_BY, HARD_MAX, OK_MAX, OK_MIN, type ProseRejection } from "./accept";

/**
 * Bumped whenever the wording below changes. It is stored beside every sentence, so a
 * row generated under an older prompt is identifiable without re-reading this file's
 * history, and it is hashed into the input hash so a prompt change marks every row stale.
 */
export const PROSE_PROMPT_VERSION = 2;

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
 * The name players use for a commander: everything before the epithet, and the front face
 * of a split card.
 *
 * The subject has to be short because the front-loading rule spends the opening of the
 * sentence on it. "Uvilda, Dean of Perfection // Nassari, Dean of Expression" is 56
 * characters — one more than the whole claim budget — so a prompt that asks for the printed
 * name back is asking for a sentence the contract cannot accept.
 */
export function shortName(commanderName: string): string {
  const short = commanderName.split(" // ")[0].split(",")[0].trim();
  return short.length > 0 ? short : commanderName;
}

/** What the front-loading rule leaves for the opening claim once the subject is spent. */
function claimBudget(subject: string): number {
  return CLAIM_BY - `${subject} decks `.length;
}

/**
 * The rules the mechanical predicates cannot check live here: say something specific to
 * this commander, open with the subject, name no cards, make no rules claims.
 *
 * The length band and the hedge are stated too even though `acceptProse` enforces them,
 * because a model told the target hits it far more often than one corrected after the fact,
 * and every rejection costs a whole generation.
 *
 * The front-loading rule is stated as a remaining character count rather than as the
 * threshold itself. Version 1 asked for a `"<name> decks tend to ..."` opening AND a claim
 * landing by character 55, which are jointly unsatisfiable for most commanders: the opening
 * alone spends 15 characters plus the name, so "Shang-Chi and the Ten Rings" was left 13
 * characters to make a claim in and failed all three attempts. Doing that arithmetic here
 * and handing over the answer is the difference between a rule the model can follow and a
 * rule it cannot.
 */
export function buildProsePrompt(commanderName: string, tags: EdhrecTag[]): string {
  const themes = topTags(tags);
  const subject = shortName(commanderName);
  const budget = claimBudget(subject);
  return [
    `Write one sentence about how ${commanderName} decks tend to play.`,
    "",
    themes.length > 0
      ? `The themes players build around, most common first: ${themes.join(", ")}.`
      : "No theme data is available for this commander; write from its name and colours alone.",
    "",
    "Rules:",
    `- Exactly one sentence, between ${OK_MIN} and ${OK_MAX} characters, and never over ${HARD_MAX}.`,
    `- Open with the subject, "${subject} decks", then the claim, then a comma, then the`,
    "  elaboration. The elaboration carries most of the length.",
    `- The comma must fall by character ${CLAIM_BY}. "${subject} decks " spends ${CLAIM_BY - budget}`,
    `  of those, leaving about ${budget} characters for the claim. Count them — this is the`,
    "  rule most sentences fail.",
    '- Hedge with "tend to", "usually" or "mostly" — never "will" or "can", because the data',
    "  is a distribution. The hedge may sit after the comma, which leaves the short opening",
    "  claim for the claim itself.",
    "- Name no cards. Not one.",
    "- State no rules text and no card interactions as fact. The subject is what the decks",
    "  do, never what the commander's own text does — no \"its ability\", no \"triggered\".",
    '- Never "he", "she", "his" or "her". The commander is a card.',
    '- Do not address the reader. No "you", no "your".',
    "- Say something true of this commander in particular. A sentence that would fit any",
    "  deck in these colours is a failure, not a safe answer.",
    "",
    "Reply with the sentence and nothing else.",
  ].join("\n");
}

/** What each check means to a writer, as the instruction that would have avoided it. */
const REJECTION_ADVICE: Record<ProseRejection, (subject: string) => string> = {
  length: () => `It was outside ${OK_MIN}-${HARD_MAX} characters. Count the characters.`,
  sentences: () => "It was not exactly one sentence. One sentence, one full stop, at the end.",
  "front-loading": (subject) =>
    `Its first comma fell after character ${CLAIM_BY}. Put the comma earlier: about ` +
    `${claimBudget(subject)} characters after "${subject} decks ", then elaborate.`,
  hedge: () => 'It carried no hedge. Use "tend to", "usually" or "mostly".',
};

/**
 * The prompt for a second or later attempt, carrying the last rejection back to the model.
 *
 * Retrying the identical prompt retries the identical reasoning: three attempts at
 * "General Ferrous Rokiric" returned three byte-identical sentences, so the run paid for
 * three generations and learned nothing. Naming the rule that was broken is what makes the
 * second attempt different from the first.
 */
export function buildProseRetryPrompt(
  commanderName: string,
  tags: EdhrecTag[],
  previous: string,
  reason: ProseRejection,
): string {
  const subject = shortName(commanderName);
  return [
    buildProsePrompt(commanderName, tags),
    "",
    `A previous attempt was rejected: ${previous}`,
    "",
    REJECTION_ADVICE[reason](subject),
    "Write a different sentence that does not repeat that mistake.",
  ].join("\n");
}
