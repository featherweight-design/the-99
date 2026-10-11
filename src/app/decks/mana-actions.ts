"use server";

import { requireUserId } from "../../lib/auth";
import { shortCommanderName } from "../../lib/copy/decks-builder";
import { getDeckDetail } from "../../lib/decks/read";
import { loadProfileHead } from "../../lib/profile/load";
import { listFingerprint } from "../../lib/profile/fingerprint";
import { manaBalanceEnabled } from "../../lib/tuning/flag";
import { loadManaBalance } from "../../lib/tuning/mana-balance-load";
import { manaCountSummary, toClientBalance, type ManaPanelData } from "../../lib/tuning/mana-view";
import { recordToolCount } from "../../lib/tuning/tool-counts";
import { isUuid } from "../../lib/uuid";

/**
 * Mana Balance's free count (tier 1): the evidence for one of the reader's decks, read fresh on
 * every open. No credit and no model call. Null when the switch is off, the deck is not the
 * reader's, or a catalog read failed: the panel draws its count-failed state.
 *
 * A count that lands is recorded once per version of the LIST for History (`deck_tool_counts`),
 * keyed on `listFingerprint` of the same head Proposed cuts hashes, so the two tools key one list
 * identically. Non-fatal: History is a record of the count, never a reason it fails to draw.
 */
export async function readManaBalance(deckId: string): Promise<ManaPanelData | null> {
  const userId = await requireUserId();
  if (!manaBalanceEnabled() || !isUuid(deckId)) return null;
  const [deck, head] = await Promise.all([getDeckDetail(deckId, userId), loadProfileHead(deckId, userId)]);
  if (!deck) return null;
  const balance = await loadManaBalance(deck);
  if (!balance) return null;

  if (head) {
    await recordToolCount({ deckId, userId, tool: "mana_balance", listFingerprint: listFingerprint(head), readVersion: null, summary: manaCountSummary(balance) });
  }

  const commanders = [deck.commander, ...(deck.partner ? [deck.partner] : [])];
  // Only the names a pattern row draws: they are what a press opens card detail on.
  const byName = new Map([...deck.cards, ...commanders].map((c) => [c.name, c.oracleId] as const));
  const ids: Record<string, string> = {};
  for (const color of balance.colors) {
    for (const p of color.patterns) for (const c of p.cards) {
      const id = byName.get(c.name);
      if (id) ids[c.name] = id;
    }
  }
  return {
    balance: toClientBalance(balance),
    // The front face of a double-faced commander (`Avatar Aang // Aang` reads `Avatar Aang`).
    commander: shortCommanderName(deck.commander.name.split(" // ")[0]),
    cards: deck.cards.reduce((a, c) => a + c.quantity, 0) + commanders.length,
    ids,
  };
}
