import { cache } from "react";
import { and, eq, sql } from "drizzle-orm";

/** Rarity ordering for the "rarity" sort key. */
const RARITY_ORDER: Record<string, number> = { common: 0, uncommon: 1, rare: 2, mythic: 3 };
const WUBRG_ORDER: Record<string, number> = { W: 0, U: 1, B: 2, R: 3, G: 4 };

/**
 * One printing the user owns, with the image resolved for that printing specifically.
 * A card owned in four printings has four of these — a single resolved URI on BrowseCard
 * could not represent that, which is why the modal caption reads set + collector number here.
 */
export type BrowsePrinting = {
  setCode: string;          // uppercased for display; stored lowercase
  collectorNumber: string;  // "" for exports that carry no collector number
  quantity: number;
  imageUri: string | null;
};

export type BrowseCard = {
  oracleId: string;
  name: string;
  typeLine: string;
  manaCost: string | null;
  oracleText: string | null;
  keywords: string[];
  rarity: "common" | "uncommon" | "rare" | "mythic";
  colorIdentity: string[];
  /** The primary printing's image — first non-null across printings in display order. */
  imageUri: string | null;
  quantity: number;
  printings: BrowsePrinting[];
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

/** Subtitle date per design: "today" / "yesterday" / "Jul 12" (year appended when not current). */
export function formatLastUpdated(date: Date, now: Date = new Date()): string {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((day(now) - day(date)) / 86_400_000);
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (date.getFullYear() !== now.getFullYear()) opts.year = "numeric";
  return date.toLocaleDateString("en-US", opts);
}

/** Shared WUBRG palette — used by mana-pips, rows-view, chip-row, card-modal. */
export const WUBRG_HEX: Record<string, string> = {
  W: "#E8E4D6", U: "#4A7FB5", B: "#5B5566", R: "#C05A48", G: "#6B9E63",
};

/** Coarse card-type options shown in the Type ▾ dropdown (property table §Filter Button). */
export const AVAILABLE_TYPES = [
  "Creature", "Instant", "Sorcery", "Artifact", "Enchantment", "Planeswalker", "Land",
] as const;

export type RawCollectionRow = {
  oracleId: string;
  quantity: number;
  setCode: string;
  collectorNumber: string;
  name: string;
  typeLine: string;
  manaCost: string | null;
  oracleText: string | null;
  keywords: string[];
  rarity: string;
  colorIdentity: string[];
  /** Tier 1 — the printing joined on collection_items.scryfall_id. */
  exactImageUri: string | null;
  /** Tier 2 — the representative printing for (oracle_id, set_code). */
  representativeImageUri: string | null;
  /** Tier 3 — the oracle-level catalog image, i.e. today's behaviour. */
  cardImageUri: string | null;
};

/**
 * Image resolution (§3.5) — a COALESCE on non-null VALUE, never a first-tier-wins cascade.
 *
 * Selecting on match success would send a double-faced card, whose printing row exists but
 * whose top-level image_uris is absent, straight to a blank tile. Falling through on null is
 * the whole point: tier 4 (the identity gradient, already implemented downstream) only applies
 * when all three tiers are genuinely null.
 */
export function resolveImageUri(r: {
  exactImageUri: string | null;
  representativeImageUri: string | null;
  cardImageUri: string | null;
}): string | null {
  return r.exactImageUri ?? r.representativeImageUri ?? r.cardImageUri ?? null;
}

/** Digits-only prefix of a collector number, or null when it has none ("★"). */
function collectorNumberSortKey(collectorNumber: string): number {
  const digits = collectorNumber.replace(/\D/g, "");
  return digits === "" ? Number.MAX_SAFE_INTEGER : Number(digits);
}

/** Deterministic printing order: set code, then natural collector number, then the raw value. */
function comparePrintings(a: BrowsePrinting, b: BrowsePrinting): number {
  if (a.setCode !== b.setCode) return a.setCode < b.setCode ? -1 : 1;
  const na = collectorNumberSortKey(a.collectorNumber);
  const nb = collectorNumberSortKey(b.collectorNumber);
  if (na !== nb) return na - nb;
  if (a.collectorNumber === b.collectorNumber) return 0;
  return a.collectorNumber < b.collectorNumber ? -1 : 1;
}

/**
 * Aggregate collection_items × printings × cards rows into one BrowseCard per oracleId.
 *
 * Quantities sum across printings; printings are grouped on (setCode, collectorNumber) rather
 * than on set alone, so the same card in two arts is two entries. Set codes are uppercased for
 * display — they are stored lowercase so the printings join is exact (§3.3), but the captions
 * have always read "C21".
 *
 * The card-level imageUri is the first non-null image in printing order, not "whatever row the
 * database returned first": under the printing-level primary key, "first" is arbitrary.
 */
export function aggregateCollection(rows: RawCollectionRow[]): BrowseCard[] {
  const byOracle = new Map<string, BrowseCard>();
  const printingsByOracle = new Map<string, Map<string, BrowsePrinting>>();
  for (const r of rows) {
    const setCode = r.setCode.toUpperCase();
    const printing: BrowsePrinting = {
      setCode,
      collectorNumber: r.collectorNumber,
      quantity: r.quantity,
      imageUri: resolveImageUri(r),
    };
    const existing = byOracle.get(r.oracleId);
    if (existing) {
      existing.quantity += r.quantity;
      if (!existing.setCodes.includes(setCode)) existing.setCodes.push(setCode);
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
        imageUri: null,
        quantity: r.quantity,
        printings: [],
        setCodes: [setCode],
        primarySetCode: setCode,
      });
      printingsByOracle.set(r.oracleId, new Map());
    }
    // Finishes of one printing share art, so they collapse to a single entry here.
    const printings = printingsByOracle.get(r.oracleId)!;
    const printingKey = `${setCode}|${r.collectorNumber}`;
    const seen = printings.get(printingKey);
    if (seen) {
      seen.quantity += r.quantity;
      seen.imageUri ??= printing.imageUri;
    } else {
      printings.set(printingKey, printing);
    }
  }

  for (const card of byOracle.values()) {
    card.printings = [...printingsByOracle.get(card.oracleId)!.values()].sort(comparePrintings);
    card.setCodes.sort();
    const primary = primaryPrinting(card.printings);
    card.primarySetCode = primary.setCode;
    card.imageUri = primary.imageUri;
  }
  return [...byOracle.values()];
}

/**
 * The one printing a card is represented by: the first in display order that has art, falling
 * back to the first overall when the user owns no printing with an image.
 *
 * Art and caption MUST come from this same printing. Picking the image from the first
 * image-bearing printing while captioning the first printing outright is #84 again in miniature:
 * the tile would show one printing's art under another printing's set code.
 */
function primaryPrinting(printings: BrowsePrinting[]): BrowsePrinting {
  return printings.find((p) => p.imageUri !== null) ?? printings[0];
}

/**
 * Modal caption for the printing whose art is on screen: "C21 · 263", plus a count of the
 * other printings owned. Grid and row captions stay on primarySetCode alone — they are one
 * line of a dense list — but the modal shows one specific piece of art and has to say which.
 */
export function printingCaption(card: BrowseCard): string {
  const primary = primaryPrinting(card.printings);
  const base = primary?.collectorNumber
    ? `${primary.setCode} · ${primary.collectorNumber}`
    : card.primarySetCode;
  const others = card.printings.length - 1;
  return others > 0 ? `${base} +${others} more` : base;
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
  const { cards, collectionItems, printings } = await import("../../db/schema");
  const { alias } = await import("drizzle-orm/pg-core");
  // Two aliases of `printings`: the exact printing owned (tier 1) and the representative
  // printing for that (oracle, set) (tier 2). Both are LEFT joins — a missing row must fall
  // through to the next tier, and resolveImageUri falls through on a null image too.
  const exact = alias(printings, "exact_printing");
  const representative = alias(printings, "representative_printing");
  const rows = await db
    .select({
      oracleId: collectionItems.oracleId,
      quantity: collectionItems.quantity,
      setCode: collectionItems.setCode,
      collectorNumber: collectionItems.collectorNumber,
      name: cards.name,
      typeLine: cards.typeLine,
      manaCost: cards.manaCost,
      oracleText: cards.oracleText,
      keywords: cards.keywords,
      rarity: cards.rarity,
      colorIdentity: cards.colorIdentity,
      exactImageUri: exact.imageUri,
      representativeImageUri: representative.imageUri,
      cardImageUri: cards.imageUri,
    })
    .from(collectionItems)
    .innerJoin(cards, eq(collectionItems.oracleId, cards.oracleId))
    .leftJoin(exact, eq(exact.scryfallId, collectionItems.scryfallId))
    .leftJoin(
      representative,
      and(
        eq(representative.oracleId, collectionItems.oracleId),
        // set_code is stored lowercase on both sides since 0008; lower() here keeps any row
        // written by an older build from silently dropping to tier 3.
        eq(representative.setCode, sql`lower(${collectionItems.setCode})`),
        eq(representative.isRepresentative, true),
      ),
    )
    .where(eq(collectionItems.userId, userId));
  return aggregateCollection(rows);
});
