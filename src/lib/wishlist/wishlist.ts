/**
 * The player's own wishlist (scope §2, Hugh's ruling Q7, 2026-10-12; Social R2). Card level: any printing will
 * do. A line's `quantity` is how many copies the player wants to own in all. Once the collection holds that many,
 * deck copies included, the card is COLLECTED and leaves the list (Social R2 G5, Hugh, 2026-10-15, reversing Q9's
 * "stays until cleared"): the collection write that reaches the want deletes the line and records it for the tab's
 * one-time strip (`collected.ts`). Every read here also leaves out a line the collection already reaches, so a read
 * never shows a collected card and never deletes one. Reads and writes here are the viewer's OWN rows only; a
 * friend's wishlist is read through `src/lib/social/wishlist.ts`, which joins the friendship.
 */
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, printings, wishlistItems } from "../../db/schema";
import { cheapestNow, loadPrices } from "../decks/price-query";
import { priceOf, priceState, type PriceFact } from "../decks/price";
import { heldCopies } from "./held";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_WISHLIST_QUANTITY = 99;

/** A wanted count from untrusted input: a whole number from 1 to 99, or `null`. */
export function cleanQuantity(raw: unknown): number | null {
  const n = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : raw;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > MAX_WISHLIST_QUANTITY) return null;
  return n;
}

/** `scryfallId`: the one printing the line names, or null for "any printing" (only that printing collects it). */
export type WishlistLine = { oracleId: string; scryfallId: string | null; quantity: number; owned: number; addedAt: Date };

/**
 * One owner's lines still WANTED (the collection holds fewer than wanted), with what it holds of each, newest
 * first. A collected line is left out here rather than deleted (G5: a read never deletes). Apart so a test can
 * render it.
 */
export function wishlistLinesQuery(ownerId: string, q: Pick<typeof db, "select"> = db) {
  // What the collection holds of the line, as the line counts it (`held.ts`). The join to `cards` (a foreign key, so
  // it never drops a row) keeps the table qualification Drizzle drops in a single-table select, which the correlated
  // subquery needs: bare, its `user_id` would read the collection row's own.
  const owned = heldCopies(wishlistItems.userId, wishlistItems.oracleId, wishlistItems.scryfallId);
  return q
    .select({
      oracleId: wishlistItems.oracleId,
      scryfallId: wishlistItems.scryfallId,
      quantity: wishlistItems.quantity,
      owned,
      addedAt: wishlistItems.createdAt,
    })
    .from(wishlistItems)
    .innerJoin(cards, eq(cards.oracleId, wishlistItems.oracleId))
    .where(and(eq(wishlistItems.userId, ownerId), sql`${owned} < ${wishlistItems.quantity}`))
    .orderBy(sql`${wishlistItems.createdAt} desc`, asc(wishlistItems.oracleId));
}

export async function loadWishlist(viewerId: string): Promise<WishlistLine[]> {
  return wishlistLinesQuery(viewerId);
}

/** A wishlist tile (Social R2 G1): the line, and the card it names as the collection's own grid draws it. */
export type WishlistTile = WishlistLine & {
  name: string;
  /** The catalog's full card image; null for a card Scryfall has no image of. */
  imageUri: string | null;
  layout: string;
  backImageUri: string | null;
  /**
   * What one copy costs, from the price read every buy tag uses; null when the card has never been stocked. A line
   * that names a printing carries THAT printing's figure (live or its last, which `priceState` reads as sold out),
   * never the cheapest's.
   */
  price: PriceFact | null;
  /** The printing the line names, as the tile draws it (lowercase set, as the catalog stores it); null for "any printing". */
  printing: { scryfallId: string; setCode: string; collectorNumber: string } | null;
};

/**
 * The viewer's wanted lines as tiles, and the price read's `newestAsOf`: a fact older than it is a sold-out card's
 * last figure, which `priceState` tells apart only against the SAME read's newest (a second query could see another
 * refresh).
 */
export type WishlistTiles = { tiles: WishlistTile[]; newestAsOf: Date | null };

/** The viewer's wanted lines as tiles: the catalog's name and full card image, and the price read's figure. */
export async function loadWishlistTiles(viewerId: string): Promise<WishlistTiles> {
  const lines = await wishlistLinesQuery(viewerId);
  if (lines.length === 0) return { tiles: [], newestAsOf: null };
  const ids = lines.map((l) => l.oracleId);
  const chosen = lines.flatMap((l) => (l.scryfallId ? [l.scryfallId] : []));
  const [faces, named, read] = await Promise.all([
    db.select({ oracleId: cards.oracleId, name: cards.name, imageUri: cards.imageUri, layout: cards.layout, backImageUri: cards.backImageUri })
      .from(cards)
      .where(inArray(cards.oracleId, ids)),
    chosen.length === 0
      ? Promise.resolve([])
      : db.select({ scryfallId: printings.scryfallId, setCode: printings.setCode, collectorNumber: printings.collectorNumber, imageUri: printings.imageUri, backImageUri: printings.backImageUri })
        .from(printings)
        .where(inArray(printings.scryfallId, chosen)),
    loadPrices(ids, [], chosen),
  ]);
  const byId = new Map(faces.map((f) => [f.oracleId, f]));
  const byPrinting = new Map(named.map((p) => [p.scryfallId, p]));
  const tiles = lines.flatMap((l) => {
    const f = byId.get(l.oracleId);
    if (!f) return [];
    const p = l.scryfallId ? byPrinting.get(l.scryfallId) : undefined;
    // A printing the catalog no longer holds was nulled by the foreign key, so `p` is only missing for a read that
    // raced the delete: the tile falls back to the card's own face and price for that one read.
    return [{
      ...l,
      name: f.name,
      // This printing's face: its own image, and its back where the layout has one, else the oracle card's.
      imageUri: p?.imageUri ?? f.imageUri,
      layout: f.layout,
      backImageUri: p ? (p.backImageUri ?? f.backImageUri) : f.backImageUri,
      price: p ? (read.named?.get(p.scryfallId) ?? null) : (read.prices.get(l.oracleId) ?? null),
      printing: p ? { scryfallId: p.scryfallId, setCode: p.setCode, collectorNumber: p.collectorNumber } : null,
    }];
  });
  return { tiles, newestAsOf: read.newestAsOf };
}

/**
 * How many copies the viewer wants of one card, for card details' Wishlist section, or null when the card is not
 * on the list (never put there, cleared, or collected). A malformed id reads as not on the list.
 */
export async function loadWishlistWant(viewerId: string, oracleId: string): Promise<number | null> {
  if (!UUID.test(oracleId)) return null;
  // Aliased and qualified: the held-copies subquery reads the line's own columns (`held.ts`).
  const { rows: [row] } = await db.execute<{ quantity: number }>(sql`
    select w.quantity from ${wishlistItems} w
    where w.user_id = ${viewerId} and w.oracle_id = ${oracleId}::uuid
      and w.quantity > ${heldCopies(sql`w.user_id`, sql`w.oracle_id`, sql`w.scryfall_id`)}
  `);
  return row?.quantity ?? null;
}

/**
 * What a want write did. `wanted`: the line stands at `quantity`. `held`: the want is no more than the collection
 * already holds, so there is nothing to want and no line stands (any earlier line for the card is gone). `held` is
 * what the collection holds of the card, read under the same lock as the write, for the screen's `have N`. `null`
 * from the writes below means nothing was written: bad input, or a card id the catalog does not hold.
 */
export type WantResult = { status: "wanted" | "held"; quantity: number; held: number };

/**
 * Put a card on the viewer's wishlist wanting `quantity` copies, or change how many. A card id the catalog
 * does not hold writes nothing (checked in the statement, so no foreign-key error reaches the caller). A first want
 * the collection already reaches leaves no line, and is NOT kept for the collected strip: the player made that change
 * in front of them, and the strip says what was collected "since you last looked".
 *
 * A line still unmet is never lowered off the list (`wantFloor`): the stepper's − stops at one more than held, and a
 * screen whose held count went stale while the collection grew is held to the same floor here, under the lock.
 */
export async function setWishlistQuantity(viewerId: string, oracleId: unknown, rawQuantity: unknown): Promise<WantResult | null> {
  const quantity = cleanQuantity(rawQuantity);
  if (typeof oracleId !== "string" || !UUID.test(oracleId) || quantity === null) return null;
  return writeWant(viewerId, oracleId, (held, current) => wantFloor(quantity, held, current));
}

/**
 * The want a set writes. The want is copies wanted IN ALL, so a line standing unmet (`current` above `held`) is
 * floored at one more than held: a step down never removes it, and Remove is the way off. With no line, or a line the
 * collection already reaches (it is swept by the next collection write, the collected rule), the request stands.
 */
export function wantFloor(requested: number, held: number, current: number | null): number {
  return current !== null && current > held && requested <= held ? held + 1 : requested;
}

/**
 * Add to wishlist's first press (Social R2 G4): want ONE MORE than the collection holds, capped at 99, so a line
 * lands wanted rather than collected. A player holding 99 or more is answered `held`, with no line.
 */
export async function wantOneMore(viewerId: string, oracleId: unknown): Promise<WantResult | null> {
  if (typeof oracleId !== "string" || !UUID.test(oracleId)) return null;
  return writeWant(viewerId, oracleId, (held) => Math.min(held + 1, MAX_WISHLIST_QUANTITY));
}

/**
 * The one want write. Under the player's collection lock, so a collection write cannot land between the read of
 * what is held and the write, and the want is decided from that read.
 */
async function writeWant(
  viewerId: string,
  oracleId: string,
  want: (held: number, current: number | null) => number,
): Promise<WantResult | null> {
  // The price-drop baseline (menu and Home G2): today's cheapest, as every buy tag draws it, read before the lock so
  // the collection lock is held no longer than it was. Written only by a NEW line; a quantity change keeps the
  // line's own. Null when the card has no live price, which the price job fills on its next run.
  const atAdd = cheapestNow(await loadPrices([oracleId]), oracleId);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${viewerId}, 0))`);
    // `held` is what the collection holds as THIS line counts it (`held.ts`): a line naming a printing counts that
    // printing's copies alone, a new line or an "any printing" one counts every copy of the card.
    const { rows: [card] } = await tx.execute<{ held: number; current: number | null }>(sql`
      select ${heldCopies(viewerId, sql`c.oracle_id`, sql`w.scryfall_id`)} as held, w.quantity as current
      from ${cards} c
      left join ${wishlistItems} w on w.user_id = ${viewerId} and w.oracle_id = c.oracle_id
      where c.oracle_id = ${oracleId}
    `);
    if (!card) return null;
    const quantity = want(card.held, card.current);
    if (quantity <= card.held) {
      await tx.delete(wishlistItems).where(and(eq(wishlistItems.userId, viewerId), eq(wishlistItems.oracleId, oracleId)));
      return { status: "held", quantity, held: card.held };
    }
    await tx.execute(sql`
      insert into ${wishlistItems} (user_id, oracle_id, quantity, price_at_add_cents)
      values (${viewerId}, ${oracleId}, ${quantity}, ${atAdd}::int)
      on conflict (user_id, oracle_id) do update set quantity = excluded.quantity
    `);
    return { status: "wanted", quantity, held: card.held };
  });
}

/**
 * Name the printing a wishlist line wants, or null for "any printing" again (wishlist printing, Hugh, 2026-11-22).
 * One write under the player's collection lock: it sets `scryfall_id` and rewrites the price-drop baseline to THAT
 * printing's figure (or the cheapest's, for null) and clears the notice stamp, so the alert never compares a new
 * printing against another's price and a fresh choice can be told about at once. A card not yet on the list is put
 * on it wanting one more than the printing is held in, which is what "Want SLD 2125" means from a card that is not
 * wanted. The printing must be one of the card's own (checked in the statement); anything else writes nothing and
 * answers null.
 *
 * Collected is decided by the NEW printing: a line the player already holds enough copies of in it has nothing left
 * to want, so it is removed (`held`), as `writeWant` removes a want set at or below what is held. The baseline is
 * null when the printing has no live price (the price job fills it on its next run); a named printing that is sold
 * out sets no alert until it returns.
 */
export async function setWishlistPrinting(viewerId: string, oracleId: unknown, rawPrintingId: unknown): Promise<WantResult | null> {
  if (typeof oracleId !== "string" || !UUID.test(oracleId)) return null;
  const printingId = rawPrintingId === null ? null : typeof rawPrintingId === "string" && UUID.test(rawPrintingId) ? rawPrintingId : undefined;
  if (printingId === undefined) return null;
  const read = await loadPrices([oracleId], [], printingId ? [printingId] : []);
  const fact = printingId ? read.named?.get(printingId) : undefined;
  const atAdd = printingId ? (fact ? priceOf(fact, priceState(fact, read.newestAsOf)) : null) : cheapestNow(read, oracleId);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${viewerId}, 0))`);
    const { rows: [card] } = await tx.execute<{ held: number; current: number | null; chosen: string | null }>(sql`
      select ${heldCopies(viewerId, sql`c.oracle_id`, sql`${printingId}::uuid`)} as held,
        w.quantity as current, w.scryfall_id as chosen
      from ${cards} c
      left join ${wishlistItems} w on w.user_id = ${viewerId} and w.oracle_id = c.oracle_id
      where c.oracle_id = ${oracleId}
        and (${printingId}::uuid is null
          or exists (select 1 from ${printings} p where p.scryfall_id = ${printingId}::uuid and p.oracle_id = c.oracle_id))
    `);
    if (!card) return null;
    // Clearing a choice resets a line that is there; it never adds one (a choice of a printing does).
    if (printingId === null && card.current === null) return null;
    // The same printing again changes nothing, baseline and notice included.
    if (card.current !== null && card.chosen === printingId) return { status: "wanted", quantity: card.current, held: card.held };
    const quantity = card.current ?? Math.min(card.held + 1, MAX_WISHLIST_QUANTITY);
    if (quantity <= card.held) {
      await tx.delete(wishlistItems).where(and(eq(wishlistItems.userId, viewerId), eq(wishlistItems.oracleId, oracleId)));
      return { status: "held", quantity, held: card.held };
    }
    await tx.execute(sql`
      insert into ${wishlistItems} (user_id, oracle_id, quantity, price_at_add_cents, scryfall_id)
      values (${viewerId}, ${oracleId}, ${quantity}, ${atAdd}::int, ${printingId}::uuid)
      on conflict (user_id, oracle_id) do update set
        scryfall_id = excluded.scryfall_id, price_at_add_cents = excluded.price_at_add_cents, price_noticed_at = null
    `);
    return { status: "wanted", quantity, held: card.held };
  });
}

/** Clear a line the player no longer wants. */
export async function clearWishlistLine(viewerId: string, oracleId: unknown): Promise<boolean> {
  if (typeof oracleId !== "string" || !UUID.test(oracleId)) return false;
  const gone = await db
    .delete(wishlistItems)
    .where(and(eq(wishlistItems.userId, viewerId), eq(wishlistItems.oracleId, oracleId)))
    .returning({ oracleId: wishlistItems.oracleId });
  return gone.length > 0;
}
