import { deckCutsCopy } from "../copy/deck-cuts";
import { PLAYER_TEXT_SYSTEM_RULE } from "../model/player-text";
import type { CutsPack, CutsPackCard } from "./cuts-evidence";

/** Its own version, apart from Suggested changes' `PROMPT_VERSION`. */
export const CUTS_PROMPT_VERSION = 1;

const flagLabel = (f: keyof typeof deckCutsCopy.flags) => deckCutsCopy.flags[f];

function cardLine(c: CutsPackCard): string {
  const parts = [c.quantity > 1 ? `${c.name} x${c.quantity}` : c.name, `${c.typeLine}, mv ${c.mv}`];
  if (c.text) parts.push(`text: ${c.text.replace(/\s*\n\s*/g, " / ")}`);
  parts.push(`roles: ${c.roles.length > 0 ? c.roles.join(", ") : "none"}`);
  if (c.inclusion === "offList") parts.push("not on the commander's EDHREC list");
  else if (c.inclusion) parts.push(`inclusion ${c.inclusion.pct}`);
  if (c.roleSurplus) parts.push(`role surplus: ${c.roleSurplus.role} ${c.roleSurplus.have} of ${c.roleSurplus.target}`);
  if (c.opensGap) parts.push(`cutting it leaves ${c.opensGap} at or under target`);
  if (c.curve) parts.push(`curve: cmc ${c.curve.cmc} have ${c.curve.have}, average ${c.curve.average}`);
  if (c.flags) parts.push(`flags: ${c.flags.map(flagLabel).join(", ")}`);
  return `- ${parts.join(" | ")}`;
}

/** The pack as the two messages a cuts run sends. No ownership, no price, no ranking, no score. */
export function buildCutsPrompt(pack: CutsPack): { system: string; user: string } {
  const { prompt, rules } = deckCutsCopy;
  const system = [
    prompt.task(pack.over),
    prompt.count(pack.over),
    prompt.cites,
    prompt.reasonLength,
    ...Object.values(rules).map((r) => `- ${r}`),
    PLAYER_TEXT_SYSTEM_RULE,
  ].join("\n");

  const lines = [`Commander: ${pack.commander}`, `Cards over 100: ${pack.over}`];
  if (pack.support) {
    lines.push(`EDHREC list: ${pack.support.listed} cards${pack.support.deckCount === null ? "" : `, from ${pack.support.deckCount} decks`}. Inclusion is the percent of those decks running the card.`);
  }
  for (const m of pack.missing) lines.push(deckCutsCopy.missing[m]);
  lines.push("", "Roles, have of target:", ...pack.roles.map((r) => `- ${r.role}: ${r.have} of ${r.target}`));
  if (pack.curve) lines.push("", "Curve by mana value, this deck against the commander's average:", ...pack.curve.map((b) => `- cmc ${b.cmc}: have ${b.have}, average ${b.average}`));
  if (pack.brackets.length > 0) {
    lines.push("", "Bracket flags in the deck:", ...pack.brackets.map((b) => `- ${flagLabel(b.flag)}: ${b.cards.join(", ")}`));
  }
  lines.push("", pack.keyCards.length > 0 ? `Key cards, never to be cut: ${pack.keyCards.join(", ")}.` : "No Key cards.");
  lines.push("", pack.intent ? pack.intent.block : "What the deck is for: no stated intent.");
  lines.push("", "Cards you may cut, in alphabetical order:", ...pack.cards.map(cardLine));
  return { system, user: lines.join("\n") };
}
