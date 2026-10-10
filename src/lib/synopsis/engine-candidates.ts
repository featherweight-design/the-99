import type { FactCard } from "./facts";

/**
 * The deck cards most likely to be what the commander's ability runs on (plan
 * 2026-10-10-overview-accuracy.md, section 3.3). Pure, and computed from the oracle text alone: a
 * label would sharpen it, and the code path must work with none.
 *
 * A TERM is a word of the commander's rules text or type line. A card shares a term when the word
 * appears in its own rules text or type line (plural folded). A term every card carries says
 * nothing, and a term only the commander carries links nothing, so only terms found on at least
 * one other card and at most `MAX_SHARE` of the deck's other cards count (the commander and a single partner are a pair), and each shared term is worth
 * the inverse of how many cards share it: a rare shared word ("necron", "graveyard") outweighs a
 * common one ("creature"). The list is a starting point for the model's choice, never a verdict.
 */
export const ENGINE_CANDIDATES_MAX = 12;
const MAX_SHARE = 0.4;

/** Words of rules text that say how a card plays, not what it is about. */
const STOP = new Set([
  "about", "activate", "activated", "after", "again", "also", "among", "another", "any", "attacking", "base", "battlefield",
  "become", "becomes", "before", "being", "block", "both", "cast", "chosen", "control", "controls", "converted", "could",
  "count", "deal", "deals", "does", "each", "else", "enter", "enters", "equal", "exile", "exiled", "face", "first", "from",
  "gain", "game", "gets", "give", "gives", "have", "has", "into", "instead", "just", "keep", "less", "life", "like", "long",
  "loses", "lose", "make", "many", "mana", "more", "most", "much", "must", "name", "next", "once", "only", "onto", "opponent",
  "opponents", "other", "others", "otherwise", "owner", "pay", "player", "players", "power", "put", "puts", "rather", "remains",
  "return", "same", "search", "see", "that", "their", "them", "then", "there", "these", "they", "this", "those", "three", "time",
  "times", "toughness", "turn", "turns", "under", "until", "upkeep", "used", "using", "value", "were", "when", "whenever", "where",
  "which", "while", "with", "without", "would", "your", "yours", "you", "card", "cards", "spell", "spells", "ability", "abilities",
  "target", "targets", "number", "end", "step", "phase", "top", "bottom", "library", "hand", "may", "can", "its", "the", "and", "for",
]);

function words(text: string): Set<string> {
  const out = new Set<string>();
  for (const w of text.toLowerCase().replace(/\{[^}]*\}/g, " ").match(/[a-z][a-z'-]{2,}/g) ?? []) {
    const stem = w.length > 4 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w;
    if (!STOP.has(w) && !STOP.has(stem)) out.add(stem);
  }
  return out;
}

export type EngineCandidate = { name: string; shared: string[] };

export function engineCandidates(cards: readonly FactCard[], commanders: readonly string[]): EngineCandidate[] {
  const isCommander = (c: FactCard) => commanders.includes(c.name);
  const lead = cards.filter(isCommander);
  if (lead.length === 0) return [];

  const terms = new Set<string>();
  for (const c of lead) for (const w of words(`${c.typeLine} ${c.oracleText ?? ""}`)) terms.add(w);

  const pool = cards.filter((c) => !isCommander(c) && !c.universalStaple && !/basic land/i.test(c.typeLine));
  const bag = new Map(pool.map((c) => [c, words(`${c.typeLine} ${c.oracleText ?? ""}`)]));
  const df = new Map<string, number>();
  for (const t of terms) df.set(t, [...bag.values()].filter((b) => b.has(t)).length);
  const usable = [...terms].filter((t) => (df.get(t) ?? 0) >= 1 && (df.get(t) ?? 0) <= MAX_SHARE * pool.length);

  return pool
    .map((c) => {
      const shared = usable.filter((t) => bag.get(c)!.has(t)).sort((a, b) => df.get(a)! - df.get(b)! || a.localeCompare(b));
      return { name: c.name, shared, score: shared.reduce((n, t) => n + 1 / df.get(t)!, 0) };
    })
    .filter((c) => c.shared.length > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, ENGINE_CANDIDATES_MAX)
    .map(({ name, shared }) => ({ name, shared: shared.slice(0, 3) }));
}
