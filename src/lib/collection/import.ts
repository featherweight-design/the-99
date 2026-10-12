import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  cards, collectionItems, commanderScores, csvUploads, printings, skippedPrintings, tokenPrintings,
} from "../../db/schema";
import { countTokenPrintings, tokenTablesExist } from "../tokens/publish";
import { recordUploadTokens, type TokenHolding } from "../tokens/ownership";
import { TOKEN_LAYOUTS } from "../cards/game-card";
import type { CollectionRow } from "../manabox/parse";
import type { CatalogCard, DetailedCatalogCard, MatchIndexes } from "./match";
import { toCollectionItemValues, type PendingItem } from "./pending";

const INSERT_BATCH = 500;
// scryfall_id is a uuid column, so a malformed id from a hand-edited CSV would fail the
// lookup query with 22P02 rather than simply not matching. Filter before querying.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Chunked `in (...)` lookup — a 5MB CSV can carry tens of thousands of ids. */
async function chunkedLookup<T>(
  ids: string[],
  query: (chunk: string[]) => Promise<T[]>,
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += 1000) out.push(...(await query(ids.slice(i, i + 1000))));
  return out;
}

/**
 * Loads the catalog plus the printing indexes matchRows needs.
 *
 * `printings` holds every printing in existence, so its identity rows are looked up by the ids
 * the upload actually contains rather than loaded whole; the oracle catalog is small enough to
 * read in full and is still needed for name matching. Flavor names are the exception — matched
 * by name, so there are no ids to look them up by, and few enough to read whole.
 */
export async function loadMatchInputs(
  rows: CollectionRow[],
): Promise<{ catalog: CatalogCard[]; indexes: MatchIndexes }>;
export async function loadMatchInputs(
  rows: CollectionRow[],
  opts: { detailed: true },
): Promise<{ catalog: DetailedCatalogCard[]; indexes: MatchIndexes }>;
export async function loadMatchInputs(
  rows: CollectionRow[],
  opts: { detailed?: boolean } = {},
): Promise<{ catalog: CatalogCard[]; indexes: MatchIndexes }> {
  // Deck import needs the type line to tell a basic land and a legendary creature
  // apart; the collection flow does not, and oracle_text over the whole catalog is
  // large enough that reading it unconditionally would be a real regression there.
  //
  // `layout` and `typeLine` ride on both reads: they are what tells `matchRows` a row is not a
  // card at all (`isGameCard`), which every import path needs.
  const columns = {
    oracleId: cards.oracleId,
    scryfallId: cards.scryfallId,
    name: cards.name,
    layout: cards.layout,
    typeLine: cards.typeLine,
  };
  const catalog = await db
    .select(
      opts.detailed
        ? {
            ...columns,
            oracleText: cards.oracleText,
            commanderLegal: cards.commanderLegal,
            // The commander picker's rows are built from the pipeline's own output,
            // so identity and art travel with the catalog rather than being fetched
            // again per candidate. Detailed-only, for the same reason as oracle_text.
            colorIdentity: cards.colorIdentity,
            imageUri: cards.imageUri,
            // isCommanderCandidate reads it, with `layout`, to refuse a melded card (#712).
            manaCost: cards.manaCost,
          }
        : columns,
    )
    .from(cards);

  // Loaded whole and unconditionally, unlike the id-keyed lookups below: a flavor name is
  // matched by name, and the rows that need it most — a pasted decklist — carry no Scryfall
  // id at all, so they take the early return. A few hundred printings have one (#467).
  const flavorRows = await db
    .select({ flavorName: printings.flavorName, oracleId: printings.oracleId })
    .from(printings)
    .where(isNotNull(printings.flavorName));
  const flavorNames = flavorRows.flatMap(({ flavorName, oracleId }) =>
    flavorName ? [{ flavorName, oracleId }] : []);

  const ids = [...new Set(rows.map((r) => r.scryfallId).filter((id): id is string => !!id && UUID_RE.test(id)))];
  if (ids.length === 0) return { catalog, indexes: { flavorNames } };

  const printingRows = await chunkedLookup(ids, (chunk) =>
    db
      .select({ scryfallId: printings.scryfallId, oracleId: printings.oracleId })
      .from(printings)
      .where(inArray(printings.scryfallId, chunk)));
  const skippedRows = await chunkedLookup(ids, (chunk) =>
    db
      .select({ scryfallId: skippedPrintings.scryfallId })
      .from(skippedPrintings)
      // Only the token layouts are REPORTED as skipped. A theme front or a plane is recorded
      // there too, since the ingest refuses it the same way, but a row naming one reads as
      // unresolved: "token" would be a false account of what it is.
      .where(and(
        inArray(skippedPrintings.scryfallId, chunk),
        inArray(skippedPrintings.layout, [...TOKEN_LAYOUTS]),
      )));

  // Which of the uploaded ids are TOKEN printings, and of which token. Skipped when the token catalog
  // is not in this database (a refresh can precede its migration), so an upload never fails for a
  // feature that is dark: it simply reads no tokens. `tokensRead` says whether the lookup ran at all.
  const tokensRead = (await tokenTablesExist()) && (await countTokenPrintings()) > 0;
  const tokenRows = tokensRead
    ? await chunkedLookup(ids, (chunk) =>
      db.select({ scryfallId: tokenPrintings.scryfallId, tokenOracleId: tokenPrintings.tokenOracleId })
        .from(tokenPrintings)
        .where(inArray(tokenPrintings.scryfallId, chunk)))
    : [];

  return {
    catalog,
    indexes: {
      printings: printingRows,
      skippedScryfallIds: skippedRows.map((r) => r.scryfallId),
      tokenPrintings: tokenRows,
      tokensRead,
      flavorNames,
    },
  };
}

/**
 * Replaces a user's collection with `items`, in one transaction.
 *
 * Delete-then-plain-INSERT, with no ON CONFLICT anywhere: the caller must have aggregated to
 * exactly one item per primary key (see aggregatePendingItems) or this raises 23505.
 *
 * Shared by confirmUpload and `pnpm db:seed:collection` so the CLI path exercises the server
 * action's write rather than a second implementation of it.
 *
 * WITH `confirmUploadId`, THE UPLOAD ROW IS THE LOCK. The stamp is a conditional update —
 * `where confirmed_at is null returning id` — and the whole transaction is abandoned when it
 * returns no row, so a double submit or a retried request replaces the collection once. A
 * read-then-write check in the caller cannot do that: two concurrent confirms both read null,
 * and both replace. `alreadyConfirmed` says which happened, because the caller has a receipt to
 * serve in that case rather than an error to raise. Proved by `pnpm probe:arrivals`, whose
 * third case starts two confirms together.
 *
 * The stamp goes FIRST, before the delete, so the loser does no work at all.
 */
export async function replaceCollection(
  userId: string,
  items: PendingItem[],
  opts: { confirmUploadId?: string; onlyIfEmpty?: boolean; tokens?: TokenHolding[] } = {},
): Promise<{ alreadyConfirmed: boolean; notEmpty: number | null }> {
  const values = toCollectionItemValues(userId, items);
  let alreadyConfirmed = false;
  let notEmpty: number | null = null;
  try {
    await db.transaction(async (tx) => {
      // SERIALIZED PER USER, not per upload. The conditional stamp below locks one
      // upload row, which is not the same thing: two DIFFERENT unconfirmed uploads for
      // one player would both pass it and then interleave their delete-and-reinsert over
      // the same collection. `hashtextextended` rather than `hashtext` because the id is
      // text of arbitrary length and the two-argument form is stable across versions; the
      // lock is transaction-scoped, so it is released by the commit or the rollback and
      // never leaks.
      //
      // What this does NOT serialize is the caller's before-snapshot, which is read
      // outside this transaction by design (see the note in `confirmUpload`). Two
      // confirms fired in the same instant can still produce one receipt that mixes one
      // upload's owned delta with the other's buy state. The collection itself cannot be
      // corrupted, which is what this lock is for.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${userId}, 0))`);
      if (opts.confirmUploadId) {
        const claimed = await tx.update(csvUploads)
          // The database's clock, read after the per-user lock, as the ledger's write stamps
          // its own: `editsSinceUpload` compares this against ledger entries' `created_at`, and
          // two clocks that disagree would count an edit on the wrong side of the upload.
          .set({ confirmedAt: sql`clock_timestamp()` })
          .where(and(eq(csvUploads.id, opts.confirmUploadId), isNull(csvUploads.confirmedAt)))
          .returning({ id: csvUploads.id });
        if (claimed.length === 0) {
          // Somebody else confirmed this upload. The throw is what rolls the transaction
          // back, and the rollback is what makes the guard a lock rather than a hint.
          alreadyConfirmed = true;
          throw new AlreadyConfirmed();
        }
      }
      // WITH `onlyIfEmpty`, A COLLECTION THAT EXISTS STOPS THE REPLACE. It is a first import's
      // promise that nothing is lost, and it is checked HERE, under the lock, because a check
      // read before the lock is a snapshot another tab's import can land behind: that import
      // would be deleted with no confirm (Copilot, #1097). It runs AFTER the stamp, and both
      // halves of that order matter. After: a second submit of the SAME upload, waiting here
      // while the first commits, meets `alreadyConfirmed` and serves its receipt, rather than
      // reading the collection its own twin just wrote as somebody else's. And the throw
      // rolls the stamp back with everything else, so an upload refused for a DIFFERENT
      // import's collection stays unconfirmed and the modal can still confirm it.
      if (opts.onlyIfEmpty) {
        const [{ owned }] = await tx
          .select({ owned: sql<number>`coalesce(sum(${collectionItems.quantity}), 0)::int` })
          .from(collectionItems)
          .where(eq(collectionItems.userId, userId));
        if (owned > 0) {
          notEmpty = owned;
          throw new NotEmpty();
        }
      }
      await tx.delete(collectionItems).where(eq(collectionItems.userId, userId));
      // The tokens this upload read, and the marker that they were READ, in the same transaction as the
      // replace: a failure here rolls the whole confirm back. An upload with no token still writes the
      // marker. Only an upload (with an id) records tokens; the CLI seed path passes none.
      await recordUploadTokens(tx, userId, opts.confirmUploadId, "replace", opts.tokens);
      // Every score component derives from the collection, so a replace invalidates all of them.
      await tx.delete(commanderScores).where(eq(commanderScores.userId, userId));
      for (let i = 0; i < values.length; i += INSERT_BATCH) {
        await tx.insert(collectionItems).values(values.slice(i, i + INSERT_BATCH));
      }
    });
  } catch (err) {
    // Only this module's own sentinel is swallowed; a real failure still reaches the caller.
    if (!(err instanceof AlreadyConfirmed) && !(err instanceof NotEmpty)) throw err;
  }
  return { alreadyConfirmed, notEmpty };
}

/** Thrown to roll back an `onlyIfEmpty` replace that found a collection; reported as `notEmpty`. */
class NotEmpty extends Error {}

/**
 * Thrown to roll the transaction back when another request already confirmed this upload.
 * Never surfaced: it means "somebody else's write stands", which the caller reports by
 * serving the stored receipt, so `replaceCollection` converts it into `alreadyConfirmed`.
 */
class AlreadyConfirmed extends Error {}
