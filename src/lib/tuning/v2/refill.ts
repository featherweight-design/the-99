import { deckTuningCopy } from "../../copy/deck-tuning";
import type { Drop } from "../validate";

/**
 * Suggested changes v2's refill rule (spec 2026-10-27 §5.1, arm C). Pure. A list kept short of its target after the first
 * ask gets ONE more call, told what was kept and what was rejected and why, in each rule's own words, and asked for
 * exactly the shortfall. A list is never refilled twice.
 */
export function refillShortfall(kept: number, target: number, refilled: boolean): number {
  return refilled ? 0 : Math.max(0, target - kept);
}

/** A hard filter's reason, in words the model can act on. Written for the MODEL, not the player (never shown). */
const REASON: Partial<Record<Drop["rule"], string>> = {
  cardExists: "no card has that exact name",
  duplicate: "it was named twice",
  cutInDeck: "it is not in the deck",
  commander: "it is the commander",
  neverCut: "the player locked it",
  keyCard: "it is a key card of the deck's strategy",
  universalStaple: "a staple is not cut only to fix a role count",
  colourIdentity: "it is outside the commander's colors",
  addNotLegal: "it is not legal in Commander, or the deck already holds it",
  overCap: "it is over the price limit",
  offSet: "it is from a set the player excluded",
  notOwned: "the player does not own it",
  bracketAim: "it would move the deck away from the bracket the player chose",
};

/** Why a line was rejected: a hard filter's own reason, else the writing rule's own text (`suggestionRules`). */
export function reasonFor(drop: Pick<Drop, "rule" | "cite">): string {
  if (drop.rule === "citation") return `its ${drop.cite?.kind ?? ""} citation is not supported by the evidence`.replace("  ", " ");
  const hard = REASON[drop.rule];
  if (hard) return hard;
  const rules = deckTuningCopy.suggestionRules as Record<string, string>;
  return Object.hasOwn(rules, drop.rule) ? `it broke the rule: ${rules[drop.rule]}` : "its wording broke a writing rule";
}
