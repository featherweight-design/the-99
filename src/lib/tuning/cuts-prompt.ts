import { CURVE_MAX } from "../decks/stats";
import { deckCutsCopy } from "../copy/deck-cuts";
import { PLAYER_TEXT_SYSTEM_RULE } from "../model/player-text";
import { MAX_COMBO_FACTS, MAX_NEAR_COMBO_FACTS } from "../synopsis/facts-extra";
import type { CutsPack, CutsPackCard } from "./cuts-evidence";

/** Its own version, apart from Suggested changes' `PROMPT_VERSION`. */
export const CUTS_PROMPT_VERSION = 3;

/** The last curve bucket holds that mana value and above, so it reads `7+`; a cite still uses 7. */
const bucket = (cmc: number) => (cmc >= CURVE_MAX ? `${cmc}+` : `${cmc}`);
const flagLabel = (f: keyof typeof deckCutsCopy.flags) => deckCutsCopy.flags[f];

function cardLine(c: CutsPackCard): string {
  const parts = [c.quantity > 1 ? `${c.name} x${c.quantity}` : c.name, `${c.typeLine}, mv ${c.mv}`];
  if (c.text) parts.push(`text: ${c.text.replace(/\s*\n\s*/g, " / ")}`);
  parts.push(`roles: ${c.roles.length > 0 ? c.roles.join(", ") : "none"}`);
  if (c.inclusion === "offList") parts.push("not on the commander's EDHREC list");
  else if (c.inclusion) parts.push(`inclusion ${c.inclusion.pct}`);
  if (c.curve) parts.push(`curve: cmc ${bucket(c.curve.cmc)} have ${c.curve.have}, average ${c.curve.average}`);
  if (c.comboState) parts.push(c.comboState === "assembled" ? "piece of an assembled combo" : "piece of a combo one card short");
  if (c.entersTapped) parts.push(c.entersTapped === "always" ? "enters tapped" : "enters tapped unless a condition is met");
  if (c.needs) parts.push(`needs ${c.needs.join("")}`);
  if (c.flags) parts.push(`flags: ${c.flags.map(flagLabel).join(", ")}`);
  return `- ${parts.join(" | ")}`;
}

/** The pack as the two messages a cuts run sends. No ownership, no price, no ranking, no score. */
export function buildCutsPrompt(pack: CutsPack): { system: string; user: string } {
  const { prompt, rules } = deckCutsCopy;
  const system = [
    prompt.task(pack.over),
    prompt.count(pack.ask, pack.over),
    prompt.order(pack.plan !== null),
    pack.plan !== null ? prompt.cites : prompt.citesNoPlan,
    prompt.reasonLength,
    ...Object.values(rules).map((r) => `- ${r}`),
    PLAYER_TEXT_SYSTEM_RULE,
  ].join("\n");

  const lines = [`Commander: ${pack.commander}`, `Cards over 100: ${pack.over}`];
  if (pack.support) {
    lines.push(`EDHREC list: ${pack.support.listed} cards${pack.support.deckCount === null ? "" : `, from ${pack.support.deckCount} decks`}. Inclusion is the percent of those decks running the card.`);
  }
  for (const m of pack.missing) lines.push(deckCutsCopy.missing[m]);
  const plan = pack.plan;
  if (plan) {
    lines.push("", "The deck's plan.");
    if (plan.commanderText.length > 0) lines.push("Commander text:", ...plan.commanderText.map((t) => `- ${t}`));
    if (plan.combos === null) lines.push("The combo read failed, so no combos are listed.");
    else {
      lines.push(plan.combos.length > 0 ? "Combos the deck assembles:" : "The deck assembles no infinite or game-ending combo that the read found. It checks only indexed Spellbook combos of 2 to 6 cards without template-gated steps, so it does not show the deck has none (combos one card short are listed separately), and it says nothing about the deck's other synergies.");
      lines.push(...plan.combos.map((c) => `- ${c.pieces.join(" + ")} -> ${c.produces.join(", ")}${c.manaNeeded === null ? "" : `, mana needed ${c.manaNeeded}`}${c.usesCommander ? ", uses the commander" : ""}`));
    }
    if ((plan.combos?.length ?? 0) >= MAX_COMBO_FACTS || (plan.nearCombos?.length ?? 0) >= MAX_NEAR_COMBO_FACTS) {
      lines.push("These combo lists are capped and may omit combos, so never cite combo state none.");
    }
    if (plan.nearCombos !== null && plan.nearCombos.length > 0) {
      lines.push("Combos one card short:", ...plan.nearCombos.map((n) => `- has ${n.have}, lacks ${n.missing} -> ${n.produces.join(", ")}`));
    }
    if (plan.colourNeeds.length > 0) {
      lines.push(`Nonland cards by the colour their cost needs: ${plan.colourNeeds.map((n) => `${n.colour} ${n.cards}`).join(", ")}.`);
    }
    if (plan.basics.length > 0) lines.push(`Basic lands: ${plan.basics.map((b) => `${b.type} ${b.count}`).join(", ")}.`);
  }
  lines.push("", "Context only, never a reason alone. Roles, have of target:", ...pack.roles.map((r) => `- ${r.role}: ${r.have} of ${r.target}`));
  if (pack.curve) lines.push("", "Curve by mana value, this deck against the commander's average:", ...pack.curve.map((b) => `- cmc ${bucket(b.cmc)}: have ${b.have}, average ${b.average}`));
  if (pack.brackets.length > 0) {
    lines.push("", "Bracket flags in the deck:", ...pack.brackets.map((b) => `- ${flagLabel(b.flag)}: ${b.cards.join(", ")}`));
  }
  lines.push("", pack.keyCards.length > 0 ? `Key cards, never to be cut: ${pack.keyCards.join(", ")}.` : "No Key cards.");
  lines.push("", pack.intent ? pack.intent.block : "What the deck is for: no stated intent.");
  lines.push("", "Cards you may cut, in alphabetical order:", ...pack.cards.map(cardLine));
  return { system, user: lines.join("\n") };
}
