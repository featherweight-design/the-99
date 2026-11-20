import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "../../../db";
import { cards, decks } from "../../../db/schema";
import { factsFor } from "../../bracket/facts";
import { loadBracketFlags } from "../../bracket/flags-read";
import { recordSoftFailure } from "../../cache/soft-failure";
import type { CardFact } from "../../copy/card-mark";

/**
 * What a result row draws of a card besides its name: its mana value, its color identity, and its bracket facts (A3 G19:
 * game changer, mass land denial, extra turns, tutor, in `factsFor`'s fixed order; absent when the card carries none, never `[]`).
 * Read live when the panel draws, like ownership: a fact the catalog corrects later shows on every stored run.
 */
export type CardFacts = { cmc: number; identity: string[]; facts?: CardFact[] };

/** The facts of these cards by oracle id: a card the catalog does not hold has none, and its row draws without them. */
export async function readCardFacts(oracleIds: readonly string[]): Promise<Map<string, CardFacts>> {
  if (oracleIds.length === 0) return new Map();
  const [rows, flags] = await Promise.all([
    db
      .select({ id: cards.oracleId, cmc: cards.cmc, identity: cards.colorIdentity, gameChanger: cards.gameChanger })
      .from(cards)
      .where(inArray(cards.oracleId, [...oracleIds])),
    // A failed flags read draws every card without facts (mana value and identity still draw) rather than failing the panel,
    // which `pressUpgrade` also reads after a paid run. No game-changer-only list either: a partial list would read as the rest clear.
    loadBracketFlags(oracleIds).catch(() => {
      recordSoftFailure();
      return null;
    }),
  ]);
  return new Map(rows.map((r) => {
    const facts = flags ? factsFor(r.gameChanger, flags.get(r.id)) : undefined;
    return [r.id, { cmc: r.cmc, identity: r.identity, ...(facts ? { facts } : {}) }];
  }));
}

/** A deck the reader started from a run: what the result links to. */
export type RunDeck = { id: string; name: string };

/**
 * The deck the reader started from each of these runs, by run id: the newest one when a run started more than one. A run
 * absent from the map started none, and the press still opens on it.
 */
export async function readRunDecks(userId: string, runIds: readonly string[]): Promise<Map<string, RunDeck>> {
  if (runIds.length === 0) return new Map();
  const rows = await db
    .select({ run: decks.builtFromUpgradeId, id: decks.id, name: decks.name })
    .from(decks)
    .where(and(eq(decks.userId, userId), isNotNull(decks.builtFromUpgradeId), inArray(decks.builtFromUpgradeId, [...runIds])))
    .orderBy(desc(decks.createdAt), desc(decks.id));
  const out = new Map<string, RunDeck>();
  for (const r of rows) if (r.run && !out.has(r.run)) out.set(r.run, { id: r.id, name: r.name });
  return out;
}
