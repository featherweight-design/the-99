// What the export dialog draws for one deck (`components/decks/export-dialog.tsx`), from the deck's own detail.
// One mapping for both openers: the deck page, from the cards it holds, and the /decks tile menu, from a read
// made when its dialog opens (`readDeckExport`). Two copies of this would let a tile's export differ from the
// deck page's for the same deck.
import { printedNameOf } from "../collection/browse";
import { commanderExportName, type DecklistCard } from "./export-helpers";
import type { DeckDetailCard } from "./grouping";
import type { DeckCommander } from "./read";
import { commanderShoppingRows, isShoppingCard } from "./shopping";

export type DeckExportData = {
  commanderName: string;
  partnerName: string | null;
  commanderPrinting: { setCode?: string; collectorNumber?: string };
  partnerPrinting: { setCode?: string; collectorNumber?: string } | null;
  decklistCards: DecklistCard[];
  shoppingCards: { name: string; role?: string; quantity: number; owned: boolean }[];
};

export function deckExportData(
  commander: DeckCommander,
  partner: DeckCommander | null,
  cards: readonly DeckDetailCard[],
): DeckExportData {
  return {
    // A commander line naming its printing names that printing's face, as a body line does
    // (`printedNameOf`): the oracle name over a renamed printing's set and number would
    // describe a card face that reads something else.
    commanderName: commanderExportName(commander),
    partnerName: partner ? commanderExportName(partner) : null,
    // The printing the deck shows for each commander, as a body line names its own.
    commanderPrinting: {
      setCode: commander.printedSetCode ?? undefined,
      collectorNumber: commander.printedCollectorNumber ?? undefined,
    },
    partnerPrinting: partner ? {
      setCode: partner.printedSetCode ?? undefined,
      collectorNumber: partner.printedCollectorNumber ?? undefined,
    } : null,
    decklistCards: cards.map((c) => ({
      // The whole printed string, not the front face: an export is
      // read by another deckbuilder, which wants the full name and
      // has no width to run out of. Naming the printing while still
      // exporting the oracle name would emit a line whose set and
      // number describe a card face that reads something else.
      name: printedNameOf(c),
      quantity: c.quantity,
      setCode: c.printedSetCode ?? undefined,
      collectorNumber: c.printedCollectorNumber ?? undefined,
      // The deck view's own group, so the export's type sections are the ones it draws.
      typeGroup: c.cardTypeGroup,
    })),
    // The Shopping filter's own predicate, not a second `!owned` list.
    // The two diverged: this one carried the unowned basics the filter
    // refuses to show and dropped the spoken-for cards it puts front
    // and centre, so the buy link under it bought a basket the player
    // never saw.
    // The commanders first, as the list draws them (H28).
    shoppingCards: [
      ...commanderShoppingRows(commander, partner, cards),
      ...cards.filter(isShoppingCard),
    ].map((c) => ({
      name: c.name,
      role: c.role,
      quantity: c.quantity,
      owned: c.owned,
    })),
  };
}
