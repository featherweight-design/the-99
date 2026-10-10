import { inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards } from "../../db/schema";
import { liveLockedIds } from "../decks/locks";
import type { DeckDetail } from "../decks/read";
import type { BalanceColor } from "./mana-balance";
import { loadManaInputs } from "./mana-balance-load";
import { helpAddColor, type BasicCatalog, type ManaHelp } from "./mana-help";
import { loadManaStaples } from "./mana-staples";

const BASIC_NAMES: Record<BalanceColor, string> = { W: "Plains", U: "Island", B: "Swamp", R: "Mountain", G: "Forest" };

/** "Help me add <color>" for a deck: the moves that survive a simulated recount, and the staples behind
 *  them. Null when a text read or the basics failed. Asked for by the player, never run unprompted. */
export async function loadManaHelp(deck: DeckDetail, userId: string, color: BalanceColor): Promise<ManaHelp | null> {
  const inputs = await loadManaInputs(deck);
  if (!inputs) return null;
  const found = await db.select({ id: cards.oracleId, name: cards.name }).from(cards).where(inArray(cards.name, Object.values(BASIC_NAMES)));
  const entries = (Object.entries(BASIC_NAMES) as [BalanceColor, string][]).map(([c, name]) => [c, found.find((f) => f.name === name)] as const);
  if (entries.some(([, b]) => !b)) return null;
  const basics = Object.fromEntries(entries) as BasicCatalog;
  const [locked, candidates] = await Promise.all([liveLockedIds(db, deck.id), loadManaStaples(deck, userId)]);
  if (!candidates) return null;
  const identity = [deck.commander, ...(deck.partner ? [deck.partner] : [])].flatMap((c) => c.colorIdentity);
  return helpAddColor(inputs.rows, inputs.nameOf, locked, basics, candidates, color, identity);
}
