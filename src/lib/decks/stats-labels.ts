import { isLandFace } from "../cards/facet";
import { readLabels } from "../labels/read";
import type { Job } from "../labels/types";

/** The fresh labels of a deck's non-land cards, read ONCE for the Stats cards that read labels (Jobs,
 *  Mana colors). Null when the read failed: each card then decides for itself what it can still draw. */
export async function loadStatsLabels(cards: readonly { oracleId: string; typeLine: string }[]): Promise<Map<string, Job[]> | null> {
  try {
    return await readLabels(cards.filter((c) => !isLandFace(c.typeLine)).map((c) => c.oracleId));
  } catch {
    return null;
  }
}
