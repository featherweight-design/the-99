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

/** Postgres 23503. The driver hands the SQLSTATE back on the error object; a
 *  message match would break the first time a locale or a version reworded it. */
function isForeignKeyViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error
    && (error as { code?: unknown }).code === "23503";
}

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
  // ONE STATEMENT, plus one translated error, and both halves are needed.
  //
  // The statement replaces a select-then-update pair, which widened the window
  // in which a folder could be deleted between the two. The `exists` is not a
  // lock, though, so the window is narrowed rather than closed: a delete that
  // commits after this statement's snapshot but before the foreign key's own
  // check raises 23503 on a question whose honest answer is false. That is what
  // the catch below is for — a folder that no longer exists is a folder there
  // was nothing to move onto, which is exactly what a false return says. The
  // alternative, a transaction taking `for key share` on the folder row, buys a
  // lock and a round trip to report the same answer.
  //
  // The folder's `user_id` is in the `exists`, not merely its id: without it a
  // deck could be filed onto another player's shelf by id, and `decks.folder_id`
  // has no user column of its own to constrain.
  const target = sql.param(folderId);
  try {
    const moved = await db.execute<{ id: string }>(sql`
      update decks set folder_id = ${target}::uuid
      where id = ${deckId}::uuid
        and user_id = ${userId}
        and (
          ${target}::uuid is null
          or exists (
            select 1 from deck_folders f
            where f.id = ${target}::uuid and f.user_id = ${userId}
          )
        )
      returning id
    `);

    return moved.rows.length > 0;
  } catch (error) {
    // ONLY the foreign key, and only this one. Anything else is a real failure
    // and has to keep travelling: a caller told `false` by a connection error
    // would report "that folder is gone" about a folder that is still there.
    if (isForeignKeyViolation(error)) return false;
    throw error;
  }
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
