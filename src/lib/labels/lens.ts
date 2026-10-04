/**
 * The DECK LENS `relevant()` reads a label through (`DeckLens`, `swaps/honest.ts`): the deck's key
 * creature type, the noncreature subtypes it holds or makes, and the card types it holds. Pure.
 *
 * Moved out of `swaps/gather.ts`'s inline `lens()` unchanged, so the stand-ins sheet and the deck
 * page's Consider filter read a label through one definition.
 */
import { keyCreatureType } from "../recs/themes";
import { heldSubtypes, type DeckLens } from "../swaps/honest";
import { heldCardTypes } from "./match";

export type LensInput = {
  /** The deck's rows with their copies: the key creature type is counted off them (`keyCreatureType`). */
  draft: readonly { typeLine: string; quantity: number }[];
  /** The commanders' type lines, which break a near tie for the key type. */
  commanderTypeLines: readonly string[];
  /**
   * The cards whose subtypes (held or made as tokens) and card types the deck counts as held: the
   * draft's rows AND the commanders, whose oracle text counts too (a commander that makes Treasure
   * holds Treasure).
   */
  holding: readonly { oracleId: string; typeLine: string; oracleText: string | null }[];
  /**
   * A card that is leaving the deck: every `holding` row of it is left out of `held` and `heldTypes`
   * (d9, the stand-ins sheet's card being replaced). It still counts toward the key type, which is
   * read off `draft` whole. Null when no card is leaving (the Consider filter).
   */
  leaving: string | null;
  /** Every noncreature subtype the catalog prints (`loadNoncreatureSubtypes`). */
  noncreatureSubtypes: ReadonlySet<string>;
};

export function deckLens(i: LensInput): DeckLens {
  const holding = i.holding.filter((r) => r.oracleId !== i.leaving);
  return {
    keyType: keyCreatureType(i.draft.map((r) => ({ typeLine: r.typeLine, quantity: Number(r.quantity) })), i.commanderTypeLines),
    isSubtype: (w: string) => i.noncreatureSubtypes.has(w),
    held: heldSubtypes(holding),
    heldTypes: heldCardTypes(holding.map((r) => r.typeLine)),
  };
}
