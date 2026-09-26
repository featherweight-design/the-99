// The deck add, for a reader already signed in. It lives outside `src/app/decks/actions.ts` because
// that file is "use server": everything it exports is a callable endpoint, and a function taking a
// `userId` argument there would let any caller add to anyone's deck. `addCardToDeck` and
// `addFromFits` are the two public doors, and each decides when to revalidate.
import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "../../db";
import { cards, deckCards, decks } from "../../db/schema";
import { reviveDormantLocks } from "./locks";
import { isBasicLand } from "./grouping";
import { deckAddRejectionMessage, type DeckMutationResult } from "./mutation-result";
import { requireDeck } from "./read";
import { deckSurfaces } from "./revalidate";
import { revalidateClaims } from "./revalidate-claims";
import { takeBackPullRelease } from "./pull-release";
import { touchDeck } from "./touch";
import { validateCardForDeck, type DeckContextForValidation } from "./add-validation";

/**
 * The deck context every add path validates against: both commanders' ids and
 * both their colour identities, in one read.
 *
 * A pair is legal in the union of its two identities, so a single read of the
 * primary commander is not enough to say what the deck may hold. Throws when the
 * primary is missing, as each of these call sites did before; a missing partner
 * row is not fatal, because `partnerOracleId` being set with no card behind it
 * would refuse every card in the deck rather than fail loudly.
 */
export async function deckValidationContext(
  deck: { commanderOracleId: string; partnerOracleId: string | null },
): Promise<Omit<DeckContextForValidation, "built">> {
  const ids = [
    deck.commanderOracleId,
    ...(deck.partnerOracleId ? [deck.partnerOracleId] : []),
  ];
  const rows = await db
    .select({ oracleId: cards.oracleId, colorIdentity: cards.colorIdentity })
    .from(cards)
    .where(inArray(cards.oracleId, ids));
  const commander = rows.find((r) => r.oracleId === deck.commanderOracleId);
  if (!commander) throw new Error("commander not found");
  return {
    commanderOracleId: deck.commanderOracleId,
    commanderColorIdentity: commander.colorIdentity,
    partnerOracleId: deck.partnerOracleId,
    partnerColorIdentity: deck.partnerOracleId
      ? (rows.find((r) => r.oracleId === deck.partnerOracleId)?.colorIdentity ?? null)
      : null,
  };
}

/** What an add did, so each caller can revalidate when it chooses (`addFromFits` defers it). */
export type AddOutcome = {
  result: DeckMutationResult;
  wrote: "held" | "added" | "refused";
  /** Decks a pull from this one had freed this card for: the add took it back, so they buy again. */
  released?: string[];
};

/** The surfaces an add has to refresh: the deck's own on a repeat add, the claims on a real one. */
export function revalidateAdd(deckId: string, userId: string, outcome: AddOutcome): void {
  if (outcome.wrote === "held") for (const path of deckSurfaces(deckId)) revalidatePath(path);
  // /decks shows derived stats (built / to-buy) — keep the index fresh too, and
  // the two surfaces that draw availability off deck rows with it.
  else if (outcome.wrote === "added") revalidateClaims(deckId, userId);
  for (const id of outcome.released ?? []) revalidateClaims(id, userId);
}

/**
 * The add itself, for a reader already signed in: validation, the 99-card cap and the write, with
 * no revalidation. `addCardToDeck` and `addFromFits` both call it. `relock` is trusted here; the
 * public action is what parses it.
 */
export async function addCardToDeckFor(
  userId: string,
  deckId: string,
  oracleId: string,
  { relock }: { relock: boolean },
): Promise<AddOutcome> {
  const deck = await requireDeck(deckId, userId);

  // Fetch the deck's colour identity in the same round-trip as the card lookup.
  const [identity, [card], [existingRow]] = await Promise.all([
    deckValidationContext(deck),
    db.select({ typeLine: cards.typeLine, commanderLegal: cards.commanderLegal, colorIdentity: cards.colorIdentity })
      .from(cards).where(eq(cards.oracleId, oracleId)),
    db.select({ oracleId: deckCards.oracleId })
      .from(deckCards).where(and(eq(deckCards.deckId, deckId), eq(deckCards.oracleId, oracleId))),
  ]);

  if (!card) throw new Error("card not found");

  // Re-adding a non-basic that's already in the deck is a no-op (singleton) —
  // return before validation so a full deck doesn't spuriously reject it.
  // `held` still tells the caller to revalidate the deck's surfaces: the click means that page's
  // HTML disagreed with the row that exists, and without a fresh render the optimistic "✓ In deck"
  // would flash back to "Add" when the transition ends.
  if (existingRow && !isBasicLand(card.typeLine)) return { result: { ok: true }, wrote: "held" };

  // Lock the deck row so the 99-card cap check and the write are atomic —
  // concurrent adds serialize here instead of both passing the cap at 98.
  // Filled inside the transaction, read after it: the decks whose pulled copy this add took back.
  let released: string[] = [];
  const rejection = await db.transaction(async (tx) => {
    await tx.execute(sql`select 1 from ${decks} where ${decks.id} = ${deckId} for update`);
    const [builtRow] = await tx.select({ total: sql<number>`coalesce(sum(${deckCards.quantity}), 0)::int` })
      .from(deckCards).where(eq(deckCards.deckId, deckId));
    const built = builtRow?.total ?? 0;
    const error = validateCardForDeck(
      { commanderLegal: card.commanderLegal, colorIdentity: card.colorIdentity, oracleId },
      { ...identity, built },
    );
    if (error) return error;

    // L1 (D2): Put back and the deck page's two Undos return a removed card LOCKED. The
    // dormant row is woken BEFORE the insert, whose own trigger would otherwise delete it; a card
    // that was never locked has no dormant row, so this wakes nothing and the card comes back as it
    // left. Every other add passes nothing and returns the card unlocked.
    if (relock) await reviveDormantLocks(tx, deckId, [oracleId]);

    // Commander is singleton apart from the multi-copy exception (see
    // isBasicLand), so a repeat add increments quantity there and stays a
    // no-op otherwise.
    if (isBasicLand(card.typeLine)) {
      await tx.insert(deckCards).values({ deckId, oracleId }).onConflictDoUpdate({
        target: [deckCards.deckId, deckCards.oracleId],
        set: { quantity: sql`${deckCards.quantity} + 1` },
      });
      // The upsert always writes: either a new row or one more copy.
      await touchDeck(tx, deckId);
    } else {
      // The conflict clause is what decides here, so the stamp reads its
      // result rather than assuming the statement wrote. A repeat add of a
      // singleton the deck already holds is a no-op, and a deck nothing was
      // added to was not edited.
      const inserted = await tx.insert(deckCards).values({ deckId, oracleId })
        .onConflictDoNothing()
        .returning({ oracleId: deckCards.oracleId });
      // Nothing inserted: a concurrent add landed between the read above and this statement, so
      // this request wrote nothing and reports `held`, exactly as the early return does.
      if (inserted.length === 0) return "held" as const;
      await touchDeck(tx, deckId);
    }
    // The card is back in this draft, so a pull that had released it is undone (Put back is this
    // path): the copy is claimed again and the deck it was pulled for buys it again.
    released = await takeBackPullRelease(tx, deckId, oracleId);
    return null;
  });
  if (rejection === "held") return { result: { ok: true }, wrote: "held" };
  if (rejection) return { result: { ok: false, message: deckAddRejectionMessage(rejection) }, wrote: "refused" };
  return { result: { ok: true }, wrote: "added", released };
}
