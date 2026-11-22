// The collection list as the data cache holds it: the wire's own columnar encoding with every card
// whole, compressed. SERVER ONLY: `cache/packed` reaches for node:zlib, and `list-wire` (which the
// browser decodes with) must stay free of it, so the two live apart.
import { packJson, unpackJson } from "../cache/packed";
import type { BrowseListCard } from "./browse";
import { decodeCollection, encodeCollection, type CollectionWire } from "./list-wire";

export function packCollection(cards: BrowseListCard[]): string {
  return packJson(encodeCollection(cards, null));
}

export function unpackCollection(packed: string): BrowseListCard[] {
  // Every card in the entry is whole (no `keep`), so none decodes withheld.
  return decodeCollection(unpackJson<CollectionWire>(packed)) as BrowseListCard[];
}
