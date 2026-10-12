/**
 * The deck page's precon link read (R3 addendum): whether the deck is linked, and for an unlinked
 * deck every plain precon's overlap with it, counted in SQL so the page never reads every precon's
 * list. `link.ts` picks the suggestions and orders the picker from these counts.
 */
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, deckCards, decks, preconCards, precons, printings } from "../../db/schema";
import { catalogGeneration } from "../cache/catalog-generation";
import { pickerOrder, pickSuggestions, type DeckPreconLink, type PreconMatch } from "./link";
import { preconArt, type Reader } from "./list-read";
import { sameCommanders } from "./shared";

export async function readDeckPreconLink(userId: string, deckId: string): Promise<DeckPreconLink | null> {
  // The precons' own figures move only with the catalog, so they come from a memo keyed on its
  // generation (`loadPreconCatalog`), started beside the deck's read rather than after it. Only the
  // count of cards each precon shares with THIS deck is the deck's, and that is counted from the
  // deck's ids in memory (speed plan, 2026-10-12: the whole aggregate was ~400ms on every deck page,
  // the page's critical path once availability was shared).
  const catalog = loadPreconCatalog();
  catalog.catch(() => {});
  // One snapshot: an edit committing between the head and the deck's cards would otherwise offer a
  // precon for a deck that never existed (its old commanders against its new cards). No
  // `accessMode`, for the pooled connection's sake (`READ_SNAPSHOT`, decks/draft-state.ts).
  return db.transaction((tx) => readLink(tx, userId, deckId, catalog), { isolationLevel: "repeatable read" });
}

async function readLink(
  q: Reader,
  userId: string,
  deckId: string,
  catalog: Promise<readonly PreconCatalogRow[]>,
): Promise<DeckPreconLink | null> {
  const [head] = await linkHeadQuery(q, userId, deckId);
  if (!head) return null;
  // A linked deck is offered nothing (lock 2), so it pays for no count.
  if (head.builtFrom !== null) return { linked: head.builtFrom, suggestions: [], picker: [] };
  const commanders = head.partner ? [head.commander, head.partner] : [head.commander];
  const deckIds = await q.select({ id: deckCards.oracleId }).from(deckCards).where(eq(deckCards.deckId, deckId));
  const held = new Set([...deckIds.map((r) => r.id), ...commanders]);
  const matches = (await catalog).map((r) => toMatch({ ...r, shared: sharedCount(r.ids, held) }, commanders));
  return {
    linked: null,
    suggestions: pickSuggestions(matches, null),
    // The picker draws no art: dropped so ~200 rows ship as names and figures alone.
    picker: pickerOrder(matches).map((m) => ({ ...m, leadImage: null })),
  };
}

/** The deck's link and commanders; apart so a test can render its SQL. */
export function linkHeadQuery(q: Reader, userId: string, deckId: string) {
  return q
    // The precon's own row, not the stored name: a link to a precon a later feed dropped draws no v0
    // and no precon page, so it reads as no link, and the deck is offered the doors again. Linking
    // then replaces it.
    .select({ builtFrom: precons.fileName, commander: decks.commanderOracleId, partner: decks.partnerOracleId })
    .from(decks)
    .leftJoin(precons, eq(precons.fileName, decks.builtFromPrecon))
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)));
}

/** One plain precon's catalog figures, and the distinct non-basic cards its `shared` counts. */
export type PreconCatalogRow = Awaited<ReturnType<typeof preconCatalogQuery>>[number];
type MatchRow = Omit<PreconCatalogRow, "ids"> & { shared: number };

/** How many of a precon's distinct non-basic cards the deck holds, its commanders included. */
export function sharedCount(ids: readonly string[] | null, held: ReadonlySet<string>): number {
  let n = 0;
  for (const id of ids ?? []) if (held.has(id)) n += 1;
  return n;
}


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
 * Every plain precon's own figures: the cards it lists, the distinct non-basic cards it counts
 * (`of`) and those cards' ids, which a deck's `shared` is counted against (the same figures
 * `sharedWith` counts on the list). A twin is left out: it links to its plain edition (lock 1).
 * Nothing here depends on a deck, so it is read once per catalog generation. Apart so a test can
 * render its SQL.
 */
export function preconCatalogQuery(q: Reader = db) {
  const notBasic = sql`${cards.typeLine} not like 'Basic%'`;
  const lead = sql`filter (where ${preconCards.isCommander})`;
  return q
    .select({
      fileName: precons.fileName,
      name: precons.name,
      setCode: precons.setCode,
      releaseDate: precons.releaseDate,
      cards: sql<number>`sum(${preconCards.quantity})::int`,
      of: sql<number>`(count(distinct ${preconCards.oracleId}) filter (where ${notBasic}))::int`,
      ids: sql<string[] | null>`array_agg(distinct ${preconCards.oracleId}) filter (where ${notBasic})`,
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

// Memoised per catalog generation, the way `sets/printed-in-read.ts` memoises the commander
// printings: precons are published by the catalog refresh, which moves the generation, and every
// reader shares one copy.
const MEMO_MS = 10 * 60 * 1000;
let memo: { generation: string; at: number; ticket: number; value: Promise<readonly PreconCatalogRow[]> } | null = null;
// Taken BEFORE the generation read's await, so it orders calls by when they started.
let tickets = 0;

export async function loadPreconCatalog(
  now: number = Date.now(),
  read: () => Promise<readonly PreconCatalogRow[]> = () => preconCatalogQuery(),
): Promise<readonly PreconCatalogRow[]> {
  const ticket = ++tickets;
  const generation = await catalogGeneration();
  if (memo && memo.generation === generation && now - memo.at < MEMO_MS) return memo.value;
  const entry = { generation, at: now, ticket, value: read() };
  // A read that started earlier never replaces one that started later: around a catalog refresh
  // an old-generation read can finish last, and must not roll the memo back to it.
  if (memo && memo.ticket > ticket) return entry.value;
  memo = entry;
  entry.value.catch(() => {
    if (memo === entry) memo = null;
  });
  return entry.value;
}
