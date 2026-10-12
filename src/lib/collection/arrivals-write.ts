/**
 * The confirm's receipt: assembled from the state either side of a collection replace, and
 * stored on the upload row.
 *
 * NOT IN `actions.ts`, and that is a security boundary rather than tidiness. That module is
 * marked `"use server"`, so every export of it is a server action reachable by any caller —
 * and this function takes a `userId` and returns that player's deck and card names. Exported
 * from there it would hand anybody who knew an id somebody else's collection. It lives here,
 * where it is an ordinary server-side function: `confirmUpload` calls it after authenticating,
 * and `pnpm probe:arrivals` calls it directly because there is no request to authenticate in a
 * probe.
 *
 * Every caller is responsible for having established whose collection this is. Nothing here
 * checks.
 */

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { cardAssignments, cards, csvUploads, collectionItems, decks } from "../../db/schema";
import {
  arrivalPlacement, buildArrivalsSummary, type ArrivalsSummary, type ArrivedClaimState, type NowShortRow, type OwnedCounts,
} from "./arrivals";
import type { PendingItem } from "./pending";
import { loadAvailability, loadDeckBuyRows } from "../decks/availability-query";
import { holdsCopy } from "../decks/availability";
import type { Placement } from "../decks/placements";
import { addedCopyEnabled } from "./added-copy-flag";

/** Deck names, frozen for the same reason: a deck deleted later still has to render its row. */
export async function deckNamesFor(userId: string): Promise<Record<string, string>> {
  const rows = await db
    .select({ id: decks.id, name: decks.name })
    .from(decks)
    .where(eq(decks.userId, userId));
  const out: Record<string, string> = {};
  for (const r of rows) out[r.id] = r.name;
  return out;
}

/** Printed names for the receipt, frozen into the payload so a later rename cannot rewrite it. */
export async function cardNamesFor(oracleIds: string[]): Promise<Record<string, string>> {
  if (oracleIds.length === 0) return {};
  const rows = await db
    .select({ oracleId: cards.oracleId, name: cards.name })
    .from(cards)
    .where(inArray(cards.oracleId, oracleIds));
  const out: Record<string, string> = {};
  for (const r of rows) out[r.oracleId] = r.name;
  return out;
}

/**
 * The same shape, predicted from the rows about to be written.
 *
 * Exact rather than approximate: these ARE the rows the replace inserts, so reading the
 * collection back afterwards would return this and cost a second user-wide scan.
 */
export function pendingItemsToOwnedCounts(items: PendingItem[]): OwnedCounts {
  const out: OwnedCounts = {};
  for (const i of items) out[i.oracleId] = (out[i.oracleId] ?? 0) + i.quantity;
  return out;
}

/**
 * The collection as the claim model reads it: copies per oracle id.
 *
 * Summed across printings, because every figure in the claim model is oracle-level — a
 * Brushland from any set is a Brushland. Basics are NOT excluded here even though the claim
 * model excludes them: this feeds the arrivals count, and a player who imports 40 Forests
 * has had 40 cards arrive whatever the decks make of them.
 */
export async function ownedByOracle(userId: string): Promise<OwnedCounts> {
  const rows = await db
    .select({
      oracleId: collectionItems.oracleId,
      quantity: sql<number>`sum(${collectionItems.quantity})::int`,
    })
    .from(collectionItems)
    .where(eq(collectionItems.userId, userId))
    .groupBy(collectionItems.oracleId);
  const out: OwnedCounts = {};
  for (const r of rows) out[r.oracleId] = r.quantity;
  return out;
}

/**
 * Assembles the receipt for one confirmed upload and stores it.
 *
 * Extracted from `confirmUpload` so it can be exercised against a real database: the
 * action around it needs a request and a signed-in reader, and none of that is what the
 * receipt's correctness turns on. `pnpm probe:arrivals` calls this directly and reads the
 * stored payload back.
 *
 * Takes the BEFORE state as arguments rather than reading it, because by the time this
 * runs the replace has destroyed it.
 */
export async function writeArrivalsReceipt(args: {
  userId: string;
  uploadId: string;
  /** Copies per oracle id after the write: the whole collection, never only what changed. */
  ownedAfter: OwnedCounts;
  ownedBefore: OwnedCounts;
  buyBefore: { deckId: string; oracleId: string; quantity: number }[];
  /**
   * Committed decks the write left shorter, from the write's own deck check. Only the ledger's
   * write computes it; main's replace has no deck check and passes none. The names are the ones
   * the write read inside its transaction, and win over the lookups below, which run after the
   * commit: a deck renamed or deleted in between still reads as the warning named it.
   */
  nowShort?: (NowShortRow & { deckName?: string; cardName?: string })[];
  unmatched: { name: string; line: number }[];
  parseErrorCount: number;
  /**
   * Write version 4's `went` (where each arrived card's copies went). Defaults to the switch, read
   * per request; off, the receipt is the version 3 it always was.
   */
  addedCopy?: boolean;
}): Promise<ArrivalsSummary> {
  const { userId, uploadId, ownedAfter, ownedBefore, buyBefore } = args;
  const buyAfter = await loadDeckBuyRows(userId);

  // Only the cards that GAINED copies. Contention is a question about arrivals, so the
  // claim read is narrowed to them — passing every oracle in the old and new collection
  // defeats the point of `oracleIds` and makes every confirm materialise the player's
  // whole collection as claims.
  const arrivedIds = Object.keys(ownedAfter).filter(
    (oracleId) => (ownedAfter[oracleId] ?? 0) > (ownedBefore[oracleId] ?? 0),
  );
  // ONE SNAPSHOT for the availability and the reservation rows: two READ COMMITTED statements
  // would let a pick moved between them credit the arrived copy to a deck the availability never
  // saw holding it. Repeatable read fixes both reads at the first statement.
  const addedCopyOn = args.addedCopy ?? addedCopyEnabled();
  type Reservations = Map<string, { deckId: string; copies: number }[]>;
  const read: { availability: Awaited<ReturnType<typeof loadAvailability>>; reservations: Reservations } =
    arrivedIds.length
      ? await db.transaction(async (tx) => {
        const availability = await loadAvailability(userId, { oracleIds: arrivedIds }, tx);
        // The reservations, OLDEST FIRST: the claim model's order (`created_at`, then `deck_id`),
        // the one `regrant` needs to say which reservation the smaller supply covered.
        const reservations: Reservations = new Map();
        if (addedCopyOn && availability.size > 0) {
          for (const r of await tx
            .select({ oracleId: cardAssignments.oracleId, deckId: cardAssignments.deckId, copies: cardAssignments.copies })
            .from(cardAssignments)
            .where(and(eq(cardAssignments.userId, userId), inArray(cardAssignments.oracleId, [...availability.keys()])))
            .orderBy(cardAssignments.createdAt, cardAssignments.deckId)) {
            reservations.set(r.oracleId, [...(reservations.get(r.oracleId) ?? []), { deckId: r.deckId, copies: r.copies }]);
          }
        }
        return { availability, reservations };
      }, { isolationLevel: "repeatable read" })
      : { availability: new Map(), reservations: new Map() };
  const { availability, reservations } = read;
  const claims: Record<string, ArrivedClaimState> = {};
  for (const [oracleId, a] of availability) {
    claims[oracleId] = {
      owned: a.owned,
      hard: a.hard,
      // Claimants holding a copy (`holdsCopy`: a committed deck, or a brew the player gave one
      // to), counted as DECKS. A contested row is a choice between decks, so one deck wanting
      // three copies of a card the player owns one of is short rather than contested — see the
      // note in `arrivals.ts`. The same test `isContested` reads, so the two agree.
      committedDecks: a.claims.filter(holdsCopy).length,
    };
  }

  // WHERE THE COPIES WENT, from the same read (`arrivalPlacement`). Only while the switch is on.
  let placements: Record<string, Placement> | undefined;
  if (addedCopyOn) {
    placements = {};
    for (const [oracleId, a] of availability) {
      placements[oracleId] = arrivalPlacement(
        a,
        (ownedAfter[oracleId] ?? 0) - (ownedBefore[oracleId] ?? 0),
        reservations.get(oracleId) ?? [],
      );
    }
  }

  // Names for the rows the diff CAN EMIT, and nothing else: a card on a buy row either
  // side of the replace, or a contested arrival. Not the collection — a player with three
  // thousand cards would otherwise put three thousand parameters into one `IN` on every
  // confirm, to name a handful of rows. Frozen into the payload, so a later rename or a
  // deleted deck cannot rewrite a receipt.
  const nowShort: NowShortRow[] = (args.nowShort ?? [])
    .map(({ deckId, oracleId, short }) => ({ deckId, oracleId, short }));
  const shortDeckNames: Record<string, string> = {};
  const shortCardNames: Record<string, string> = {};
  for (const r of args.nowShort ?? []) {
    if (r.deckName) shortDeckNames[r.deckId] = r.deckName;
    if (r.cardName) shortCardNames[r.oracleId] = r.cardName;
  }
  const named = new Set([
    ...buyBefore.map((r) => r.oracleId),
    ...nowShort.map((r) => r.oracleId),
    ...buyAfter.map((r) => r.oracleId),
    ...Object.keys(claims),
  ]);

  const summary = buildArrivalsSummary({
    ownedBefore,
    ownedAfter,
    buyBefore,
    buyAfter,
    claims,
    nowShort,
    unmatched: args.unmatched,
    parseErrorCount: args.parseErrorCount,
    cardNames: { ...(await cardNamesFor([...named])), ...shortCardNames },
    deckNames: { ...(await deckNamesFor(userId)), ...shortDeckNames },
    placements,
  });
  await db.update(csvUploads).set({ summaryPayload: summary })
    .where(and(eq(csvUploads.id, uploadId), eq(csvUploads.userId, userId)));
  return summary;
}

