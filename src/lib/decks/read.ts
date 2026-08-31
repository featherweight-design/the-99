import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, collectionItems, deckCards, deckUnresolvedRows, decks } from "../../db/schema";
import { ownedCardsWhere } from "../collection/owned-cards";
import { classifyRoles } from "../recs/roles";
import { isCommanderCandidate } from "../recs/score";
import { loadAvailability } from "./availability-query";
import {
  deckCounts,
  unresolvedCardCount,
  type CardTypeGroup,
  type DeckDetailCard,
  type DeckUnresolvedRow,
} from "./grouping";
import { statusPill, type StatusPill } from "./status";

// ---------------------------------------------------------------------------
// WUBRG bitmask helpers (tested)
// ---------------------------------------------------------------------------

const WUBRG_BITS: Record<string, number> = { W: 1, U: 2, B: 4, R: 8, G: 16 };

/** Converts a color identity array to a 5-bit WUBRG bitmask. */
export function colorIdentityMask(identity: string[]): number {
  let mask = 0;
  for (const c of identity) mask |= WUBRG_BITS[c] ?? 0;
  return mask;
}

/**
 * Given a tally of card counts keyed by WUBRG bitmask (0–31), returns the number
 * of cards whose identity is a subset of `candidateMask`.
 * A bucket fits when every bit in the bucket is also set in candidateMask,
 * i.e. `(bucket & candidateMask) === bucket`.
 */
export function poolCountFromMaskTally(
  tally: Map<number, number>,
  candidateMask: number,
): number {
  let count = 0;
  for (const [bucket, n] of tally) {
    if ((bucket & candidateMask) === bucket) count += n;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Pure helpers (tested)
// ---------------------------------------------------------------------------

export function cardTypeGroup(typeLine: string): CardTypeGroup {
  const t = typeLine.toLowerCase();
  if (t.includes("land")) return "Lands";
  if (t.includes("creature")) return "Creatures";
  if (t.includes("planeswalker")) return "Planeswalkers";
  if (t.includes("instant")) return "Instants";
  if (t.includes("sorcery")) return "Sorceries";
  if (t.includes("artifact")) return "Artifacts";
  if (t.includes("enchantment")) return "Enchantments";
  return "Other";
}

export function primaryRole(input: { typeLine: string; oracleText: string | null; keywords: string[] }): "ramp" | "draw" | "removal" | "wipes" | "land" | "other" {
  const roles = classifyRoles(input);
  return roles[0] ?? "other";
}

// ---------------------------------------------------------------------------
// DB query types and functions (untested — same policy as recommend.ts)
// ---------------------------------------------------------------------------

export type { DeckUnresolvedRow };

export type DeckDetail = {
  id: string;
  name: string;
  createdAt: Date;
  commander: {
    oracleId: string;
    name: string;
    colorIdentity: string[];
    manaCost: string | null;
    typeLine: string;
    oracleText: string | null;
    imageUri: string | null;
  };
  cards: DeckDetailCard[];
  /**
   * Lines the import could not match, sorted by their position in the player's
   * source. Returned here rather than fetched separately so every consumer sees
   * them without a second query — and so a surface cannot forget to ask.
   */
  unresolvedRows: DeckUnresolvedRow[];
  built: number;
  ownedCount: number;
  toBuyCount: number;
  /** built plus the cards on unresolved lines — the size of the deck the player asked for. */
  total: number;
};

export async function getDeckDetail(deckId: string, userId: string): Promise<DeckDetail | null> {
  // First: check deck exists and belongs to userId.
  const [deck] = await db
    .select({
      id: decks.id,
      name: decks.name,
      createdAt: decks.createdAt,
      commanderOracleId: decks.commanderOracleId,
    })
    .from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)));

  if (!deck) return null;

  // Second: fetch commander card details.
  const [commander] = await db
    .select({
      oracleId: cards.oracleId,
      name: cards.name,
      colorIdentity: cards.colorIdentity,
      manaCost: cards.manaCost,
      typeLine: cards.typeLine,
      oracleText: cards.oracleText,
      imageUri: cards.imageUri,
    })
    .from(cards)
    .where(eq(cards.oracleId, deck.commanderOracleId));

  if (!commander) return null;

  // Third: fetch all deck cards with owned flag.
  const ownedSql = sql<boolean>`exists (
    select 1 from ${collectionItems}
    where ${collectionItems.oracleId} = ${cards.oracleId}
    and ${collectionItems.userId} = ${userId}
  )`;

  const cardRows = await db
    .select({
      oracleId: cards.oracleId,
      name: cards.name,
      typeLine: cards.typeLine,
      oracleText: cards.oracleText,
      keywords: cards.keywords,
      owned: ownedSql,
      quantity: deckCards.quantity,
    })
    .from(deckCards)
    .innerJoin(cards, eq(deckCards.oracleId, cards.oracleId))
    .where(eq(deckCards.deckId, deckId))
    .orderBy(asc(cards.name));

  // This deck's own vantage: its claims must not count against its own rows, or
  // every card in a finished deck would read as spoken for by itself.
  //
  // Swallowed because the decklist is the deck — it has to render whether or not
  // the availability rollup succeeded. A null map leaves every row markerless,
  // which is the same rendering as a card with nothing competing for it.
  // Narrowed to this deck's owned rows, the only cards that will ever be looked
  // up in the map. Unscoped, this aggregated the player's whole collection on
  // every deck-page load; unowned rows are excluded for the same reason the
  // search action excludes them, which is that the rollup is driven by the
  // collection and cannot return them.
  const ownedIds = cardRows.filter((r) => r.owned).map((r) => r.oracleId);
  const availability =
    ownedIds.length > 0
      ? await loadAvailability(userId, { excludeDeckId: deckId, oracleIds: ownedIds }).catch(
          () => null,
        )
      : null;

  const detailCards: DeckDetailCard[] = cardRows.map((row) => ({
    oracleId: row.oracleId,
    name: row.name,
    typeLine: row.typeLine,
    cardTypeGroup: cardTypeGroup(row.typeLine),
    role: primaryRole({ typeLine: row.typeLine, oracleText: row.oracleText, keywords: row.keywords }),
    owned: row.owned,
    quantity: row.quantity,
    availability: availability?.get(row.oracleId) ?? null,
  }));

  // Fourth: the lines the import could not identify, in the source's own order.
  const unresolvedRows = await db
    .select({
      id: deckUnresolvedRows.id,
      rawName: deckUnresolvedRows.rawName,
      quantity: deckUnresolvedRows.quantity,
      sourceLine: deckUnresolvedRows.sourceLine,
    })
    .from(deckUnresolvedRows)
    .where(eq(deckUnresolvedRows.deckId, deckId))
    .orderBy(asc(deckUnresolvedRows.sourceLine));

  return {
    id: deck.id,
    name: deck.name,
    createdAt: deck.createdAt,
    commander,
    cards: detailCards,
    unresolvedRows,
    ...deckCounts(detailCards, unresolvedCardCount(unresolvedRows)),
  };
}

export type DeckListItem = {
  id: string;
  name: string;
  createdAt: Date;
  commanderName: string;
  commanderColorIdentity: string[];
  commanderImageUri: string | null;
  built: number;
  ownedCount: number;
  toBuyCount: number;
  /** Cards on lines the import could not name. Drives the deck card's badge. */
  unresolvedCount: number;
  statusPill: StatusPill;
};

export async function listDecksWithStats(userId: string): Promise<DeckListItem[]> {
  const ownedCountSql = sql<number>`coalesce(
    (
      select sum(dc2.quantity)
      from ${deckCards} dc2
      where dc2.deck_id = ${decks.id}
        and exists (
          select 1 from ${collectionItems} ci
          where ci.oracle_id = dc2.oracle_id and ci.user_id = ${userId}
        )
    ),
    0
  )::int`;

  // A subquery rather than a second left join: joining both child tables and
  // grouping would multiply their rows against each other and inflate `built`.
  const unresolvedCountSql = sql<number>`coalesce(
    (
      select sum(dur.quantity)
      from ${deckUnresolvedRows} dur
      where dur.deck_id = ${decks.id}
    ),
    0
  )::int`;

  const rows = await db
    .select({
      id: decks.id,
      name: decks.name,
      createdAt: decks.createdAt,
      commanderName: cards.name,
      commanderColorIdentity: cards.colorIdentity,
      commanderImageUri: cards.imageUri,
      built: sql<number>`coalesce(sum(${deckCards.quantity}), 0)::int`,
      ownedCount: ownedCountSql,
      unresolvedCount: unresolvedCountSql,
    })
    .from(decks)
    .innerJoin(cards, eq(decks.commanderOracleId, cards.oracleId))
    .leftJoin(deckCards, eq(deckCards.deckId, decks.id))
    .where(eq(decks.userId, userId))
    .groupBy(decks.id, decks.name, decks.createdAt, cards.name, cards.colorIdentity, cards.imageUri)
    .orderBy(desc(decks.createdAt));

  return rows.map((row) => {
    const pill = statusPill({
      built: row.built,
      ownedCount: row.ownedCount,
      unresolvedCount: row.unresolvedCount,
    });
    return {
      id: row.id,
      name: row.name,
      createdAt: row.createdAt,
      commanderName: row.commanderName,
      commanderColorIdentity: row.commanderColorIdentity,
      commanderImageUri: row.commanderImageUri,
      built: row.built,
      ownedCount: row.ownedCount,
      toBuyCount: row.built - row.ownedCount,
      unresolvedCount: row.unresolvedCount,
      statusPill: pill,
    };
  });
}

// ---------------------------------------------------------------------------
// listOwnedLegalCommanders
// ---------------------------------------------------------------------------

export type OwnedLegalCommander = {
  oracleId: string;
  name: string;
  colorIdentity: string[];
  imageUri: string | null;
  /** Number of cards in the user's collection that fit within this commander's color identity. */
  poolCount: number;
};

/**
 * Returns every commander-legal card the user owns, ordered by name ASC.
 * For each candidate, poolCount = how many distinct oracle IDs the user owns
 * that are commander_legal and fit within that candidate's color identity.
 * (Mirrors the ownedColorLegalPool shape from actions.ts, flipped per-candidate.)
 */
export async function listOwnedLegalCommanders(userId: string): Promise<OwnedLegalCommander[]> {
  // Single query: fetch all commander-legal cards the user owns (distinct by oracleId).
  // The result is a superset of commander candidates, so we split in JS rather than
  // issuing a second nearly-identical query.
  const ownedRows = await db
    .selectDistinctOn([cards.oracleId], {
      oracleId: cards.oracleId,
      name: cards.name,
      colorIdentity: cards.colorIdentity,
      imageUri: cards.imageUri,
      typeLine: cards.typeLine,
      oracleText: cards.oracleText,
    })
    .from(collectionItems)
    .innerJoin(cards, eq(collectionItems.oracleId, cards.oracleId))
    .where(ownedCardsWhere(userId, { commanderLegalOnly: true }))
    // Postgres requires DISTINCT ON expressions to lead the ORDER BY.
    .orderBy(cards.oracleId);

  // Split: candidates are legendary creatures / "can be your commander" cards;
  // the full ownedRows set is used as the pool for poolCount calculation.
  const candidates = ownedRows.filter((r) =>
    isCommanderCandidate({ typeLine: r.typeLine, oracleText: r.oracleText }),
  );

  if (candidates.length === 0) return [];

  // Precompute: tally owned card counts per WUBRG bitmask (≤32 buckets).
  // This lets each candidate's poolCount be computed in O(32) instead of O(ownedRows).
  const maskTally = new Map<number, number>();
  for (const r of ownedRows) {
    const m = colorIdentityMask(r.colorIdentity);
    maskTally.set(m, (maskTally.get(m) ?? 0) + 1);
  }

  return candidates
    .map((c) => {
      const candidateMask = colorIdentityMask(c.colorIdentity);
      // Subtract 1 to exclude the commander itself (it appears in ownedRows).
      const poolCount = poolCountFromMaskTally(maskTally, candidateMask) - 1;
      return {
        oracleId: c.oracleId,
        name: c.name,
        colorIdentity: c.colorIdentity,
        imageUri: c.imageUri,
        poolCount,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
