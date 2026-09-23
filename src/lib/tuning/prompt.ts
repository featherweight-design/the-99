import { axisCopy } from "../copy/game-log";
import type { GameAxisKey } from "../decks/game-axes";
import { deckTuningCopy } from "../copy/deck-tuning";
import type { EvidencePack } from "./evidence";
import { MAX_SUGGESTIONS } from "./limits";

/**
 * The evidence pack, rendered as the two messages a tuning run sends. Pure string work.
 *
 * The SYSTEM message carries the nine `suggestionRules` verbatim — they are the model's
 * instructions and the validator's checklist, one text, so the two cannot drift.
 *
 * The USER message renders what the pack holds, with three deliberate absences:
 *  - OWNERSHIP AND PRICE are not rendered. `suggestionRules.ownershipNotRanking`: they may not
 *    affect which cards are suggested or their order, and a model cannot be swayed by a fact it
 *    was never shown. The card states ownership afterwards, from the database.
 *  - NO BRACKET FIGURE. The app flags a swap that moves the bracket itself, through `slotDeck`.
 *  - NO NET and NO PROPORTION: the pack has already dropped both.
 * And one deliberate presence: at zero games the message SAYS no games are logged, rather than
 * rendering an empty summary a model might read as "0 of 0".
 */
export function buildPrompt(pack: EvidencePack): { system: string; user: string } {
  return { system: SYSTEM, user: renderPack(pack) };
}

const SYSTEM = [
  "You suggest changes to a Magic: The Gathering Commander deck, for the player who built it.",
  `Propose at most ${MAX_SUGGESTIONS} swaps. Each swap cuts exactly one card from the deck and adds exactly one card. Fewer is better than padding: one swap you can back beats three you cannot, and an empty list is an acceptable answer.`,
  "Ground every swap in the evidence you are given: the player's games and notes, the decklist and its targets, and what the player says the deck is for. Cite what you used.",
  "Name cards exactly as the decklist and the staples list spell them. Never suggest cutting a card marked as a commander.",
  "Rules. A suggestion that breaks any of these is discarded before the player sees it:",
  ...Object.values(deckTuningCopy.suggestionRules).map((rule) => `- ${rule}`),
  "Write the rationale in plain words for the player. rationaleShort is the same point in at most 80 characters.",
].join("\n");

function renderPack(pack: EvidencePack): string {
  const lines: string[] = [];

  lines.push(`Commander: ${pack.commanders.map((c) => c.name).join(" and ")}`);
  lines.push(`Colour identity: ${pack.colorIdentity.length > 0 ? pack.colorIdentity.join("") : "colourless"}`);

  lines.push("", pack.intent === null
    ? "What the deck is for: no stated intent."
    : `What the deck is for, in the player's words: "${pack.intent}"`);

  lines.push("", "Games:");
  const { summary, games } = pack.play;
  if (summary.count === 0) {
    lines.push("No games logged yet. There is no play evidence: suggest from the decklist and its targets alone, and cite no games.");
  } else {
    const { wins, losses, draws } = summary.record;
    lines.push(`${summary.count} games logged: ${wins} won, ${losses} lost, ${draws} drawn. ${summary.marked} of ${summary.count} carry marks.`);
    for (const axis of summary.axes) {
      lines.push(`- ${axisLabel(axis.key)}: marked as hurting in ${axis.hurt} of ${summary.count} games, as working in ${axis.worked} of ${summary.count} games.`);
    }
    const noted = games.filter((g) => g.note !== null);
    if (noted.length > 0) {
      lines.push("Notes, verbatim, with their dates:");
      for (const g of noted) lines.push(`- ${g.playedAt.slice(0, 10)}: "${g.note}"`);
    }
  }

  lines.push("", "Targets for this commander (have / target):");
  for (const t of pack.targets.roles) {
    const basis = t.measured ? "measured from decklists" : "a common starting point";
    lines.push(`- ${t.role}: ${t.have} of ${t.target}${t.advisory ? ", a range rather than a finish line" : ""} (${basis})`);
  }
  if (pack.targets.thin) lines.push("These targets come from few decks; treat them as a guide.");

  lines.push("", `Decklist (${pack.cards.reduce((n, c) => n + c.quantity, 0)} cards):`);
  for (const c of pack.cards) {
    const tags = [c.commander ? "commander" : null, c.roles.length > 0 ? c.roles.join(", ") : null].filter(Boolean);
    lines.push(`- ${c.quantity > 1 ? `${c.quantity}x ` : ""}${c.name} (${c.typeLine})${tags.length > 0 ? ` [${tags.join("; ")}]` : ""}`);
  }

  lines.push("", "Staples other decks with this commander run, not in this deck (context, not a menu):");
  if (pack.staples.length === 0) lines.push("- none recorded");
  for (const s of pack.staples) lines.push(`- ${s.name}: in ${s.commanders} of ${s.commanderTotal} commanders' decks`);

  return lines.join("\n");
}

function axisLabel(key: string): string {
  return axisCopy[key as GameAxisKey]?.label ?? key;
}
