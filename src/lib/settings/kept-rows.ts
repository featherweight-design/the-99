// Settings' Kept back rows (menu and Home PR 3; handoff item 10: "Kept back uses the shipped collection row"). Each
// kept card is drawn as the reader's own collection card when the collection holds it, so the row is exactly the one
// `/collection` draws. A card kept back and since let go of from the collection still lists, so it can be released:
// it draws from the catalog alone, at ×0.
import type { BrowseListCard } from "../collection/browse";
import type { KeptCard } from "../social/spare-settings";

const RARITIES = new Set<BrowseListCard["rarity"]>(["common", "uncommon", "rare", "mythic"]);

export function keptRows(kept: readonly KeptCard[], collection: readonly BrowseListCard[]): BrowseListCard[] {
  const owned = new Map(collection.map((c) => [c.oracleId, c]));
  return kept.map((k) => owned.get(k.oracleId) ?? {
    oracleId: k.oracleId,
    name: k.name,
    typeLine: k.typeLine,
    manaCost: k.manaCost,
    rarity: RARITIES.has(k.rarity as BrowseListCard["rarity"]) ? (k.rarity as BrowseListCard["rarity"]) : "common",
    colorIdentity: k.colorIdentity,
    imageUri: k.imageUri,
    printedName: null,
    layout: k.layout,
    quantity: 0,
    setCounts: [],
    primarySetCode: "",
  });
}
