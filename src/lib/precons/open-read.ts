/**
 * One precon, as `/decks/precons/[fileName]` draws it: its cards with the precon's own printing
 * (shown read-only, never carried into a deck), which of them the reader owns (any printing), and
 * the reader's decks that share its list. A Collector's Edition twin answers with the plain
 * edition it folds into, so the page can redirect to it (design call 4).
 */
import { and, eq, inArray } from "drizzle-orm";
import { preconAddedOn } from "./added";
import { db as pool } from "../../db";
import { cards, collectionItems, preconCards, precons, printings, sets } from "../../db/schema";
import { summarisePrecons, type PreconRow, type ReaderDeck } from "./list";
import { preconArt, readReaderDecks, type Reader } from "./list-read";
import { sharedCount } from "./shared";

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
  /** Legal in Commander today. A precon can hold a card banned since it shipped; the start keeps it and says so. */
  legal: boolean;
  /** The precon's printing, `SET number`, or null when the catalog lacks it. */
  printing: { scryfallId: string; setCode: string; collectorNumber: string; label: string; imageUri: string | null; backImageUri: string | null } | null;
};

/** One of the reader's decks in the "Link a deck" picker (R3 K7). */
export type PreconDeckChoice = {
  deckId: string;
  deckName: string;
  /** The deck's commanders by name. */
  commanders: string[];
  shared: number;
  sameCommanders: boolean;
  /** The other precon this deck is linked to, by name: linking moves it here (lock 1). */
  linkedElsewhere: string | null;
};

export type OpenPrecon =
  | { kind: "twin"; plainFileName: string }
  | {
    kind: "precon";
    row: PreconRow;
    setName: string | null;
    cards: OpenPreconCard[];
    hasCollection: boolean;
    /** Every deck the reader could link here, most shared first; one already linked here is not. */
    decks: PreconDeckChoice[];
    /** When the reader last added this precon to their collection (an unreverted entry), as ISO, or null. */
    addedOn: string | null;
  };

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
  // Read whether or not there is a collection: the page draws no built lines without one (L2), but
  // the start dialog still owes its "already have" note to a reader whose decks share the list.
  const readerDecks = await readReaderDecks(userId, db);
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

  const precon = {
    cards: new Set(lines.filter((l) => !basic(l.typeLine)).map((l) => l.oracleId)),
    commanders: row.commanders.map((c) => c.oracleId),
  };
  const decks = await deckChoices(db, readerDecks, fileName, precon);

  return {
    kind: "precon",
    row,
    setName: setRow[0]?.name ?? null,
    hasCollection: any.length > 0,
    decks,
    addedOn: await preconAddedOn(userId, fileName, db),
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
      legal: l.legal,
      printing: l.scryfallId && l.setCode && l.collectorNumber
        ? { scryfallId: l.scryfallId, setCode: l.setCode, collectorNumber: l.collectorNumber, label: `${l.setCode.toUpperCase()} ${l.collectorNumber}`, imageUri: l.printingImage, backImageUri: l.printingBack }
        : null,
    })),
  };
}

/** The picker's rows: each deck's overlap, its commanders' names and the precon it is linked to. */
async function deckChoices(
  db: Reader,
  readerDecks: readonly ReaderDeck[],
  fileName: string,
  precon: { cards: ReadonlySet<string>; commanders: readonly string[] },
): Promise<PreconDeckChoice[]> {
  const decks = readerDecks.filter((d) => d.builtFrom !== fileName);
  if (decks.length === 0) return [];
  const commanderIds = [...new Set(decks.flatMap((d) => d.commanders))];
  const linkedIds = [...new Set(decks.flatMap((d) => (d.builtFrom ? [d.builtFrom] : [])))];
  const names = new Map((await db.select({ id: cards.oracleId, name: cards.name }).from(cards)
    .where(inArray(cards.oracleId, commanderIds))).map((r) => [r.id, r.name]));
  const linkedNames = new Map(linkedIds.length === 0 ? [] : (await db.select({ id: precons.fileName, name: precons.name })
    .from(precons).where(inArray(precons.fileName, linkedIds))).map((r) => [r.id, r.name]));
  return assembleDeckChoices(readerDecks, fileName, precon, names, linkedNames);
}

/** The picker's decks for one precon: every deck not already linked to it, each with its overlap
 *  and the precon it is linked to elsewhere, the larger overlap first. Pure, so a test can start
 *  from the reader's decks rather than from the finished choices. */
export function assembleDeckChoices(
  readerDecks: readonly ReaderDeck[],
  fileName: string,
  precon: { cards: ReadonlySet<string>; commanders: readonly string[] },
  commanderNames: ReadonlyMap<string, string>,
  preconNames: ReadonlyMap<string, string>,
): PreconDeckChoice[] {
  const byCodePoint = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  return readerDecks
    .filter((d) => d.builtFrom !== fileName)
    .map((d) => ({
      deckId: d.id,
      deckName: d.name,
      commanders: d.commanders.map((id) => commanderNames.get(id) ?? ""),
      ...sharedCount(precon, d),
      // A link whose precon a later feed dropped names nothing, and the picker moves it silently.
      linkedElsewhere: d.builtFrom ? preconNames.get(d.builtFrom) ?? null : null,
    }))
    .sort((a, b) => b.shared - a.shared || byCodePoint(a.deckName.toLowerCase(), b.deckName.toLowerCase()));
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
      legal: cards.commanderLegal,
      scryfallId: printings.scryfallId,
      setCode: printings.setCode,
      collectorNumber: printings.collectorNumber,
      printingImage: printings.imageUri,
      printingBack: printings.backImageUri,
    })
    .from(preconCards)
    .innerJoin(cards, eq(cards.oracleId, preconCards.oracleId))
    .leftJoin(printings, eq(printings.scryfallId, preconCards.scryfallId))
    .where(eq(preconCards.fileName, fileName))
    .orderBy(preconCards.position);
}
