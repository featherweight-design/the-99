/**
 * When "Upgrade precon" shows on the deck page (addendum A2c, G16; STATES-deck-page.md). Pure, so the page's loader and the
 * Apply's transaction ask the same question of what each read. The button shows while the deck is still the box:
 *
 * - it has a precon origin (`decks.built_from_precon`, read as v0);
 * - nothing is committed after v0. A started deck's only version is its start version (`startVersionId`: its v0, or the v1
 *   a start made before starts committed v0, which still holds the box), and a deck linked after the fact has no version at
 *   all (R3 K14: it stays a brew). Any other version is the player's, and the button is gone for good;
 * - its live list and helm are the box's own (call 4, ruled with the round): no changes since v0, an Apply included.
 *
 * The swaps were worked out from the box's list, so they apply only over it: the gate is what makes "never apply over the
 * player's own changes" impossible rather than checked.
 */

type Qty = { oracleId: string; quantity: number };

/** A helm, primary and partner, as a deck, a version row or a precon's commanders carry it. */
export type Helm = { commanderOracleId: string | null; partnerOracleId: string | null };
/** A helm as one key: a pair in either order is one helm (`isStartVersion` compares by it too). */
export const helmKey = (h: Helm) => [h.commanderOracleId, h.partnerOracleId].filter((id) => id !== null).sort().join(",");

export type GateBox = Helm & { cards: readonly Qty[] };

/** The same cards at the same counts, in any order. */
export function sameList(a: readonly Qty[], b: readonly Qty[]): boolean {
  const want = new Map<string, number>();
  for (const c of a) want.set(c.oracleId, (want.get(c.oracleId) ?? 0) + c.quantity);
  const have = new Map<string, number>();
  for (const c of b) have.set(c.oracleId, (have.get(c.oracleId) ?? 0) + c.quantity);
  return want.size === have.size && [...want].every(([id, n]) => have.get(id) === n);
}

/** The same commander(s), a pair in either order. */
export const sameHelm = (a: Helm, b: Helm) => helmKey(a) === helmKey(b);

/**
 * Whether the deck can take an upgrade now. `versionIds` is every version the deck has committed; `startVersionId` is the one
 * that IS the box, or null for a linked deck (`readDeckOriginAndStart`). Null `box`: no precon origin.
 */
export function upgradeGateOpen(
  box: GateBox | null,
  startVersionId: string | null,
  versionIds: readonly string[],
  live: GateBox,
): boolean {
  if (!box) return false;
  const nothingAfterV0 = startVersionId === null
    ? versionIds.length === 0
    : versionIds.length === 1 && versionIds[0] === startVersionId;
  return nothingAfterV0 && sameHelm(box, live) && sameList(box.cards, live.cards);
}
