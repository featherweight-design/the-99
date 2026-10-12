/**
 * The deck page's precon link read (R3 addendum): whether the deck is linked, and for an unlinked
 * deck every plain precon's overlap with it, counted in SQL so the page never reads every precon's
 * list. `link.ts` picks the suggestions and orders the picker from these counts.
 */
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, decks, preconCards, precons, printings } from "../../db/schema";
import { pickerOrder, pickSuggestions, type DeckPreconLink, type PreconMatch } from "./link";
import { preconArt, type Reader } from "./list-read";
import { sameCommanders } from "./shared";

export async function readDeckPreconLink(userId: string, deckId: string): Promise<DeckPreconLink | null> {
  // One snapshot: an edit committing between the head and the counts would otherwise offer a precon
  // for a deck that never existed (its old commanders against its new cards). No `accessMode`, for
  // the pooled connection's sake (`READ_SNAPSHOT`, decks/draft-state.ts).
  return db.transaction((tx) => readLink(tx, userId, deckId), { isolationLevel: "repeatable read" });
}

async function readLink(q: Reader, userId: string, deckId: string): Promise<DeckPreconLink | null> {
  const [head] = await q
    .select({ builtFrom: decks.builtFromPrecon, commander: decks.commanderOracleId, partner: decks.partnerOracleId })
    .from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)));
  if (!head) return null;
  // A linked deck is offered nothing (lock 2), so it pays for no count.
  if (head.builtFrom !== null) return { linked: head.builtFrom, suggestions: [], picker: [] };
  const commanders = head.partner ? [head.commander, head.partner] : [head.commander];
  const matches = (await preconMatchQuery(deckId, commanders, q)).map((r) => toMatch(r, commanders));
  return {
    linked: null,
    suggestions: pickSuggestions(matches, null),
    // The picker draws no art: dropped so ~200 rows ship as names and figures alone.
    picker: pickerOrder(matches).map((m) => ({ ...m, leadImage: null })),
  };
}

type MatchRow = Awaited<ReturnType<typeof preconMatchQuery>>[number];

export function toMatch(r: MatchRow, deckCommanders: readonly string[]): PreconMatch {
  // The feed can list a commander under two printings: one commander, kept once, in its order.
  const ids: string[] = [];
  const names: string[] = [];
  (r.commanderIds ?? []).forEach((id, i) => {
    if (ids.includes(id)) return;
    ids.push(id);
    names.push(r.commanderNames?.[i] ?? "");
  });
  return {
    fileName: r.fileName,
    name: r.name,
    setCode: r.setCode,
    releaseDate: r.releaseDate,
    commanders: names,
    leadImage: r.leadImage,
    cards: r.cards,
    shared: r.shared,
    of: r.of,
    sameCommanders: sameCommanders(ids, deckCommanders),
  };
}

/**
 * Every plain precon's counts against one deck: the distinct non-basic cards it lists, and those
 * the deck holds, its commanders included (the same figures `sharedWith` counts on the list). A
 * twin is left out: it links to its plain edition (lock 1). Apart so a test can render its SQL.
 */
export function preconMatchQuery(deckId: string, commanders: readonly string[], q: Reader = db) {
  const notBasic = sql`${cards.typeLine} not like 'Basic%'`;
  const inDeck = sql`(exists (select 1 from deck_cards dc where dc.deck_id = ${deckId} and dc.oracle_id = ${preconCards.oracleId})
    or ${preconCards.oracleId} in (${sql.join(commanders.map((id) => sql`${id}`), sql`, `)}))`;
  const lead = sql`filter (where ${preconCards.isCommander})`;
  return q
    .select({
      fileName: precons.fileName,
      name: precons.name,
      setCode: precons.setCode,
      releaseDate: precons.releaseDate,
      cards: sql<number>`sum(${preconCards.quantity})::int`,
      of: sql<number>`(count(distinct ${preconCards.oracleId}) filter (where ${notBasic}))::int`,
      shared: sql<number>`(count(distinct ${preconCards.oracleId}) filter (where ${notBasic} and ${inDeck}))::int`,
      commanderIds: sql<string[] | null>`array_agg(${preconCards.oracleId} order by ${preconCards.position}) ${lead}`,
      commanderNames: sql<string[] | null>`array_agg(${cards.name} order by ${preconCards.position}) ${lead}`,
      leadImage: sql<string | null>`(array_agg(${preconArt} order by ${preconCards.position}) ${lead})[1]`,
    })
    .from(precons)
    .innerJoin(preconCards, eq(preconCards.fileName, precons.fileName))
    .innerJoin(cards, eq(cards.oracleId, preconCards.oracleId))
    .leftJoin(printings, eq(printings.scryfallId, preconCards.scryfallId))
    .where(isNull(precons.twinOf))
    .groupBy(precons.fileName);
}
