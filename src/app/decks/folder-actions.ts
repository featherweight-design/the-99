"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "../../lib/auth";
import { isUuid } from "../../lib/uuid";
import { isUniqueViolation } from "../../lib/db-error";
import {
  createFolder,
  deleteFolder,
  moveDeck,
  renameFolder,
  type DeckFolder,
} from "../../lib/decks/folders";
import { validateFolderName } from "../../lib/decks/folder-name";

// The four acts on a shelf. Separate from `actions.ts` because nothing here
// touches a decklist, a version or a claim — the one write that reaches a deck
// changes which shelf it sits on, and that changes no card's availability.
//
// EVERY ARGUMENT IS CHECKED AT RUNTIME, and the types are not the check. These
// are Server Actions: their parameters arrive over the wire, so a
// `folderId: string` signature is a claim about the caller rather than a fact
// about the value. Unchecked, a non-uuid id reaches the `::uuid` cast inside
// `moveDeck` and returns a 500 to a question whose honest answer is `false`.
//
// The user id comes from the session, never from the caller. Each query below
// also carries `user_id` in its own where clause, so a folder that is not this
// player's fails to match rather than being touched.
//
// REVALIDATION IS `/decks` AND THE DECK PAGE, AND ONLY THOSE. A folder is not a
// claim — no card changes hands, no deck's contents move, and no availability
// marker anywhere reads `decks.folder_id` — so `deckSurfaces`' wider set would
// invalidate routes that cannot tell the difference. Home is in that set: it
// renders decks through `ResumeDecks`, which draws no folder, and evicting it
// would make the next visit pay for its collection, ranking and availability
// reads to render output that did not change. The deck page draws the shelves in
// its header menu's Move (the deck's own shelf and every shelf it can go to), so
// a move, create, rename or delete retires it too; `[id]` with "page", or
// `revalidatePath` does nothing for a dynamic route.
const folderSurfaces = () => {
  revalidatePath("/decks");
  revalidatePath("/decks/[id]", "page");
};

/**
 * `{ ok: false }` carries a reason because exactly one refusal has to be said
 * in words — a duplicate name, which is the unique index's answer and the only
 * thing the player can act on. Everything else is `refused`: a folder that is
 * not theirs, or an argument that never was one.
 */
export type CreateFolderResult =
  | { ok: true; folder: Pick<DeckFolder, "id" | "name"> }
  | { ok: false; reason: "duplicate" | "invalid" | "refused" };

/**
 * The name rule, asked before the write rather than caught after it.
 * `validateFolderName` throws — it is shared with the deck-name path, whose
 * callers want the exception — so this is the boolean form of the same rule and
 * not a second copy of it.
 */
function isValidName(name: string): boolean {
  try {
    validateFolderName(name);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the folder it made, because the surface selects the new shelf
 * immediately (STATES CR4) and the client cannot derive an id from the name it
 * submitted.
 */
export async function createFolderAction(name: unknown): Promise<CreateFolderResult> {
  if (typeof name !== "string") return { ok: false, reason: "invalid" };
  // VALIDATED BEFORE THE WRITE, not by catching what the write throws. The
  // validator is pure, so the only refusal it can produce is a name rule — and
  // catching it downstream would put every database failure in the same branch,
  // reporting an outage as bad input.
  if (!isValidName(name)) return { ok: false, reason: "invalid" };
  const userId = await requireUserId();

  try {
    const folder = await createFolder(userId, name);
    folderSurfaces();
    return { ok: true, folder: { id: folder.id, name: folder.name } };
  } catch (error) {
    // ONLY the unique index. Everything else is a real failure and keeps
    // travelling to the action's error boundary: a caller told "invalid" by a
    // timeout would be shown a name refusal for a name that was fine.
    if (isUniqueViolation(error)) return { ok: false, reason: "duplicate" };
    throw error;
  }
}

export type RenameFolderResult =
  | { ok: true; folder: Pick<DeckFolder, "id" | "name"> }
  | { ok: false; reason: "duplicate" | "invalid" | "refused" };

export async function renameFolderAction(
  folderId: unknown,
  name: unknown,
): Promise<RenameFolderResult> {
  if (!isUuid(folderId) || typeof name !== "string") return { ok: false, reason: "invalid" };
  if (!isValidName(name)) return { ok: false, reason: "invalid" };
  const userId = await requireUserId();

  try {
    const folder = await renameFolder(folderId as string, userId, name);
    // Null is a folder that is not this player's or is already gone. It is not
    // an error and it is not a duplicate — there is nothing to rename.
    //
    // Revalidated anyway, exactly as the delete's no-op is: if another tab
    // removed the folder, the payload this caller is looking at still names it,
    // and that list is the thing that is stale.
    if (!folder) {
      folderSurfaces();
      return { ok: false, reason: "refused" };
    }
    folderSurfaces();
    return { ok: true, folder: { id: folder.id, name: folder.name } };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, reason: "duplicate" };
    throw error;
  }
}

/**
 * Files a deck, or unfiles it with `null`. One control does both, because
 * `moveDeck` takes `null` for exactly that.
 *
 * `false` means "not yours, or gone" (STATES M6) and never a crash: the row
 * reverts to the shelf it named, and nothing announces a success.
 */
export async function moveDeckAction(deckId: unknown, folderId: unknown): Promise<boolean> {
  if (!isUuid(deckId)) return false;
  if (folderId !== null && !isUuid(folderId)) return false;
  const userId = await requireUserId();

  const moved = await moveDeck(deckId as string, userId, (folderId as string | null) ?? null);
  // Revalidated either way, as the other two no-ops are: `false` means the deck
  // or the folder went while this caller was looking at a list that still shows
  // both. A wire-invalid argument returned above and never reaches this.
  folderSurfaces();
  return moved;
}

/**
 * The decks on the shelf are unfiled, never deleted — that is the foreign key's
 * `on delete set null`, not a promise this action keeps.
 *
 * `false` is DONE, not an error (handoff decision 25): the folder is already
 * gone, or was never this player's, and a double submit is not a failure.
 */
export async function deleteFolderAction(folderId: unknown): Promise<boolean> {
  if (!isUuid(folderId)) return false;
  const userId = await requireUserId();

  const deleted = await deleteFolder(folderId as string, userId);
  // Revalidated on a delete that found nothing too: the caller is looking at a
  // list that still names it, and that list is what is stale.
  folderSurfaces();
  return deleted;
}
