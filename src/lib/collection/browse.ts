import { cache } from "react";
import { eq } from "drizzle-orm";

/** Rarity ordering for the "rarity" sort key. */
const RARITY_ORDER: Record<string, number> = { common: 0, uncommon: 1, rare: 2, mythic: 3 };
const WUBRG_ORDER: Record<string, number> = { W: 0, U: 1, B: 2, R: 3, G: 4 };

export type BrowseCard = {
  oracleId: string;
  name: string;
  typeLine: string;
  manaCost: string | null;
  oracleText: string | null;
  keywords: string[];
  rarity: "common" | "uncommon" | "rare" | "mythic";
  colorIdentity: string[];
  imageUri: string | null;
  quantity: number;
  setCodes: string[];
  primarySetCode: string;
};

export type BrowseFilters = {
  search: string;
  colors: string[];       // subset of ["W","U","B","R","G"]
  type: string | null;    // substring match against typeLine
  setCode: string | null; // matches any variant setCode, case-insensitive
};

export type SortKey = "name" | "quantity" | "set" | "rarity" | "color";

export function cssUrl(uri: string): string {
  return `url("${encodeURI(uri).replaceAll('"', "%22")}")`;
}

/** Shared WUBRG palette — used by mana-pips, rows-view, chip-row, card-modal. */
export const WUBRG_HEX: Record<string, string> = {
  W: "#E8E4D6", U: "#4A7FB5", B: "#5B5566", R: "#C05A48", G: "#6B9E63",
};

/** Coarse card-type options shown in the Type ▾ dropdown (property table §Filter Button). */
export const AVAILABLE_TYPES = [
  "Creature", "Instant", "Sorcery", "Artifact", "Enchantment", "Planeswalker", "Land",
] as const;

type RawCollectionRow = {
  oracleId: string;
  quantity: number;
  setCode: string;
  name: string;
  typeLine: string;
  manaCost: string | null;
  oracleText: string | null;
  keywords: string[];
  rarity: string;
  colorIdentity: string[];
  imageUri: string | null;
};

/**
 * Aggregate collection_items × cards rows into one BrowseCard per oracleId.
 * Quantities sum across setCode/foil variants; setCodes collect distinct values;
 * primarySetCode = min(setCodes) lexicographic so the row/tile caption stays stable.
 */
export function aggregateCollection(rows: RawCollectionRow[]): BrowseCard[] {
  const byOracle = new Map<string, BrowseCard>();
  for (const r of rows) {
    const existing = byOracle.get(r.oracleId);
    if (existing) {
      existing.quantity += r.quantity;
      if (!existing.setCodes.includes(r.setCode)) existing.setCodes.push(r.setCode);
      if (r.setCode < existing.primarySetCode) existing.primarySetCode = r.setCode;
    } else {
      byOracle.set(r.oracleId, {
        oracleId: r.oracleId,
        name: r.name,
        typeLine: r.typeLine,
        manaCost: r.manaCost,
        oracleText: r.oracleText,
        keywords: r.keywords,
        rarity: (RARITY_ORDER[r.rarity] !== undefined ? r.rarity : "common") as BrowseCard["rarity"],
        colorIdentity: r.colorIdentity,
        imageUri: r.imageUri,
        quantity: r.quantity,
        setCodes: [r.setCode],
        primarySetCode: r.setCode,
      });
    }
  }
  return [...byOracle.values()];
}

export function filterCards(list: BrowseCard[], f: BrowseFilters): BrowseCard[] {
  const search = f.search.trim().toLowerCase();
  const type = f.type?.toLowerCase() ?? null;
  const setCode = f.setCode?.toLowerCase() ?? null;
  return list.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search)) return false;
    if (f.colors.length > 0) {
      const id = new Set(c.colorIdentity);
      for (const col of f.colors) if (!id.has(col)) return false;
    }
    if (type && !c.typeLine.toLowerCase().includes(type)) return false;
    if (setCode && !c.setCodes.some((s) => s.toLowerCase() === setCode)) return false;
    return true;
  });
}

function colorSortKey(identity: string[]): number {
  if (identity.length === 0) return 100;         // colorless last
  if (identity.length >= 2) return 50;           // multicolor after monocolor
  return WUBRG_ORDER[identity[0]] ?? 40;         // mono: WUBRG position (0–4)
}

export function sortCards(list: BrowseCard[], sort: SortKey): BrowseCard[] {
  const copy = [...list];
  switch (sort) {
    case "name":
      copy.sort((a, b) => a.name.localeCompare(b.name));
      return copy;
    case "quantity":
      copy.sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name));
      return copy;
    case "set":
      copy.sort((a, b) => a.primarySetCode.localeCompare(b.primarySetCode) || a.name.localeCompare(b.name));
      return copy;
    case "rarity":
      copy.sort((a, b) => (RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]) || a.name.localeCompare(b.name));
      return copy;
    case "color":
      copy.sort((a, b) => (colorSortKey(a.colorIdentity) - colorSortKey(b.colorIdentity)) || a.name.localeCompare(b.name));
      return copy;
  }
}

/**
 * Server query — joins collection_items × cards for the user and aggregates.
 * Untested-query pattern (see recommend.ts / summary.ts): thin, logic-free SQL,
 * pure aggregation covered by tests above.
 */
export const loadBrowseCards = cache(async function loadBrowseCards(
  userId: string,
): Promise<BrowseCard[]> {
  const { db } = await import("../../db");
  const { cards, collectionItems } = await import("../../db/schema");
  const rows = await db
    .select({
      oracleId: collectionItems.oracleId,
      quantity: collectionItems.quantity,
      setCode: collectionItems.setCode,
      name: cards.name,
      typeLine: cards.typeLine,
      manaCost: cards.manaCost,
      oracleText: cards.oracleText,
      keywords: cards.keywords,
      rarity: cards.rarity,
      colorIdentity: cards.colorIdentity,
      imageUri: cards.imageUri,
    })
    .from(collectionItems)
    .innerJoin(cards, eq(collectionItems.oracleId, cards.oracleId))
    .where(eq(collectionItems.userId, userId));
  return aggregateCollection(rows);
});
