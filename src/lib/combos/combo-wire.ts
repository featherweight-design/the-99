// The combos response on the wire, and back. A piece card (name, image link, colors, type line) is about 170 bytes
// and a busy collection draws the same card in dozens of pairs, so the wire carries each piece once in `pieces` and every
// pair names its two by oracle id. The client expands it back to the pair shape the view and the filters read.
// Types only from `collection-combos` (it holds the database import), so this file is safe in a client bundle.
import type { CollectionComboPair, CollectionComboSides, CollectionCombos, ComboPiece } from "./collection-combos";

export type WirePair = Omit<CollectionComboPair, "a" | "b"> & { a: string; b: string };
export type WireSide = Omit<CollectionCombos, "pairs"> & { pairs: WirePair[] };
export type CollectionCombosWire = { pieces: Record<string, ComboPiece>; both: WireSide; one: WireSide };

export function compactSides(sides: CollectionComboSides): CollectionCombosWire {
  const pieces: Record<string, ComboPiece> = {};
  const side = (s: CollectionCombos): WireSide => ({
    ...s,
    pairs: s.pairs.map(({ a, b, ...rest }) => {
      pieces[a.oracleId] = a;
      pieces[b.oracleId] = b;
      return { ...rest, a: a.oracleId, b: b.oracleId };
    }),
  });
  return { pieces, both: side(sides.both), one: side(sides.one) };
}

export function expandSides(wire: CollectionCombosWire): CollectionComboSides {
  const side = (s: WireSide): CollectionCombos => ({
    ...s,
    pairs: s.pairs.map(({ a, b, ...rest }) => ({ ...rest, a: wire.pieces[a], b: wire.pieces[b] })),
  });
  return { both: side(wire.both), one: side(wire.one) };
}
