// The Other decks group of the copy chooser (Move a copy, #2980): the player's COMMITTED decks that do not list a
// card and whose color identity allows it, with the card count a pick would bring each to.
//
// A deck outside the card's colors is never an option, so it is left out here and the chooser says only that such decks
// are not listed. A deck at 99 or more IS offered (`makes 100`): going long is a normal way to build and the add path
// does not refuse it either. A deck whose commander is the card is left out too: it holds the copy as its commander.
//
// Composed from readers that already exist: `listDecksWithStats` (names, counts, both commanders' identity, whether the
// deck has committed) and `validateCardForDeck` (the add's own color test, so the chooser and the add can never
// disagree). The one new query asks which decks' NEWEST version lists the card, the question the claim model asks.

import { eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, decks, pendingAssignments } from "../../db/schema";
import { validateCardForDeck } from "./add-validation";
import { listDecksWithStats } from "./read";

export type OtherDeck = {
  id: string;
  name: string;
  /** The cards in the deck's draft now. */
  cards: number;
};

export type OtherDecks = {
  decks: OtherDeck[];
  /** The decks this card's pending picks name, among `decks`, oldest pick first (several picks, 2026-11-21). */
  pendingDeckIds: string[];
};

export async function loadOtherDecks(userId: string, oracleId: string): Promise<OtherDecks> {
  const [list, [card]] = await Promise.all([
    listDecksWithStats(userId, "name"),
    db.select({ commanderLegal: cards.commanderLegal, colorIdentity: cards.colorIdentity })
      .from(cards).where(eq(cards.oracleId, oracleId)),
  ]);
  if (!card) return { decks: [], pendingDeckIds: [] };
  // Only a deck with a committed version can hold a reservation. A brew has no version to commit a pick into.
  const committed = list.filter((d) => d.lastCommittedAt !== null);
  if (committed.length === 0) return { decks: [], pendingDeckIds: [] };

  const ids = sql.join(committed.map((d) => sql`${d.id}::uuid`), sql`, `);
  const [{ rows: listing }, commanders, pending] = await Promise.all([
    db.execute<{ deck_id: string }>(sql`
      select nv.deck_id
      from (
        select distinct on (v.deck_id) v.deck_id, v.id
        from deck_versions v
        where v.deck_id in (${ids})
        order by v.deck_id, v.number desc
      ) nv
      join deck_version_cards c on c.version_id = nv.id and c.oracle_id = ${oracleId}
    `),
    db.select({ id: decks.id, commanderOracleId: decks.commanderOracleId, partnerOracleId: decks.partnerOracleId })
      .from(decks).where(sql`${decks.userId} = ${userId} and ${decks.id} in (${ids})`),
    db.select({ deckId: pendingAssignments.deckId }).from(pendingAssignments)
      .where(sql`${pendingAssignments.userId} = ${userId} and ${pendingAssignments.oracleId} = ${oracleId}`)
      .orderBy(pendingAssignments.createdAt, pendingAssignments.deckId),
  ]);
  const lists = new Set(listing.map((r) => r.deck_id));
  const commanderOf = new Map(commanders.map((c) => [c.id, c]));

  const offered: OtherDeck[] = [];
  for (const d of committed) {
    if (lists.has(d.id)) continue;
    const c = commanderOf.get(d.id);
    if (!c) continue;
    const refusal = validateCardForDeck(
      { commanderLegal: card.commanderLegal, colorIdentity: card.colorIdentity, oracleId },
      {
        commanderOracleId: c.commanderOracleId,
        commanderColorIdentity: d.commanderColorIdentity,
        partnerOracleId: c.partnerOracleId,
        partnerColorIdentity: d.partnerColorIdentity,
        built: d.built,
      },
    );
    if (refusal !== null) continue;
    offered.push({ id: d.id, name: d.name, cards: d.built });
  }
  return {
    decks: offered,
    pendingDeckIds: pending.map((p) => p.deckId).filter((id) => offered.some((d) => d.id === id)),
  };
}
