import { classifyEngine, type CommanderEngine } from "../recs/engine";
import { synergyStateFrom, type SynergyState } from "../recs/synergy-state";
import { frontFaceName } from "../recs/faces";
import type { EdhrecFetchResult } from "./client";
import type { EdhrecTag } from "./parse";

export type IndexCommander = { oracleId: string; name: string; oracleText: string | null };

export type SupportHeader = {
  commanderOracleId: string;
  synergyState: SynergyState;
  edhrecTotal: number | null;
  tags: EdhrecTag[];
  bracketCounts: Record<string, number>;
  budgetCounts: Record<string, number>;
  similarOracleIds: string[];
  deckCount: number | null;
  rank: number | null;
  saltScore: number | null;
  engine: CommanderEngine | null;
};

export type SupportCard = {
  commanderOracleId: string;
  oracleId: string;
  inclusion: number | null;
  synergy: number | null;
};

/**
 * name -> oracle_id, resolved ONCE at index build rather than on every read.
 *
 * Indexes the full lowercased name AND the front face, because EDHREC lists
 * double-faced cards by front face while Scryfall names them "Front // Back".
 * score.ts:96-102 does the same thing for the live path; this is that rule
 * applied to the offline one.
 *
 * The full name always wins over a derived front-face key: "Bala Ged Recovery"
 * is a real single-faced card in some printings and the front face of a DFC in
 * others, and the real card is the right answer.
 */
export function buildNameIndex(cards: { oracleId: string; name: string }[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const c of cards) {
    const front = frontFaceName(c.name).toLowerCase();
    if (!index.has(front)) index.set(front, c.oracleId);
  }
  for (const c of cards) index.set(c.name.toLowerCase(), c.oracleId);
  return index;
}

/**
 * One commander's fetch result -> the rows the index stores.
 *
 * Derives synergyState via synergyStateFrom rather than testing an HTTP status,
 * which is what keeps the index's notion of absent/degraded identical to the
 * live path's.
 */
export function toSupportRows(args: {
  commander: IndexCommander;
  result: EdhrecFetchResult;
  nameIndex: Map<string, string>;
}): { header: SupportHeader; cards: SupportCard[]; unresolved: number } {
  const { commander, result, nameIndex } = args;
  const state = synergyStateFrom(result);
  const d = result.data;

  const header: SupportHeader = {
    commanderOracleId: commander.oracleId,
    synergyState: state,
    // Null unless "ok" — the check constraint enforces this pairing, and a 0
    // here would claim "EDHREC lists nothing for this commander" when the truth
    // is "we did not reach EDHREC".
    edhrecTotal: state === "ok" ? d!.topCards.length : null,
    tags: d?.tags ?? [],
    bracketCounts: d?.bracketCounts ?? {},
    budgetCounts: d?.budgetCounts ?? {},
    similarOracleIds: (d?.similarNames ?? [])
      .map((n) => nameIndex.get(n.toLowerCase()))
      .filter((id): id is string => id !== undefined),
    deckCount: d?.deckCount ?? null,
    rank: d?.rank ?? null,
    saltScore: d?.saltScore ?? null,
    engine: classifyEngine(commander),
  };

  if (state !== "ok") return { header, cards: [], unresolved: 0 };

  const cards: SupportCard[] = [];
  const emitted = new Set<string>();
  let unresolved = 0;
  for (const name of d!.topCards) {
    const key = name.toLowerCase();
    const oracleId = nameIndex.get(key);
    // Unresolvable names are dropped from the child table but stay counted in
    // edhrecTotal, so a missing name reduces measured overlap rather than
    // silently shrinking the denominator and inflating every user's completeness.
    if (oracleId === undefined) { unresolved++; continue; }
    if (oracleId === commander.oracleId) continue;
    // buildNameIndex maps both "Front // Back" and "Front" to one oracle id, so
    // a list carrying both forms would otherwise emit two rows sharing the
    // composite primary key and fail the whole insert for that commander.
    if (emitted.has(oracleId)) continue;
    emitted.add(oracleId);
    cards.push({
      commanderOracleId: commander.oracleId,
      oracleId,
      inclusion: d!.inclusionByName[key] ?? null,
      synergy: d!.synergyByName[key] ?? null,
    });
  }
  return { header, cards, unresolved };
}
