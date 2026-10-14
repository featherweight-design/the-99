/**
 * "Start with this precon" with "I own this precon" selected (Hugh, 2026-10-14): the box's copies go
 * into the collection AND to the deck they came in, in ONE transaction, in this order:
 *
 *   1. the add writes the copies (the ledger's own write, `applyCollectionChange`);
 *   2. inside it, the deck is written, pinned to the box's printings and committed as v1;
 *   3. the copies the box brought are RESERVED to that deck (`card_assignments`), so the claim model
 *      hands them to it and not, by seniority, to an older deck that was short of the same card;
 *   4. only then does the add read where its copies went and write its History entry, so "Went to"
 *      names the new deck.
 *
 * Anything that fails rolls all four back: the player has either the deck and the copies, or neither.
 * Undo of the add takes the reservations with the copies (`releasePreconReservations`); the deck is
 * linked to the add by `decks.precon_add_entry_id`, which is also how a retry finds the deck it made.
 * Not a "use server" module: it takes a user id.
 */
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { cardAssignments, cards, collectionHistory, decks } from "../../db/schema";
import { applyCollectionChange } from "../collection/write";
import { lockCardClaims } from "../decks/assign";
import { isBasicLand } from "../decks/grouping";
import { preconSource } from "./added";
import { committedAnswer, preconAddLines, readPreconForAddIn } from "./add";
import { preparePreconDeckIn, writePreconDeckIn, type PreparedPreconDeck } from "./start";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type PreconStartResult =
  | { ok: true; deckId: string; entryId: string }
  | { ok: false; reason: "notFound" | "failed" };

/**
 * The copies to reserve to the new deck, by card: what the box brought, up to what the deck lists. A
 * commander is never reservable (`card_assignments`), and a basic is outside the claim model, so neither
 * is reserved. Pure, so a test can start from the lists.
 */
export function preconReservations(
  deck: Pick<PreparedPreconDeck, "cards">,
  brought: ReadonlyMap<string, number>,
  basics: ReadonlySet<string>,
): { oracleId: string; copies: number }[] {
  return deck.cards
    .filter((c) => !basics.has(c.oracleId))
    .map((c) => ({ oracleId: c.oracleId, copies: Math.min(c.quantity, brought.get(c.oracleId) ?? 0) }))
    .filter((r) => r.copies > 0)
    .sort((a, b) => (a.oracleId < b.oracleId ? -1 : a.oracleId > b.oracleId ? 1 : 0));
}

export async function startPreconOwned(
  userId: string,
  fileName: string,
  name: string,
  actionId: string,
  env: NodeJS.ProcessEnv,
  placements: boolean,
): Promise<PreconStartResult> {
  // A retry: the deck this action made, found through its link. Read before the catalog, so an ingest
  // that replaced the precon since changes nothing.
  const made = await madeBy(userId, fileName, actionId);
  if (made === "other") return { ok: false, reason: "failed" };
  if (made) return { ok: true, deckId: made, entryId: actionId };
  // An id some other write already used (an add with no deck, a card's add) is not this start's.
  if (await committedAnswer(userId, fileName, actionId)) return { ok: false, reason: "failed" };

  // The box and the deck from ONE snapshot: the ingest replaces a precon's rows in one transaction, so two
  // reads could add one generation's box and start the next generation's deck, reserving against a list
  // the deck does not hold.
  const read = await db.transaction(async (tx) => {
    const box = await readPreconForAddIn(tx, fileName);
    return box ? { box, deck: await preparePreconDeckIn(tx, fileName) } : null;
  }, { isolationLevel: "repeatable read" });
  if (!read) return { ok: false, reason: "notFound" };
  const { box, deck } = read;
  const lines = preconAddLines(box.cards, box.tokens);
  const brought = new Map<string, number>();
  for (const item of lines.items) brought.set(item.oracleId, (brought.get(item.oracleId) ?? 0) + item.quantity);

  let deckId: string | null = null;
  const result = await applyCollectionChange(
    userId,
    { kind: "add", items: lines.items, preconTokens: lines.tokens },
    {
      id: actionId,
      env,
      source: preconSource(fileName),
      ...(placements ? { placements } : {}),
      inside: async (tx) => {
        const basics = await basicIds(tx, deck.cards.map((c) => c.oracleId));
        const reserve = preconReservations(deck, brought, basics);
        // Every card's claim lock FIRST, sorted, before the deck row the commit locks: the order every
        // reservation write takes them in (`lockCardClaims`).
        for (const r of reserve) await lockCardClaims(tx, userId, r.oracleId);
        deckId = await writePreconDeckIn(tx, userId, name, deck, env, actionId);
        if (reserve.length > 0) {
          await tx.insert(cardAssignments).values(reserve.map((r) => ({ userId, oracleId: r.oracleId, deckId: deckId!, copies: r.copies })));
        }
      },
    },
  );
  if (result.status === "applied" && deckId) return { ok: true, deckId, entryId: actionId };
  // A twin request committed between the check above and this write.
  if (result.status === "alreadyApplied") {
    const raced = await madeBy(userId, fileName, actionId);
    if (raced && raced !== "other") return { ok: true, deckId: raced, entryId: actionId };
  }
  return { ok: false, reason: "failed" };
}

/**
 * The deck this action already made, or "other" when the id made a deck from a DIFFERENT precon: a retry
 * lands on its own deck, never on another precon's.
 */
async function madeBy(userId: string, fileName: string, actionId: string): Promise<string | "other" | null> {
  const [row] = await db.select({ id: decks.id, source: collectionHistory.source }).from(decks)
    .innerJoin(collectionHistory, eq(collectionHistory.id, decks.preconAddEntryId))
    .where(and(eq(decks.userId, userId), eq(decks.preconAddEntryId, actionId), eq(collectionHistory.userId, userId)));
  if (!row) return null;
  return row.source === preconSource(fileName) ? row.id : "other";
}

async function basicIds(tx: Tx, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await tx.select({ oracleId: cards.oracleId, typeLine: cards.typeLine }).from(cards).where(inArray(cards.oracleId, ids));
  return new Set(rows.filter((r) => isBasicLand(r.typeLine)).map((r) => r.oracleId));
}
