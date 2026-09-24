import { CHAR_BUDGETS, SECTION_COUNTS, TIP_MIN_CARDS } from "./limits";
import type { SynopsisFacts } from "./facts";
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
 * the reply, so a retry can never change what the player already read.
 */

const SYSTEM = [
  "You write a synopsis of a Magic: The Gathering Commander deck: how it plays, for the player who built it first and for their playgroup second. Nothing may make sense only to the builder.",
  "Say how the deck plays, never how strong it is. Never mention a bracket, power level, tier, score, rating or cEDH, never call the deck or a card strong, powerful, efficient or similar, and never rate anything out of ten. Facts of the game are fine (\"deals 16 damage\").",
  "Write every card name exactly as the decklist spells it, wrapped in double square brackets: [[Sol Ring]]. Name only cards in the decklist, except in weaknesses, which may name a card the deck lacks.",
  "Write in US English.",
  "Every item is one or more whole sentences ending in a period, question mark or exclamation mark.",
  "Sections:",
  `- overview: one paragraph, at most ${CHAR_BUDGETS.overview} characters: what the deck is and how it wins.`,
  `- primer.strategy: ${range(SECTION_COUNTS.strategy)} steps of the deck's plan, in order, each at most ${CHAR_BUDGETS.strategy} characters.`,
  `- primer.mulligan.keep and primer.mulligan.sendBack: ${range(SECTION_COUNTS.keep)} lines each, each at most ${CHAR_BUDGETS.mulligan} characters, about what opening hand to keep and what to send back. Use only the figures given under "Mulligan figures"; state no other number.`,
  `- primer.tips: ${range(SECTION_COUNTS.tips)} tips, each an interaction between at least ${TIP_MIN_CARDS} cards in this deck, never general rules advice. List the tip's cards in "cards", and name exactly those cards in its text. Each text at most ${CHAR_BUDGETS.tip} characters.`,
  `- keyCards: ${range(SECTION_COUNTS.keyCards)} different cards from the decklist, each with one line, at most ${CHAR_BUDGETS.job} characters, on the job it does in this deck. "claims" lists only categories the decklist shows in that card's brackets; leave it empty for a card with none. Do not describe a card as ramp, card draw, removal, a wipe, a tutor or a combo piece unless the decklist gives it that category.`,
  `- weaknesses: ${range(SECTION_COUNTS.weaknesses)} weaknesses of how the deck plays, untiered and unranked, each at most ${CHAR_BUDGETS.weakness} characters.`,
].join("\n");

function range(r: { min: number; max: number }): string {
  return `${r.min} to ${r.max}`;
}

export function buildSynopsisPrompt(
  facts: SynopsisFacts,
  retry?: { keep: CheckedSynopsis; refused: SectionId[] },
): { system: string; user: string } {
  const lines: string[] = [];
  lines.push(`Commander: ${facts.commanders.join(" and ")}`);
  lines.push(`Color identity: ${facts.identity.length > 0 ? facts.identity.join("") : "colorless"}`);
  if (facts.unproducible.length > 0) {
    lines.push(`Colors the spells need that no land produces: ${facts.unproducible.join("")}`);
  }

  lines.push("", "Mulligan figures (the only numbers the mulligan lines may state):");
  lines.push(`- Lands, counting land-backed double-faced cards: ${facts.lands}`);
  lines.push(`- Ramp pieces: ${facts.ramp}`);
  lines.push(`- A keepable seven-card hand holds ${facts.keep.low} to ${facts.keep.high} lands.`);

  const total = facts.cards.reduce((n, c) => n + c.quantity, 0);
  lines.push("", `Decklist (${total} cards). Each card: name, type line, [categories], then its rules text.`);
  for (const c of facts.cards) {
    const qty = c.quantity > 1 ? `${c.quantity}x ` : "";
    const cats = c.categories.length > 0 ? ` [${c.categories.join(", ")}]` : "";
    lines.push(`- ${qty}${c.name} (${c.typeLine})${cats}${c.oracleText ? `: ${oneLine(c.oracleText)}` : ""}`);
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
  }

  return { system: SYSTEM, user: lines.join("\n") };
}

/** Rules text on one line: a line break inside it would read as a new list item. */
function oneLine(text: string): string {
  return text.replace(/\r\n|[\r\n\u2028\u2029]+/g, " / ");
}
