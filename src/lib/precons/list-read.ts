/**
 * Reads what `/decks/precons` draws: every precon's cards (catalog data, keyed on the catalog
 * generation through the page cache), and the reader's ownership and deck lists, which the page
 * cache keys on the reader's stamp. `summarisePrecons` does the rest.
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, collectionItems, deckCards, decks, preconCards, precons } from "../../db/schema";
import { summarisePrecons, type PreconRow, type PreconSource, type ReaderDeck } from "./list";

export type PreconList = {
  rows: PreconRow[];
  /** Precons listed, twins included: the denominator a reader never sees, kept for the probe. */
  listed: number;
  /** Whether the reader owns any card at all (L2 reads differently from a collection that misses). */
  hasCollection: boolean;
  newest: string | null;
};

export async function readPreconSources(): Promise<PreconSource[]> {
  const heads = await db.select().from(precons);
  const facts = await db
    .select({
      fileName: preconCards.fileName,
      oracleId: preconCards.oracleId,
      isCommander: preconCards.isCommander,
      name: cards.name,
      typeLine: cards.typeLine,
      colorIdentity: cards.colorIdentity,
      imageUri: cards.imageUri,
    })
    .from(preconCards)
    .innerJoin(cards, eq(cards.oracleId, preconCards.oracleId))
    .orderBy(preconCards.fileName, preconCards.position);
  const byDeck = new Map<string, PreconSource["cards"]>();
  for (const f of facts) {
    const list = byDeck.get(f.fileName) ?? [];
    list.push({
      oracleId: f.oracleId,
      name: f.name,
      isCommander: f.isCommander,
      basic: /^Basic\b/.test(f.typeLine),
      colorIdentity: f.colorIdentity,
      imageUri: f.imageUri,
    });
    byDeck.set(f.fileName, list);
  }
  return heads.map((h) => ({
    fileName: h.fileName,
    name: h.name,
    setCode: h.setCode,
    releaseDate: h.releaseDate,
    twinOf: h.twinOf,
    unmappedCount: h.unmappedCount,
    cards: byDeck.get(h.fileName) ?? [],
  }));
}

/** Every deck the reader holds, as the shared rule reads it: commanders and every card in the list. */
export async function readReaderDecks(userId: string): Promise<ReaderDeck[]> {
  const heads = await db
    .select({ id: decks.id, name: decks.name, commander: decks.commanderOracleId, partner: decks.partnerOracleId })
    .from(decks)
    .where(eq(decks.userId, userId));
  if (heads.length === 0) return [];
  const lines = await db
    .select({ deckId: deckCards.deckId, oracleId: deckCards.oracleId })
    .from(deckCards)
    .where(inArray(deckCards.deckId, heads.map((h) => h.id)));
  const byDeck = new Map<string, Set<string>>();
  for (const l of lines) {
    const set = byDeck.get(l.deckId) ?? new Set<string>();
    set.add(l.oracleId);
    byDeck.set(l.deckId, set);
  }
  return heads.map((h) => {
    const commanders = h.partner ? [h.commander, h.partner] : [h.commander];
    const list = byDeck.get(h.id) ?? new Set<string>();
    for (const c of commanders) list.add(c);
    return { id: h.id, name: h.name, commanders, cards: list };
  });
}

/** The precon cards the reader owns, any printing (brief lock 6). One query, never a list of ids. */
export function ownedPreconCards(userId: string) {
  return db
    .selectDistinct({ oracleId: collectionItems.oracleId })
    .from(collectionItems)
    .where(and(
      eq(collectionItems.userId, userId),
      sql`exists (select 1 from ${preconCards} pc where pc.oracle_id = ${collectionItems.oracleId})`,
    ));
}

export async function loadPreconList(userId: string): Promise<PreconList> {
  const [sources, ownedRows, any, readerDecks] = await Promise.all([
    readPreconSources(),
    ownedPreconCards(userId),
    db.select({ one: sql<number>`1` }).from(collectionItems).where(eq(collectionItems.userId, userId)).limit(1),
    readReaderDecks(userId),
  ]);
  const rows = summarisePrecons(sources, new Set(ownedRows.map((r) => r.oracleId)), readerDecks);
  const newest = rows.reduce<string | null>((m, r) => (m === null || r.releaseDate > m ? r.releaseDate : m), null);
  return { rows, listed: sources.length, hasCollection: any.length > 0, newest };
}
