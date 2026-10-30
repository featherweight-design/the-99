/**
 * A precon's alternate commanders (Hugh, 2026-10-29): the box prints a few legendary cards in foil
 * beside its face commander, each another way to lead the same 99. The contract-13 Overview carries
 * ONE line about leading the deck with one of them (`stages.ts`, `alternate`).
 *
 * THE RULE, applied to the catalog's own rows (`precon_cards` joined to `cards`) so the answer is the
 * list the app starts, never a second feed: a card that is on the main board (`is_commander` false on
 * every row it has), is held in foil (`foil_quantity` > 0 on some row), can lead a deck in this app
 * (`commander_legal` and `isCommanderCandidate`, the two checks `preparePreconDeck` makes of the face
 * commander), and is not the face commander or its partner. Sorted by name, so the prompt and the
 * request hash never depend on a read's row order.
 *
 * The eval harness derives the same set from the MTGJSON deck file (`alternateCommanders` in
 * `stages.ts`, `leadershipSkills` instead of the app's predicate); the build and the copy use this one,
 * which is what the app can start. Pure: the read lives in `scripts/lib/precon-overview-request.ts`.
 */
import { isCommanderCandidate } from "../recs/score";

export type AlternateRow = {
  oracleId: string;
  name: string;
  isCommander: boolean;
  foilQuantity: number;
  commanderLegal: boolean;
  typeLine: string;
  oracleText: string | null;
  manaCost: string | null;
  layout: string | null;
};

/** The names of the box's alternate commanders, sorted; empty when it has none. */
export function preconAlternates(rows: readonly AlternateRow[]): string[] {
  const faces = new Set(rows.filter((r) => r.isCommander).map((r) => r.oracleId));
  const foil = new Set(rows.filter((r) => !r.isCommander && r.foilQuantity > 0).map((r) => r.oracleId));
  const named = new Map<string, AlternateRow>();
  for (const r of rows) if (!r.isCommander && foil.has(r.oracleId) && !faces.has(r.oracleId) && !named.has(r.oracleId)) named.set(r.oracleId, r);
  return [...named.values()]
    .filter((r) => r.commanderLegal && isCommanderCandidate(r))
    .map((r) => r.name)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}
