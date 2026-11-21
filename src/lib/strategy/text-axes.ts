// The fixed axes read off a card's rules text rather than its type line: a mechanic a deck is built around that the label
// themes have no word for. No model call and no label, so no prompt version moves: the rule is a regex over the front
// face, measured on staging before it shipped (docs/agents/strategy.md, Text axes).
import { frontFaceOracle } from "@/lib/recs/faces";

export const TEXT_AXES = ["storm", "monarch", "extraTurns", "extraCombats", "minusCounters", "burn"] as const;
export type TextAxis = (typeof TEXT_AXES)[number];

/** Reminder text is the rules restating themselves, never an ability (the same strip `recs/themes.ts` reads through). */
const stripReminders = (text: string) => text.replace(/\([^)]*\)/g, "");

/** An opponent, or the player a spell targets, who takes the turn: a card that hands another player a turn is no plan. */
const GIVES_A_TURN_AWAY = /(opponent|that player) takes an extra turn/;

/**
 * Damage aimed at a player: a number, X or "that much" dealt to an opponent or a player. "Any target" is generic removal
 * (every red deck plays it) and damage to a creature alone is removal too, so both stay out.
 */
const BURN = /deals? (\d+|x|that much) damage to (each opponent|each other player|each player|target opponent|target player)/;

const RULES: readonly [TextAxis, (text: string, keywords: readonly string[]) => boolean][] = [
  ["storm", (t, k) => k.some((w) => w.toLowerCase() === "storm") || /storm count/.test(t)],
  ["monarch", (t) => /becomes? the monarch|you(?:'|’)re the monarch|you are the monarch|is the monarch/.test(t)],
  ["extraTurns", (t) => /extra turn/.test(t) && !GIVES_A_TURN_AWAY.test(t)],
  ["extraCombats", (t) => /additional combat phase/.test(t)],
  ["minusCounters", (t) => /\b(?:puts?|with|distribute) [^.]*-1\/-1 counter/.test(t)],
  ["burn", (t) => BURN.test(t)],
];

/** The text axes one card counts toward, read off the lowercased front face with its reminder text stripped. */
export function textAxesOf(oracleText: string | null | undefined, keywords: readonly string[]): TextAxis[] {
  const text = stripReminders(frontFaceOracle(oracleText ?? null)).toLowerCase();
  return RULES.filter(([, test]) => test(text, keywords)).map(([axis]) => axis);
}
