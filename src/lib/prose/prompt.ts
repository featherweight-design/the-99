import { createHash } from "node:crypto";
import { shortName } from "../cards/short-name";
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

/**
 * Flatten a string onto one line before it is interpolated into a prompt.
 *
 * Everything the prompt names comes from outside this repo — the commander's name from the
 * catalog, the theme labels from EDHREC, the rejected sentence from the model — and a line
 * break in any of them turns a quoted value into what reads as a fresh instruction.
 */
const oneLine = (s: string): string => s.replace(/\s+/g, " ").trim();

/**
 * The labels the prompt names, most common first — flattened here rather than at the point
 * of use, so the hash covers the same strings the prompt is built from and a label whose
 * upstream whitespace changes shape without changing its words does not mark rows stale.
 */
const topEntries = (tags: EdhrecTag[]): EdhrecTag[] =>
  [...tags]
    .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug))
    .slice(0, TAG_LIMIT);

const topTags = (tags: EdhrecTag[]): string[] => topEntries(tags).map((t) => oneLine(t.label));

/** How many of the leading themes the hash keeps in order. */
const LEAD_THEMES = 3;

/**
 * The identity of the inputs a sentence claims to be about: the commander, the themes the
 * index says its decks are built around, and the prompt that turned those into a sentence.
 *
 * A row whose stored hash differs from the hash its current inputs produce is stale. The
 * generator regenerates it; readers still serve it, because a slightly stale sentence is
 * better than no sentence.
 *
 * The themes enter twice (d9 for Hugh, 2026-09-28): the top eight as a SET, sorted by slug, and
 * the top three IN ORDER. A theme entering or leaving the eight changes what a sentence may
 * name, and a move among the leading three changes what it leads with; a reorder below the top
 * three changes neither. Measured on production's 3,260 fresh sentences, a theme's own label
 * appears in the sentence at rank 1 53% of the time, then 42%, 33%, 25%, 19%, 14%, 10% and 8%,
 * so the lower ranks are named often enough that membership has to count. Against the 09-25
 * staging index, 854 of 1,777 stale sentences had moved by ORDER alone under the old hash,
 * which took all eight in order; this one keeps 525 of them.
 *
 * The name is in the payload as well as the oracle id, which is redundant only while the
 * two move together. A sentence has to open with the subject the name produces, so a card
 * renamed under its existing oracle id leaves a stored sentence naming a card that no
 * longer exists — the one case where the oracle id alone says fresh and the string is not.
 */
export function proseInputHash(
  oracleId: string,
  commanderName: string,
  tags: EdhrecTag[],
): string {
  const top = topEntries(tags);
  const payload = JSON.stringify([
    oracleId,
    oneLine(commanderName),
    [...top].sort((a, b) => a.slug.localeCompare(b.slug)).map((t) => oneLine(t.label)),
    top.slice(0, LEAD_THEMES).map((t) => oneLine(t.label)),
    PROSE_PROMPT_VERSION,
  ]);
  return createHash("sha256").update(payload).digest("hex");
}

/**
 * The hash every sentence was stamped with before 2026-09-28: all eight themes, in order. Kept
 * ONLY so a row current under it can be re-stamped with `proseInputHash` without a model call
 * (`generateCommanderProse`, `copyCommanderProse`, `db:restamp:prose`). Nothing decides
 * freshness by it.
 */
export function legacyProseInputHash(
  oracleId: string,
  commanderName: string,
  tags: EdhrecTag[],
): string {
  const payload = JSON.stringify([
    oracleId,
    oneLine(commanderName),
    topTags(tags),
    PROSE_PROMPT_VERSION,
  ]);
  return createHash("sha256").update(payload).digest("hex");
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
 *
 * It asks for a comma where `checkProse` accepts a comma, a semicolon or an em dash. That
 * narrowing is deliberate — one punctuation mark to aim at is easier to hit than three, and
 * anything the narrower instruction produces the wider check accepts. The advice below,
 * which explains a rejection rather than asking for a sentence, names all three.
 */
export function buildProsePrompt(commanderName: string, tags: EdhrecTag[]): string {
  const themes = topTags(tags);
  const subject = shortName(commanderName);
  const budget = claimBudget(subject);
  return [
    `Write one sentence about how ${oneLine(commanderName)} decks tend to play.`,
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
  sentences: () =>
    'It was not exactly one sentence. Use one ".", "!" or "?", at the end and nowhere else.',
  // The check measures the first of a comma, a semicolon or an em dash, and a sentence
  // carrying none of the three fails it too, on its last character. Naming only the comma
  // here told a sentence broken by an em dash that its comma was late when it had no comma.
  "front-loading": (subject) =>
    `Its first comma, semicolon or em dash fell after character ${CLAIM_BY} — or it had none ` +
    `at all, which fails the same way. Break about ${claimBudget(subject)} characters after ` +
    `"${subject} decks ", then elaborate.`,
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
  const quoted = oneLine(previous);
  return [
    buildProsePrompt(commanderName, tags),
    "",
    // On its own line rather than in quotes: the rejected string is model output and may
    // carry quotation marks of its own, which would close the quoting early and turn the
    // remainder into what reads as instruction. `oneLine` guarantees the line holds.
    "A previous attempt was rejected. It was:",
    quoted,
    "",
    REJECTION_ADVICE[reason](subject),
    "Write a different sentence that does not repeat that mistake.",
  ].join("\n");
}

export { shortName };
