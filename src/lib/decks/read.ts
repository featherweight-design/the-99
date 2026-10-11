import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { factsFor } from "../bracket/facts";
import { isTutor } from "../bracket/tutor-targets";
import type { NoteCounts } from "../bracket/card-note";
import type { Bracket } from "../bracket/types";
import { loadBracketFlags, type CardBracketFlags } from "../bracket/flags-read";
import {
  cards,
  collectionItems,
  deckCards,
  deckFolders,
  deckGames,
  deckUnresolvedRows,
  deckVersionCards,
  deckVersions,
  decks,
} from "../../db/schema";
import { ownedCardsWhere } from "../collection/owned-cards";
import { commanderDisplayName } from "../cards/printed-name";
import { resolveOwnedPrintings } from "../collection/owned-printings";
import {
  resolveCommanderPrintingsByDeck,
  resolveDeckOwnedPrintings,
  type DeckPrinting,
} from "./printings";
import { lockedOracleIds } from "./locks";
import { neverCutEnabled } from "./never-cut-flag";
import { deckPrintingsEnabled } from "./printings-flag";
import type { PreferredPrinting } from "../collection/browse";
import { proxiedOracleIds, proxyCounts, type ProxyCount } from "./proxies";
import { classifyRoles } from "../recs/roles";
import { isCommanderCandidate } from "../recs/score";
import { loadAvailability, loadDeckBuyRows } from "./availability-query";
import { deckBodySize } from "./deck-size";
import { changeCommanderEnabled } from "../commander-change/flag";
import { deckCommanderMovedSql } from "../commander-change/pending";
import { inUseElsewhereByDeck } from "./in-use-elsewhere";
import { toUtcInstant, type PriceFact } from "./price";
import type { Availability } from "./availability";
import {
  cardTypeGroup,
  deckCounts,
  unresolvedCardCount,
  type DeckDetailCard,
  type DeckUnresolvedRow,
} from "./grouping";
import { statusPill, type StatusPill } from "./status";
import { chipAnswer } from "../bracket/chip-answer";
import { isReachablePermits } from "../bracket/verdict-head";
import { storedPermitsSql } from "../profile/stored-sql";
import { noticeSummarySql, type NoticeSummary } from "../notices/summary-sql";
import type { DeckSort } from "./sort";
import { recordSoftFailure } from "../cache/soft-failure";

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
 * shopping query at all. Its body size is its own: a pair deck is full at
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
  /**
   * Slots filled, printed ones included. Defaults to `ownedCount` for a caller
   * that cannot count proxies.
   *
   * It is what this test reads, because the question is "could this deck reach
   * `Complete`" and a deck whose last gaps are printed now can. On `ownedCount`
   * alone such a deck skipped the seniority query and then flipped to
   * `Complete` without the check every other complete deck gets.
   */
  coveredCount?: number;
  unresolvedCount: number;
}): boolean {
  return (
    r.built === deckBodySize(r.partnerName !== null) &&
    (r.coveredCount ?? r.ownedCount) === r.built &&
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
  /**
   * This deck prints its copy of this commander. Per id, because a pair deck can
   * proxy one and own the other.
   *
   * Optional for the reason `DeckDetailCard.proxied` is: the literal is built in
   * fixtures that cannot reach the database, and absent means not proxied.
   */
  proxied?: boolean;
  name: string;
  colorIdentity: string[];
  manaCost: string | null;
  typeLine: string;
  oracleText: string | null;
  imageUri: string | null;
  artCropUri: string | null;
  /**
   * The name printed on the copy the player owns, where it differs from the oracle
   * card's — Secret Lair's renames. Null when they own no copy, or when the copy
   * they own prints the oracle name, which is almost every printing.
   *
   * Optional for the reason `proxied` is: fixtures across the suite build
   * `DeckCommander` literals that never touch the catalog, and absent means null.
   */
  printedName?: string | null;
  /**
   * The printing the art and the name come from, for the export's commander line (deck printings):
   * the deck's pick, else the Collection's. Null for a commander the player does not own, which
   * the export names without a printing, as a body line. Optional for the reason `printedName` is.
   */
  printedSetCode?: string | null;
  printedCollectorNumber?: string | null;
  /**
   * The player owns at least one copy of this commander, by the same test a decklist row's
   * `owned` is. Optional for the reason `proxied` is: fixtures build `DeckCommander` literals
   * that never touch the collection, and ABSENT MEANS OWNED, which is what every surface
   * assumed before the deck page could bill a commander (H28).
   */
  owned?: boolean;
  /**
   * This deck's vantage on the commander's copies, exactly as `DeckDetailCard.availability`
   * is: read with the deck excluded, so an owned commander held by an older committed deck's
   * claim reads `over` and goes on the Shopping list. Null for an unowned commander, and for a
   * failed read, which degrades to the free rendering as a decklist row does.
   */
  availability?: Availability | null;
  /**
   * Attached by the deck page beside every decklist row's price, for the commander's Shopping
   * row. Absent and null both mean the bare `buy` tag.
   */
  price?: PriceFact | null;
  /** Scryfall's converted cost, so a commander's Shopping row sorts by mana value like any row. */
  cmc?: number;
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
  /** Slots filled: owned, or printed. See `deckCounts`. */
  coveredCount: number;
  toBuyCount: number;
  /** built plus the cards on unresolved lines — the size of the deck the player asked for. */
  total: number;
  /**
   * `decks.declared_bracket`. The bracket the player SAID they were building, live on the
   * deck while drafting and copied onto a version at commit.
   *
   * A declaration is an intention rather than a measurement, so it cannot go stale from an
   * edit — which is what lets the card note cite it on every add with nothing recomputed.
   */
  declaredBracket: Bracket | null;
  /** What the deck is for, in one line: the player's, or the app's when it filled the deck. */
  intent: string | null;
  /** True while the intent is the app's own words; the player's first edit clears it for good. */
  intentSeeded: boolean;
  /** "Kept for this deck" (H35, PR 2). Null/empty/false until the player sets them. Optional on
   *  the type — not every caller builds this field by hand — but `getDeckDetail` always sets it. */
  limits?: { capCents: number | null; sets: readonly string[]; ownedOnly: boolean };
  /**
   * How many of each note-bearing kind this deck's list already holds, counted by COPIES.
   *
   * Derived here rather than on the client because one of the four is not on the card: the
   * three marks come off `facts`, and the tutor reading is `isTutor` over oracle text,
   * which this query already has and a `DeckDetailCard` does not carry.
   */
  noteCounts: NoteCounts;
  /**
   * Deck printings: the deck's own picks the player still holds, by oracle id, in the card
   * modal's display form. Null with `DECK_PRINTINGS_ENABLED` off, which keeps the modal's picker
   * collection-scoped; absent reads the same (a fixture built before the field).
   */
  printingPicks?: Record<string, PreferredPrinting> | null;
};

/** The deck row, or a throw. Used by every deck mutation and by the reads that
    have no other reason to load the deck. The predicate is defence in depth at
    the query layer; the explicit comparison below is the authorization the tests
    constrain — it fires even when the stub or ORM ignores the WHERE clause. */
export async function requireDeck(deckId: string, userId: string) {
  const [deck] = await db.select().from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)));
  if (!deck || deck.userId !== userId) throw new Error("deck not found");
  return deck;
}

/**
 * The deck page's four owner-scoped reads that need nothing but the deck id and the reader, as
 * query builders (not yet run), so `getDeckDetail` can start them together and a test can read
 * the SQL each one emits.
 *
 * THE OWNER IS IN EACH QUERY'S OWN SQL. They run beside the deck row rather than after it, so
 * none of them can lean on "the deck row already proved this deck is theirs": each joins `decks`
 * on `user_id` itself. A stranger's deck id reads as no deck, no cards, no commanders and no
 * lines. `deck-detail-reads.test.ts` pins the qualified predicate on all four.
 */
export function deckDetailReads(deckId: string, userId: string) {
  const ownDeck = and(eq(decks.id, deckId), eq(decks.userId, userId));
  const ownedSql = sql<boolean>`exists (
    select 1 from ${collectionItems}
    where ${collectionItems.oracleId} = ${cards.oracleId}
    and ${collectionItems.userId} = ${userId}
  )`;
  return {
    deck: db
      .select({
        id: decks.id,
        name: decks.name,
        createdAt: decks.createdAt,
        filled: decks.filled,
        // The LIVE declaration, which the card note cites and nothing else on this page reads.
        // Null is UNANSWERED and means nothing else: there is no skip, and the note prints no
        // deck clause rather than falling back to a determined verdict that may be four edits
        // old with nothing on the row to say so.
        declaredBracket: decks.declaredBracket,
        intent: decks.intent,
        intentSeeded: decks.intentSeeded,
        tuningCapCents: decks.tuningCapCents,
        tuningSets: decks.tuningSets,
        tuningOwnedOnly: decks.tuningOwnedOnly,
      })
      .from(decks)
      .where(ownDeck),
    // Both commanders' card details in one query, found through the deck row itself rather than
    // from ids a first read handed over. The two ids are read back out of the result rather than
    // trusted to come back in order: `in` promises a set, not a sequence.
    commanders: db
      .select({
        oracleId: cards.oracleId,
        name: cards.name,
        colorIdentity: cards.colorIdentity,
        manaCost: cards.manaCost,
        typeLine: cards.typeLine,
        oracleText: cards.oracleText,
        imageUri: cards.imageUri,
        artCropUri: cards.artCropUri,
        cmc: cards.cmc,
        // COMMANDERS ARE CARDS. The bracket rules count a Game Changer in the command zone
        // against every limit, so the card note's ordinal has to count it too — and this is
        // the one card on the page that is a column on `decks` rather than a `deck_cards` row.
        gameChanger: cards.gameChanger,
        // The pair THIS statement matched against. The deck row is a separate statement in the
        // same wave, so a commander change committing between the two would hand them different
        // pairs; the page names its commanders from these columns, never from the deck row's.
        deckCommanderOracleId: decks.commanderOracleId,
        deckPartnerOracleId: decks.partnerOracleId,
        // The same ownership test the card query below makes, so a commander the player does not
        // own can go on the Shopping list (H28). LAST in the projection: its subquery carries a
        // `from` of its own, and the pair columns above are read out of the projection by tests
        // that end it at the first one.
        owned: ownedSql,
      })
      .from(cards)
      .innerJoin(decks, and(
        ownDeck,
        sql`${cards.oracleId} in (${decks.commanderOracleId}, ${decks.partnerOracleId})`,
      )),
    // All deck cards with the owned flag.
    cards: db
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
        gameChanger: cards.gameChanger,
        owned: ownedSql,
        quantity: deckCards.quantity,
        auto: deckCards.auto,
      })
      .from(deckCards)
      .innerJoin(decks, and(eq(decks.id, deckCards.deckId), ownDeck))
      .innerJoin(cards, eq(deckCards.oracleId, cards.oracleId))
      .where(eq(deckCards.deckId, deckId))
      .orderBy(asc(cards.name)),
    // The lines the import could not identify, in the source's own order.
    unresolved: db
      .select({
        id: deckUnresolvedRows.id,
        rawName: deckUnresolvedRows.rawName,
        quantity: deckUnresolvedRows.quantity,
        sourceLine: deckUnresolvedRows.sourceLine,
      })
      .from(deckUnresolvedRows)
      .innerJoin(decks, and(eq(decks.id, deckUnresolvedRows.deckId), ownDeck))
      .where(eq(deckUnresolvedRows.deckId, deckId))
      .orderBy(asc(deckUnresolvedRows.sourceLine)),
  };
}

export async function getDeckDetail(deckId: string, userId: string): Promise<DeckDetail | null> {
  // TWO WAVES, not seven reads in a row. Each read below used to wait for the one before it, and
  // on a `pull:staging` copy that chain was ~410-440ms for a 96-card deck, most of it round trips.
  // Wave 1 needs nothing but the deck id and the reader, so it runs at once; wave 2 needs the ids
  // wave 1 found, so it runs at once after it.
  //
  // THE OWNER IS IN EVERY WAVE-1 QUERY'S OWN SQL, because they no longer wait for the deck row
  // to prove ownership first: the card, commander and unresolved-line reads each join `decks`
  // on `user_id`, and the proxy and lock reads already did. A stranger's deck id reads as no deck
  // and nothing else, exactly as it did when the deck row was checked first.
  const reads = deckDetailReads(deckId, userId);
  const [deckRows, commanderRows, [proxiedIds, lockedIds], cardRows, unresolvedRows] = await Promise.all([
    reads.deck,
    reads.commanders,
    // Every printed id in this deck, list cards and commanders alike, in one
    // FAIL-SOFT read. It is not a column on the card query and not a join, because
    // a proxy flag is decoration on a page that must render without it: the
    // availability rollup and the printed-name lookup beside it both degrade the
    // same way, and a transient failure here would otherwise 500 an otherwise
    // readable deck over a mark.
    // The lock set is the same kind of decoration and degrades the same way ("empty"): a failed read
    // draws the deck as it read before Locked existed. Nothing is read with the switch off.
    Promise.all([
      proxiedOracleIds(deckId, userId),
      neverCutEnabled() ? lockedOracleIds(deckId, userId) : Promise.resolve(new Set<string>()),
    ]),
    reads.cards,
    reads.unresolved,
  ]);

  const [deck] = deckRows;
  if (!deck) return null;
  // The commanders come from ONE statement: its rows and the pair it matched against. The deck
  // row is never consulted for them, because it is a second statement: a commander change landing
  // between the two would name a commander this one never returned, and an owned deck would read
  // as missing.
  const pair = commanderRows[0];
  if (!pair) return null;
  const commanderOracleId = pair.deckCommanderOracleId;
  const partnerOracleId = pair.deckPartnerOracleId;
  const commanderIds = [commanderOracleId, ...(partnerOracleId ? [partnerOracleId] : [])];
  const commanderRow = commanderRows.find((c) => c.oracleId === commanderOracleId);
  if (!commanderRow) return null;
  const partnerRow = partnerOracleId
    ? (commanderRows.find((c) => c.oracleId === partnerOracleId) ?? null)
    : null;

  // WAVE 2: the three reads that need wave 1's ids, at once.
  //
  // This deck's own vantage: its claims must not count against its own rows, or
  // every card in a committed deck would read as spoken for by itself.
  //
  // Swallowed because the decklist is the deck — it has to render whether or not
  // the availability rollup succeeded. A null map leaves every row markerless,
  // which is the same rendering as a card with nothing competing for it.
  // Narrowed to this deck's owned rows, the only cards that will ever be looked
  // up in the map. Unscoped, this aggregated the player's whole collection on
  // every deck-page load; unowned rows are excluded for the same reason the
  // search action excludes them, which is that the rollup is driven by the
  // collection and cannot return them.
  //
  // The printed name and the art both come from the player's own copy, which this
  // route does not otherwise read: the deck query is oracle-level. One extra query
  // for the whole decklist — see `resolveOwnedPrintings` for why it reuses the
  // collection reader rather than joining `printings` here.
  //
  // The commanders ride along in the SAME lookup rather than in one of their own.
  // They are columns on `decks`, not `deck_cards` rows, which is precisely how they
  // came to be the one card on these two surfaces still drawn from the oracle-level
  // catalog — art belonging to whichever printing Scryfall's oracle row happens to
  // name, and not to the copy in the player's box.
  //
  // The two bracket facts that are not columns on `cards`. FAIL-SOFT for exactly the reason
  // the proxy read above is: a mark is decoration on a page that must render without it, and
  // a transient failure here would otherwise 500 a readable deck over three glyphs. An empty
  // map costs the marks and nothing else.
  //
  // The COMMANDERS' ids ride along: they draw no mark on this page, but the card note counts
  // a kind across the whole deck and a commander is part of the deck. One read either way.
  //
  // FAIL-SOFT, and the FAILURE IS CARRIED rather than flattened to an empty map. The marks
  // degrade to absence either way, which is right for them — but the card note's ordinals are
  // counts, and a count nobody has is not zero. The candidate's own facts come from a separate
  // flags read that can succeed while this one fails, so a flattened failure introduces a
  // correctly-detected mass land denial as `your 1st` to a deck already holding three.
  const ownedIds = cardRows.filter((r) => r.owned).map((r) => r.oracleId);
  // The OWNED commanders ride along in the availability read (H28): an owned commander sleeved
  // into an older committed deck is spoken for from this deck's vantage, and the Shopping list
  // draws it exactly as it draws a spoken-for list card. Owned only, for the reason the list's
  // ids are: an unowned id can never come back from the collection.
  const ownedCommanderIds = commanderRows
    .filter((r) => r.owned && commanderIds.includes(r.oracleId))
    .map((r) => r.oracleId);
  const availabilityIds = [...new Set([...ownedIds, ...ownedCommanderIds])];
  const [availability, resolved, bracketFlags] = await Promise.all([
    availabilityIds.length > 0
      ? loadAvailability(userId, { excludeDeckId: deckId, oracleIds: availabilityIds }).catch(() => {
          recordSoftFailure();
          return null;
        })
      : null,
    // The deck's own printing picks first (deck printings), then the Collection's: one chain for
    // every surface, so the rows, the card details they open and the export name one printing.
    resolveDeckOwnedPrintings(userId, deckId, [...ownedIds, ...commanderIds]),
    readNoteFlags([...cardRows.map((r) => r.oracleId), ...commanderIds]),
  ]);

  /** A commander drawn from the player's own copy where they have one. */
  const asCommander = (row: typeof commanderRow): DeckCommander => {
    const own = resolved.get(row.oracleId);
    return {
      ...row,
      proxied: proxiedIds.has(row.oracleId),
      owned: row.owned,
      availability: row.owned ? (availability?.get(row.oracleId) ?? null) : null,
      // Belt and braces on the right-hand side of each, and deliberately so: the
      // oracle-level fallback for a printing ingested before `printings.art_crop_uri`
      // existed already lives in `resolveArtCropUri`, which is where it belongs — one
      // rule for every reader of a printing's art. A mutation run confirmed these two
      // `??`s are unreachable for an owned card today; they are here so an owned
      // commander cannot lose its art to a null if that resolution ever changes.
      imageUri: own?.imageUri ?? row.imageUri,
      artCropUri: own?.artCropUri ?? row.artCropUri,
      // The name of whichever printing the art just came from. Held to the same
      // invariant as every decklist row: a Secret Lair art under the oracle name is
      // the mismatch the collection reader forbids, and taking the art without the
      // name would have introduced it here.
      printedName: own?.printedName ?? null,
      // Read by the export's commander line alone, which is main's (no printing) with the switch off.
      printedSetCode: deckPrintingsEnabled() ? (own?.setCode ?? null) : null,
      printedCollectorNumber: deckPrintingsEnabled() ? (own?.collectorNumber ?? null) : null,
    };
  };
  const flags = bracketFlags ?? new Map<string, CardBracketFlags>();

  const commander = asCommander(commanderRow);
  const partner = partnerRow ? asCommander(partnerRow) : null;

  const detailCards: DeckDetailCard[] = cardRows.map((row) => ({
    oracleId: row.oracleId,
    name: row.name,
    typeLine: row.typeLine,
    cardTypeGroup: cardTypeGroup(row.typeLine),
    role: primaryRole({ typeLine: row.typeLine, oracleText: row.oracleText, keywords: row.keywords }),
    cmc: row.cmc,
    owned: row.owned,
    facts: factsFor(row.gameChanger, flags.get(row.oracleId)),
    proxied: proxiedIds.has(row.oracleId),
    locked: lockedIds.has(row.oracleId),
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

  return {
    id: deck.id,
    name: deck.name,
    createdAt: deck.createdAt,
    filled: deck.filled,
    commander,
    partner,
    cards: detailCards,
    unresolvedRows,
    declaredBracket: (deck.declaredBracket as Bracket | null) ?? null,
    intent: deck.intent,
    intentSeeded: deck.intentSeeded,
    limits: {
      capCents: deck.tuningCapCents,
      sets: deck.tuningSets ?? [],
      ownedOnly: deck.tuningOwnedOnly ?? false,
    },
    noteCounts: countNoteKinds(cardRows, commanderRows, bracketFlags),
    printingPicks: deckPrintingsEnabled()
      ? Object.fromEntries(
          [...resolved].filter(([, p]) => p.source === "deck")
            .map(([id, p]) => [id, { setCode: p.setCode, collectorNumber: p.collectorNumber }]),
        )
      : null,
    ...deckCounts(detailCards, unresolvedCardCount(unresolvedRows)),
  };
}

/**
 * The deck's bracket flags, or `null` where the read FAILED.
 *
 * Three lines with a name on them, because the difference between `null` and an empty map is
 * the whole of the degradation and a `.catch` inline is a branch no test can reach: a unit
 * test would have to drive `getDeckDetail`'s entire query chain to see it, and the mutation
 * that flattens it to an empty map passes every test of the pure counter beneath.
 */
export async function readNoteFlags(
  oracleIds: string[],
): Promise<Map<string, CardBracketFlags> | null> {
  return loadBracketFlags(oracleIds).catch(() => {
    recordSoftFailure();
    return null;
  });
}

/**
 * The card note's three ordinal counts over the deck as it stands — the DRAFT, since that is
 * what the analysis reads and what a player is looking at while they add.
 *
 * EXPORTED for its own test. Every renderer test injects `NoteCounts`, so the denominator
 * behind every ordinal on the surface was asserted by nobody: a regression returning zeros,
 * dropping the commanders, or counting rows instead of copies renders a perfectly plausible
 * `your 1st` and passes every check this round shipped. `read.test.ts` covers it directly.
 *
 * BY COPIES, not by rows. A deck can hold five Swamps and the note's ordinal is a count of
 * cards, not of distinct names. No kind here is a basic today, so the two agree on every real
 * deck; counting rows would be a rule that happens to be right rather than the right rule.
 *
 * The commanders are folded in at one copy each for the reason `probe:bracket` pins end to
 * end: a Game Changer in the command zone counts against every limit, and it is the one card
 * on this page that is a column rather than a row.
 */
export function countNoteKinds(
  cardRows: readonly { oracleId: string; gameChanger: boolean; oracleText: string | null; quantity: number }[],
  commanderRows: readonly { oracleId: string; gameChanger: boolean; oracleText: string | null }[],
  /** `null` when the flags read FAILED — see `NoteCounts`. An empty map is a successful read
   *  that found nothing, which is a different claim and counts as zero. */
  flags: Map<string, CardBracketFlags> | null,
): NoteCounts {
  // THREE, not four: mass land denial is absent from `NoteCounts` because its sentence
  // carries no ordinal. See that type for why counting it withheld a true sentence.
  const counts = {
    gameChanger: 0,
    extraTurns: flags === null ? null : 0,
    tutor: 0,
  } as NoteCounts;
  const add = (
    copies: number,
    row: { oracleId: string; gameChanger: boolean; oracleText: string | null },
  ) => {
    const flag = flags?.get(row.oracleId);
    if (row.gameChanger) counts.gameChanger += copies;
    // Mass land denial is NOT counted: its sentence takes no ordinal. See `NoteCounts`.
    if (flag?.extraTurn && counts.extraTurns !== null) counts.extraTurns += copies;
    // `isTutor`, the same predicate `loadCandidateFacts` and the search read, so a card's
    // reading cannot differ depending on which side of the add it is on. NOT `classifyTutor`,
    // which counts every land search (ruled 2026-09-22) and put Evolving Wilds in this count.
    if (isTutor(row.oracleText)) counts.tutor += copies;
  };
  for (const row of cardRows) add(row.quantity, row);
  for (const row of commanderRows) add(1, row);
  return counts;
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
 * to learn a name and three counts. Returns null for a deck this reader does not
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
      // Every correlated subquery here is aliased and its columns written out
      // rather than interpolated, and that is load-bearing. A single-table
      // Drizzle select emits column references UNQUALIFIED, so
      // `${deckGames.deckId} = ${decks.id}` rendered as
      // `where "deck_id" = "id"` — inside the subquery both names resolve
      // against `deck_games`, so it compared a row's deck to its own primary
      // key and every deck reported 0 games. That games count has since been
      // removed with the route that drew it, but the rule outlived it:
      // `deck_unresolved_rows` has an `id` column too and was silently 0 the
      // same way. `deck_cards` has no `id`, which is the only reason `built`
      // ever looked right.
      built: sql<number>`coalesce((
        select sum(dc.quantity) from ${deckCards} dc
        where dc.deck_id = ${decks}.id
      ), 0)::int`,
      unresolvedCount: sql<number>`(
        select count(*) from ${deckUnresolvedRows} dur
        where dur.deck_id = ${decks}.id
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

/** A source deck's current size, and whether the ONE card a reader might pull from it is still
 *  in that deck's draft. See `loadSourceDeckFigures`. */
export type SourceDeckFigure = { built: number; inDraft: boolean };

/**
 * The CURRENT draft size of a small set of other decks, and whether each one still HOLDS the
 * specific card a reader might pull from it — "→ {n} cards" on the Pull it source list
 * (addendum R1), batched because the list shows every candidate source on a page that renders
 * several contested rows, never one deck at a time.
 *
 * Found by Copilot's round-1 review: `pullCardFromDeck` (`actions.ts`) only touches
 * `deck_cards` when the card is still `inDraft` there — a claim can outlive the draft row it
 * came from (the player cut the card themselves; the claim still stands against the deck's
 * committed version until the draft is re-committed or discarded), and a pull against THAT
 * claim writes only the release, leaving the source's size unchanged. "current size minus
 * one" is wrong for that case; "current size" is wrong for the ordinary one. Returning both
 * halves lets the caller pick, per card, the same way the action does.
 *
 * `built` matches `getDeckReviewHeader`'s own definition exactly — `sum(deck_cards.quantity)`,
 * commander not counted — so a source's size reads in the one vocabulary this route already
 * uses for "card count" rather than introducing a second one. Scoped to `userId` for the same
 * reason every other read on this page is: a candidate source is always a claim on a card this
 * reader's OWN decks hold, but the scope costs nothing to state and a deck id that is not this
 * reader's returns no row rather than another player's count.
 */
type SourceFigureQuerier = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The ownership-and-size half of `loadSourceDeckFigures`, pulled out so a `.toSQL()` test can
 * assert the `userId` filter without a database — see `read.test.ts`. Rendered inside the
 * transaction in the real call, and standalone off `db` in the test.
 */
export function sourceDeckSizesQuery(tx: SourceFigureQuerier, deckIds: string[], userId: string) {
  return tx
    .select({
      id: decks.id,
      built: sql<number>`coalesce((
        select sum(dc.quantity) from ${deckCards} dc
        where dc.deck_id = ${decks}.id
      ), 0)::int`,
    })
    .from(decks)
    .where(and(inArray(decks.id, deckIds), eq(decks.userId, userId)));
}

/**
 * The membership half of `loadSourceDeckFigures`, pulled out so a `.toSQL()` test can assert
 * both dimensions are filtered — see `read.test.ts`. Every (deckId, oracleId) actually present
 * in `deck_cards` among the asked-for decks and cards; both dimensions filtered, so a returned
 * row IS a real membership for that exact pair, with no cross-contamination to guard against.
 */
export function sourceDeckPresenceQuery(
  tx: SourceFigureQuerier,
  deckIds: string[],
  oracleIds: string[],
) {
  return tx
    .select({ deckId: deckCards.deckId, oracleId: deckCards.oracleId })
    .from(deckCards)
    .where(and(inArray(deckCards.deckId, deckIds), inArray(deckCards.oracleId, oracleIds)));
}

/**
 * The join of a reader's own asked-for pairs against each source deck's current size and
 * membership, pulled out so a test can assert the combination without a database — see
 * `read.test.ts`. A pair whose `deckId` is absent from `built` names a deck `loadSourceDeckFigures`
 * did not own (filtered out by the ownership query), and is skipped rather than reported with a
 * size of zero.
 */
export function assembleSourceFigures(
  pairs: { deckId: string; oracleId: string }[],
  built: Map<string, number>,
  present: Set<string>,
): Map<string, SourceDeckFigure> {
  const figures = new Map<string, SourceDeckFigure>();
  for (const { deckId, oracleId } of pairs) {
    const size = built.get(deckId);
    if (size === undefined) continue;
    figures.set(`${deckId}:${oracleId}`, { built: size, inDraft: present.has(`${deckId}:${oracleId}`) });
  }
  return figures;
}

export async function loadSourceDeckFigures(
  pairs: { deckId: string; oracleId: string }[],
  userId: string,
): Promise<Map<string, SourceDeckFigure>> {
  if (pairs.length === 0) return new Map();
  const deckIds = [...new Set(pairs.map((p) => p.deckId))];
  const oracleIds = [...new Set(pairs.map((p) => p.oracleId))];
  // ONE repeatable-read transaction — found by Copilot's round-2 review: two
  // separate statements can straddle a write to the source's draft between them (a cut, or
  // another pull), returning an impossible pair such as the OLD size with the NEW absence.
  // Same rule `readSnapshot` (`draft-state.ts:178`) and `tuning-read.ts` already follow for a
  // multi-read comparison. Not asserted by a test, same as those two — Drizzle's transaction
  // options are not part of the rendered SQL a `.toSQL()` test could check.
  const { built, present } = await db.transaction(async (tx) => {
    const sizeRows = await sourceDeckSizesQuery(tx, deckIds, userId);
    const presentRows = await sourceDeckPresenceQuery(tx, deckIds, oracleIds);
    return {
      built: new Map(sizeRows.map((r) => [r.id, r.built])),
      present: new Set(presentRows.map((r) => `${r.deckId}:${r.oracleId}`)),
    };
  }, { isolationLevel: "repeatable read" });
  return assembleSourceFigures(pairs, built, present);
}

export type DeckListItem = {
  id: string;
  name: string;
  createdAt: Date;
  commanderName: string;
  /**
   * The name printed on the copy the player owns, where it differs from the oracle
   * card's. Null when they own no copy, or when that copy prints the oracle name.
   *
   * Optional for the reason `DeckCommander.printedName` is: fixtures build these
   * literals without touching the catalog, and absent means null.
   */
  commanderPrintedName?: string | null;
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
   * Cards the draft has changed since the newest committed version, counted the
   * way the deck page counts them. Zero for a deck with no version — there is
   * nothing to differ from, and that deck is a PLAN, which
   * `lastCommittedAt === null` says instead.
   *
   * The two facts draw two marks and can never both be true: the pill's edge
   * needs a version, the hollow plate means there is none.
   */
  pendingChanges: number;
  /** The newest version's number, for `36 changes since v2`. Null for a deck
      that has committed nothing. */
  versionNumber: number | null;
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
   * When this deck's contents last changed — see `src/lib/decks/touch.ts` for
   * what counts. Never null: the column is NOT NULL and defaults to the deck's
   * own creation, so a deck nobody has edited reads as edited when it was made.
   */
  lastEditedAt: Date;
  /** When this deck was last committed, or null for a brew that never has been. */
  lastCommittedAt: Date | null;
  /**
   * How many of this deck's owned cards a *different* committed deck has
   * sleeved. Zero when the availability read fails, which is the same thing the
   * tile draws when nothing is spoken for — a clause is not worth a 500.
   */
  inUseElsewhere: number;
  /**
   * How many CARDS in this deck are printed — distinct marks, not copies. One
   * mark on a quantity-4 row counts 1, because a proxy covers the deck's whole
   * ask for a card and has no quantity (ruling 5); `proxyCounts` and the probe
   * both pin that. Summing `deck_cards.quantity` here would read `4 proxies`
   * off a single marked playset.
   *
   * One figure, three readings: the tile's `N proxies` line, the covered count
   * behind its status pill, and the subtitle on `/collection/proxies`.
   */
  proxiedCount: number;
  statusPill: StatusPill;
  /**
   * The deck's stored bracket, for the tile's chip — null when it has not been analyzed since its
   * last edit, which draws no chip ("a deck we have not read draws no chip", Round 0 §5).
   */
  bracket: TileBracket | null;
  /** The deck's notice for its tile (deck notices plan D6). Null or absent: none. */
  notice?: NoticeSummary;
};

export type TileBracket = { permits: Bracket[]; answered: Bracket | null };

/** The stored range and the declaration that answers it, if one does. */
export function tileBracket(
  permits: readonly number[] | null,
  declared: number | null,
): TileBracket | null {
  if (!permits || !isReachablePermits(permits)) return null;
  const range = permits;
  return { permits: range, answered: chipAnswer(range, (declared as Bracket | null) ?? null) };
}

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
function toDate(value: Date | string | null, column: string): Date | null {
  if (value === null) return null;
  const parsed = value instanceof Date ? value : new Date(toUtcInstant(value));
  if (Number.isNaN(parsed.getTime())) {
    // Named, because two columns now come through here and they fail
    // independently — a production failure has to say which one is malformed.
    throw new Error(`${column} is not a readable timestamp: ${String(value)}`);
  }
  return parsed;
}

/**
 * A deck's newest commit, as a correlated subquery.
 *
 * Module-level and exported so `last-committed.test.ts` can render it: the trap
 * it is written around is invisible in a component test and silent at runtime.
 *
 * Aliased, with both sides written out, for the reason AGENTS.md gives — in the
 * PROJECTION of a select whose `from` names one table, Drizzle emits column
 * references bare, so the obvious `where ${deckVersions.deckId} = ${decks.id}`
 * renders as `where "deck_id" = "id"`: each version row's own foreign key
 * against its own primary key, matching nothing, for ever, with no error. The
 * stamp would simply never say `committed` and nothing would fail.
 *
 * Typed as `Date | string` because that is what drivers return for a `timestamp`
 * reached through raw SQL; `toDate` resolves it at the row map.
 */
export const lastCommittedSql = sql<Date | string | null>`(
  select max(dv.committed_at)
  from ${deckVersions} dv
  where dv.deck_id = ${decks}.id
)`;

/**
 * How many cards a deck's draft has changed since the version it last
 * committed, and which version that was.
 *
 * ZERO for a deck with no version at all, and that is the accurate answer
 * rather than a missing case: there is nothing to differ from. That deck is a
 * PLAN, which `lastCommittedAt === null` already says, and the two facts get
 * two different marks — see the deck-state marks handoff.
 *
 * A COUNT rather than a flag, because the tile draws the figure as well as the
 * mark: `36 changes since v2` is the detail row's line, and a boolean would
 * force a second read of the same rows to put a number on it.
 *
 * `count(distinct oracle_id)`, which is what makes this figure agree with
 * `changeCount` on the deck page. The symmetric difference puts a quantity
 * change on BOTH sides — `1 → 2` is a row in each direction — while `draftDiff`
 * files it as ONE add. Counting rows would tell a player who bought a second
 * copy that they had made two changes.
 *
 * **A real diff, not a proxy.** `last_edited_at > committed_at` is the cheap
 * answer and it is wrong: a discard back to the version MOVES `last_edited_at`
 * by design (pinned by `scripts/probe-touched.ts`), so a deck restored to
 * exactly its committed list would report pending for ever. Nothing in the
 * columns short of comparing the rows can tell that state from a real edit.
 *
 * What "differs" means here is EXACTLY what it means on the deck page: a
 * quantity mismatch in either direction, or a card on one side and not the
 * other, over `deck_cards` against the newest version's rows. Basics included,
 * as they are in the deck page's own change list.
 *
 * **This fragment compares the cards alone.** The commander is the other half
 * of the draft (change commander): `changeCount` in `draft-shape.ts` adds one
 * for a moved commander, and `deckPendingSql` below adds the same one here, so
 * the tile and the deck page count the same draft. The deck list reads
 * `deckPendingSql`, never this fragment on its own; with
 * CHANGE_COMMANDER_ENABLED off the two are the same object.
 *
 * The symmetric difference is two `except`s rather than a join: a full outer
 * join over two child tables inside a grouped select is a second way to write
 * the same question and the more expensive one, and `except` compares the
 * (oracle_id, quantity) PAIR, which is exactly the comparison.
 *
 * Aliased with both sides written out, for the reason `lastCommittedSql` above
 * gives: in the projection of a select whose `from` names one table, Drizzle
 * emits column references bare, and `where "deck_id" = "id"` compares each
 * child row's foreign key to its own primary key — matching nothing, for ever,
 * with no error. Every deck would read as clean.
 */
export const pendingChangesSql = sql<number>`(
  select coalesce((
    select count(distinct diff.oracle_id)
    from ${deckVersions} dv,
    lateral (
      (
        select dcd.oracle_id, dcd.quantity
        from ${deckCards} dcd
        where dcd.deck_id = ${decks}.id
        except
        select dvd.oracle_id, dvd.quantity
        from ${deckVersionCards} dvd
        where dvd.version_id = dv.id
      )
      union all
      (
        select dvo.oracle_id, dvo.quantity
        from ${deckVersionCards} dvo
        where dvo.version_id = dv.id
        except
        select dco.oracle_id, dco.quantity
        from ${deckCards} dco
        where dco.deck_id = ${decks}.id
      )
    ) as diff
    where dv.deck_id = ${decks}.id
      and dv.number = (
        select max(dvn.number) from ${deckVersions} dvn where dvn.deck_id = ${decks}.id
      )
  ), 0)::int
)`;

/**
 * `pendingChangesSql`, plus one when the deck's commander moved since its newest version (change
 * commander, plan decision 3: a new commander or pair is one change). With
 * CHANGE_COMMANDER_ENABLED off this IS `pendingChangesSql`, the same object, so the deck list's
 * SQL is byte-identical to the one before commanders could move.
 */
export function deckPendingSql(): SQL<number> {
  if (!changeCommanderEnabled()) return pendingChangesSql;
  return sql<number>`(${pendingChangesSql} + (case when ${deckCommanderMovedSql("decks")} then 1 else 0 end))::int`;
}

/**
 * The newest version's number, for the figure the mark explains: `36 changes
 * since v2` needs the 2 as well as the 36.
 *
 * Null for a deck that has committed nothing, which is the same deck
 * `lastCommittedAt` answers null for — and the tile never prints this without
 * a change count above zero, which that deck can never have.
 */
export const newestVersionNumberSql = sql<number | null>`(
  select max(dvm.number) from ${deckVersions} dvm where dvm.deck_id = ${decks}.id
)`;

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
  opts: {
    includeInUseElsewhere?: boolean;
    /**
     * Whether to count each deck's printed cards. Off by default, and
     * `/decks/[id]` is the caller that leaves it off: it calls this for a
     * deck-name list, discards every figure, and would otherwise pay a raw
     * aggregate over the player's whole proxy table on every deck page load.
     *
     * `/` and `/decks` both pass it, because both RENDER a status pill from
     * these rows — and a pill that reads `Complete` on one and `To buy` on the
     * other, about one deck, is worse than the query it saves.
     *
     * With it off a deck's `proxiedCount` is 0 and its pill falls back to the
     * ownership answer. That is the same bargain `includeInUseElsewhere` makes
     * beside it: a caller that does not draw the figure does not buy it.
     */
    includeProxyStats?: boolean;
    /**
     * Whether to compute the deck-state marks — the pending change count and
     * the version it counts against. Off by default, and `/decks/[id]` is the
     * caller that leaves it off: it calls this for a deck-name list, draws no
     * pill, and would otherwise pay two `except` scans and a newest-version
     * lookup per deck to answer a question nothing on that page asks.
     *
     * `/` and `/decks` both pass it, because both RENDER the marks — and a deck
     * whose tile carries the pending edge on one and not the other is the same
     * disagreement `includeProxyStats` exists to prevent.
     *
     * With it off a deck's `pendingChanges` is 0 and its `versionNumber` null,
     * which is the same answer a deck with no version gives: no edge drawn.
     * That is the bargain the two options beside it already make — a caller
     * that does not draw the figure does not buy it.
     */
    includeDeckState?: boolean;
    /**
     * Whether each row's commander art and name come from the printing the
     * player owns rather than from the oracle-level catalog. Off by default,
     * and `/decks/[id]` is the caller that leaves it off for the third time on
     * this list: it calls this for a deck-name list, draws no commander art at
     * all, and would otherwise pay a collection-and-printings aggregation over
     * every deck the player has on every builder load.
     *
     * `/` and `/decks` both pass it, because both DRAW that art — the resume
     * row's portrait and the tile's wash — and a commander drawn from a
     * printing the player does not own is the defect this option exists to
     * carry the fix for.
     *
     * With it off a row keeps `cards.image_uri` and `cards.art_crop_uri` and a
     * null `commanderPrintedName`, which is what every row carried before.
     */
    includeCommanderArt?: boolean;
    /**
     * Read each deck's last analyzed bracket (`storedPermitsSql`, which holds over an edit).
     * `/decks` is the one caller that draws the tile's bracket chip, so it is the one that sets
     * it. Unset, every row's `bracket` is null, which is what a deck nobody has analyzed draws.
     */
    includeBracket?: boolean;
    /**
     * Read each deck's notice (`noticeSummarySql`). Its own option rather than riding on
     * `includeBracket`: Home asks for the bracket on its resume rows and draws no notice, and this is
     * a correlated subquery per deck on the list's hot path.
     */
    includeNotice?: boolean;
  } = {},
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
      commanderOracleId: decks.commanderOracleId,
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
      // Raw, and normalised through `toDate` below, rather than taken as a
      // mapped column. `last_edited_at` is `timestamp` WITHOUT time zone holding
      // a UTC instant, and the driver parses a mapped one in the RUNTIME's zone
      // — so on a server west of UTC this column would arrive hours adrift of
      // `lastPlayedAt` and `lastCommittedAt`, which arrive as strings and are
      // read as UTC. `touchedBy` compares all three, and a mixed pair of
      // parsings picks the wrong verb and the wrong order by exactly the offset.
      lastEditedAt: sql<Date | string>`${decks.lastEditedAt}`,
      lastCommittedAt: lastCommittedSql,
      // `sql` either way, so the projection's SHAPE does not change with the
      // option: a conditional column would make the row type depend on a
      // runtime value, and every reader would have to narrow it.
      pendingChanges: opts.includeDeckState ? deckPendingSql() : sql<number>`0::int`,
      versionNumber: opts.includeDeckState
        ? newestVersionNumberSql
        : sql<number | null>`null::int`,
      bracketPermits: opts.includeBracket
        ? storedPermitsSql()
        : sql<number[] | null>`null::int[]`,
      declaredBracket: decks.declaredBracket,
      notice: opts.includeNotice ? noticeSummarySql() : sql<NoticeSummary>`null::json`,
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
      decks.lastEditedAt,
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
      ? await loadAvailability(userId).catch(() => {
          recordSoftFailure();
          return null;
        })
      : null;
  const inUseElsewhere = availability
    ? inUseElsewhereByDeck(availability.values())
    : new Map<string, number>();

  // This one decides the status pill, and every caller renders that.
  // `ownedCount` alone cannot answer it — a card the player owns is still a card
  // THIS deck must buy when an older committed deck already holds every copy — so
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
  // Two figures per deck, and conflating them was a real defect: a proxied
  // COMMANDER is not a body slot, and a proxied card the player also owns is
  // already inside `ownedCount`. Adding one total to `ownedCount` let a proxied
  // commander fill an unowned body slot, so a 98-owned 99-card deck read
  // `Complete` with one card genuinely missing. See `proxyCounts`.
  //
  // Tolerated like the two reads above: a failed count leaves every deck reading
  // as it did before proxies existed, which is a missing line rather than a 500.
  const proxiedByDeck = opts.includeProxyStats && rows.length > 0
    ? await proxyCounts(userId)
    : new Map<string, ProxyCount>();

  // AFTER the proxy read, not before it. `deckIsFlippable` decides whether the
  // seniority query runs at all, and it asks whether a deck could reach
  // `Complete` — which a deck whose last gaps are printed now can. Asked on
  // `ownedCount` alone, such a deck never fetched its buy rows, so its
  // `unfundedCount` stayed 0 and it flipped to `Complete` without the seniority
  // check every other complete deck gets.
  const canFlip = rows.some((r) =>
    deckIsFlippable({ ...r, coveredCount: r.ownedCount + (proxiedByDeck.get(r.id)?.covers ?? 0) }),
  );
  // Tolerated the same way as `inUseElsewhere`: a failed read falls back to the
  // ownership answer, which is the pre-seniority behaviour and not a 500.
  const buyRows = canFlip
    ? await loadDeckBuyRows(userId).catch(() => {
        recordSoftFailure();
        return [];
      })
    : [];
  const unfundedByDeck = new Map<string, number>();
  for (const r of buyRows) {
    unfundedByDeck.set(r.deckId, (unfundedByDeck.get(r.deckId) ?? 0) + r.quantity);
  }

  // Every tile's commander art, from the copy the player owns. `cards.art_crop_uri`
  // is oracle-level — one arbitrary printing's crop — so a deck led by a card owned
  // in another printing drew art that is not on the card in the box. One query for
  // the whole grid, and fail-soft: an unresolved commander keeps the oracle art,
  // which is what every tile drew before this.
  // Each deck's own pick of its commander comes first (deck printings), so the tile draws the
  // copy that deck shows, keyed by DECK rather than by card: two decks led by one card can pick
  // different printings.
  const ownedCommanders = opts.includeCommanderArt && rows.length > 0
    ? await resolveCommanderPrintingsByDeck(
        userId,
        rows.map((r) => ({ deckId: r.id, commanderOracleId: r.commanderOracleId })),
      )
    : new Map<string, DeckPrinting>();

  return rows.map((row) => {
    const proxies = proxiedByDeck.get(row.id);
    const proxiedCount = proxies?.copies ?? 0;
    const pill = statusPill({
      built: row.built,
      ownedCount: row.ownedCount,
      // A printed slot is a filled slot, so a deck whose only gaps are proxies
      // reads `Complete` here exactly as it does on its own page. `covers` is
      // already restricted to unowned body rows, so this neither double-counts
      // an owned proxy nor lets a commander fill a body slot.
      coveredCount: row.ownedCount + (proxies?.covers ?? 0),
      unresolvedCount: row.unresolvedCount,
      unfundedCount: unfundedByDeck.get(row.id) ?? 0,
      bodySize: deckBodySize(row.partnerName !== null),
      // The phase, and it costs no query: `lastCommittedAt` is already on this
      // row, null exactly when the deck has never committed.
      hasVersion: row.lastCommittedAt !== null,
    });
    return {
      id: row.id,
      name: row.name,
      createdAt: row.createdAt,
      commanderName: row.commanderName,
      // The name of whichever printing the art below came from, so a renamed copy
      // is not captioned with the oracle name over its own art.
      commanderPrintedName: ownedCommanders.get(row.id)?.printedName ?? null,
      commanderColorIdentity: row.commanderColorIdentity,
      commanderImageUri:
        ownedCommanders.get(row.id)?.imageUri ?? row.commanderImageUri,
      commanderArtCropUri:
        ownedCommanders.get(row.id)?.artCropUri ?? row.commanderArtCropUri,
      partnerName: row.partnerName,
      partnerColorIdentity: row.partnerColorIdentity,
      folderId: row.folderId,
      folderName: row.folderName,
      built: row.built,
      ownedCount: row.ownedCount,
      proxiedCount,
      // The same definition `deckCounts` uses on the deck page: what is still to
      // ACQUIRE. Left as `built - ownedCount` the two payloads disagreed about
      // one deck — the tile saying a printed card was still to buy while the
      // page it links to said it was covered.
      toBuyCount: row.built - (row.ownedCount + (proxies?.covers ?? 0)),
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
      lastPlayedAt: toDate(row.lastPlayedAt, "deck_games.played_at"),
      // Never null: the column is NOT NULL, so `toDate` cannot return null here
      // — the assertion is the type's, and an unreadable value throws instead.
      lastEditedAt: toDate(row.lastEditedAt, "decks.last_edited_at")!,
      lastCommittedAt: toDate(row.lastCommittedAt, "deck_versions.committed_at"),
      // `::int` on both, and coerced again here: an aggregate reached through
      // raw SQL comes back as a string from some drivers, and a string `"0"` is
      // truthy — which would draw the pending edge on every clean deck in the
      // app.
      pendingChanges: Number(row.pendingChanges ?? 0),
      versionNumber: row.versionNumber === null ? null : Number(row.versionNumber),
      inUseElsewhere: inUseElsewhere.get(row.id) ?? 0,
      statusPill: pill,
      bracket: tileBracket(row.bracketPermits, row.declaredBracket),
      notice: row.notice ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// listOwnedLegalCommanders
// ---------------------------------------------------------------------------

export type OwnedLegalCommander = {
  oracleId: string;
  name: string;
  /**
   * The name printed on the copy the player owns, where it differs. Every row here is
   * a card they own by definition, so this is the one list where the field is about
   * the printing rather than about whether there is one.
   */
  printedName?: string | null;
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
      // Both read by isCommanderCandidate, which refuses a melded card (#712).
      layout: cards.layout,
      manaCost: cards.manaCost,
    })
    .from(collectionItems)
    .innerJoin(cards, eq(collectionItems.oracleId, cards.oracleId))
    .where(ownedCardsWhere(userId, { commanderLegalOnly: true }))
    // Postgres requires DISTINCT ON expressions to lead the ORDER BY.
    .orderBy(cards.oracleId);

  // Split: candidates are legendary creatures / "can be your commander" cards;
  // the full ownedRows set is used as the pool for poolCount calculation.
  const candidates = ownedRows.filter((r) =>
    isCommanderCandidate(r),
  );

  if (candidates.length === 0) return [];

  // Precompute: tally owned card counts per WUBRG bitmask (≤32 buckets).
  // This lets each candidate's poolCount be computed in O(32) instead of O(ownedRows).
  const maskTally = new Map<number, number>();
  for (const r of ownedRows) {
    const m = colorIdentityMask(r.colorIdentity);
    maskTally.set(m, (maskTally.get(m) ?? 0) + 1);
  }

  // Every row here is a card the player owns, so every row has a printing of its own —
  // this is the one list where the lookup misses nothing. The picker draws each
  // candidate's card image, and `cards.image_uri` is one arbitrary printing's.
  const owned = await resolveOwnedPrintings(userId, candidates.map((c) => c.oracleId));

  return candidates
    .map((c) => {
      const candidateMask = colorIdentityMask(c.colorIdentity);
      // Subtract 1 to exclude the commander itself (it appears in ownedRows).
      const poolCount = poolCountFromMaskTally(maskTally, candidateMask) - 1;
      const own = owned.get(c.oracleId);
      return {
        oracleId: c.oracleId,
        name: c.name,
        printedName: own?.printedName ?? null,
        colorIdentity: c.colorIdentity,
        imageUri: own?.imageUri ?? c.imageUri,
        oracleText: c.oracleText,
        poolCount,
      };
    })
    // Ordered by the name DRAWN, not the oracle name. An A-Z list the reader scans is
    // alphabetical in the names they can see or it is not alphabetical at all: a copy
    // printed `Freya, Queen of the Valkyries` filed under I for Iroas reads as a list
    // with one card in the wrong place. The picker's search matches both names, which
    // is what keeps the oracle name reachable for a reader who types it.
    .sort((a, b) =>
      commanderDisplayName(a).localeCompare(commanderDisplayName(b), "en"),
    );
}
