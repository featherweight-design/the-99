// The shelf, as the deck list holds it. Pure — no database import and no
// server-only import — so `DecksView` can hold every one of these as a value.
//
// THE SHELF IS NOT A FILTER, and this file is the code-level form of that
// (handoff decision 7). It never touches `DeckFilters`, `EMPTY_FILTERS`,
// `activeFilterCount`, `filtersToParams` or `filtersFromParams`. That is what
// makes the `Filters` badge and `Clear all filters` unable to move the shelf —
// by construction rather than by care.

/**
 * Which shelf the reader is standing on. `null` is All decks — the unscoped
 * view and the default — and `"none"` is Unfiled, the decks with no folder.
 * Anything else is a folder id.
 *
 * `"none"` rather than a second boolean because the three states are one
 * choice, and a `{ folderId, unfiled }` pair can represent a fourth thing that
 * does not exist.
 */
export type Shelf = string | null | "none";

export const ALL_DECKS = null;
export const UNFILED = "none";

/** The parameter this view owns. Joined to `OWNED_PARAMS` by the caller. */
export const FOLDER_PARAM = "folder";

type FolderLike = { id: string };
type ShelvedDeck = { folderId: string | null };

/**
 * Reads the shelf off the URL, against the folders that actually exist.
 *
 * An id nobody owns falls back to All decks rather than showing an empty grid
 * for a folder that is not there — the same treatment `readList` gives a
 * hand-edited filter value, and the same treatment a folder deleted in another
 * tab needs when this one restores from a stale URL.
 *
 * `none` FALLS BACK TOO WHEN THERE ARE NO FOLDERS. The `Unfiled` segment is not
 * drawn until the first folder exists (`showsUnfiled`), so a bookmarked
 * `?folder=none` would otherwise select a shelf that no control on screen can
 * show as selected — and it would name a subset that is the whole list anyway.
 */
export function shelfFromParams(
  params: URLSearchParams,
  folders: readonly FolderLike[],
): Shelf {
  const raw = params.get(FOLDER_PARAM);
  if (!raw) return ALL_DECKS;
  if (raw === UNFILED) return showsUnfiled(folders) ? UNFILED : ALL_DECKS;
  // Case-insensitively, and the CANONICAL id is what comes back — `isUuid`
  // accepts either case (`src/lib/uuid.ts`), so a link someone upper-cased on
  // the way past still names a real shelf, and everything downstream compares
  // against the id the server gave us rather than the one that was typed.
  return matchFolder(folders, raw)?.id ?? ALL_DECKS;
}

/** The folder a URL value names, whatever case it arrived in. */
export function matchFolder<T extends FolderLike>(
  folders: readonly T[],
  raw: string,
): T | undefined {
  const wanted = raw.toLowerCase();
  return folders.find((f) => f.id.toLowerCase() === wanted);
}

/**
 * The value to write, or null for "write nothing". All decks is serialised as
 * an ABSENCE, the way every default is on this route — a `?folder=all` would be
 * a second spelling of the bare URL.
 */
export function shelfToParam(shelf: Shelf): string | null {
  return shelf;
}

/** The decks this shelf holds, before any filter runs. */
export function narrowToShelf<T extends ShelvedDeck>(decks: readonly T[], shelf: Shelf): T[] {
  if (shelf === null) return [...decks];
  if (shelf === UNFILED) return decks.filter((d) => d.folderId === null);
  return decks.filter((d) => d.folderId === shelf);
}

export type ShelfCounts = {
  /** Every deck the player owns. The All decks segment's figure. */
  all: number;
  /** Decks with no folder. The Unfiled segment's figure. */
  unfiled: number;
  /** Keyed by folder id. A folder with no decks is present at 0, not absent. */
  byFolder: Map<string, number>;
};

/**
 * ONE MAP FEEDS THE SEGMENT AND THE RESULT LINE, and that is the whole point of
 * this function.
 *
 * The handoff says the two figures "agree by construction" (decision 8). They
 * would not if the segment printed `listFolders.deckCount` — a server read —
 * while the result line divided by the list this browser is holding: a move
 * updates the grid immediately and the server figure on the next read, and the
 * two would disagree for a frame on exactly the act that changes both. Both are
 * computed here instead, from the loaded payload, so they move together.
 *
 * `folders` is still needed: a folder holding no decks has no deck row to count
 * and would otherwise be missing from the map rather than present at zero.
 */
export function shelfCounts(
  decks: readonly ShelvedDeck[],
  folders: readonly FolderLike[],
): ShelfCounts {
  const byFolder = new Map<string, number>(folders.map((f) => [f.id, 0]));
  let unfiled = 0;

  for (const deck of decks) {
    if (deck.folderId === null) {
      unfiled += 1;
      continue;
    }
    // A deck filed under a folder that is not in the list — a folder deleted
    // between the two reads — counts toward All decks and nothing else. It is
    // not unfiled, because the payload says it has a folder.
    const current = byFolder.get(deck.folderId);
    if (current !== undefined) byFolder.set(deck.folderId, current + 1);
  }

  return { all: decks.length, unfiled, byFolder };
}

/** The figure the selected shelf's segment prints, and the result line's denominator. */
export function shelfTotal(counts: ShelfCounts, shelf: Shelf): number {
  if (shelf === null) return counts.all;
  if (shelf === UNFILED) return counts.unfiled;
  return counts.byFolder.get(shelf) ?? 0;
}

/**
 * Whether the `Unfiled` segment draws at all.
 *
 * It does not until the first folder exists (handoff decision 13): with no
 * folders every deck is unfiled, so a bucket equal to the whole list is a
 * distinction without a difference.
 */
export function showsUnfiled(folders: readonly FolderLike[]): boolean {
  return folders.length > 0;
}
