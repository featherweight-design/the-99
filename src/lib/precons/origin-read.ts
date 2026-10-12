/**
 * v0's read (R3 addendum §5): a linked deck's precon and its list, from `precons` and
 * `precon_cards` alone. It never names `deck_versions`, and nothing writes v0 anywhere: v0 is drawn
 * at read, so every reader of committed history skips it by construction (lock 4,
 * `origin-read.test.ts`). `origin.ts` assembles the rows.
 */
import { and, asc, eq } from "drizzle-orm";
import { db } from "../../db";
import { cards, decks, preconCards, precons } from "../../db/schema";
import type { Reader } from "./list-read";
import { assembleOrigin, type OriginRead } from "./origin";

/**
 * Every card of the precon the deck is linked to, one row per `precon_cards` row. Owner-scoped in
 * its own SQL, and an unlinked deck joins nothing (`built_from_precon` is null), so the deck page
 * can start it beside its ownership guard without knowing yet whether the deck is linked. Apart so
 * a test can render its SQL.
 */
export function originQuery(userId: string, deckId: string, q: Reader = db) {
  return q
    .select({
      fileName: precons.fileName,
      name: precons.name,
      setCode: precons.setCode,
      releaseDate: precons.releaseDate,
      oracleId: preconCards.oracleId,
      quantity: preconCards.quantity,
      isCommander: preconCards.isCommander,
      cardName: cards.name,
      typeLine: cards.typeLine,
      cmc: cards.cmc,
      manaCost: cards.manaCost,
      layout: cards.layout,
      imageUri: cards.imageUri,
    })
    .from(decks)
    .innerJoin(precons, eq(precons.fileName, decks.builtFromPrecon))
    .innerJoin(preconCards, eq(preconCards.fileName, precons.fileName))
    .innerJoin(cards, eq(cards.oracleId, preconCards.oracleId))
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
    .orderBy(asc(preconCards.position));
}

/** v0 for one deck, or null when it is not linked (or not the reader's). */
export async function readDeckOrigin(userId: string, deckId: string): Promise<OriginRead | null> {
  return assembleOrigin(await originQuery(userId, deckId));
}
