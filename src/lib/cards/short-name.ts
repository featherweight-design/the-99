/**
 * Client-safe on purpose. This lived in `lib/prose/prompt.ts`, which imports
 * `node:crypto` — so the deck spine importing it from a client component pulled
 * a server-only dependency into the browser bundle.
 */
/**
 * The name players use for a commander: everything before the epithet, and the front face
 * of a split card.
 *
 * The subject has to be short because the front-loading rule spends the opening of the
 * sentence on it. "Uvilda, Dean of Perfection // Nassari, Dean of Expression" is 56
 * characters — one more than the whole claim budget — so a prompt that asks for the printed
 * name back is asking for a sentence the contract cannot accept.
 */
export function shortName(commanderName: string): string {
  const full = commanderName.replace(/\s+/g, " ").trim();
  const short = full.split(" // ")[0].split(",")[0].trim();
  return short.length > 0 ? short : full;
}

