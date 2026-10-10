"use server";

import { after } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { printings } from "../../db/schema";
import { requireUserId } from "../../lib/auth";
import { isUuid } from "../../lib/uuid";
import { isFinish, type CollectionItemIdentity } from "../../lib/collection/key";
import { invalidateCollectionReaders } from "../../lib/collection/invalidate";
import { applyCollectionChange } from "../../lib/collection/write";
import { requireDeck } from "../../lib/decks/read";
import { proxiedMembership } from "../../lib/decks/proxies";
import { shoppingMarkBoughtEnabled } from "../../lib/decks/mark-bought-flag";
import { MARK_BOUGHT_MAX, receiptFacts, type ReceiptFacts } from "../../lib/decks/mark-bought";
import { warmCommanderScores } from "../../lib/recs/warm";

/** A holding's count is a PG integer; the same bound the collection editor uses. */
const MAX_HELD = 10_000;

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

  // Body or commander, the rule every per-deck write uses.
  const { rows: [member] } = await db.execute<{ held: boolean }>(
    sql`select ${proxiedMembership(deckId, oracleId)} as held`,
  );
  if (!member?.held) return { refused: "notInDeck" };

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
    { id: id as string, source: `shopping:${deckId}`, receipt: { oracleId, deckId } },
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
          receipt: snaps ? receiptFacts(snaps.before, snaps.after, snaps.afterFromDeck, deckId) : null,
        },
      };
    }
    case "stale": return { stale: result.current };
    case "missingCard": return { missingCard: result.names };
    // A raise never lowers a count, so `wouldShort` cannot come back; `unchanged` needs a quantity
    // of 0, which the input check refuses.
    default: throw new Error(`mark bought refused: ${result.status}`);
  }
}

