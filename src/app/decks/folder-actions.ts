"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "../../lib/auth";
import { isUuid } from "../../lib/uuid";
import {
  createFolder,
  deleteFolder,
  moveDeck,
  renameFolder,
  type DeckFolder,
} from "../../lib/decks/folders";

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
// REVALIDATION IS `/decks` AND HOME, and nothing else. A folder is not a claim:
// no card changes hands, no deck's contents move, and no availability marker
// anywhere in the app reads `decks.folder_id`. `deckSurfaces`' wider set would
// invalidate three routes that cannot tell the difference.
const folderSurfaces = () => {
  revalidatePath("/decks");
  revalidatePath("/");
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

/** Postgres 23505. Read off the SQLSTATE rather than the message, which is
 *  localised and version-dependent. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && "code" in error
    && (error as { code?: unknown }).code === "23505"
  );
}

/**
 * Returns the folder it made, because the surface selects the new shelf
 * immediately (STATES CR4) and the client cannot derive an id from the name it
 * submitted.
 */
export async function createFolderAction(name: unknown): Promise<CreateFolderResult> {
  if (typeof name !== "string") return { ok: false, reason: "invalid" };
  const userId = await requireUserId();

  try {
    const folder = await createFolder(userId, name);
    folderSurfaces();
    return { ok: true, folder: { id: folder.id, name: folder.name } };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, reason: "duplicate" };
    // `validateFolderName` throws on an empty or control-character name. The
    // field disables its own submit on empty, so this is the hand-crafted call
    // rather than the reachable one — refused, not crashed.
    return { ok: false, reason: "invalid" };
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
  const userId = await requireUserId();

  try {
    const folder = await renameFolder(folderId as string, userId, name);
    // Null is a folder that is not this player's or is already gone. It is not
    // an error and it is not a duplicate — there is nothing to rename.
    if (!folder) return { ok: false, reason: "refused" };
    folderSurfaces();
    return { ok: true, folder: { id: folder.id, name: folder.name } };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, reason: "duplicate" };
    return { ok: false, reason: "invalid" };
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
  if (moved) folderSurfaces();
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
