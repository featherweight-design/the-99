// Move a copy (#2980): History's live half, ONE batched read over the oracle ids a page (or an opened entry) names, never one
// per entry. Reads only `userId`'s own collection and decks. The record (`wentTo`) is never touched.
import { loadAvailability } from "../decks/availability-query";
import { allocateClaims } from "../decks/allocate";
import { HISTORY_LIVE_MAX, type HistoryLive } from "./history-live-view";

export { HISTORY_LIVE_MAX };

export async function loadHistoryLive(userId: string, oracleIds: readonly string[]): Promise<Record<string, HistoryLive>> {
  const ids = [...new Set(oracleIds)].slice(0, HISTORY_LIVE_MAX);
  if (ids.length === 0) return {};
  const availability = await loadAvailability(userId, { oracleIds: ids });
  const out: Record<string, HistoryLive> = {};
  for (const id of ids) {
    const a = availability.get(id);
    if (!a) continue;
    // The door's own rule (card details): every copy spoken for, and some deck claims it. `free` is the query's, never recomputed.
    const change = a.owned > 0 && a.free <= 0 && a.claims.length > 0;
    const holders = allocateClaims(a).filter((c) => c.allocated > 0).map((c) => ({ id: c.deckId, name: c.deckName }));
    // The decks a pick put a copy in: holders now, less the holders commit order alone would give (several picks, G3).
    const byOrder = new Set(
      allocateClaims({ owned: a.owned, claims: a.claims.map((c) => ({ ...c, granted: 0 })) })
        .filter((c) => c.allocated > 0)
        .map((c) => c.deckId),
    );
    out[id] = { change, holders, gained: holders.filter((h) => !byOrder.has(h.id)) };
  }
  return out;
}
