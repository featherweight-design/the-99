// The rows `manaSupply()` counts, built from a deck's cards and commanders. One definition for the
// deck page's Colors card and for Mana Balance, so the two cannot count a deck differently.

import { isLandFace } from "../cards/facet";
import { landProduces, type LandManaByCard, type ManaColor, type ManaSupplyCardRow } from "./supply";

type SupplyCard = { oracleId: string; name: string; typeLine: string; manaCost?: string | null; quantity: number };
type SupplyCommander = { typeLine: string; manaCost: string | null };

/** The 99 are the cards; a commander adds its pips to demand and is never a source. A land the
 *  reads had no text for (added after load) reads its type line alone. */
export function manaSupplyRows(
  cards: readonly SupplyCard[],
  commanders: readonly SupplyCommander[],
  lands: LandManaByCard,
  sources: Readonly<Record<string, readonly ManaColor[]>>,
  deckColors: readonly string[],
): ManaSupplyCardRow[] {
  return [
    ...cards.map((c) => ({
      id: c.oracleId,
      typeLine: c.typeLine,
      manaCost: c.manaCost ?? null,
      quantity: c.quantity,
      produces:
        lands[c.oracleId] ??
        sources[c.oracleId] ??
        (isLandFace(c.typeLine) ? landProduces({ name: c.name, typeLine: c.typeLine, oracleText: null }, deckColors) : []),
      ramp: c.oracleId in sources,
    })),
    ...commanders.map((c, i) => ({ id: `commander:${i}`, typeLine: c.typeLine, manaCost: c.manaCost, quantity: 1 })),
  ];
}
