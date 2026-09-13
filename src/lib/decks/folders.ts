// Deck folders: the shelf a deck is filed on.
//
// ONE DECK, ONE FOLDER — decided over tags, and the schema is what enforces it:
// `decks.folder_id` is a nullable column, not a join table, so "two folders" is
// not a state this app can reach and nothing has to pick a winner at read time.
// Null is unfiled, which is where every deck that already exists starts and
// where a deck returns when its folder is deleted.
//
// DELETING A FOLDER NEVER DELETES ITS DECKS. The foreign key is `on delete set
// null` (src/db/schema.ts), so the decks are unfiled by the database rather than
// by a query that has to remember to do it first. `deleteFolder` below is a
// single statement for that reason, and a folder deleted by any other route —
// a future admin path, a manual statement — behaves identically.
//
// EVERY FUNCTION IS USER-SCOPED. `user_id` is in the where clause of each one,
// so a folder id or deck id belonging to someone else fails to match rather
// than being touched; the id is the narrowing, never the authorisation.

import { and, asc, count, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { deckFolders, decks } from "../../db/schema";
import { validateFolderName } from "./folder-name";

export type DeckFolder = {
  id: string;
  name: string;
  createdAt: Date;
};

export type DeckFolderWithCount = DeckFolder & {
  /** Decks filed here. Zero is a real answer: an empty folder still draws. */
  deckCount: number;
};

/**
 * Every folder this player has, with how many decks sit in each.
 *
 * Ordered by name rather than by creation, because the list is a set of shelves
 * the player reads by label — a creation order would move a folder the moment
 * one is added and make it unfindable by scanning.
 *
 * A LEFT join and a group by, not a correlated subquery: a subquery's reference
 * to the outer folder id renders unqualified in a drizzle select list, so
 * `d.folder_id = "id"` binds to the SUBQUERY's own id and every count comes back
 * zero. Left, because an empty folder still has to appear.
 *
 * `count(decks.id)` rather than `count(*)`: the latter counts the row the outer
 * join manufactures for an empty folder and would report one deck on a shelf
 * holding none.
 *
 * The join carries the OWNER as well as the folder id. The foreign key
 * constrains only the id, so nothing at the database level forbids a row whose
 * deck and folder belong to different players — `moveDeck` is what prevents it,
 * and a count that trusted that would inflate the moment anything else wrote
 * the column. It is also what lets this use the `(user_id, folder_id)` index
 * rather than scanning every player's decks.
 */
export async function listFolders(userId: string): Promise<DeckFolderWithCount[]> {
  const rows = await db
    .select({
      id: deckFolders.id,
      name: deckFolders.name,
      createdAt: deckFolders.createdAt,
      deckCount: count(decks.id),
    })
    .from(deckFolders)
    .leftJoin(
      decks,
      and(eq(decks.folderId, deckFolders.id), eq(decks.userId, deckFolders.userId)),
    )
    .where(eq(deckFolders.userId, userId))
    .groupBy(deckFolders.id, deckFolders.name, deckFolders.createdAt)
    .orderBy(asc(deckFolders.name));

  return rows;
}

/**
 * A new shelf. The name is trimmed and validated here so every caller gets the
 * same rule, and the unique index on (user_id, name) is what actually stops a
 * duplicate — a check-then-insert would race with itself.
 */
export async function createFolder(userId: string, name: string): Promise<DeckFolder> {
  const [row] = await db
    .insert(deckFolders)
    .values({ userId, name: validateFolderName(name) })
    .returning({
      id: deckFolders.id,
      name: deckFolders.name,
      createdAt: deckFolders.createdAt,
    });
  return row;
}

/**
 * Renames a shelf. Same validator as `createFolder`, refused by the same unique
 * index, scoped to the same `user_id` — so a rename cannot reach another
 * player's folder and cannot produce a name their own list already holds.
 *
 * Null when the folder is not this player's or is already gone, which is the
 * same shape `moveDeck` and `deleteFolder` use for that case. A rename to the
 * name the folder already has is a no-op rather than a self-collision: the
 * unique index does not fire against the row being updated.
 */
export async function renameFolder(
  folderId: string,
  userId: string,
  name: string,
): Promise<DeckFolder | null> {
  const [row] = await db
    .update(deckFolders)
    .set({ name: validateFolderName(name) })
    .where(and(eq(deckFolders.id, folderId), eq(deckFolders.userId, userId)))
    .returning({
      id: deckFolders.id,
      name: deckFolders.name,
      createdAt: deckFolders.createdAt,
    });

  return row ?? null;
}

/**
 * Files a deck, or unfiles it with `folderId: null`.
 *
 * The folder is confirmed to be this player's BEFORE the update rather than
 * trusted from the caller: `decks.folder_id` has no user column of its own to
 * constrain, so without this check a deck could be filed onto someone else's
 * shelf by id. Returns false when either the deck or the folder is not theirs,
 * which is the same answer as "there was nothing to move".
 */
export async function moveDeck(
  deckId: string,
  userId: string,
  folderId: string | null,
): Promise<boolean> {
  // Unfiling touches no folder row, so it is one statement and cannot race
  // anything: the column is being cleared, which is what a concurrent delete
  // would have done to it anyway.
  if (folderId === null) {
    const cleared = await db
      .update(decks)
      .set({ folderId: null })
      .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
      .returning({ id: decks.id });
    return cleared.length > 0;
  }

  // Filing takes the FOLDER's lock first, then writes the deck. The order is
  // the point, and it is the order `deleteFolder` already uses: Postgres locks
  // the folder row for the delete and then runs `on delete set null` against
  // the decks. A move that wrote the deck first and let the foreign key take
  // its key-share lock afterwards would take the two rows in the opposite
  // order, and the pair could deadlock — 40P01, an error where the caller asked
  // a question with a false answer.
  //
  // `for key share` rather than `for update`: this only needs the folder's key
  // to stay in place for the length of the transaction, which is exactly what
  // the foreign key needs too. A concurrent delete blocks behind it and then
  // unfiles the deck, which is the same outcome as deleting the folder a moment
  // later — and a delete that got there FIRST leaves this select with no row,
  // so the move reports false instead of failing a foreign key.
  //
  // The folder's `user_id` is in that select, not merely its id: without it a
  // deck could be filed onto another player's shelf, and `decks.folder_id` has
  // no user column of its own to constrain.
  return db.transaction(async (tx) => {
    const locked = await tx.execute<{ id: string }>(sql`
      select id from deck_folders
      where id = ${folderId}::uuid and user_id = ${userId}
      for key share
    `);
    if (locked.rows.length === 0) return false;

    const moved = await tx
      .update(decks)
      .set({ folderId })
      .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
      .returning({ id: decks.id });

    return moved.length > 0;
  });
}

/**
 * Deletes a shelf. The decks on it are unfiled, not deleted — see the note at
 * the top of this file. Returns false when the folder is not this player's or
 * is already gone, so a double submit is not an error.
 */
export async function deleteFolder(folderId: string, userId: string): Promise<boolean> {
  const deleted = await db
    .delete(deckFolders)
    .where(and(eq(deckFolders.id, folderId), eq(deckFolders.userId, userId)))
    .returning({ id: deckFolders.id });

  return deleted.length > 0;
}
