// Rule 0's deck art: the copy each deck's OWNER holds, as a deck tile draws it (`resolveCommanderPrintingsByDeck`),
// never `cards.art_crop_uri` alone, which is one arbitrary printing's crop. Resolved per owner, never per viewer: a
// friend's seat draws the printing in the friend's box. Called only with deck ids a grant read already returned (the
// seat check, setup's listed decks, the viewer's own), so it widens nothing: an owner's collection answers for that
// owner's decks alone, and nothing but an image URL leaves. Fail-soft, as the tiles are: a card its owner does not
// hold, or a read that fails, leaves the oracle art the caller already holds.
import { inArray } from "drizzle-orm";
import { db } from "../../db";
import { decks } from "../../db/schema";
import { recordSoftFailure } from "../cache/soft-failure";
import { resolveCommanderPrintingsByDeck } from "../decks/printings";

/** A deck's owned crops: null where the owner does not hold that card, and the caller keeps its oracle art. */
export type DeckArt = { commander: string | null; partner: string | null };

/** Each deck's owned commander and partner crops, keyed by deck id. */
export async function ownedDeckArt(deckIds: readonly string[]): Promise<Map<string, DeckArt>> {
  const out = new Map<string, DeckArt>();
  if (deckIds.length === 0) return out;
  const rows = await db
    .select({ deckId: decks.id, ownerId: decks.userId, commanderOracleId: decks.commanderOracleId, partnerOracleId: decks.partnerOracleId })
    .from(decks)
    .where(inArray(decks.id, [...new Set(deckIds)]))
    .catch(() => {
      recordSoftFailure();
      return [];
    });
  const byOwner = new Map<string, typeof rows>();
  for (const r of rows) byOwner.set(r.ownerId, [...(byOwner.get(r.ownerId) ?? []), r]);
  await Promise.all([...byOwner].map(async ([ownerId, own]) => {
    const [commanders, partners] = await Promise.all([
      resolveCommanderPrintingsByDeck(ownerId, own.map((r) => ({ deckId: r.deckId, commanderOracleId: r.commanderOracleId }))),
      resolveCommanderPrintingsByDeck(ownerId, own.flatMap((r) => (r.partnerOracleId ? [{ deckId: r.deckId, commanderOracleId: r.partnerOracleId }] : []))),
    ]);
    for (const r of own) {
      out.set(r.deckId, { commander: commanders.get(r.deckId)?.artCropUri ?? null, partner: partners.get(r.deckId)?.artCropUri ?? null });
    }
  }));
  return out;
}
