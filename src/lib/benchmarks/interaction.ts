import { CHEAP_MANA_VALUE } from "../synopsis/facts-extra";
import { isLand } from "./cards";
import type { BenchCard } from "./types";


export type InteractionKind = "removal" | "wipe" | "counterspell";

export type InteractionLine = {
  card: BenchCard;
  /** 1, plus 1 at instant speed, plus 1 when cheap. */
  weight: number;
  kind: InteractionKind;
  instantSpeed: boolean;
  cheap: boolean;
};

export type Interaction = {
  answers: number;
  weighted: number;
  instantSpeed: number;
  cheap: number;
  /** Both: what can answer a combo on the stack. */
  cheapInstant: number;
  counterspells: number;
  wipes: number;
  lines: InteractionLine[];
};

const INSTANT = /\binstant\b/i;

/** An instant, or a card with flash. */
export function isInstantSpeed(card: Pick<BenchCard, "typeLine" | "keywords">): boolean {
  return INSTANT.test(card.typeLine) || card.keywords.includes("Flash");
}

/**
 * Interaction, the reader the Overview's facts move onto in PR 1b (brief lock 7: one reader per
 * figure); until then `interactionCounts` still counts the Overview's. Instant speed is the keyword
 * Flash, never "flash" in the text, which a card granting flash to others carries too. Removal, board wipes and counterspells, each
 * weighed 1 plus 1 at instant speed plus 1 at mana value 2 or less. A counterspell is interaction
 * and never removal (Hugh, 2026-10-10), so it is its own kind here and in the figure.
 */
export function interaction(cards: readonly BenchCard[]): Interaction {
  const lines: InteractionLine[] = [];
  for (const card of cards) {
    if (isLand(card)) continue;
    const kinds = new Set(card.jobs.filter((j) => j.space === "role").map((j) => j.kind));
    const kind: InteractionKind | null = kinds.has("counterspell") ? "counterspell"
      : kinds.has("wipes") ? "wipe" : kinds.has("removal") ? "removal" : null;
    if (!kind) continue;
    const instantSpeed = isInstantSpeed(card);
    const cheap = card.manaValue <= CHEAP_MANA_VALUE;
    lines.push({ card, kind, instantSpeed, cheap, weight: 1 + Number(instantSpeed) + Number(cheap) });
  }
  lines.sort((a, b) => b.weight - a.weight || a.card.name.localeCompare(b.card.name));
  const count = (f: (l: InteractionLine) => boolean) => lines.reduce((n, l) => n + (f(l) ? l.card.quantity : 0), 0);
  return {
    answers: count(() => true),
    weighted: lines.reduce((s, l) => s + l.weight * l.card.quantity, 0),
    instantSpeed: count((l) => l.instantSpeed),
    cheap: count((l) => l.cheap),
    cheapInstant: count((l) => l.instantSpeed && l.cheap),
    counterspells: count((l) => l.kind === "counterspell"),
    wipes: count((l) => l.kind === "wipe"),
    lines,
  };
}
