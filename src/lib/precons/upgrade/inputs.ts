import type { EdhrecTag } from "../../edhrec/parse";
import { classifyRoles } from "../../recs/roles";
import { normalizeName } from "../../synopsis/facts";
import type { CheckedSynopsis } from "../../synopsis/types";
import type { DeckCardFact, OverviewPlan } from "./detect";
import { poolForPrompt, type PoolCard, type PromptCard } from "./prompt";
import type { DeckEntry, PoolEntry } from "./validate";

/**
 * Upgrade this precon's inputs, assembled from rows already read (`load.ts` reads them). Pure: no database, no clock.
 * Everything the prompt and the validator need comes from one source here, so the pool the model is shown and the pool the
 * answer is checked against are the same list.
 */

export type DeckLine = { oracleId: string; name: string; manaCost: string | null; typeLine: string; oracleText: string | null; keywords: readonly string[]; quantity: number; isCommander: boolean };
export type PoolRow = { oracleId: string; name: string; manaCost: string | null; typeLine: string; oracleText: string | null; keywords: readonly string[]; inclusion: number | null };

const BASIC = /\bBasic\b/;
const roles = (c: { typeLine: string; oracleText: string | null; keywords: readonly string[] }) =>
  classifyRoles({ typeLine: c.typeLine, oracleText: c.oracleText, keywords: [...c.keywords] }).join(", ");
const oracle = (t: string | null) => (t ?? "").replace(/\s+/g, " ").trim();

/** The deck as the detector, the prompt and the validator each read it. `cents` is the catalog's cheapest price by oracle id. */
export function assembleDeck(lines: readonly DeckLine[], cents: ReadonlyMap<string, number | null>): {
  facts: DeckCardFact[]; prompt: PromptCard[]; entries: DeckEntry[];
} {
  return {
    facts: lines.map((l) => ({ oracleId: l.oracleId, name: l.name, typeLine: l.typeLine, oracleText: l.oracleText, isCommander: l.isCommander })),
    prompt: lines.map((l) => ({
      name: l.name, manaCost: l.manaCost, typeLine: l.typeLine, roles: roles(l), cents: cents.get(l.oracleId) ?? null, oracle: oracle(l.oracleText),
      isCommander: l.isCommander, basic: BASIC.test(l.typeLine), qty: l.quantity,
    })),
    entries: lines.map((l) => ({ oracleId: l.oracleId, name: l.name, isCommander: l.isCommander, basic: BASIC.test(l.typeLine) })),
  };
}

/** The candidate pool the prompt shows and the validator checks: not in the deck, priced, at or under the cap, most-included first, capped. */
export function assemblePool(rows: readonly PoolRow[], cents: ReadonlyMap<string, number | null>, deckIds: ReadonlySet<string>): { prompt: PoolCard[]; entries: PoolEntry[] } {
  const all: PoolCard[] = rows.map((r) => ({
    oracleId: r.oracleId, name: r.name, manaCost: r.manaCost, typeLine: r.typeLine, roles: roles(r), cents: cents.get(r.oracleId) ?? null,
    inclusion: r.inclusion, oracle: oracle(r.oracleText),
  }));
  const prompt = poolForPrompt(all, deckIds);
  return { prompt, entries: prompt.map((p) => ({ oracleId: p.oracleId, name: p.name, cents: p.cents })) };
}

/** A partnered precon has one `commander_support` row per commander: the tags are summed by slug, most-counted first. */
export function mergeTags(lists: readonly (readonly EdhrecTag[])[]): EdhrecTag[] {
  const by = new Map<string, EdhrecTag>();
  for (const t of lists.flat()) {
    const seen = by.get(t.slug);
    by.set(t.slug, seen ? { ...seen, count: seen.count + t.count } : { ...t });
  }
  return [...by.values()].sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));
}

const MARK = /\[\[([^\]]+)\]\]/g;
const plain = (line: string) => line.replace(MARK, "$1").replace(/\s+/g, " ").trim();

/** The oracle ids a line names in `[[Name]]` marks, by the Overview's own name table. */
function named(content: Pick<CheckedSynopsis, "cards">, line: string): string[] {
  return [...line.matchAll(MARK)].map((m) => content.cards[normalizeName(m[1])]?.oracleId).filter((id): id is string => Boolean(id));
}

/**
 * The directions the stored Overview already names, as plans for the detector: its strategy lines (Early, Mid, Close) taken
 * as one plan, and its alternate line when it has one. Each backs itself with the cards its lines name and its evidence cites.
 * No model call: this reads what is stored. An Overview with no strategy yields nothing.
 */
export function overviewPlans(content: Pick<CheckedSynopsis, "primer" | "alternate" | "evidence" | "cards"> | null): OverviewPlan[] {
  if (!content) return [];
  const out: OverviewPlan[] = [];
  const lines = content.primer?.strategy ?? [];
  if (lines.length > 0) {
    out.push({
      label: "The Overview's plan",
      blurb: lines.map(plain).join(" "),
      cardIds: [...new Set([...(content.evidence?.strategy ?? []).flat(), ...lines.flatMap((l) => named(content, l))])],
    });
  }
  if (content.alternate) {
    out.push({
      label: "The Overview's alternate",
      blurb: plain(content.alternate),
      cardIds: [...new Set([...(content.evidence?.alternate ?? []), ...named(content, content.alternate)])],
    });
  }
  return out;
}

/** The lowest bracket a verdict permits: "the slot is the lowest satisfied bracket" (`slotDeck`). */
export function lowestBracket(permits: readonly number[]): number | null {
  return permits.length === 0 ? null : Math.min(...permits);
}
