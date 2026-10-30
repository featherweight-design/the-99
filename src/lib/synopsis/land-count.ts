/**
 * The land count a line states, pure and dependency free so the browser can read it (the Overview
 * modal's figure tile parses the stored land line with it) without pulling in the stages checks.
 * Moved out of `stages.ts`, which re-exports it unchanged.
 */

export const LAND_COUNT_WORDS: Record<string, number> = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 };
/**
 * The hand land counts a line states ("Keep 4 lands", "four lands", "a four-land hand", "3 or 4
 * lands"), outside card marks. A deck-total phrase, which the prompt hands the land line as a reason,
 * is told apart by its WORDS, never by its number (a deck's total may equal the hand count): "on 37
 * lands", "plays (only) 37 lands", "runs 37 lands", "its 37 lands", "37 lands in the deck", "with 37
 * lands" (unless a hand comes just before: "a hand with 3 lands" is a hand count), "a 37-land deck". "3 of its
 * 37 lands" states 3.
 */
export function statedLandNumbers(text: string): number[] {
  const bare = text.replace(/\[\[[^\[\]]+\]\]/g, " ");
  const W = `(\\d+|${Object.keys(LAND_COUNT_WORDS).join("|")})`;
  const out: number[] = [];
  const val = (x: string) => (/^\d+$/.test(x) ? Number(x) : LAND_COUNT_WORDS[x.toLowerCase()]!);
  const ofTotal = new RegExp(`\\b${W}\\s+of\\s+(?:its|the(?:\\s+deck's)?|your|this\\s+deck's)\\s+\\d+\\s+lands\\b`, "gi");
  for (const m of bare.matchAll(ofTotal)) out.push(val(m[1]));
  const re = new RegExp(`\\b${W}(?:(?:\\s*[-\u2013\u2014]\\s*|\\s+(?:to|or)\\s+)${W})?(?:\\s+|-)(?:or\\s+(?:more|fewer|less)\\s+)?lands?\\b`, "gi");
  for (const m of bare.matchAll(re)) {
    if (isDeckTotal(bare.slice(0, m.index), bare.slice(m.index + m[0].length))) continue;
    for (const x of [m[1], m[2]]) if (x !== undefined) out.push(val(x));
  }
  return out;
}

/** Words before a land count that make it the deck's total: "on", "plays (only)", "runs", "its", "of the", "the deck's". */
const TOTAL_BEFORE = /\b(?:on|plays?|playing|runs?|running|its|of\s+(?:the|your)|the\s+deck's|this\s+deck's)(?:\s+(?:only|just))?\s+$/i;
/** "with" before a land count, which is the deck's total unless a hand comes just before it. */
const WITH_BEFORE = /\bwith\s+(?:only\s+|just\s+)?$/i;
const HAND_WITH_BEFORE = /\b(?:hand|seven|opener|opening\s+\w+)\s+with\s+(?:only\s+|just\s+)?$/i;
/** Words after a land count that make it the deck's total: "in the deck", "in the list", "in the 99", and "deck" itself ("a 40-land deck"). */
const TOTAL_AFTER = /^(?:\s+in\s+(?:the|this|your)\s+(?:deck|list|99|library)|\s+(?:deck|list|build))\b/i;

function isDeckTotal(before: string, after: string): boolean {
  if (TOTAL_AFTER.test(after) || TOTAL_BEFORE.test(before)) return true;
  return WITH_BEFORE.test(before) && !HAND_WITH_BEFORE.test(before);
}
