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
 * `ids` is the list Arrange was showing: refused when empty, duplicated, or naming a deck that is not
 * the caller's. Decks that arrived since Arrange opened (created, or moved onto the shelf) are not in
 * `ids`, and a reorder must not fail forever over them.
 *
 * - Shelf mode: every id shares one folder (null = unfiled) and there are fewer ids than decks. The
 *   shelf's decks missing from `ids` take that shelf's first slots, then `ids` in order; every other
 *   deck keeps its slot in the current Custom order.
 * - Whole-set mode: anything else (including ids that span folders). Decks missing from `ids` go
 *   first, in the current Custom order, then `ids` in order.
 *
 * The result numbers EVERY deck 0..n-1 exactly once, so a first reorder materializes the order the
 * player was looking at, nulls included.
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

  const shelf = byId.get(ids[0])!.folderId;
  const oneShelf = ids.every((id) => byId.get(id)!.folderId === shelf);

  if (oneShelf && ids.length < rows.length) {
    const inIds = new Set(ids);
    const arranged = [
      ...current.filter((id) => byId.get(id)!.folderId === shelf && !inIds.has(id)),
      ...ids,
    ];
    const next = [...current];
    let k = 0;
    current.forEach((id, slot) => {
      if (byId.get(id)!.folderId === shelf) next[slot] = arranged[k++];
    });
    return next.map((id, position) => ({ id, position }));
  }

  const inIds = new Set(ids);
  const next = [...current.filter((id) => !inIds.has(id)), ...ids];
  return next.map((id, position) => ({ id, position }));
}
