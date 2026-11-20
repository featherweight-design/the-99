import { sortDecks } from "./sort";

// Pure: the client's optimistic reorder and the server's transaction share one plan.

/** The most decks one reorder may carry. A player's whole library, with room to spare. */
export const MAX_REORDER = 500;

/** What the plan reads of a deck: the Custom order's own sort fields, plus the shelf. */
export type OrderRow = {
  id: string;
  folderId: string | null;
  createdAt: Date;
  sortPosition: number | null;
};

/**
 * The positions to write for a reorder, or null when the ids are not a set this player may
 * arrange (C8).
 *
 * `ids` must be the caller's WHOLE deck set, or exactly one shelf's decks (a folder's, or the
 * unfiled ones). A shelf's decks are permuted among the slots they already hold in the current
 * Custom order, so every other deck keeps its place. The result numbers EVERY deck 0..n-1, so
 * a first reorder materializes the order the player was looking at, nulls included.
 */
export function planReorder(
  rows: readonly OrderRow[],
  ids: readonly string[],
): { id: string; position: number }[] | null {
  if (ids.length === 0 || new Set(ids).size !== ids.length) return null;
  const byId = new Map(rows.map((r) => [r.id, r]));
  if (ids.some((id) => !byId.has(id))) return null;

  // The current order is exactly what the Custom sort shows.
  const current = sortDecks(
    rows.map((r) => ({ ...r, name: "", lastPlayedAt: null })),
    "custom",
  ).map((r) => r.id);

  if (ids.length === rows.length) return ids.map((id, position) => ({ id, position }));

  const shelf = byId.get(ids[0])!.folderId;
  const members = rows.filter((r) => r.folderId === shelf);
  if (members.length !== ids.length) return null;

  const next = [...current];
  let k = 0;
  current.forEach((id, slot) => {
    if (byId.get(id)!.folderId === shelf) next[slot] = ids[k++];
  });
  return next.map((id, position) => ({ id, position }));
}
