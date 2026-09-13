import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import {
  cards,
  collectionItems,
  deckCards,
  deckFolders,
  deckGames,
  deckUnresolvedRows,
  decks,
} from "../../db/schema";
import {
  aggregateCollection,
  resolvedPrinting,
  selectCollectionRows,
} from "../collection/browse";
import { ownedCardsWhere } from "../collection/owned-cards";
import { classifyRoles } from "../recs/roles";
import { isCommanderCandidate } from "../recs/score";
import { loadAvailability, loadDeckBuyRows } from "./availability-query";
import { deckBodySize } from "./deck-size";
import { inUseElsewhereByDeck } from "./in-use-elsewhere";
import { toUtcInstant } from "./price";
import {
  cardTypeGroup,
  deckCounts,
  unresolvedCardCount,
  type DeckDetailCard,
  type DeckUnresolvedRow,
} from "./grouping";
import { statusPill, type StatusPill } from "./status";
import type { DeckSort } from "./sort";

// ---------------------------------------------------------------------------
// WUBRG bitmask helpers (tested)
// ---------------------------------------------------------------------------

/** `cards` a second time, for the partner. A join to the same table twice needs
    a name for each side or the SQL is ambiguous. */
const partnerCards = alias(cards, "partner_cards");

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

// Re-exported rather than moved outright: this module is where every server
// caller already reaches for it, and the function itself now lives in the
// db-free `grouping.ts` so client components can group by type too.
export { cardTypeGroup };

export function primaryRole(input: { typeLine: string; oracleText: string | null; keywords: string[] }): "ramp" | "draw" | "removal" | "wipes" | "land" | "other" {
  const roles = classifyRoles(input);
  return roles[0] ?? "other";
}

/**
 * Whether a deck row could flip from `To buy` to `Complete` once the seniority
 * allocation is known — the gate deciding whether `listDecksWithStats` runs the
 * shopping query at all. Its body size is its own: a pair deck is finished at
 * 98, so measuring it against 99 would exclude the very deck the second query
 * exists to answer for.
 *
 * Lives up here, exported, because it is the one part of that function a test
 * can reach — the query around it needs a database and this file's tests mock
 * `db` away entirely.
 */
export function deckIsFlippable(r: {
  built: number;
  partnerName: string | null;
  ownedCount: number;
  unresolvedCount: number;
}): boolean {
  return (
    r.built === deckBodySize(r.partnerName !== null) &&
    r.ownedCount === r.built &&
    r.unresolvedCount === 0
  );
}

// ---------------------------------------------------------------------------
// DB query types and functions (untested — same policy as recommend.ts)
// ---------------------------------------------------------------------------

export type { DeckUnresolvedRow };

/**
 * One commander card, as a deck detail carries it. Named rather than inlined
 * because a deck now has up to two of them and they are the same shape key for
 * key — the pair's order is the field order, exactly as it is the column order
 * in `decks`.
 */
export type DeckCommander = {
  oracleId: string;
  name: string;
  colorIdentity: string[];
  manaCost: string | null;
  typeLine: string;
  oracleText: string | null;
  imageUri: string | null;
  artCropUri: string | null;
};

export type DeckDetail = {
  id: string;
  name: string;
  createdAt: Date;
  filled: boolean;
  commander: DeckCommander;
  /** The second commander, or null for the single-commander deck most decks are. */
  partner: DeckCommander | null;
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
      filled: decks.filled,
      commanderOracleId: decks.commanderOracleId,
      partnerOracleId: decks.partnerOracleId,
    })
    .from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)));

  if (!deck) return null;

  // Second: fetch both commanders' card details in one query. The two ids are
  // read back out of the result rather than trusted to come back in order —
  // `in` promises a set, not a sequence.
  const commanderIds = [
    deck.commanderOracleId,
    ...(deck.partnerOracleId ? [deck.partnerOracleId] : []),
  ];
  const commanderRows = await db
    .select({
      oracleId: cards.oracleId,
      name: cards.name,
      colorIdentity: cards.colorIdentity,
      manaCost: cards.manaCost,
      typeLine: cards.typeLine,
      oracleText: cards.oracleText,
      imageUri: cards.imageUri,
      artCropUri: cards.artCropUri,
    })
    .from(cards)
    .where(inArray(cards.oracleId, commanderIds));

  const commander = commanderRows.find((c) => c.oracleId === deck.commanderOracleId);
  if (!commander) return null;
  const partner = deck.partnerOracleId
    ? (commanderRows.find((c) => c.oracleId === deck.partnerOracleId) ?? null)
    : null;

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
      manaCost: cards.manaCost,
      cmc: cards.cmc,
      imageUri: cards.imageUri,
      layout: cards.layout,
      owned: ownedSql,
      quantity: deckCards.quantity,
      auto: deckCards.auto,
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

  // The printed name comes from the player's own copy, which this route does not
  // otherwise read: the deck query is oracle-level. Reusing the collection reader
  // rather than joining `printings` here is deliberate — the name must follow the
  // SAME printing the art preference picks, and `aggregateCollection` is where
  // that precedence lives. One extra query for the whole decklist.
  //
  // Swallowed like the availability rollup above, and for the same reason: the
  // decklist is the deck. A failed lookup leaves every row on its oracle name,
  // which is exactly today's rendering.
  const resolved = new Map<
    string,
    {
      printedName: string | null;
      imageUri: string | null;
      setCode: string;
      collectorNumber: string;
    }
  >();
  if (ownedIds.length > 0) {
    const owned = await selectCollectionRows(userId, ownedIds)
      .then(aggregateCollection)
      .catch(() => []);
    for (const c of owned) {
      const p = resolvedPrinting(c);
      if (p) {
        resolved.set(c.oracleId, {
          printedName: c.printedName,
          imageUri: p.imageUri,
          setCode: p.setCode,
          collectorNumber: p.collectorNumber,
        });
      }
    }
  }

  const detailCards: DeckDetailCard[] = cardRows.map((row) => ({
    oracleId: row.oracleId,
    name: row.name,
    typeLine: row.typeLine,
    cardTypeGroup: cardTypeGroup(row.typeLine),
    role: primaryRole({ typeLine: row.typeLine, oracleText: row.oracleText, keywords: row.keywords }),
    cmc: row.cmc,
    owned: row.owned,
    quantity: row.quantity,
    auto: row.auto,
    availability: availability?.get(row.oracleId) ?? null,
    manaCost: row.manaCost,
    // The art of the copy the player owns, falling back to the oracle-level
    // image for a card they do not. `row.imageUri` alone captioned a renamed
    // card with its printed name over another printing's art — the one thing
    // the collection reader's standing invariant forbids.
    imageUri: (row.owned ? resolved.get(row.oracleId)?.imageUri : null) ?? row.imageUri,
    // The `row.owned` guard is belt-and-braces — an unowned card has no
    // collection row and so cannot be in the map — but it states locked
    // decision 2 in the code rather than leaving it to the query's shape.
    printedName: row.owned ? (resolved.get(row.oracleId)?.printedName ?? null) : null,
    printedSetCode: row.owned ? (resolved.get(row.oracleId)?.setCode ?? null) : null,
    printedCollectorNumber:
      row.owned ? (resolved.get(row.oracleId)?.collectorNumber ?? null) : null,
    layout: row.layout,
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
    filled: deck.filled,
    commander,
    partner,
    cards: detailCards,
    unresolvedRows,
    ...deckCounts(detailCards, unresolvedCardCount(unresolvedRows)),
  };
}

/** What the review page needs of the deck itself — and nothing else. */
export type DeckReviewHeader = {
  name: string;
  /** A deck has a partner exactly when it carries a second commander id, and the
   *  pair-aware body size is the only thing the review page asks that of. */
  hasPartner: boolean;
  /** Matched copies in the live list. The unresolved lines are counted separately
   *  because no version can freeze them. */
  built: number;
  unresolvedCount: number;
};

/**
 * The deck facts the review page draws, in one query.
 *
 * `getDeckDetail` answers the same four questions, but it is the deck PAGE's
 * loader: it reads every card with its collection printing, the whole
 * availability rollup and both commanders' art. The review page pays for
 * `loadDraftRows` — its own snapshot, diff, claim, price and card-fact reads —
 * so calling the deck page's loader beside it buys one deck's worth of queries
 * to learn a name and two counts. Returns null for a deck this reader does not
 * own, which is the ownership guard the route depends on.
 */
export async function getDeckReviewHeader(
  deckId: string,
  userId: string,
): Promise<DeckReviewHeader | null> {
  const [row] = await db
    .select({
      name: decks.name,
      partnerOracleId: decks.partnerOracleId,
      built: sql<number>`coalesce((
        select sum(${deckCards.quantity}) from ${deckCards}
        where ${deckCards.deckId} = ${decks.id}
      ), 0)::int`,
      unresolvedCount: sql<number>`(
        select count(*) from ${deckUnresolvedRows}
        where ${deckUnresolvedRows.deckId} = ${decks.id}
      )::int`,
    })
    .from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)));

  if (!row) return null;
  return {
    name: row.name,
    hasPartner: row.partnerOracleId !== null,
    built: row.built,
    unresolvedCount: row.unresolvedCount,
  };
}

export type DeckListItem = {
  id: string;
  name: string;
  createdAt: Date;
  commanderName: string;
  commanderColorIdentity: string[];
  commanderImageUri: string | null;
  commanderArtCropUri: string | null;
  /**
   * The second commander's name, or null for a single-commander deck — which is
   * also the pair signal every list surface reads, because a deck has a partner
   * exactly when this is non-null.
   *
   * No partner art rides along. Decision 21 rules the resume portrait structural
   * and the rail spine 26px, so no list surface draws a second commander's art
   * and selecting it would be a column nothing consumes.
   */
  partnerName: string | null;
  partnerColorIdentity: string[] | null;
  /**
   * The folder this deck is filed on, or null for unfiled. Both fields ride
   * along together so a grid can group by folder and label the group without a
   * second lookup; null on both is the unfiled bucket, which is where every
   * deck starts and where one returns when its folder is deleted.
   */
  folderId: string | null;
  folderName: string | null;
  built: number;
  ownedCount: number;
  toBuyCount: number;
  /** Cards on lines the import could not name. Drives the deck card's badge. */
  unresolvedCount: number;
  /**
   * The most recent game logged against this deck, or null when none is. Drawn
   * on the right of a tile's second row at desktop widths, and **only when it
   * has a date**: the `never played` clause is cut, with no replacement, because
   * it filled a slot rather than answering a question. A deck with no logged game
   * draws nothing there, and that absence is the state. A Draft tile draws
   * nothing there either, even holding a date: its detail row carries `created
   * today` instead, so `DeckCard` excludes that status rather than printing a
   * play date beside a deck that has not been built.
   */
  lastPlayedAt: Date | null;
  /**
   * How many of this deck's owned cards a *different* finished deck has
   * sleeved. Zero when the availability read fails, which is the same thing the
   * tile draws when nothing is spoken for — a clause is not worth a 500.
   */
  inUseElsewhere: number;
  statusPill: StatusPill;
};

/**
 * A `timestamp` column read through raw SQL, which carries none of the column
 * mapping that would hand back a Date. `toUtcInstant` marks the string form as
 * UTC before parsing, because a bare `new Date("2026-09-05 20:00:00")` is read
 * in the runtime's own zone.
 *
 * An unreadable value throws rather than yielding the Invalid Date `new Date`
 * hands back, which satisfies `instanceof Date`, travels out through
 * `lastPlayedAt`, and surfaces as a rendered `Invalid Date` far from its cause.
 * `parseAsOf` guards the same shape for `printing_prices.as_of`.
 */
function toDate(value: Date | string | null): Date | null {
  if (value === null) return null;
  const parsed = value instanceof Date ? value : new Date(toUtcInstant(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`deck_games.played_at is not a readable timestamp: ${String(value)}`);
  }
  return parsed;
}

/**
 * `sort` is required rather than defaulted: a default here would silently
 * re-order every existing caller the day it changed, and the caller is always
 * the one that knows which order its page asked for.
 */
export async function listDecksWithStats(
  userId: string,
  sort: DeckSort,
  /**
   * Off by default because only the deck grid draws the clause. The builder's
   * move-card picker calls this for names alone, and the availability read
   * aggregates the player's whole collection — a cost that page has no use for.
   * A caller that leaves it off gets `inUseElsewhere: 0`, which is what the
   * tile draws when nothing is spoken for anyway.
   */
  opts: { includeInUseElsewhere?: boolean } = {},
): Promise<DeckListItem[]> {
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

  // Same reason as `unresolvedCount` above: a third child table joined and
  // grouped would multiply rows against `deck_cards` and inflate `built`.
  // Typed as `Date | string` because that is what drivers actually return for a
  // `timestamp` column reached through raw SQL; the row map below resolves it.
  const lastPlayedSql = sql<Date | string | null>`(
    select max(dg.played_at)
    from ${deckGames} dg
    where dg.deck_id = ${decks.id}
  )`;

  // `lower()` rather than the bare column: the ordering a player sees must not
  // depend on the database's collation, which puts every capitalised name ahead
  // of every lowercase one under C and interleaves them under en_US. The id is
  // the tiebreak in every order, not decoration — deck names are not unique, and
  // two decks sharing one would otherwise swap places between requests.
  const byName = [asc(sql`lower(${decks.name})`), asc(decks.id)];
  const order =
    sort === "name"
      ? byName
      : sort === "newest"
        ? [desc(decks.createdAt), asc(decks.id)]
        : // NULLS LAST is explicit: Postgres sorts nulls first under DESC, which
          // would put every never-played deck at the top of "last played".
          [sql`${lastPlayedSql} desc nulls last`, ...byName];

  const rows = await db
    .select({
      id: decks.id,
      name: decks.name,
      createdAt: decks.createdAt,
      commanderName: cards.name,
      commanderColorIdentity: cards.colorIdentity,
      commanderImageUri: cards.imageUri,
      commanderArtCropUri: cards.artCropUri,
      partnerName: partnerCards.name,
      partnerColorIdentity: partnerCards.colorIdentity,
      // The JOINED id, not `decks.folder_id`. The join is scoped to the owner,
      // so a row pointing at another player's folder — a state the foreign key
      // permits even though nothing writes it — matches nothing here. Reading
      // the raw column would then pair a foreign id with a null name, which
      // both breaks the documented pair and hands a grouping consumer a
      // phantom unlabelled folder to draw.
      folderId: deckFolders.id,
      folderName: deckFolders.name,
      built: sql<number>`coalesce(sum(${deckCards.quantity}), 0)::int`,
      ownedCount: ownedCountSql,
      unresolvedCount: unresolvedCountSql,
      lastPlayedAt: lastPlayedSql,
    })
    .from(decks)
    .innerJoin(cards, eq(decks.commanderOracleId, cards.oracleId))
    // LEFT, and aliased: it is a second join to the same table, and most decks
    // have no partner — an inner join would drop every single-commander deck
    // from the list.
    .leftJoin(partnerCards, eq(decks.partnerOracleId, partnerCards.oracleId))
    // LEFT, because an unfiled deck has no folder row — an inner join here
    // would hide every deck the player has not filed, which today is all of them.
    //
    // Keyed on the OWNER as well as the id. The foreign key constrains only the
    // id, so a row whose deck and folder belong to different players is a state
    // the database permits even though `moveDeck` refuses to write it — and on
    // this join it would print another player's folder name beside this
    // player's deck.
    .leftJoin(
      deckFolders,
      and(eq(deckFolders.id, decks.folderId), eq(deckFolders.userId, userId)),
    )
    .leftJoin(deckCards, eq(deckCards.deckId, decks.id))
    .where(eq(decks.userId, userId))
    .groupBy(
      decks.id,
      decks.name,
      decks.createdAt,
      cards.name,
      cards.colorIdentity,
      cards.imageUri,
      cards.artCropUri,
      partnerCards.name,
      partnerCards.colorIdentity,
      deckFolders.id,
      deckFolders.name,
    )
    .orderBy(...order);

  // One unscoped availability read for the whole grid. Its `claims` already
  // name every deck holding every card, so the per-deck counts fall out of a
  // single pass — a per-deck `excludeDeckId` query would be one round trip per
  // tile.
  //
  // Issued after the list rather than alongside it, even though that costs a
  // round trip, because the query is driven by the player's collection and not
  // by their decks: a player who has uploaded a CSV and built nothing would
  // otherwise pay a scan of the whole collection to be told they have no decks,
  // which is exactly the zero state this page draws on a first visit. The one
  // added trip is hidden behind `loadShoppingRollup`, which the page already
  // runs in parallel with this whole function and which is itself two queries.
  //
  // Tolerated rather than awaited into the page's failure path: a missing
  // clause is not worth a 500 on the deck list.
  const availability =
    opts.includeInUseElsewhere && rows.length > 0
      ? await loadAvailability(userId).catch(() => null)
      : null;
  const inUseElsewhere = availability
    ? inUseElsewhereByDeck(availability.values())
    : new Map<string, number>();

  // This one decides the status pill, and every caller renders that.
  // `ownedCount` alone cannot answer it — a card the player owns is still a card
  // THIS deck must buy when an older finished deck already holds every copy — so
  // without it a fully-owned deck reads `Complete` while its own Shopping list
  // names twelve cards.
  //
  // Asked only when some deck could actually move. `unfunded` is read by exactly
  // one branch of `statusPill`, the one deciding `Complete` against `To buy`, and
  // every earlier branch returns without consulting it: a deck short of its body
  // size, not owning its whole list, or holding an unresolved line has already
  // been answered. With no such deck on the page the query is a collection-wide
  // scan whose result nothing reads — and `/decks` and Home both run
  // `loadShoppingRollup` alongside this, which asks the same question, so the
  // saving is a real second scan rather than a hypothetical one.
  const canFlip = rows.some(deckIsFlippable);
  // Tolerated the same way as `inUseElsewhere`: a failed read falls back to the
  // ownership answer, which is the pre-seniority behaviour and not a 500.
  const buyRows = canFlip ? await loadDeckBuyRows(userId).catch(() => []) : [];
  const unfundedByDeck = new Map<string, number>();
  for (const r of buyRows) {
    unfundedByDeck.set(r.deckId, (unfundedByDeck.get(r.deckId) ?? 0) + r.quantity);
  }

  return rows.map((row) => {
    const pill = statusPill({
      built: row.built,
      ownedCount: row.ownedCount,
      unresolvedCount: row.unresolvedCount,
      unfundedCount: unfundedByDeck.get(row.id) ?? 0,
      bodySize: deckBodySize(row.partnerName !== null),
    });
    return {
      id: row.id,
      name: row.name,
      createdAt: row.createdAt,
      commanderName: row.commanderName,
      commanderColorIdentity: row.commanderColorIdentity,
      commanderImageUri: row.commanderImageUri,
      commanderArtCropUri: row.commanderArtCropUri,
      partnerName: row.partnerName,
      partnerColorIdentity: row.partnerColorIdentity,
      folderId: row.folderId,
      folderName: row.folderName,
      built: row.built,
      ownedCount: row.ownedCount,
      toBuyCount: row.built - row.ownedCount,
      unresolvedCount: row.unresolvedCount,
      // Normalised here rather than trusted from the driver: `lastPlayedSql` is
      // raw SQL, so it carries none of the column mapping that would hand back a
      // Date, and a timestamp string reaching a caller typed `Date | null` would
      // survive every check until something called `.getTime()` on it.
      //
      // `played_at` is `timestamp` WITHOUT time zone holding a UTC instant, so
      // the string form goes through `toUtcInstant` rather than straight into
      // `new Date`, which would read it in the runtime's own zone — the same row
      // would then date to a different day in Denver than in CI, and `2 days
      // ago` is exactly the kind of figure that shifts.
      lastPlayedAt: toDate(row.lastPlayedAt),
      inUseElsewhere: inUseElsewhere.get(row.id) ?? 0,
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
  /**
   * Read for the Partner ability, which decides whether a pick offers a second
   * slot and which legends may fill it. Already fetched by the query below.
   */
  oracleText: string | null;
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
        oracleText: c.oracleText,
        poolCount,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
