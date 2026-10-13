import { recordSoftFailure } from "../cache/soft-failure";
import { readOwnedPrintings } from "../collection/owned-printings";
import { readDeckOwnedPrintings } from "../decks/printings";
import { loadOpeningArt } from "./opening-printing";

/**
 * The art a card is drawn with for this player, down the chain card details uses: the deck's chosen
 * printing where a deck is in context (`deckPickFor`, then the Collection's), else the printing the
 * player owns, and for a card they do not own the printing card details open it on (`loadOpeningArt`: the oracle's own
 * when the shop carries it, else the cheapest it does). A card with no such printing is absent, and the caller keeps
 * the catalog representative it already holds (`cards.image_uri`).
 *
 * ONE RULE FOR A SURFACE THAT DRAWS A CARD WITHOUT OPENING IT: Suggested changes, Proposed cuts, the
 * stand-ins sheet and Improve my mana's staples call this. The Top-off list shows only cards NOT in the deck, which have no deck pick, so
 * `resolveOwnedPrintings` is already their whole chain; the deck page overlays it on the candidates it
 * hands the list (`readSynergyCards` carries the catalog's printing). `cards.image_uri` is oracle-level,
 * one arbitrary printing per card, so a hover preview that read it showed a different printing from the
 * card details the same row opens (Suggested changes, Hugh 2026-10-11). A loader that feeds a hover
 * preview overlays this on the art it read, at the draw rather than inside a shared loader, the same
 * reason `withOwnedCardArt` gives.
 *
 * Fail-soft: a failed ownership read answers an empty map (recorded, so no cached page keeps it) and every row
 * keeps the art it arrived with.
 */
export async function chainArt(
  userId: string,
  deckId: string | null,
  oracleIds: readonly (string | null | undefined)[],
): Promise<Map<string, string>> {
  const ids = [...new Set(oracleIds.filter((id): id is string => typeof id === "string"))];
  const art = new Map<string, string>();
  if (ids.length === 0) return art;
  // The throwing reads: only a SUCCESSFUL read says which cards the reader owns, and a failed one answers nothing
  // rather than "owns nothing", or every owned card would be sent through the unowned rule below.
  let printings: Map<string, { imageUri: string | null }>;
  try {
    printings = deckId !== null
      ? await readDeckOwnedPrintings(userId, deckId, ids)
      : await readOwnedPrintings(userId, ids);
  } catch {
    recordSoftFailure();
    return art;
  }
  for (const [id, p] of printings) if (p.imageUri) art.set(id, p.imageUri);
  // The cards the read confirms absent are cards the reader does not own: they open on the opening printing, so
  // the preview and the press show one picture. A card the reader owns whose printing has no art is in the map
  // and keeps what the caller holds. Fail-soft inside `loadOpeningArt`.
  for (const [id, uri] of await loadOpeningArt(ids.filter((id) => !printings.has(id)))) art.set(id, uri);
  return art;
}

/**
 * `rows` drawn with the chain's art where it has some, and with the art they arrived with where it has
 * none (a card the player does not own). The overlay half of `chainArt`, named so the one place a
 * surface applies the map is a function a test can break.
 */
export function withChainArt<T extends { oracleId: string; imageUri: string | null }>(
  rows: readonly T[],
  art: ReadonlyMap<string, string>,
): T[] {
  return rows.map((row) => ({ ...row, imageUri: art.get(row.oracleId) ?? row.imageUri }));
}
