// The pure half of a History deck line: the first few living decks by name, the rest of the living counted,
// and the deleted counted apart. Shared by the cart row (decks it was bought for) and the add/upload rows
// (decks the copies went to), and imported by the client list, so it touches no database.

export const CART_DECKS_NAMED = 3;
export type CartDecks = { named: { id: string; name: string }[]; more: number; gone: number };

/** Pure half of the cart's deck line: `living` maps the ids that still exist to their names. */
export function cartDecksOf(ids: readonly string[], living: ReadonlyMap<string, string>): CartDecks {
  const alive = ids.filter((id) => living.has(id));
  return {
    named: alive.slice(0, CART_DECKS_NAMED).map((id) => ({ id, name: living.get(id)! })),
    more: Math.max(alive.length - CART_DECKS_NAMED, 0),
    gone: ids.length - alive.length,
  };
}
