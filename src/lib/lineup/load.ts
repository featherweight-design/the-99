// The Stats view's read (handoff `design_handoff_the99_lineup`, R2). SERVER-ONLY.
//
// A FIXED NUMBER OF READS, whatever the deck count (brief, lock 4): the deck list as `/decks` reads it, one
// games read, one decklist read with the commanders, one labels read and one price read, each over every
// deck at once. Every per-deck figure is the deck's own (lock 2): the bracket is the tile's
// (`listDecksWithStats` with `includeBracket`), a game is the row its Games tab draws, and the build figures
// come from the functions its Stats tab uses: `averageManaValue`, `jobTally` over the same labels with the
// same rules-text fallback, and Money's `moneyStats` over rows priced by `priceFor`, picks included.
//
// A failed build read (labels or prices) is a soft failure: the build figures are null and the payload is
// not cached, so the next visit reads again rather than keeping charts that say nothing.

import { and, desc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { cards, deckCards, deckGames, decks as decksTable } from "../../db/schema";
import { recordSoftFailure } from "../cache/soft-failure";
import { isLandFace } from "../cards/facet";
import { isBasicLand } from "../decks/grouping";
import { jobRowsOf, jobTally, type JobRowsByCard } from "../decks/job-tally";
import { averageManaValue } from "../decks/mana-value";
import { loadPrices, priceFor, type PriceRead } from "../decks/price-query";
import { readHeldPricePicks } from "../decks/printings";
import { primaryRole } from "../decks/read";
import { moneyStats } from "../decks/stats-money";
import { readLabels } from "../labels/read";
import { loadAvailability, loadDeckBuyRows, type DeckBuyRow } from "../decks/availability-query";
import type { Availability } from "../decks/availability";
import { analysisTabEnabled } from "../decks/analysis-flag";
import { chainArt, withChainArt } from "../cards/chain-art";
import { deckIdentity } from "../decks/format";
import { listDecksWithStats } from "../decks/read";
import { DEFAULT_DECK_SORT } from "../decks/sort";
import { shortCommanderName } from "../copy/decks-builder";
import { readCollection } from "./collection-read";
import type { LineupBuild, LineupCollection, LineupData, LineupGame, LineupShared } from "./types";

type BuildCard = { deckId: string; oracleId: string; name: string; typeLine: string; cmc: number; quantity: number; oracleText: string | null; keywords: string[]; imageUri: string | null };

/** The decks' 99s and their commanders, each one statement over every deck. */
async function readLists(ids: string[]): Promise<{ list: BuildCard[]; commanders: Omit<BuildCard, "oracleText" | "keywords">[] }> {
  const partner = alias(cards, "partner_card");
  const [list, heads] = await Promise.all([
    db.select({
      deckId: deckCards.deckId, oracleId: deckCards.oracleId, quantity: deckCards.quantity,
      name: cards.name, typeLine: cards.typeLine, cmc: cards.cmc, oracleText: cards.oracleText, keywords: cards.keywords, imageUri: cards.imageUri,
    }).from(deckCards).innerJoin(cards, eq(cards.oracleId, deckCards.oracleId)).where(inArray(deckCards.deckId, ids)),
    db.select({
      deckId: decksTable.id,
      oracleId: decksTable.commanderOracleId, name: cards.name, typeLine: cards.typeLine, cmc: cards.cmc, imageUri: cards.imageUri,
      partnerId: decksTable.partnerOracleId, partnerName: partner.name, partnerTypeLine: partner.typeLine, partnerCmc: partner.cmc, partnerImageUri: partner.imageUri,
    }).from(decksTable).innerJoin(cards, eq(cards.oracleId, decksTable.commanderOracleId))
      .leftJoin(partner, eq(partner.oracleId, decksTable.partnerOracleId))
      .where(inArray(decksTable.id, ids)),
  ]);
  const commanders = heads.flatMap((h) => [
    { deckId: h.deckId, oracleId: h.oracleId!, name: h.name, typeLine: h.typeLine, cmc: h.cmc, quantity: 1, imageUri: h.imageUri },
    ...(h.partnerId && h.partnerName !== null
      ? [{ deckId: h.deckId, oracleId: h.partnerId, name: h.partnerName, typeLine: h.partnerTypeLine!, cmc: h.partnerCmc ?? 0, quantity: 1, imageUri: h.partnerImageUri }]
      : []),
  ]);
  return { list, commanders };
}

/** Each deck's build figures, or null for every deck when the labels or the prices could not be read. */
/**
 * The cards two or more decks play, basics left out, each with what the collection holds and how many of each
 * deck's copies it already has. What a deck still lacks is Shopping's own buy row (lock 3: the claim model's,
 * never re-derived here), so the count a row links to is the count `/decks/shopping` lists: it reads each
 * deck's draft against the copies left to it, bills nothing a deck proxies, and lets a brew take a free copy.
 * A deck with no card in its list plays nothing here, its commanders included: Shopping bills it nothing until it
 * holds a card again, so counting its commander would draw a copy it neither has nor is told to buy.
 */
export function sharedCards(
  lists: { deckId: string; oracleId: string; name: string; typeLine: string; quantity: number; imageUri: string | null }[],
  availability: ReadonlyMap<string, Pick<Availability, "owned">>,
  buys: readonly DeckBuyRow[],
  /** The decks whose list holds a card. */
  bodied: ReadonlySet<string>,
): LineupShared[] {
  const byCard = new Map<string, { name: string; imageUri: string | null; decks: Map<string, number> }>();
  for (const c of lists) {
    if (isBasicLand(c.typeLine) || !bodied.has(c.deckId)) continue;
    const row = byCard.get(c.oracleId) ?? { name: c.name, imageUri: c.imageUri, decks: new Map<string, number>() };
    row.decks.set(c.deckId, (row.decks.get(c.deckId) ?? 0) + c.quantity);
    byCard.set(c.oracleId, row);
  }
  const buy = new Map(buys.map((r) => [`${r.deckId}|${r.oracleId}`, r.quantity]));
  return [...byCard].filter(([, r]) => r.decks.size >= 2).map(([oracleId, r]) => ({
    oracleId,
    name: r.name,
    imageUri: r.imageUri,
    owned: availability.get(oracleId)?.owned ?? 0,
    decks: [...r.decks].map(([id, wants]) => ({ id, wants, held: Math.max(0, wants - (buy.get(`${id}|${oracleId}`) ?? 0)) })),
  }));
}

type ListRow = { deckId: string; oracleId: string; typeLine: string };

type Built = { builds: Map<string, LineupBuild> | null; asOf: Date | null; shared: LineupShared[] | null; lists: ListRow[] | null; collection: LineupCollection | null };

async function readBuilds(userId: string, ids: string[], brews: ReadonlySet<string>): Promise<Built> {
  if (ids.length === 0) {
    const { collection, asOf } = await readCollection(userId, [], [], brews);
    return { builds: new Map(), asOf, shared: [], lists: [], collection };
  }
  let lists: Awaited<ReturnType<typeof readLists>>;
  let jobs: JobRowsByCard;
  let prices: PriceRead;
  let availability: Map<string, Availability>;
  let buys: DeckBuyRow[];
  let collection: LineupCollection;
  try {
    lists = await readLists(ids);
    const all = [...lists.list, ...lists.commanders];
    const priced = [...new Set(all.filter((c) => !isBasicLand(c.typeLine)).map((c) => c.oracleId))];
    const [labels, read, avail, buyRows] = await Promise.all([
      readLabels([...new Set(lists.list.filter((c) => !isLandFace(c.typeLine)).map((c) => c.oracleId))]),
      readHeldPricePicks(userId, ids).then((picks) => loadPrices(priced, picks)),
      // The whole collection's claim model, once (lock 3, lock 4).
      loadAvailability(userId),
      // Shopping's own buy rows, so a row's to-buy count is the cart's.
      loadDeckBuyRows(userId, ids),
    ]);
    buys = buyRows;
    jobs = Object.fromEntries([...labels].map(([id, j]) => [id, jobRowsOf(j)]));
    prices = read;
    availability = avail;
    const heads = [...new Set(lists.commanders.map((c) => c.deckId))].map((deckId) => {
      const cs = lists.commanders.filter((c) => c.deckId === deckId);
      return { deckId, commander: cs[0].oracleId, partner: cs[1]?.oracleId ?? null };
    });
    collection = (await readCollection(userId, [...lists.list, ...lists.commanders], heads, brews)).collection;
  } catch (error) {
    recordSoftFailure();
    console.warn("loadLineup: the build figures could not be read", error);
    return { builds: null, asOf: null, shared: null, lists: null, collection: null };
  }
  const byDeck = new Map<string, BuildCard[]>();
  for (const c of lists.list) byDeck.set(c.deckId, [...(byDeck.get(c.deckId) ?? []), c]);
  const builds = new Map<string, LineupBuild>();
  for (const id of ids) {
    const list = byDeck.get(id) ?? [];
    const priced = (c: { oracleId: string; name: string; typeLine: string; quantity: number }) => ({ ...c, price: priceFor(prices, id, c.oracleId) });
    const tally = jobTally(
      list.filter((c) => !isLandFace(c.typeLine)).map((c) => ({ oracleId: c.oracleId, name: c.name, copies: c.quantity, role: primaryRole(c) })),
      jobs,
    );
    const copies = (key: string) => tally.rows.find((r) => r.key === key)?.copies ?? 0;
    const money = moneyStats({ cards: list.map(priced), commanders: lists.commanders.filter((c) => c.deckId === id).map(priced), shopping: [] }, prices.newestAsOf);
    builds.set(id, {
      manaValue: averageManaValue(list),
      lands: list.filter((c) => isLandFace(c.typeLine)).reduce((n, c) => n + c.quantity, 0),
      ramp: copies("ramp"),
      draw: copies("draw"),
      removal: copies("removal"),
      valueCents: money?.value.cents ?? 0,
    });
  }
  // A deck with no card in its list plays nothing on Shared, its commanders included, so its denominator drops them too.
  const bodied = new Set(lists.list.map((c) => c.deckId));
  const every = [...lists.list, ...lists.commanders].filter((c) => bodied.has(c.deckId));
  const shared = sharedCards(every, availability, buys, bodied);
  // Each preview shows the printing card details opens (the owned-printing chain, at the draw), else the catalog's.
  const art = await chainArt(userId, null, shared.map((c) => c.oracleId));
  return { builds, asOf: prices.newestAsOf, shared: withChainArt(shared, art), lists: every, collection };
}

export async function loadLineup(userId: string): Promise<LineupData> {
  // The bracket follows the tile's own switch: a bracket only the Analysis tab can explain is drawn
  // only while that tab exists.
  const decks = await listDecksWithStats(userId, DEFAULT_DECK_SORT, { includeBracket: analysisTabEnabled() });
  const ids = decks.map((d) => d.id);
  const brews = new Set(decks.filter((d) => d.lastCommittedAt === null).map((d) => d.id));
  const [rows, built] = await Promise.all([ids.length === 0
    ? []
    : db
      .select({ deckId: deckGames.deckId, result: deckGames.result, podSize: deckGames.podSize, playedAt: deckGames.playedAt })
      .from(deckGames)
      .where(and(eq(deckGames.userId, userId), inArray(deckGames.deckId, ids)))
      // `listDeckGames`' order, so a deck's games read newest first here as on its Games tab.
      .orderBy(desc(deckGames.playedAt), desc(deckGames.createdAt)),
  readBuilds(userId, ids, brews)]);
  const games = new Map<string, LineupGame[]>();
  for (const r of rows) {
    const list = games.get(r.deckId) ?? [];
    list.push({ result: r.result as LineupGame["result"], playedAt: r.playedAt.toISOString(), podSize: r.podSize });
    games.set(r.deckId, list);
  }
  const distinct = (keep: (deckId: string) => boolean) =>
    new Set((built.lists ?? []).filter((c) => keep(c.deckId) && !isBasicLand(c.typeLine)).map((c) => c.oracleId)).size;
  return {
    cardCounts: { all: distinct(() => true), finished: distinct((id) => !brews.has(id)) },
    decks: decks.map((d) => ({
      id: d.id,
      name: d.name,
      identity: deckIdentity(d.commanderColorIdentity, d.partnerColorIdentity),
      brew: d.lastCommittedAt === null,
      bracket: d.bracket,
      games: games.get(d.id) ?? [],
      basis: [d.commanderName, ...(d.partnerName ? [d.partnerName] : [])].map((c) => shortCommanderName(c.split(" // ")[0])).join(" + "),
      build: built.builds?.get(d.id) ?? null,
    })),
    pricesAsOf: built.asOf ? built.asOf.toISOString() : null,
    shared: built.shared,
    collection: built.collection,
  };
}
