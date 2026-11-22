// How many of the reader's decks still need a card (the Spares tab's `a deck needs it` line and Wanted filter). A deck
// needs a card when its Shopping list has a body row for it: the draft decklist wants more copies than the shelf holds
// for it. A commander or partner draws in a group of its own on that list, with no spare glyph, so it is left out here
// exactly as `loadToolFits` leaves it out.
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { decks } from "../../db/schema";
import { loadDeckBuyRows, type DeckBuyRow } from "./availability-query";

type DeckSlots = { id: string; commander: string | null; partner: string | null };

/** Pure half: distinct decks per card over the body rows. */
export function deckNeedByCard(rows: readonly DeckBuyRow[], slots: readonly DeckSlots[]): Record<string, number> {
  const byDeck = new Map(slots.map((d) => [d.id, d]));
  const decksPerCard = new Map<string, Set<string>>();
  for (const r of rows) {
    const deck = byDeck.get(r.deckId);
    if (!deck || r.oracleId === deck.commander || r.oracleId === deck.partner || r.quantity <= 0) continue;
    const set = decksPerCard.get(r.oracleId) ?? new Set<string>();
    set.add(r.deckId);
    decksPerCard.set(r.oracleId, set);
  }
  return Object.fromEntries([...decksPerCard].map(([id, set]) => [id, set.size]));
}

/** One read of the Shopping rows and the decks' commanders. A failed read is `{}`: the tab then draws no deck line. */
export async function loadDeckNeed(userId: string): Promise<Record<string, number>> {
  try {
    const [rows, slots] = await Promise.all([
      loadDeckBuyRows(userId),
      db.select({ id: decks.id, commander: decks.commanderOracleId, partner: decks.partnerOracleId }).from(decks).where(eq(decks.userId, userId)),
    ]);
    return deckNeedByCard(rows, slots);
  } catch {
    return {};
  }
}
