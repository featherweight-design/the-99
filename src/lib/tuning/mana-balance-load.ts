import { inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards } from "../../db/schema";
import { isLandFace } from "../cards/facet";
import { loadLandMana } from "../decks/land-mana";
import type { DeckDetail } from "../decks/read";
import { loadSourceMana } from "../decks/source-mana";
import { loadStatsLabels } from "../decks/stats-labels";
import { tappedLands, type TappedLands } from "../mana/lands-tapped";
import type { ManaSupplyCardRow } from "../mana/supply";
import { manaSupplyRows } from "../mana/supply-rows";
import { readManaBalance, type ManaBalance } from "./mana-balance";

export type ManaInputs = {
  rows: ManaSupplyCardRow[];
  nameOf: (id: string) => string;
  tapped: TappedLands;
  identity: string[];
  /** Each land's oracle text, by oracle id: what the tapped count read, kept for Improve my mana's off-plan land. */
  landText: ReadonlyMap<string, string | null>;
};

/** The three reads the Colors card makes plus the text of each land for the tapped count, as the rows
 *  the engine counts. Null when a text read failed: the evidence would then state what the reads
 *  never learned. */
export async function loadManaInputs(deck: Pick<DeckDetail, "cards" | "commander" | "partner">): Promise<ManaInputs | null> {
  const commanders = [deck.commander, ...(deck.partner ? [deck.partner] : [])];
  const deckColors = commanders.flatMap((c) => c.colorIdentity);
  const labels = await loadStatsLabels(deck.cards);
  const [lands, sources] = await Promise.all([loadLandMana(deck.cards, deckColors), loadSourceMana(deck.cards, deckColors, labels)]);
  if (!lands || !sources) return null;

  const deckLands = deck.cards.filter((c) => isLandFace(c.typeLine));
  let landText: { oracleId: string; oracleText: string | null }[] = [];
  if (deckLands.length > 0) {
    try {
      landText = await db.select({ oracleId: cards.oracleId, oracleText: cards.oracleText }).from(cards).where(inArray(cards.oracleId, deckLands.map((c) => c.oracleId)));
    } catch {
      return null;
    }
  }
  const text = new Map(landText.map((r) => [r.oracleId, r.oracleText]));
  const tapped = tappedLands(deckLands.map((c) => ({ name: c.name, typeLine: c.typeLine, oracleText: text.get(c.oracleId) ?? null, quantity: c.quantity })));

  const names = new Map<string, string>([...deck.cards.map((c) => [c.oracleId, c.name] as const), ...commanders.map((c, i) => [`commander:${i}`, c.name] as const)]);
  return { rows: manaSupplyRows(deck.cards, commanders, lands, sources, deckColors), nameOf: (id) => names.get(id) ?? id, tapped, identity: deckColors, landText: text };
}

/** Mana Balance's evidence for a deck. */
export async function loadManaBalance(deck: Pick<DeckDetail, "cards" | "commander" | "partner">): Promise<ManaBalance | null> {
  const inputs = await loadManaInputs(deck);
  return inputs && readManaBalance(inputs);
}
