import { db } from "../../../db";
import { bestPartnerPerCard, inDeckPairsQuery, type ComboPartner, type PairRow } from "../../combos/near-miss";
import type { StoredPair, SwapCombo, UpgradePair } from "./validate";

/**
 * Each swap's two-card combo partner (A3 G20), computed at finish with no model call and stored on the run's pairs. SERVER-ONLY:
 * the read imports the database; `partnersFromRows` is the pure rule.
 *
 * The deck row's rule (`inDeckPairsQuery` + `bestPartnerPerCard`, partner in this deck), applied to the deck as it would stand
 * after the swaps:
 * - an add that combos with another add, or with a card that stays, is marked;
 * - a cut whose partner stays is marked (cutting it breaks the combo);
 * - a cut whose only partners are also cut is not: a partner that is itself being cut does not count (ruled). The filter runs
 *   BEFORE the fold, so a cut whose most popular partner is cut but a second one stays is marked with the one that stays.
 */

/** The list the swaps run over: the commander(s) apart, and every card (the commanders flagged `isCommander`). */
export type PartnerList = { commanderIds: readonly string[]; cards: readonly { oracleId: string; isCommander: boolean }[] };

/** The 99 after the swaps (as `profileOf` applies them), the cuts, and the commanders. */
export function swapSides(list: PartnerList, pairs: readonly UpgradePair[]) {
  const cuts = new Set(pairs.map((p) => p.cutId));
  const adds = new Set(pairs.map((p) => p.addId));
  const after = new Set(list.cards.filter((c) => !c.isCommander && !cuts.has(c.oracleId)).map((c) => c.oracleId));
  for (const id of adds) after.add(id);
  return { cuts, adds, after, commanders: [...list.commanderIds] };
}

const combo = (hit: ComboPartner | undefined): SwapCombo | null =>
  hit ? { oracleId: hit.partnerOracleId, name: hit.partnerName, ...(hit.otherPartners ? { otherPartners: hit.otherPartners } : {}) } : null;

/** The pairs with their partners, from the in-deck rows read over the after-list plus the cuts. Null on a side means looked and found none. */
export function partnersFromRows(rows: readonly PairRow[], list: PartnerList, pairs: readonly UpgradePair[]): StoredPair[] {
  const { cuts, adds, after, commanders } = swapSides(list, pairs);
  const stays = new Set([...after, ...commanders]);
  const kept = rows.filter((r) => (cuts.has(r.present_id) || adds.has(r.present_id)) && stays.has(r.missing_id));
  const best = bestPartnerPerCard(kept);
  return pairs.map((p) => ({ ...p, cutCombo: combo(best.get(p.cutId)), addCombo: combo(best.get(p.addId)) }));
}

/** The live read: one `inDeckPairsQuery` over the after-list, the cuts and the commanders. The caller isolates a failure. */
export async function readSwapPartners(list: PartnerList, pairs: readonly UpgradePair[]): Promise<StoredPair[]> {
  if (pairs.length === 0) return [];
  const { cuts, after, commanders } = swapSides(list, pairs);
  const present = [...new Set([...after, ...cuts, ...commanders])];
  const rows = (await db.execute(inDeckPairsQuery({ present, commanders }))).rows as PairRow[];
  return partnersFromRows(rows, list, pairs);
}
