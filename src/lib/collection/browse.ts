import { cache } from "react";
import { and, eq, sql } from "drizzle-orm";
// Type-only, so the set-filter → browse dependency stays one-way at runtime.
import type { OwnedSetMeta } from "./set-filter";

/** Rarity ordering for the "rarity" sort key. */
const RARITY_ORDER: Record<string, number> = { common: 0, uncommon: 1, rare: 2, mythic: 3 };
const WUBRG_ORDER: Record<string, number> = { W: 0, U: 1, B: 2, R: 3, G: 4 };

/**
 * One printing the user owns, with the image resolved for that printing specifically.
 * A card owned in four printings has four of these — a single resolved URI on BrowseCard
 * could not represent that, which is why the modal caption reads set + collector number here.
 */
export type BrowsePrinting = {
  setCode: string;           // uppercased for display; stored lowercase
  /** From the `sets` catalog. Null when no row exists — callers fall back to setCode. */
  setName: string | null;
  collectorNumber: string;   // "" for exports that carry no collector number
  /** ISO date from `sets`, for the picker's newest-first set grouping. Null sorts last. */
  releasedAt: string | null;
  quantity: number;
  /**
   * Copies owned per finish, e.g. {nonfoil: 3, foil: 1}. Finishes of one printing share art
   * and so collapse into one entry, but the picker names the breakdown when it is not plain
   * nonfoil — otherwise "×4" would hide that one of them is the foil.
   */
  finishes: Partial<Record<Finish, number>>;
  imageUri: string | null;
};

export type Finish = "nonfoil" | "foil" | "etched";

/** The printing a user chose to represent a card. Set code uppercased, as BrowsePrinting is. */
export type PreferredPrinting = { setCode: string; collectorNumber: string };

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
  /**
   * The stored pick, or null when the user has never chosen. Present even when that printing is
   * no longer owned — the picker renders it as a dormant tile so the pin stays clearable, and
   * the art quietly falls back through the remaining tiers.
   */
  preferredPrinting: PreferredPrinting | null;
};

export type BrowseFilters = {
  search: string;
  colors: string[];       // subset of ["W","U","B","R","G"]
  type: string | null;    // substring match against typeLine
  /** Multi-select (#86): a card matches when ANY selected code is one of its setCodes. */
  setCodes: string[];
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
  finish: Finish;
  name: string;
  typeLine: string;
  manaCost: string | null;
  oracleText: string | null;
  keywords: string[];
  rarity: string;
  colorIdentity: string[];
  /** From `sets`, joined on the holding's set code. Null when the catalog has no row. */
  setName: string | null;
  releasedAt: string | null;
  /**
   * The user's stored pick for this oracle id, lowercase as stored. Null when unset. Constant
   * across every row of an oracle — the preference is per card, not per holding.
   *
   * There is deliberately no `preferredImageUri` tier here (§3.5 tier 0). This function resolves
   * ONE PRINTING's art, and the preference is oracle-level: a tier-0 arm would paint every
   * printing tile with the chosen printing's art, so the picker would show eleven copies of the
   * same image. Tier 0 is applied where it belongs — in `primaryPrinting`, which selects WHICH
   * printing represents the card. The chosen printing's own art then resolves through tiers 1-3
   * exactly like any other, which is also what makes the null-image edge case fall through for
   * free.
   */
  preferredSetCode: string | null;
  preferredCollectorNumber: string | null;
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

/**
 * A collector number's digits with every non-digit stripped, so "12a" and "A-12" both sort as 12
 * and numberless values like "★" sort last. Deliberately the same rule as `numericPart` in
 * transform-printings.ts: browse order has to agree with the order the ingest chose the
 * representative printing by, or a tile shows one printing's art under another's caption.
 */
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
      setName: r.setName,
      collectorNumber: r.collectorNumber,
      releasedAt: r.releasedAt,
      quantity: r.quantity,
      finishes: { [r.finish]: r.quantity },
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
        // Uppercased to match BrowsePrinting.setCode — the preference is stored lowercase, and
        // comparing the two raw would silently never match.
        preferredPrinting: r.preferredSetCode === null
          ? null
          : {
            setCode: r.preferredSetCode.toUpperCase(),
            collectorNumber: r.preferredCollectorNumber ?? "",
          },
      });
      printingsByOracle.set(r.oracleId, new Map());
    }
    // Finishes of one printing share art, so they collapse to a single entry here.
    const printings = printingsByOracle.get(r.oracleId)!;
    const printingKey = `${setCode}|${r.collectorNumber}`;
    const seen = printings.get(printingKey);
    if (seen) {
      seen.quantity += r.quantity;
      seen.finishes[r.finish] = (seen.finishes[r.finish] ?? 0) + r.quantity;
      seen.imageUri ??= printing.imageUri;
    } else {
      printings.set(printingKey, printing);
    }
  }

  for (const card of byOracle.values()) {
    card.printings = [...printingsByOracle.get(card.oracleId)!.values()].sort(comparePrintings);
    card.setCodes.sort();
    const primary = primaryPrinting(card.printings, card.preferredPrinting);
    card.primarySetCode = primary.setCode;
    card.imageUri = primary.imageUri;
  }
  return [...byOracle.values()];
}

/** Whether a printing is the one a preference names. Both sides are uppercased set codes. */
export function matchesPreference(p: BrowsePrinting, pref: PreferredPrinting | null): boolean {
  return pref !== null && p.setCode === pref.setCode && p.collectorNumber === pref.collectorNumber;
}

/**
 * The one printing a card is represented by (§3.5 tier 0): the user's pick when they still own
 * it, else the first in display order that has art, else the first overall.
 *
 * The pick wins even when its own image is null. The caption states the user's intent, which
 * stays true when the art cannot render; falling the caption back too would make an explicit
 * choice silently vanish. Only the image falls through, and it does so in resolveImageUri.
 *
 * Art and caption MUST come from this same printing. Picking the image from the first
 * image-bearing printing while captioning the first printing outright is #84 again in miniature:
 * the tile would show one printing's art under another printing's set code.
 */
function primaryPrinting(
  printings: BrowsePrinting[],
  preference: PreferredPrinting | null = null,
): BrowsePrinting {
  const preferred = printings.find((p) => matchesPreference(p, preference));
  // A pick the user no longer owns is absent here, so it falls through to the normal
  // resolver — silently, per decision 5. The dormant tile is the picker's business, not this.
  return preferred ?? printings.find((p) => p.imageUri !== null) ?? printings[0];
}

/**
 * Modal caption for the printing whose art is on screen: "C21 · 263", plus a count of the
 * other printings owned. Grid and row captions stay on primarySetCode alone — they are one
 * line of a dense list — but the modal shows one specific piece of art and has to say which.
 */
export function printingCaption(card: BrowseCard): string {
  const primary = primaryPrinting(card.printings, card.preferredPrinting);
  const base = primary?.collectorNumber
    ? `${primary.setCode} · ${primary.collectorNumber}`
    : card.primarySetCode;
  const others = card.printings.length - 1;
  return others > 0 ? `${base} +${others} more` : base;
}

export function filterCards(list: BrowseCard[], f: BrowseFilters): BrowseCard[] {
  const search = f.search.trim().toLowerCase();
  const type = f.type?.toLowerCase() ?? null;
  // Sets OR with each other and AND with every other filter.
  const setCodes = new Set(f.setCodes.map((s) => s.toLowerCase()));
  return list.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search)) return false;
    if (f.colors.length > 0) {
      const id = new Set(c.colorIdentity);
      for (const col of f.colors) if (!id.has(col)) return false;
    }
    if (type && !c.typeLine.toLowerCase().includes(type)) return false;
    if (
      setCodes.size > 0 &&
      !c.setCodes.some((s) => setCodes.has(s.toLowerCase()))
    ) return false;
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
  const { cardArtPreferences, cards, collectionItems, printings, sets } =
    await import("../../db/schema");
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
      finish: collectionItems.finish,
      setName: sets.name,
      releasedAt: sets.releasedAt,
      preferredSetCode: cardArtPreferences.setCode,
      preferredCollectorNumber: cardArtPreferences.collectorNumber,
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
    // sets.code is the primary key, so this is at most 1:1 and multiplies no rows.
    .leftJoin(sets, eq(sets.code, sql`lower(${collectionItems.setCode})`))
    // The user's pick for this card, if any. Oracle-level, so it repeats across the card's rows.
    .leftJoin(
      cardArtPreferences,
      and(
        eq(cardArtPreferences.userId, collectionItems.userId),
        eq(cardArtPreferences.oracleId, collectionItems.oracleId),
      ),
    )
    .where(eq(collectionItems.userId, userId));
  return aggregateCollection(rows);
});

/**
 * Server query — the `sets` catalog rows for the sets this user owns, for the
 * Set ▾ panel's names and release-date ordering (#86).
 *
 * Same untested-query pattern as above: an inner join over the user's distinct
 * owned set codes, no logic. A code with no `sets` row simply does not come
 * back; buildSetOptions falls the option back to the uppercased code.
 */
export const loadOwnedSetMeta = cache(async function loadOwnedSetMeta(
  userId: string,
): Promise<OwnedSetMeta[]> {
  const { db } = await import("../../db");
  const { collectionItems, sets } = await import("../../db/schema");
  const rows = await db
    .selectDistinct({ code: sets.code, name: sets.name, releasedAt: sets.releasedAt })
    .from(collectionItems)
    // set_code is stored lowercase on both sides since 0008; lower() keeps a row
    // written by an older build from dropping out of the join.
    .innerJoin(sets, eq(sets.code, sql`lower(${collectionItems.setCode})`))
    .where(eq(collectionItems.userId, userId));
  return rows;
});
