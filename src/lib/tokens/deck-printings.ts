import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { deckTokenPrintings, tokenPrintingHoldings, tokenPrintings } from "../../db/schema";

/**
 * Which printing a deck shows for each of its tokens (token printings plan, TP2). The same chain a card
 * follows (`src/lib/decks/printings.ts`): the deck's pick while the player still holds that printing, else
 * the printing they hold the most copies of that has art (a held printing with no image is passed over while one
 * with an image is held, as `primaryPrinting` passes it over for a card: the details sheet resolves with that, so the
 * row and the sheet show the same printing), else the catalog's own art (`assembleDeckTokens`' default).
 *
 * A pick the player no longer holds is IGNORED, never deleted, so a Replace upload that drops a printing
 * leaves every deck's choice standing for the day it comes back. So is a pick whose printing is not OF its
 * token: no key enforces that (the token ingest re-files printings), so the writer checks it and the reader
 * checks it again.
 */

/** One printing the player holds, summed across sources (an upload and a precon both put copies on the shelf). */
export type HeldTokenPrinting = { tokenPrintingId: string; quantity: number };

/**
 * The held printings in the order the details sheet lists them and the row's rule reads them: most copies
 * first, ties by id so the answer never depends on a read's row order. `primaryPrinting` takes the first
 * printing with art from this same order, so the row and its sheet agree.
 */
export function orderHeld(held: readonly HeldTokenPrinting[]): HeldTokenPrinting[] {
  return [...held].sort((a, b) => b.quantity - a.quantity || (a.tokenPrintingId < b.tokenPrintingId ? -1 : a.tokenPrintingId > b.tokenPrintingId ? 1 : 0));
}

/**
 * The printing a token row shows: the pick while held, else the first held printing with art, else `fallback`
 * (the catalog's default), else the first held. `hasArt` says whether a printing id carries an image.
 */
export function chooseTokenPrinting(
  pick: string | null,
  held: readonly HeldTokenPrinting[],
  fallback: string | null,
  hasArt: (tokenPrintingId: string) => boolean,
): { tokenPrintingId: string; source: "deck" | "held" | "catalog" } | null {
  const ordered = orderHeld(held);
  if (pick !== null && ordered.some((h) => h.tokenPrintingId === pick)) return { tokenPrintingId: pick, source: "deck" };
  const first = ordered.find((h) => hasArt(h.tokenPrintingId));
  if (first) return { tokenPrintingId: first.tokenPrintingId, source: "held" };
  // No held printing has art: the catalog's picture rather than a blank one. A held printing is shown with no
  // art only when the catalog has nothing either.
  if (fallback !== null) return { tokenPrintingId: fallback, source: "catalog" };
  return ordered[0] ? { tokenPrintingId: ordered[0].tokenPrintingId, source: "held" } : null;
}

type Reader = Pick<typeof db, "select">;

/** The printings a player holds of each of `tokenIds`, summed across sources, by token. */
export async function loadHeldTokenPrintings(
  userId: string,
  tokenIds: readonly string[],
  runner: Reader = db,
): Promise<Map<string, HeldTokenPrinting[]>> {
  const out = new Map<string, HeldTokenPrinting[]>();
  if (tokenIds.length === 0) return out;
  const rows = await runner
    .select({
      tokenOracleId: tokenPrintings.tokenOracleId,
      tokenPrintingId: tokenPrintingHoldings.tokenPrintingId,
      quantity: sql<number>`sum(${tokenPrintingHoldings.quantity})::int`,
    })
    .from(tokenPrintingHoldings)
    .innerJoin(tokenPrintings, eq(tokenPrintings.scryfallId, tokenPrintingHoldings.tokenPrintingId))
    .where(and(eq(tokenPrintingHoldings.userId, userId), inArray(tokenPrintings.tokenOracleId, [...tokenIds])))
    .groupBy(tokenPrintings.tokenOracleId, tokenPrintingHoldings.tokenPrintingId);
  for (const r of rows) out.set(r.tokenOracleId, [...(out.get(r.tokenOracleId) ?? []), { tokenPrintingId: r.tokenPrintingId, quantity: r.quantity }]);
  return out;
}

/**
 * A deck's picks, by token. The join on the token as well as the printing is the reader's half of the
 * printing-of-token check: a row naming another token's printing is not read.
 */
export async function loadDeckTokenPicks(deckId: string, userId: string, runner: Reader = db): Promise<Map<string, string>> {
  const rows = await runner
    .select({ tokenOracleId: deckTokenPrintings.tokenOracleId, tokenPrintingId: deckTokenPrintings.tokenPrintingId })
    .from(deckTokenPrintings)
    .innerJoin(tokenPrintings, and(
      eq(tokenPrintings.scryfallId, deckTokenPrintings.tokenPrintingId),
      eq(tokenPrintings.tokenOracleId, deckTokenPrintings.tokenOracleId),
    ))
    .where(and(eq(deckTokenPrintings.deckId, deckId), eq(deckTokenPrintings.userId, userId)));
  return new Map(rows.map((r) => [r.tokenOracleId, r.tokenPrintingId]));
}

type Writer = Pick<typeof db, "select" | "insert">;

/**
 * Whether this player's deck holds a card (its commanders included) that makes the token, read through `tx` so
 * a caller holding the deck's row lock reads it under that lock. A deck that is not theirs makes none.
 */
export async function deckMakesTokenIn(tx: Pick<typeof db, "execute">, deckId: string, userId: string, tokenOracleId: string): Promise<boolean> {
  const { rows: [r] } = await tx.execute<{ made: boolean }>(sql`
    select exists (
      select 1 from card_tokens ct
      where ct.token_oracle_id = ${tokenOracleId}::uuid
        and ct.card_oracle_id in (
          select d.commander_oracle_id from decks d where d.id = ${deckId}::uuid and d.user_id = ${userId}
          union select d.partner_oracle_id from decks d where d.id = ${deckId}::uuid and d.user_id = ${userId}
          union select dc.oracle_id from deck_cards dc join decks d on d.id = dc.deck_id
            where dc.deck_id = ${deckId}::uuid and d.user_id = ${userId}
        )
    ) as made`);
  return r?.made === true;
}

/**
 * The printing of a token a picker's set and number names, among the printings the player HOLDS: a set and
 * number is not unique (sibling variants share one), and the picker offered only held printings. Most copies
 * first, then by id, the order the picker lists them in. Null when no held printing of the token matches.
 */
export async function heldPrintingByNumber(
  tx: Reader,
  userId: string,
  tokenOracleId: string,
  setCode: string,
  collectorNumber: string,
): Promise<string | null> {
  const [p] = await tx.select({ id: tokenPrintings.scryfallId }).from(tokenPrintings)
    .innerJoin(tokenPrintingHoldings, and(
      eq(tokenPrintingHoldings.tokenPrintingId, tokenPrintings.scryfallId),
      eq(tokenPrintingHoldings.userId, userId),
    ))
    .where(and(
      eq(tokenPrintings.tokenOracleId, tokenOracleId),
      eq(sql`lower(${tokenPrintings.setCode})`, setCode.toLowerCase()),
      eq(tokenPrintings.collectorNumber, collectorNumber),
    ))
    .groupBy(tokenPrintings.scryfallId)
    .orderBy(sql`sum(${tokenPrintingHoldings.quantity}) desc`, tokenPrintings.scryfallId)
    .limit(1);
  return p?.id ?? null;
}

export type DeckTokenPrintingWrite = "ok" | "notOfToken" | "notHeld";

/**
 * Records `tokenPrintingId` as the printing deck `deckId` shows for `tokenOracleId`: the ONE writer of
 * `deck_token_printings`. Its caller today is the picker (`setDeckTokenPrinting`); a precon start is to call
 * it too, after writing its holdings in the same transaction. It refuses a printing that is not of that token,
 * and one the player holds no copy of (the picker offers only held printings). Whether the token is the deck's, and the deck the player's,
 * is the caller's to have checked.
 */
export async function writeDeckTokenPrintingIn(
  tx: Writer,
  w: { deckId: string; userId: string; tokenOracleId: string; tokenPrintingId: string },
): Promise<DeckTokenPrintingWrite> {
  const [of] = await tx.select({ id: tokenPrintings.scryfallId }).from(tokenPrintings)
    .where(and(eq(tokenPrintings.scryfallId, w.tokenPrintingId), eq(tokenPrintings.tokenOracleId, w.tokenOracleId)));
  if (!of) return "notOfToken";
  const [held] = await tx.select({ id: tokenPrintingHoldings.tokenPrintingId }).from(tokenPrintingHoldings)
    .where(and(eq(tokenPrintingHoldings.userId, w.userId), eq(tokenPrintingHoldings.tokenPrintingId, w.tokenPrintingId)))
    .limit(1);
  if (!held) return "notHeld";
  await tx.insert(deckTokenPrintings)
    .values({ deckId: w.deckId, tokenOracleId: w.tokenOracleId, tokenPrintingId: w.tokenPrintingId, userId: w.userId })
    .onConflictDoUpdate({
      target: [deckTokenPrintings.deckId, deckTokenPrintings.tokenOracleId],
      set: { tokenPrintingId: w.tokenPrintingId, updatedAt: sql`now()` },
    });
  return "ok";
}
