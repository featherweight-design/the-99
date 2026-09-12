// Folder names, validated. Pure — a client field imports this to say which rule
// a name broke before it is sent.

import { DECK_NAME_MAX, hasControlChars } from "./deck-name";

/**
 * The same ceiling a deck name gets. Both are player-typed labels that sit in
 * the same lists at the same widths, and two limits would mean a folder name
 * accepted in one field and refused in a neighbouring one for no reason the
 * player can see.
 */
export const FOLDER_NAME_MAX = DECK_NAME_MAX;

/**
 * Trims and checks. The control-character guard is `deck-name`'s, not a second
 * copy: a folder name reaches the same exports and filenames a deck name does,
 * through the deck it files.
 *
 * Throws rather than returning a result, matching `validateDeckName` — the
 * callers are server actions whose failure path is already an exception.
 */
export function validateFolderName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > FOLDER_NAME_MAX || hasControlChars(trimmed)) {
    throw new Error(
      `folder name must be 1-${FOLDER_NAME_MAX} characters without control characters`,
    );
  }
  return trimmed;
}
