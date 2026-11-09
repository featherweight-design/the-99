import { shortCommanderName } from "../copy/decks-builder";
import { getDeckDetail, type DeckDetail } from "../decks/read";
import { listKeyOf } from "./list-key";
import { loadManaBalance } from "./mana-balance-load";
import { manaCountSummary, toClientBalance, type ManaPanelData } from "./mana-view";
import { recordToolCount } from "./tool-counts";

/** The list the count read (`listKeyOf`). */
export function listFingerprintOf(deck: Pick<DeckDetail, "commander" | "partner" | "cards">): string {
  return listKeyOf({ commanderOracleId: deck.commander.oracleId, partnerOracleId: deck.partner?.oracleId ?? null, cards: deck.cards });
}

/**
 * Mana Balance's free count (tier 1) for a reader already known: the evidence for one of their decks, read fresh. No
 * credit and no model call. Null when the deck is not the reader's, or a catalog read failed. `readManaBalance`
 * (`mana-actions.ts`) is this behind the session and the id check. Taken out of the action so it can be called with a
 * known owner where there is no session: shared with the landing demo's exporter (PR 6b-2).
 *
 * NOT A PURE READ: a count that lands is recorded once per version of the LIST for History (`deck_tool_counts`), keyed
 * on `listFingerprint` of the very deck read it counted, so a record can never file one list's figures under another's
 * key. Non-fatal: History is a record of the count, never a reason it fails to draw.
 */
export async function loadManaPanel(deckId: string, userId: string): Promise<ManaPanelData | null> {
  const deck = await getDeckDetail(deckId, userId, undefined);
  if (!deck) return null;
  const balance = await loadManaBalance(deck);
  if (!balance) return null;

  await recordToolCount({ deckId, userId, tool: "mana_balance", listFingerprint: listFingerprintOf(deck), readVersion: null, summary: manaCountSummary(balance) });

  const commanders = [deck.commander, ...(deck.partner ? [deck.partner] : [])];
  // Only the names a pattern row draws: they are what a press opens card detail on.
  const byName = new Map([...deck.cards, ...commanders].map((c) => [c.name, c.oracleId] as const));
  const artOf = new Map([...deck.cards, ...commanders].flatMap((c) => (c.imageUri ? [[c.oracleId, c.imageUri] as const] : [])));
  const ids: Record<string, string> = {};
  const art: Record<string, string> = {};
  for (const color of balance.colors) {
    for (const p of color.patterns) for (const c of p.cards) {
      const id = byName.get(c.name);
      if (!id) continue;
      ids[c.name] = id;
      const uri = artOf.get(id);
      if (uri) art[id] = uri;
    }
  }
  return {
    balance: toClientBalance(balance),
    // Every commander, by its front face (`Avatar Aang // Aang` reads `Avatar Aang`): the figure
    // "without" them leaves out each commander row, a partner's included.
    commander: commanders.map((c) => shortCommanderName(c.name.split(" // ")[0])).join(" and "),
    commanders: commanders.length,
    cards: deck.cards.reduce((a, c) => a + c.quantity, 0) + commanders.length,
    ids,
    art,
  };
}
