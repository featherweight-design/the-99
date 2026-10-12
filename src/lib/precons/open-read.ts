/**
 * One precon, as `/decks/precons/[fileName]` draws it: its cards with the precon's own printing
 * (shown read-only, never carried into a deck), which of them the reader owns (any printing), and
 * the reader's decks that share its list. A Collector's Edition twin answers with the plain
 * edition it folds into, so the page can redirect to it (design call 4).
 */
import { and, eq, inArray } from "drizzle-orm";
import { db as pool } from "../../db";
import { cards, collectionItems, preconCards, precons, printings, sets } from "../../db/schema";
import { summarisePrecons, type PreconRow } from "./list";
import { preconArt, readReaderDecks, type Reader } from "./list-read";

export type OpenPreconCard = {
  oracleId: string;
  name: string;
  typeLine: string;
  manaCost: string | null;
  /** Scryfall's layout word, for the row's two-faced mark. */
  layout: string | null;
  imageUri: string | null;
  quantity: number;
  isCommander: boolean;
  basic: boolean;
  owned: boolean;
  /** The precon's printing, `SET number`, or null when the catalog lacks it. */
  printing: { scryfallId: string; setCode: string; collectorNumber: string; label: string; imageUri: string | null } | null;
};

export type OpenPrecon =
  | { kind: "twin"; plainFileName: string }
  | { kind: "precon"; row: PreconRow; setName: string | null; cards: OpenPreconCard[]; hasCollection: boolean };

export async function loadOpenPrecon(userId: string, fileName: string): Promise<OpenPrecon | null> {
  // One snapshot, as the list's loader takes (and for its reason: the page caches what this
  // returns). No `accessMode`, for the pooled connection's sake (`READ_SNAPSHOT`, draft-state.ts).
  return pool.transaction((tx) => readOpenPrecon(tx, userId, fileName), { isolationLevel: "repeatable read" });
}

async function readOpenPrecon(db: Reader, userId: string, fileName: string): Promise<OpenPrecon | null> {
  const [head] = await db.select().from(precons).where(eq(precons.fileName, fileName));
  if (!head) return null;
  if (head.twinOf !== null) return { kind: "twin", plainFileName: head.twinOf };

  const twin = await db.select({ fileName: precons.fileName, name: precons.name }).from(precons).where(eq(precons.twinOf, fileName));
  const lines = await openPreconLines(db, fileName);

  const ids = [...new Set(lines.map((l) => l.oracleId))];
  // In sequence: a transaction is one connection, so these could not overlap anyway.
  const ownedRows = ids.length === 0 ? [] : await db.selectDistinct({ oracleId: collectionItems.oracleId }).from(collectionItems)
    .where(and(eq(collectionItems.userId, userId), inArray(collectionItems.oracleId, ids)));
  const any = await db.select({ oracleId: collectionItems.oracleId }).from(collectionItems).where(eq(collectionItems.userId, userId)).limit(1);
  // No built lines without a collection, as the list draws none in L2.
  const readerDecks = any.length > 0 ? await readReaderDecks(userId, db) : [];
  const setRow = await db.select({ name: sets.name }).from(sets).where(eq(sets.code, head.setCode.toLowerCase()));
  const owned = new Set(ownedRows.map((r) => r.oracleId));
  const basic = (typeLine: string) => /^Basic\b/.test(typeLine);

  const [row] = summarisePrecons(
    [
      {
        fileName: head.fileName, name: head.name, setCode: head.setCode, releaseDate: head.releaseDate, twinOf: null,
        unmappedCount: head.unmappedCount,
        cards: lines.map((l) => ({
          oracleId: l.oracleId, name: l.name, isCommander: l.isCommander, basic: basic(l.typeLine),
          colorIdentity: l.colorIdentity, imageUri: l.imageUri,
        })),
      },
      ...twin.map((t) => ({ fileName: t.fileName, name: t.name, setCode: head.setCode, releaseDate: head.releaseDate, twinOf: head.fileName, unmappedCount: 0, cards: [] })),
    ],
    owned,
    readerDecks,
  );

  return {
    kind: "precon",
    row,
    setName: setRow[0]?.name ?? null,
    hasCollection: any.length > 0,
    cards: lines.map((l) => ({
      oracleId: l.oracleId,
      name: l.name,
      typeLine: l.typeLine,
      manaCost: l.manaCost,
      layout: l.layout,
      imageUri: l.imageUri,
      quantity: l.quantity,
      isCommander: l.isCommander,
      basic: basic(l.typeLine),
      owned: owned.has(l.oracleId),
      printing: l.scryfallId && l.setCode && l.collectorNumber
        ? { scryfallId: l.scryfallId, setCode: l.setCode, collectorNumber: l.collectorNumber, label: `${l.setCode.toUpperCase()} ${l.collectorNumber}`, imageUri: l.printingImage }
        : null,
    })),
  };
}

/** One precon's cards in the feed's order, with the art `preconArt` resolves and the precon's own
 *  printing; apart so a test can render its SQL. */
export function openPreconLines(db: Reader, fileName: string) {
  return db
    .select({
      oracleId: preconCards.oracleId,
      quantity: preconCards.quantity,
      isCommander: preconCards.isCommander,
      name: cards.name,
      typeLine: cards.typeLine,
      manaCost: cards.manaCost,
      layout: cards.layout,
      colorIdentity: cards.colorIdentity,
      imageUri: preconArt,
      scryfallId: printings.scryfallId,
      setCode: printings.setCode,
      collectorNumber: printings.collectorNumber,
      printingImage: printings.imageUri,
    })
    .from(preconCards)
    .innerJoin(cards, eq(cards.oracleId, preconCards.oracleId))
    .leftJoin(printings, eq(printings.scryfallId, preconCards.scryfallId))
    .where(eq(preconCards.fileName, fileName))
    .orderBy(preconCards.position);
}
