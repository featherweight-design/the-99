import { db } from "../../db";
import { castableCandidates, pairsWithOnePiece, type PairRow } from "../combos/near-miss";
import type { DeckProfile } from "../profile/types";
import { nearComboFacts, type NearComboFact } from "./facts-extra";

/**
 * The combos this deck is one card short of, for the v2 Overview facts. Reuses the Add panel's
 * own query and its rule 2 (`castableCandidates`), so "one card short" means what it means there;
 * `nearComboFacts` then keeps infinite or game-ending ones and caps them. A failed read returns
 * none: the Overview is written without the section rather than not at all.
 */
export async function loadNearComboFacts(profile: Pick<DeckProfile, "cards" | "commanderOracleIds">): Promise<NearComboFact[]> {
  const deckIds = profile.cards.map((c) => c.oracleId);
  if (deckIds.length === 0) return [];
  try {
    const present = [...new Set([...deckIds, ...profile.commanderOracleIds])];
    const rows = castableCandidates(
      (await db.execute(pairsWithOnePiece({ present, commanders: profile.commanderOracleIds, missingIn: null }))).rows as PairRow[],
    );
    const names = new Map(profile.cards.map((c) => [c.oracleId, c.name]));
    return nearComboFacts(rows.flatMap((r) => {
      const have = names.get(r.present_id);
      return have ? [{ variantId: r.variant_id, produces: r.produces, have, missing: r.missing_name }] : [];
    }));
  } catch (error) {
    console.error("near-combo facts read failed", error);
    return [];
  }
}
