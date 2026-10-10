import { loadLandMana } from "../decks/land-mana";
import type { DeckDetail } from "../decks/read";
import { loadSourceMana } from "../decks/source-mana";
import { loadStatsLabels } from "../decks/stats-labels";
import { manaSupplyRows } from "../mana/supply-rows";
import { readManaBalance, type ManaBalance } from "./mana-balance";

/** Mana Balance for a deck, through the same three reads the Colors card makes. Null when a text
 *  read failed: the verdict would then state what the reads never learned. */
export async function loadManaBalance(deck: Pick<DeckDetail, "cards" | "commander" | "partner">): Promise<ManaBalance | null> {
  const commanders = [deck.commander, ...(deck.partner ? [deck.partner] : [])];
  const deckColors = commanders.flatMap((c) => c.colorIdentity);
  const labels = await loadStatsLabels(deck.cards);
  const [lands, sources] = await Promise.all([loadLandMana(deck.cards, deckColors), loadSourceMana(deck.cards, deckColors, labels)]);
  if (!lands || !sources) return null;
  return readManaBalance(manaSupplyRows(deck.cards, commanders, lands, sources, deckColors));
}
