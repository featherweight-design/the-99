import { bestPartnerPerCard, loadInDeckPartners, type ComboPartner, type PairRow } from "../../combos/near-miss";
import type { StoredPair, SwapCombo, UpgradePair } from "./validate";

/**
 * Each swap's two-card combo partner (A3 G20), computed at finish with no model call and stored on the run's pairs. SERVER-ONLY:
 * the read goes through `loadInDeckPartners`; `keepFor` is the pure rule it filters by.
 *
 * The deck row's rule (`inDeckPairsQuery` + `bestPartnerPerCard`, partner in this deck), applied to the deck as it would stand
 * after the swaps:
 * - an add that combos with another add, or with a card that stays, is marked;
 * - a cut whose partner was in the list and stays is marked (cutting it breaks the combo);
 * - a cut is not marked by a partner that is itself cut (ruled), nor by one of this run's adds: the deck never had that combo.
 * The filter runs BEFORE the fold, so a cut whose most popular partner is cut but a second one stays is marked with the one that stays.
 */

/** The list the swaps run over: the commander(s) apart, and every card with its quantity (the commanders flagged `isCommander`). */
export type PartnerList = { commanderIds: readonly string[]; cards: readonly { oracleId: string; quantity: number; isCommander: boolean }[] };

/**
 * The 99 after the swaps, as `profileOf` applies them (`swapped`: a cut takes ONE copy, so a card held twice still stays), the
 * cuts, the adds, and the commanders.
 */
export function swapSides(list: PartnerList, pairs: readonly UpgradePair[]) {
  const cuts = new Set(pairs.map((p) => p.cutId));
  const adds = new Set(pairs.map((p) => p.addId));
  const held = new Map<string, number>();
  for (const c of list.cards) if (!c.isCommander) held.set(c.oracleId, (held.get(c.oracleId) ?? 0) + c.quantity);
  for (const p of pairs) held.set(p.cutId, (held.get(p.cutId) ?? 0) - 1);
  const after = new Set([...held].filter(([, n]) => n > 0).map(([id]) => id));
  for (const id of adds) after.add(id);
  return { cuts, adds, after, commanders: [...list.commanderIds] };
}

/** Which in-deck rows may name a partner for this run's swaps. */
export function keepFor(list: PartnerList, pairs: readonly UpgradePair[]): (row: PairRow) => boolean {
  const { cuts, adds, after, commanders } = swapSides(list, pairs);
  const stays = new Set([...after, ...commanders]);
  return (r) => {
    if (!stays.has(r.missing_id)) return false;
    if (adds.has(r.present_id)) return true;
    // A cut's partner must have been in the deck: one of this run's adds would claim a combo the deck never had.
    return cuts.has(r.present_id) && !adds.has(r.missing_id);
  };
}

const combo = (hit: ComboPartner | undefined): SwapCombo | null =>
  hit ? { oracleId: hit.partnerOracleId, name: hit.partnerName, ...(hit.otherPartners ? { otherPartners: hit.otherPartners } : {}) } : null;

/** The pairs with their partners. Null on a side means looked and found none. */
export function withPartners(pairs: readonly UpgradePair[], best: ReadonlyMap<string, ComboPartner>): StoredPair[] {
  return pairs.map((p) => ({ ...p, cutCombo: combo(best.get(p.cutId)), addCombo: combo(best.get(p.addId)) }));
}

/** The pure rule over rows already read: `keepFor`, then the fold. */
export function partnersFromRows(rows: readonly PairRow[], list: PartnerList, pairs: readonly UpgradePair[]): StoredPair[] {
  return withPartners(pairs, bestPartnerPerCard(rows.filter(keepFor(list, pairs))));
}

/** The live read: the deck row's own read over the after-list and the cuts, filtered by `keepFor`. The caller isolates a failure. */
export async function readSwapPartners(list: PartnerList, pairs: readonly UpgradePair[]): Promise<StoredPair[]> {
  if (pairs.length === 0) return [];
  const { cuts, after, commanders } = swapSides(list, pairs);
  const best = await loadInDeckPartners({ deckOracleIds: [...new Set([...after, ...cuts])], commanderOracleIds: commanders, keep: keepFor(list, pairs) });
  return withPartners(pairs, best);
}
