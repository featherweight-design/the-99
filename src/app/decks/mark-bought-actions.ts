"use server";

import { after } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { printings } from "../../db/schema";
import { requireUserId } from "../../lib/auth";
import { isUuid } from "../../lib/uuid";
import { isFinish, type CollectionItemIdentity } from "../../lib/collection/key";
import { invalidateCollectionReaders } from "../../lib/collection/invalidate";
import { applyCollectionChange } from "../../lib/collection/write";
import { requireDeck } from "../../lib/decks/read";
import { allDecksCartEnabled } from "../../lib/decks/all-decks-cart-flag";
import { loadDeckBuyRows } from "../../lib/decks/availability-query";
import { loadContestedCard, type ContestedCard } from "../../lib/collection/summary-read";
import type { AssignRefusal } from "../../lib/decks/assign";
import { shoppingMarkBoughtEnabled } from "../../lib/decks/mark-bought-flag";
import {
  CART_DECKS_MAX, MARK_BOUGHT_MAX, cartReceiptFacts, cartSource, receiptFacts, type CartReceiptFacts, type ReceiptFacts,
} from "../../lib/decks/mark-bought";
import { warmCommanderScores } from "../../lib/recs/warm";

/** `collection_items.quantity` is a Postgres integer: the collection editor's bound. */
const MAX_HELD = 2_147_483_647;

export type MarkBoughtOutcome =
  /**
   * Written. `receipt` is null on a retry that found this press already applied: the snapshots
   * were taken by the request that wrote it, and a second read would count later writes.
   */
  | { applied: { id: string; receipt: ReceiptFacts | null } }
  /** The holding moved since the confirm read it (`expected`); `current` is each row now. */
  | { stale: (CollectionItemIdentity & { quantity: number })[] }
  /** The catalog no longer holds the card. */
  | { missingCard: string[] }
  /** Either switch off, a card this deck does not hold, or a printing or finish that does not exist. */
  | { refused: "off" | "notInDeck" | "notAPrinting" };

/**
 * I got it: records `quantity` copies of one printing, bought off `deckId`'s Shopping list, into
 * the Collection through the ledger, as one `edit` entry sourced `shopping:<deckId>` (audit gap 3,
 * finding 4: no new history kind).
 *
 * The confirm sends the printing by its catalog id; set and collector number are the catalog's,
 * never the client's, and the finish must be one that printing has (gap 2). `expected` is the
 * count of that exact holding as the confirm read it, and the write is the ABSOLUTE count
 * `expected + quantity`, never a delta, so a holding that moved since refuses with `stale` (gap 6).
 * `id` is minted once per press and reused on retry, so a retried press records once.
 *
 * The readers are invalidated BEFORE the response, as the revert action does: the deck page's
 * list must be current when the press resolves. Only the score warm waits for `after()`.
 */
export async function markBought(
  rawDeckId: string,
  rawOracleId: string,
  input: { scryfallId: unknown; finish: unknown; quantity: unknown; expected: unknown; id: unknown },
): Promise<MarkBoughtOutcome> {
  if (!shoppingMarkBoughtEnabled()) return { refused: "off" };
  const userId = await requireUserId();
  const { scryfallId, finish, quantity, expected, id } = input;
  if (!isUuid(rawDeckId) || !isUuid(rawOracleId) || !isUuid(id) || !isUuid(scryfallId)) throw new Error("bad mark-bought input");
  // Lowercased: Postgres hands uuids back lowercase, every map is keyed on what it returned, and the
  // entry's `shopping:<id>` source is compared as a string by the undo (`ignoreDeckId`).
  const deckId = rawDeckId.toLowerCase();
  const oracleId = rawOracleId.toLowerCase();
  if (typeof finish !== "string" || !isFinish(finish)) throw new Error("bad mark-bought input");
  if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > MARK_BOUGHT_MAX) {
    throw new Error("bad mark-bought input");
  }
  if (!Number.isInteger(expected) || (expected as number) < 0 || (expected as number) + (quantity as number) > MAX_HELD) {
    throw new Error("bad mark-bought input");
  }
  await requireDeck(deckId, userId);

  // The printing, from the catalog by its id and only as a printing OF THIS CARD.
  const [printing] = await db
    .select({ setCode: printings.setCode, collectorNumber: printings.collectorNumber, finishes: printings.finishes })
    .from(printings)
    .where(and(eq(printings.scryfallId, scryfallId as string), eq(printings.oracleId, oracleId)));
  if (!printing || !printing.finishes.includes(finish)) return { refused: "notAPrinting" };

  const result = await applyCollectionChange(
    userId,
    {
      kind: "edit",
      rows: [{
        oracleId,
        setCode: printing.setCode,
        collectorNumber: printing.collectorNumber,
        finish,
        quantity: (expected as number) + (quantity as number),
        expected: expected as number,
        scryfallId: scryfallId as string,
        condition: null,
      }],
    },
    {
      id: id as string,
      source: `shopping:${deckId}`,
      receipt: { oracleId, deckIds: [deckId] },
      // Body or commander, checked inside the write under the deck row's lock, so no deck edit can
      // remove the card between the check and the commit.
      requireMember: { deckIds: [deckId], oracleId },
    },
  );
  switch (result.status) {
    case "applied":
    case "alreadyApplied": {
      invalidateCollectionReaders(userId);
      after(() => warmCommanderScores(userId));
      const snaps = result.status === "applied" ? result.receipt : undefined;
      return {
        applied: {
          id: result.entry.id,
          receipt: snaps ? receiptFacts(snaps.before, snaps.after, snaps.afterFromDecks[deckId] ?? null, deckId) : null,
        },
      };
    }
    case "stale": return { stale: result.current };
    case "missingCard": return { missingCard: result.names };
    case "notInDeck": return { refused: "notInDeck" };
    // A raise never lowers a count, so `wouldShort` cannot come back; `unchanged` needs a quantity
    // of 0, which the input check refuses.
    default: throw new Error(`mark bought refused: ${result.status}`);
  }
}


export type MarkBoughtForDecksOutcome =
  | { applied: { id: string; receipt: CartReceiptFacts | null } }
  /**
   * The holding moved since the confirm read it. `need` is what the line's decks are billed now, from
   * the roll-up: one copy landing elsewhere can clear several brews' rows, or none, so the cart's
   * need is read again rather than worked out from the holding.
   */
  | { stale: (CollectionItemIdentity & { quantity: number })[]; need: number }
  | { missingCard: string[] }
  /**
   * Either switch off; a deck that no longer holds the card (the line is read again, audit G2); a
   * printing or finish that does not exist; or the chooser's pick refused, by its reason, with
   * nothing written.
   */
  | { refused: "off" | "notInDeck" | "notAPrinting" }
  | { pickRefused: AssignRefusal };

/**
 * I got it from the all-decks cart (cart PR 5, audit G2): `quantity` copies of one printing, bought
 * for the line's selected decks, as ONE absolute write under one press id, sourced `cartSource`
 * (the line's deck ids, which the cart's undo is checked against).
 * Every deck in `deckIds` must still hold the card, checked per deck inside the write under its
 * row lock; one that dropped it refuses the whole press, and the cart reads the line again.
 *
 * `pickDeckId` is the S1b chooser: when fewer copies are bought than the decks want, the player
 * names the deck that gets one, brews included (lock 9). It is written as the card's reservation
 * in the same transaction, after the copies land, so the purchase and the pick commit together or
 * not at all. Absent, seniority decides, as everywhere else.
 */
export async function markBoughtForDecks(
  rawOracleId: string,
  input: {
    deckIds: unknown; pickDeckId?: unknown;
    scryfallId: unknown; finish: unknown; quantity: unknown; expected: unknown; id: unknown;
  },
): Promise<MarkBoughtForDecksOutcome> {
  if (!shoppingMarkBoughtEnabled() || !allDecksCartEnabled()) return { refused: "off" };
  const userId = await requireUserId();
  const { scryfallId, finish, quantity, expected, id, pickDeckId } = input;
  if (!isUuid(rawOracleId) || !isUuid(id) || !isUuid(scryfallId)) throw new Error("bad mark-bought input");
  if (!Array.isArray(input.deckIds) || input.deckIds.length === 0 || input.deckIds.length > CART_DECKS_MAX
    || !input.deckIds.every(isUuid)) {
    throw new Error("bad mark-bought input");
  }
  // Lowercased, as in `markBought`: every map the receipt reads is keyed on what Postgres returns.
  const deckIds = [...new Set((input.deckIds as string[]).map((d) => d.toLowerCase()))];
  const oracleId = rawOracleId.toLowerCase();
  let pick: string | null = null;
  if (pickDeckId !== undefined && pickDeckId !== null) {
    if (typeof pickDeckId !== "string" || !isUuid(pickDeckId) || !deckIds.includes(pickDeckId.toLowerCase())) {
      throw new Error("bad mark-bought input");
    }
    pick = pickDeckId.toLowerCase();
  }
  if (typeof finish !== "string" || !isFinish(finish)) throw new Error("bad mark-bought input");
  if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > MARK_BOUGHT_MAX) {
    throw new Error("bad mark-bought input");
  }
  if (!Number.isInteger(expected) || (expected as number) < 0 || (expected as number) + (quantity as number) > MAX_HELD) {
    throw new Error("bad mark-bought input");
  }

  const [printing] = await db
    .select({ setCode: printings.setCode, collectorNumber: printings.collectorNumber, finishes: printings.finishes })
    .from(printings)
    .where(and(eq(printings.scryfallId, scryfallId as string), eq(printings.oracleId, oracleId)));
  if (!printing || !printing.finishes.includes(finish)) return { refused: "notAPrinting" };

  const result = await applyCollectionChange(
    userId,
    {
      kind: "edit",
      rows: [{
        oracleId,
        setCode: printing.setCode,
        collectorNumber: printing.collectorNumber,
        finish,
        quantity: (expected as number) + (quantity as number),
        expected: expected as number,
        scryfallId: scryfallId as string,
        condition: null,
      }],
    },
    {
      id: id as string,
      source: cartSource(deckIds),
      // No per-deck vantage: the cart's receipt reads what each line deck is still billed, from
      // its live list, inside the write (`owesFor`), and the rest off the one snapshot.
      receipt: { oracleId, deckIds: [], owesFor: deckIds },
      // Ownership and membership per deck, under each deck's row lock (see `markBought`).
      requireMember: { deckIds, oracleId },
      ...(pick ? { assign: { oracleId, deckId: pick } } : {}),
    },
  );
  switch (result.status) {
    case "applied":
    case "alreadyApplied": {
      invalidateCollectionReaders(userId);
      after(() => warmCommanderScores(userId));
      const snaps = result.status === "applied" ? result.receipt : undefined;
      return {
        applied: {
          id: result.entry.id,
          receipt: snaps ? cartReceiptFacts(snaps.before, snaps.after, deckIds, new Map(Object.entries(snaps.owes ?? {}))) : null,
        },
      };
    }
    case "stale": {
      const billed = await loadDeckBuyRows(userId, deckIds);
      return { stale: result.current, need: billed.filter((r) => r.oracleId === oracleId).reduce((n, r) => n + r.quantity, 0) };
    }
    case "missingCard": return { missingCard: result.names };
    case "notInDeck": return { refused: "notInDeck" };
    case "assignRefused": return { pickRefused: result.reason };
    default: throw new Error(`mark bought refused: ${result.status}`);
  }
}

/**
 * The S1b chooser's read (cart PR 6b): the card's claimants, narrowed to the cart line's decks in
 * the claim model's own queue order, for the confirm to preview who gets the copies being bought.
 * Read-only: the pick it previews is written by `markBoughtForDecks`, with the purchase. Null when
 * either switch is off, or the claim model does not list every one of the line's decks, and the confirm then lists the decks as
 * it does at full count.
 */
export async function readCartChooser(rawOracleId: string, rawDeckIds: unknown): Promise<ContestedCard | null> {
  if (!shoppingMarkBoughtEnabled() || !allDecksCartEnabled()) return null;
  const userId = await requireUserId();
  if (!isUuid(rawOracleId) || !Array.isArray(rawDeckIds) || rawDeckIds.length === 0
    || rawDeckIds.length > CART_DECKS_MAX || !rawDeckIds.every(isUuid)) {
    throw new Error("bad chooser input");
  }
  const deckIds = new Set((rawDeckIds as string[]).map((d) => d.toLowerCase()));
  const card = await loadContestedCard(rawOracleId.toLowerCase(), userId);
  if (!card) return null;
  const claimants = card.claimants.filter((c) => deckIds.has(c.deckId.toLowerCase()));
  // Every deck on the line or none: a deck billed for the card that the claim model does not list
  // (a card only in a committed deck's draft) would otherwise vanish from the confirm, and the plain
  // list is the honest fallback.
  return claimants.length === deckIds.size ? { ...card, claimants } : null;
}
