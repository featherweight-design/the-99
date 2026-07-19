import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, collectionItems, deckCards, decks } from "../../db/schema";
import { classifyRoles } from "../recs/roles";
import { isCommanderCandidate } from "../recs/score";

// ---------------------------------------------------------------------------
// Pure helpers (tested)
// ---------------------------------------------------------------------------

export type StatusPill = "Draft" | "Building" | "Playable" | "Complete";

export function statusPill(args: { built: number; ownedCount: number }): StatusPill {
  if (args.built === 0) return "Draft";
  if (args.built < 99) return "Building";
  return args.ownedCount === args.built ? "Complete" : "Playable";
}

export type CardTypeGroup =
  | "Creatures" | "Instants" | "Sorceries"
  | "Artifacts" | "Enchantments" | "Planeswalkers" | "Lands" | "Other";

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
// Grouping helpers (tested)
// ---------------------------------------------------------------------------

const CARD_TYPE_GROUP_ORDER: CardTypeGroup[] = [
  "Creatures", "Instants", "Sorceries", "Artifacts", "Enchantments", "Planeswalkers", "Lands", "Other",
];

const ROLE_GROUP_ORDER: Array<"ramp" | "draw" | "removal" | "wipes" | "land" | "other"> = [
  "ramp", "draw", "removal", "wipes", "land", "other",
];

const ROLE_GROUP_LABELS: Record<"ramp" | "draw" | "removal" | "wipes" | "land" | "other", string> = {
  ramp: "Ramp",
  draw: "Draw",
  removal: "Removal",
  wipes: "Wipes",
  land: "Land",
  other: "Other",
};

/**
 * Returns true when a card should render a "+N more" meta row below its primary row.
 * Only basic lands with quantity > 1 qualify.
 */
export function shouldShowMetaRow(card: Pick<DeckDetailCard, "quantity" | "typeLine">): boolean {
  return card.quantity > 1 && card.typeLine.includes("Basic");
}

export function groupByCardType(cards: DeckDetailCard[]): [CardTypeGroup, DeckDetailCard[]][] {
  const map = new Map<CardTypeGroup, DeckDetailCard[]>();
  for (const g of CARD_TYPE_GROUP_ORDER) map.set(g, []);
  for (const c of cards) {
    map.get(c.cardTypeGroup)!.push(c);
  }
  const result: [CardTypeGroup, DeckDetailCard[]][] = [];
  for (const g of CARD_TYPE_GROUP_ORDER) {
    const group = map.get(g)!;
    if (group.length > 0) {
      result.push([g, group.slice().sort((a, b) => a.name.localeCompare(b.name))]);
    }
  }
  return result;
}

export function groupByRole(cards: DeckDetailCard[]): [string, DeckDetailCard[]][] {
  const map = new Map<string, DeckDetailCard[]>();
  for (const r of ROLE_GROUP_ORDER) map.set(r, []);
  for (const c of cards) {
    const key = c.role in ROLE_GROUP_LABELS ? c.role : "other";
    map.get(key)!.push(c);
  }
  const result: [string, DeckDetailCard[]][] = [];
  for (const r of ROLE_GROUP_ORDER) {
    const group = map.get(r)!;
    if (group.length > 0) {
      result.push([ROLE_GROUP_LABELS[r], group.slice().sort((a, b) => a.name.localeCompare(b.name))]);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// DB query types and functions (untested — same policy as recommend.ts)
// ---------------------------------------------------------------------------

export type DeckDetailCard = {
  oracleId: string;
  name: string;
  typeLine: string;
  cardTypeGroup: CardTypeGroup;
  role: "ramp" | "draw" | "removal" | "wipes" | "land" | "other";
  owned: boolean;
  quantity: number;
};

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
  built: number;
  ownedCount: number;
  toBuyCount: number;
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

  const detailCards: DeckDetailCard[] = cardRows.map((row) => ({
    oracleId: row.oracleId,
    name: row.name,
    typeLine: row.typeLine,
    cardTypeGroup: cardTypeGroup(row.typeLine),
    role: primaryRole({ typeLine: row.typeLine, oracleText: row.oracleText, keywords: row.keywords }),
    owned: row.owned,
    quantity: row.quantity,
  }));

  const built = detailCards.reduce((sum, c) => sum + c.quantity, 0);
  const ownedCount = detailCards.reduce((sum, c) => sum + (c.owned ? c.quantity : 0), 0);

  return {
    id: deck.id,
    name: deck.name,
    createdAt: deck.createdAt,
    commander,
    cards: detailCards,
    built,
    ownedCount,
    toBuyCount: built - ownedCount,
  };
}

export type DeckListItem = {
  id: string;
  name: string;
  createdAt: Date;
  commanderName: string;
  commanderColorIdentity: string[];
  built: number;
  ownedCount: number;
  toBuyCount: number;
  statusPill: StatusPill;
};

export async function listDecksWithStats(userId: string): Promise<DeckListItem[]> {
  const ownedCountSql = sql<number>`coalesce(
    (
      select sum(dc2.quantity)
      from ${deckCards} dc2
      inner join ${collectionItems} ci
        on ci.oracle_id = dc2.oracle_id and ci.user_id = ${userId}
      where dc2.deck_id = ${decks.id}
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
      built: sql<number>`coalesce(sum(${deckCards.quantity}), 0)::int`,
      ownedCount: ownedCountSql,
    })
    .from(decks)
    .innerJoin(cards, eq(decks.commanderOracleId, cards.oracleId))
    .leftJoin(deckCards, eq(deckCards.deckId, decks.id))
    .where(eq(decks.userId, userId))
    .groupBy(decks.id, decks.name, decks.createdAt, cards.name, cards.colorIdentity)
    .orderBy(desc(decks.createdAt));

  return rows.map((row) => {
    const pill = statusPill({ built: row.built, ownedCount: row.ownedCount });
    return {
      id: row.id,
      name: row.name,
      createdAt: row.createdAt,
      commanderName: row.commanderName,
      commanderColorIdentity: row.commanderColorIdentity,
      built: row.built,
      ownedCount: row.ownedCount,
      toBuyCount: row.built - row.ownedCount,
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
    .where(and(eq(collectionItems.userId, userId), eq(cards.commanderLegal, true)))
    .orderBy(cards.oracleId);

  // Split: candidates are legendary creatures / "can be your commander" cards;
  // the full ownedRows set is used as the pool for poolCount calculation.
  const candidates = ownedRows.filter((r) =>
    isCommanderCandidate({ typeLine: r.typeLine, oracleText: r.oracleText }),
  );

  if (candidates.length === 0) return [];

  // For each candidate, count owned cards fitting within their color identity.
  // Exclude the commander itself from its own pool count.
  return candidates
    .map((c) => {
      const identitySet = new Set(c.colorIdentity);
      const poolCount = ownedRows.filter(
        (r) => r.oracleId !== c.oracleId && r.colorIdentity.every((x) => identitySet.has(x)),
      ).length;
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
