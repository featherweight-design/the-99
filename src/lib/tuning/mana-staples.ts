// The mana sources a deck's commander (or its colors) usually runs and this deck does not. A read
// against the already-built commander index; no new table and no model call. Owned copies come first.

import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "../../db";
import { cards, commanderPairSupportCards, commanderSupportCards, formatStaples } from "../../db/schema";
import { loadPrices } from "../discovery/price";
import { loadAvailability } from "../decks/availability-query";
import { loadLandMana } from "../decks/land-mana";
import type { DeckDetail } from "../decks/read";
import { loadSourceMana } from "../decks/source-mana";
import { loadStatsLabels } from "../decks/stats-labels";
import type { ManaColor } from "../mana/supply";
import { classifyRoles } from "../recs/roles";
import { identityCondition } from "../staples/condition";

/** What the number behind a staple means, which differs by where it was read. A commander's own
 *  page is a rate over that commander's decks; the identity bucket is an average across commanders,
 *  and is never labelled as this commander's rate. */
export type StapleFact =
  | { kind: "commander"; inclusion: number | null }
  | { kind: "identity"; condition: string; commanders: number; commanderTotal: number; avgInclusion: number };

export type StapleCandidate = {
  oracleId: string;
  name: string;
  typeLine: string;
  manaCost: string | null;
  /** Colors the card adds, by the Colors card's own source rules. */
  produces: readonly ManaColor[];
  fact: StapleFact;
  /** Copies not spoken for, from this deck's vantage (`loadAvailability`). */
  free: number;
  priceCents: number | null;
};

const strength = (f: StapleFact) => (f.kind === "commander" ? (f.inclusion ?? -1) : f.commanders / Math.max(1, f.commanderTotal));

/** Candidates that add a color in `helps`, owned copies first, then by how often the commander (or
 *  the bucket) runs them, then by name so the order is stable. */
export function rankStaples(candidates: readonly StapleCandidate[], helps: readonly ManaColor[], limit = 5): StapleCandidate[] {
  return candidates
    .filter((c) => c.produces.some((p) => helps.includes(p)))
    .sort((a, b) => Number(b.free > 0) - Number(a.free > 0) || strength(b.fact) - strength(a.fact) || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/** Every candidate the index offers for this deck that the deck does not hold and the colors allow,
 *  with the colors each adds. Empty when the index has nothing for it; null when a text read failed,
 *  which is not the same thing and must not read as an empty index. */
export async function loadManaStaples(deck: DeckDetail, userId: string): Promise<StapleCandidate[] | null> {
  const commanders = [deck.commander, ...(deck.partner ? [deck.partner] : [])];
  const identity = [...new Set(commanders.flatMap((c) => c.colorIdentity))];
  const held = new Set([...deck.cards.map((c) => c.oracleId), ...commanders.map((c) => c.oracleId)]);

  let facts: Map<string, StapleFact>;
  if (deck.partner) {
    const [a, b] = [deck.commander.oracleId, deck.partner.oracleId];
    const rows = await db.select({ oracleId: commanderPairSupportCards.oracleId, inclusion: commanderPairSupportCards.inclusion })
      .from(commanderPairSupportCards)
      .where(or(
        and(eq(commanderPairSupportCards.commanderOracleId, a), eq(commanderPairSupportCards.partnerOracleId, b)),
        and(eq(commanderPairSupportCards.commanderOracleId, b), eq(commanderPairSupportCards.partnerOracleId, a)),
      ));
    facts = new Map(rows.map((r) => [r.oracleId, { kind: "commander", inclusion: r.inclusion }]));
  } else {
    const rows = await db.select({ oracleId: commanderSupportCards.oracleId, inclusion: commanderSupportCards.inclusion })
      .from(commanderSupportCards)
      .where(eq(commanderSupportCards.commanderOracleId, deck.commander.oracleId));
    facts = new Map(rows.map((r) => [r.oracleId, { kind: "commander", inclusion: r.inclusion }]));
  }
  if (facts.size === 0) {
    const condition = identityCondition(identity);
    const rows = await db.select().from(formatStaples).where(eq(formatStaples.condition, condition));
    facts = new Map(rows.map((r) => [r.oracleId, { kind: "identity", condition, commanders: r.commanders, commanderTotal: r.commanderTotal, avgInclusion: r.avgInclusion }]));
  }
  const ids = [...facts.keys()].filter((id) => !held.has(id));
  if (ids.length === 0) return [];

  const rows = await db
    .select({ oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine, manaCost: cards.manaCost, oracleText: cards.oracleText, keywords: cards.keywords, layout: cards.layout, colorIdentity: cards.colorIdentity })
    .from(cards)
    .where(inArray(cards.oracleId, ids));
  // Inside the commander's identity, and never a basic: the rebalance suggestion owns the basics.
  const pool = rows.filter((r) => !/\bbasic\b/i.test(r.typeLine) && r.colorIdentity.every((c) => identity.includes(c)));
  const labels = await loadStatsLabels(pool);
  const [lands, sources] = await Promise.all([
    loadLandMana(pool, identity),
    loadSourceMana(pool.map((r) => ({ oracleId: r.oracleId, typeLine: r.typeLine, role: classifyRoles(r).includes("ramp") ? "ramp" : null })), identity, labels),
  ]);
  if (!lands || !sources) return null;
  const [availability, prices] = await Promise.all([
    loadAvailability(userId, { oracleIds: pool.map((r) => r.oracleId), excludeDeckId: deck.id }),
    loadPrices(pool.map((r) => r.oracleId)),
  ]);
  return pool.flatMap((r): StapleCandidate[] => {
    const produces = lands[r.oracleId] ?? sources[r.oracleId] ?? [];
    const fact = facts.get(r.oracleId);
    if (produces.length === 0 || !fact) return [];
    return [{
      oracleId: r.oracleId,
      name: r.name,
      typeLine: r.typeLine,
      manaCost: r.manaCost,
      produces,
      fact,
      free: availability.get(r.oracleId)?.free ?? 0,
      priceCents: prices.get(r.oracleId)?.liveCents ?? null,
    }];
  });
}
