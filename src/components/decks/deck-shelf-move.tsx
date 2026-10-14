"use client";

import { useCallback, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createFolderAction, moveDeckAction } from "../../app/decks/folder-actions";
import { folderCopy } from "../../lib/copy/folders";
import { FolderCreateDialog } from "./folder-create-dialog";
import type { DeckMove } from "./deck-card-overflow";

/** The deck's shelf and every shelf it could go on, read by the deck page beside its deck list. */
export interface DeckShelf {
  folders: readonly { id: string; name: string }[];
  folderId: string | null;
  folderName: string | null;
}

/**
 * The Decks tile's Move, brought to the deck page's ⋯ menu (Hugh, 2026-10-14). The same move mode
 * and the same create dialog the Decks list uses, fed the page's own read of the shelves. The deck
 * page draws no shelf of its own, so the menu's Move row is the receipt (`Move · Cube night`), held
 * here optimistically and taken back on a refusal, as the list does. The reader stays on the deck;
 * `moveDeckAction` revalidates `/decks`, whose shelves this changed.
 */
export function useDeckShelfMove(deckId: string, shelf: DeckShelf): {
  move: DeckMove;
  dialog: ReactNode;
  announced: string;
} {
  const router = useRouter();
  const [, startMove] = useTransition();
  // The server's shelf, until a move here says otherwise. A new payload (the action's own
  // revalidation, or a move made in another tab) replaces the prediction, adjusted during render.
  const [served, setServed] = useState(shelf);
  const [current, setCurrent] = useState({ id: shelf.folderId, name: shelf.folderName });
  // Folders made here that the server's list had not returned yet: every one, not the last, since
  // a second create can land before any payload does.
  const [made, setMade] = useState<readonly { id: string; name: string }[]>([]);
  if (served !== shelf) {
    setServed(shelf);
    setCurrent({ id: shelf.folderId, name: shelf.folderName });
    setMade((prev) => prev.filter((m) => !shelf.folders.some((f) => f.id === m.id)));
  }
  const pending = made.filter((m) => !shelf.folders.some((f) => f.id === m.id));
  const folders = pending.length
    ? [...shelf.folders, ...pending].sort((a, b) => a.name.localeCompare(b.name))
    : shelf.folders;
  const [creating, setCreating] = useState(false);
  const [closeAfterCreate, setCloseAfterCreate] = useState<{ seq: number } | null>(null);
  const filedOnDismiss = useRef(false);
  const [announced, setAnnounced] = useState("");

  const onMove = useCallback(
    (to: { id: string | null; name: string | null }, failed: string = folderCopy.move.failed) => {
      const was = current;
      setCurrent(to);
      setAnnounced(to.name ? folderCopy.move.announceFiled(to.name) : folderCopy.move.announceUnfiled);
      startMove(async () => {
        const answer = await moveDeckAction(deckId, to.id).catch(() => "threw" as const);
        if (answer === true) return;
        // Outside the action, as the list does: a state update inside it is held by the transition.
        setTimeout(() => {
          setCurrent(was);
          setAnnounced(answer === "threw" ? failed : folderCopy.move.refused);
        }, 0);
        // A rejection may have committed with its response lost, and no payload is coming for it.
        if (answer === "threw") router.refresh();
      });
    },
    [current, deckId, router],
  );

  const move: DeckMove = {
    folders,
    folderId: current.id,
    folderName: current.name,
    onCreateFolder: () => setCreating(true),
    onMove: (to) => onMove(to),
    keepsFocus: true,
    closeAfterCreate,
  };

  const dialog = creating ? (
    <FolderCreateDialog
      onDismiss={() => {
        setCreating(false);
        // The panel that asked for the folder closes and takes focus back to its ⋯.
        if (filedOnDismiss.current) {
          filedOnDismiss.current = false;
          setCloseAfterCreate((prev) => ({ seq: (prev?.seq ?? 0) + 1 }));
        }
      }}
      onCreate={async (name) => {
        const result = await createFolderAction(name);
        if (!result.ok) return result.reason === "duplicate" ? "duplicate" : "invalid";
        setMade((prev) => [...prev, { id: result.folder.id, name: result.folder.name }]);
        // Made from the act, so the deck is filed into it, through the same move as every other door.
        onMove(
          { id: result.folder.id, name: result.folder.name },
          `${folderCopy.create.created(result.folder.name)} ${folderCopy.move.failed}`,
        );
        filedOnDismiss.current = true;
        return null;
      }}
    />
  ) : null;

  return { move, dialog, announced };
}
