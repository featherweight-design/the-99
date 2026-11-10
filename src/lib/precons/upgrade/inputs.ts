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

export type DeckLine = {
  oracleId: string; name: string; manaCost: string | null; typeLine: string; oracleText: string | null; keywords: readonly string[];
  cmc: number; commanderLegal: boolean; quantity: number; isCommander: boolean;
};
export type PoolRow = { oracleId: string; name: string; manaCost: string | null; typeLine: string; oracleText: string | null; keywords: readonly string[]; inclusion: number | null };

const BASIC = /\bBasic\b/;
const roles = (c: { typeLine: string; oracleText: string | null; keywords: readonly string[] }) =>
  classifyRoles({ typeLine: c.typeLine, oracleText: c.oracleText, keywords: [...c.keywords] }).join(", ");
const oracle = (t: string | null) => (t ?? "").replace(/\s+/g, " ").trim();

/**
 * A precon's rows are one per (card, printing, commander), so one oracle id can arrive on several rows (the basics in several
 * arts). They are merged here, quantities summed, so every reader below sees one line per card.
 */
export function mergeLines(lines: readonly DeckLine[]): DeckLine[] {
  const by = new Map<string, DeckLine>();
  for (const l of lines) {
    const seen = by.get(l.oracleId);
    by.set(l.oracleId, seen ? { ...seen, quantity: seen.quantity + l.quantity, isCommander: seen.isCommander || l.isCommander } : { ...l });
  }
  return [...by.values()];
}

/** The deck as the detector, the prompt and the validator each read it. `cents` is the catalog's cheapest price by oracle id. */
export function assembleDeck(lines: readonly DeckLine[], cents: ReadonlyMap<string, number | null>): {
  facts: DeckCardFact[]; prompt: PromptCard[]; entries: DeckEntry[]; cards: { oracleId: string; quantity: number; isCommander: boolean }[];
} {
  return {
    cards: lines.map((l) => ({ oracleId: l.oracleId, quantity: l.quantity, isCommander: l.isCommander })),
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
 * The direction the stored Overview already names, as a plan for the detector: its strategy lines (Early, Mid, Close) taken as
 * one plan, backed by the cards its lines name and its evidence cites. No model call: this reads what is stored. Its alternate
 * line is NOT a direction (orchestrator, 2026-11-10: Hugh's ruling is the strategies in the deck, and another commander is a
 * different axis, not a tilt of this list). An Overview with no strategy yields nothing.
 */
export function overviewPlans(content: Pick<CheckedSynopsis, "primer" | "evidence" | "cards"> | null): OverviewPlan[] {
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
  return out;
}

/** The lowest bracket a verdict permits: "the slot is the lowest satisfied bracket" (`slotDeck`). */
export function lowestBracket(permits: readonly number[]): number | null {
  return permits.length === 0 ? null : Math.min(...permits);
}

/** One way to lead the box: its face commander(s), or a single alternate. The strategies are offered per option. */
export type CommanderOption = {
  /** The commanders' oracle ids joined with `+`: what the client sends back to pick this option. */
  key: string;
  isFace: boolean;
  commanderIds: string[];
  cards: { oracleId: string; name: string; manaCost: string | null; cmc: number; typeLine: string }[];
  /** The index's stored prose for the commander (what it pushes), null when it has none. Never a model call. */
  line: string | null;
  tags: EdhrecTag[];
};

const canLead = (l: DeckLine) => l.commanderLegal && (/\bLegendary\b[^—]*\bCreature\b/.test(l.typeLine) || /can be your commander/i.test(l.oracleText ?? ""));

/**
 * The alternate commander a box offers: the Commander-legal card in the 99 that the Overview's alternate line names in a
 * `[[Name]]` mark. Only for a box with ONE face commander: a partnered box keeps both and never offers to swap one out (the
 * data does not say which partner an alternate would replace). Null when there is none.
 */
export function alternateCommander(content: Pick<CheckedSynopsis, "alternate" | "cards"> | null, lines: readonly DeckLine[]): DeckLine | null {
  if (!content?.alternate || lines.filter((l) => l.isCommander).length !== 1) return null;
  // In the order the line names them: the first leader it names is the alternate.
  for (const id of named(content, content.alternate)) {
    const l = lines.find((x) => x.oracleId === id);
    if (l && !l.isCommander && canLead(l)) return l;
  }
  return null;
}

/** The lines with exactly these cards as the commanders: a face commander that is not chosen becomes one of the 99. */
export function withCommanders(lines: readonly DeckLine[], commanderIds: readonly string[]): DeckLine[] {
  const lead = new Set(commanderIds);
  return lines.map((l) => ({ ...l, isCommander: lead.has(l.oracleId) }));
}

/** An option for a set of lead cards, with the index's tags and prose for them (a pair's tags are summed, its prose is the first one). */
export function optionFor(lines: readonly DeckLine[], commanderIds: readonly string[], isFace: boolean, meta: ReadonlyMap<string, { prose: string | null; tags: readonly EdhrecTag[] }>): CommanderOption {
  const cards = commanderIds.map((id) => lines.find((l) => l.oracleId === id)!).map((l) => ({ oracleId: l.oracleId, name: l.name, manaCost: l.manaCost, cmc: l.cmc, typeLine: l.typeLine }));
  return {
    key: commanderIds.join("+"), isFace, commanderIds: [...commanderIds], cards,
    line: commanderIds.map((id) => meta.get(id)?.prose ?? null).find((p) => p !== null) ?? null,
    tags: mergeTags(commanderIds.map((id) => meta.get(id)?.tags ?? [])),
  };
}
