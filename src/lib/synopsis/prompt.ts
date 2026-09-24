import { CHAR_BUDGETS, SECTION_COUNTS, TIP_MIN_CARDS } from "./limits";
import { colorLabel } from "../decks/format";
import { identityNameOf, type SynopsisFacts } from "./facts";
import type { CheckedSynopsis, SectionId } from "./types";

/**
 * The two messages a synopsis run sends. Pure string work.
 *
 * The SYSTEM message states the accept contract as instructions, figure for figure from
 * `limits.ts`, so the prompt and `validate.ts` read one set of numbers. Asking is not checking:
 * every rule stated here is also enforced there.
 *
 * The USER message is the deck: its commanders, colours, the mulligan's computed figures, and
 * every card with its type line, what the app classifies it as, and its rules text. Two
 * deliberate absences: NO BRACKET and NO FIGURE ABOUT STRENGTH (brief §2.2), because a model
 * cannot restate a fact it was never shown; and NO THEME LIST (brief §6: the profile's theme slot
 * is null on purpose, and the strategy is named from the cards).
 *
 * A RETRY (`retry`) sends the passing sections back as context and asks for all four again; the
 * generator keeps the stored passing sections byte for byte and takes only the refused ones from
 * the reply, so a retry can never change what the player already read. It also names the reason
 * each refused section failed, read off the verdicts it was given.
 *
 * The LENGTH and PLUS rules are the eval harness's `budgets-plus` prompt (sub-project 10), shipped
 * as measured. On 15 held-out decks at `effort: "low"`, with the repair below, all four sections
 * rendered on 96% of answers against 18% without them.
 */

const SYSTEM = [
  "You write a synopsis of a Magic: The Gathering Commander deck: how it plays, for the player who built it first and for their playgroup second. Nothing may make sense only to the builder.",
  "Say how the deck plays, never how strong it is. Never mention a bracket, power level, tier, score, rating or cEDH, never call the deck or a card strong, powerful, efficient or similar, and never rate anything out of ten. Facts of the game are fine (\"deals 16 damage\").",
  "Write every card name exactly as the decklist spells it, wrapped in double square brackets: [[Sol Ring]]. EVERY mention, every time, including the commander's own name and a name repeated in the same sentence: a card name written without brackets fails its whole section. Name only cards in the decklist, except in weaknesses, which may name a card the deck lacks.",
  "Write in US English.",
  "Name the deck's colors by the identity name given (\"Gruul\", \"Sultai\", \"Colorless\"), never by mana letters such as RG or BUG.",
  "Every item is one or more whole sentences ending in a period, question mark or exclamation mark.",
  "Sections:",
  `- overview: one paragraph, at most ${CHAR_BUDGETS.overview} characters: what the deck is and how it wins.`,
  `- primer.strategy: ${range(SECTION_COUNTS.strategy)} steps of the deck's plan, in order, each at most ${CHAR_BUDGETS.strategy} characters.`,
  `- primer.mulligan.keep and primer.mulligan.sendBack: ${range(SECTION_COUNTS.keep)} lines each, each at most ${CHAR_BUDGETS.mulligan} characters, about what opening hand to keep and what to send back. Use only the figures given under "Mulligan figures"; state no other number.`,
  `- primer.tips: ${range(SECTION_COUNTS.tips)} tips, each an interaction between at least ${TIP_MIN_CARDS} cards in this deck, never general rules advice. List the tip's cards in "cards", and name exactly those cards in its text. Each text at most ${CHAR_BUDGETS.tip} characters.`,
  `- keyCards: ${range(SECTION_COUNTS.keyCards)} different cards from the decklist, never one marked "universal staple" (a card nearly every deck plays says nothing about this one), each with one line, at most ${CHAR_BUDGETS.job} characters, on the job it does in this deck. "claims" lists only categories the decklist shows in that card's brackets; leave it empty for a card with none. In a job, never use the words ramp, draw, removal, remove, destroy, wipe, sweeper, tutor, combo or infinite unless that card's brackets list the matching category.`,
  `- weaknesses: ${range(SECTION_COUNTS.weaknesses)} weaknesses of how the deck plays, untiered and unranked, each at most ${CHAR_BUDGETS.weakness} characters.`,
].join("\n");

/**
 * Lengths, restated with targets under each limit and one worked example. Asking for shorter text
 * rather than loosening a budget: the job line ran 65 characters at the median against its 60.
 */
const LENGTH_RULES = [
  "Lengths are counted in characters as the text renders ([[Name]] counts as the name alone). One item over its limit refuses its whole section, so stay well under:",
  `- a Key card's job: at most ${CHAR_BUDGETS.job} characters; write one short clause of about ${CHAR_BUDGETS.job - 20}. For example: "Ramps two lands a turn off the top." (35).`,
  `- a mulligan line: at most ${CHAR_BUDGETS.mulligan}; aim for about ${CHAR_BUDGETS.mulligan - 25}.`,
  `- a tip: at most ${CHAR_BUDGETS.tip}; aim for about ${CHAR_BUDGETS.tip - 50}.`,
  "Before you answer, count each job, mulligan line and tip, and shorten any that is near or over its limit.",
].join("\n");

/** A word target for the job line, this deck's own mulligan figures, the refused words, and marking every mention. */
function plusRules(facts: SynopsisFacts): string {
  return [
    "A Key card's job is 4 to 8 words.",
    `In the mulligan lines, every number, written as digits or as a word like "two", must be one of: ${facts.figures.join(", ")}. Do not name a turn number; say "early" or "late" instead.`,
    "Never use these words anywhere: strong, powerful, efficient, competitive, casual, optimized, tier, score, rating, bracket, power level, brutal, busted, oppressive, respectable.",
    "Mark EVERY mention of a card in the decklist, the commander included and every repeat: [[Name]] each time.",
  ].join("\n");
}

const REPAIR_LEAD = "Those sections failed checking for these reasons; fix exactly these:";

/** Whether a user message asks for refused sections again: the repair, or the player's Try again. */
export function isRepair(user: string): boolean {
  return user.includes(REPAIR_LEAD);
}

function range(r: { min: number; max: number }): string {
  return `${r.min} to ${r.max}`;
}

export function buildSynopsisPrompt(
  facts: SynopsisFacts,
  retry?: { keep: CheckedSynopsis; refused: SectionId[] },
): { system: string; user: string } {
  const lines: string[] = [];
  lines.push(`Commander: ${facts.commanders.join(" and ")}`);
  lines.push(`Color identity: ${identityNameOf(facts)}`);
  if (facts.unproducible.length > 0) {
    // By name, as the identity is: a letter run here would hand the model the very form it is
    // told never to write.
    lines.push(`Colors the spells need that no land produces: ${facts.unproducible.map((c) => colorLabel([c]).toLowerCase()).join(" and ")}`);
  }

  lines.push("", "Mulligan figures (the only numbers the mulligan lines may state):");
  lines.push(`- Lands, counting land-backed double-faced cards: ${facts.lands}`);
  lines.push(`- Ramp pieces: ${facts.ramp}`);
  lines.push(`- A keepable seven-card hand holds ${facts.keep.low} to ${facts.keep.high} lands.`);
  lines.push(`- Send back a hand with ${facts.sendBack.none} to ${facts.sendBack.under} lands, or ${facts.sendBack.over} or more.`);
  if (facts.commanderManaValues.length > 0) {
    lines.push(`- Commander mana value (a turn to cast it on is this number): ${facts.commanderManaValues.join(" and ")}`);
  }

  const total = facts.cards.reduce((n, c) => n + c.quantity, 0);
  lines.push("", `Decklist (${total} cards). Each card: name, type line, [categories], then its rules text.`);
  for (const c of facts.cards) {
    const qty = c.quantity > 1 ? `${c.quantity}x ` : "";
    const cats = c.categories.length > 0 ? ` [${c.categories.join(", ")}]` : "";
    const staple = c.universalStaple ? " (universal staple)" : "";
    lines.push(`- ${qty}${c.name} (${c.typeLine})${cats}${staple}${c.oracleText ? `: ${oneLine(c.oracleText)}` : ""}`);
  }

  if (retry) {
    lines.push("", `Rewrite these sections, which did not pass checking last time: ${retry.refused.join(", ")}.`);
    lines.push("The other sections passed and are kept as they are. They are given here so the rewrite agrees with them; return them unchanged.");
    lines.push(JSON.stringify({
      overview: retry.keep.overview,
      primer: retry.keep.primer,
      keyCards: retry.keep.keyCards,
      weaknesses: retry.keep.weaknesses,
    }));
    const reasons = retry.keep.verdicts.flatMap((v) =>
      v.status === "refused" && retry.refused.includes(v.section)
        ? [`${v.section}: ${v.reason}${v.failed ? ` (${v.failed} of ${v.total} cards failed checking)` : ""}`]
        : []);
    lines.push(`${REPAIR_LEAD} ${reasons.join("; ")}.`);
  }

  return { system: `${SYSTEM}\n${LENGTH_RULES}\n${plusRules(facts)}`, user: lines.join("\n") };
}

/** Rules text on one line: a line break inside it would read as a new list item. */
function oneLine(text: string): string {
  return text.replace(/\r\n|[\r\n\u2028\u2029]+/g, " / ");
}
