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
import { cards, deckCards, deckGames, deckProxies, decks as decksTable } from "../../db/schema";
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
import { allocateClaims } from "../decks/allocate";
import { loadAvailability } from "../decks/availability-query";
import type { Availability } from "../decks/availability";
import { analysisTabEnabled } from "../decks/analysis-flag";
import { deckIdentity } from "../decks/format";
import { listDecksWithStats } from "../decks/read";
import { DEFAULT_DECK_SORT } from "../decks/sort";
import type { LineupBuild, LineupData, LineupGame, LineupShared } from "./types";

type BuildCard = { deckId: string; oracleId: string; name: string; typeLine: string; cmc: number; quantity: number; oracleText: string | null; keywords: string[] };

/** The decks' 99s and their commanders, each one statement over every deck. */
async function readLists(ids: string[]): Promise<{ list: BuildCard[]; commanders: Omit<BuildCard, "oracleText" | "keywords">[] }> {
  const partner = alias(cards, "partner_card");
  const [list, heads] = await Promise.all([
    db.select({
      deckId: deckCards.deckId, oracleId: deckCards.oracleId, quantity: deckCards.quantity,
      name: cards.name, typeLine: cards.typeLine, cmc: cards.cmc, oracleText: cards.oracleText, keywords: cards.keywords,
    }).from(deckCards).innerJoin(cards, eq(cards.oracleId, deckCards.oracleId)).where(inArray(deckCards.deckId, ids)),
    db.select({
      deckId: decksTable.id,
      oracleId: decksTable.commanderOracleId, name: cards.name, typeLine: cards.typeLine, cmc: cards.cmc,
      partnerId: decksTable.partnerOracleId, partnerName: partner.name, partnerTypeLine: partner.typeLine, partnerCmc: partner.cmc,
    }).from(decksTable).innerJoin(cards, eq(cards.oracleId, decksTable.commanderOracleId))
      .leftJoin(partner, eq(partner.oracleId, decksTable.partnerOracleId))
      .where(inArray(decksTable.id, ids)),
  ]);
  const commanders = heads.flatMap((h) => [
    { deckId: h.deckId, oracleId: h.oracleId!, name: h.name, typeLine: h.typeLine, cmc: h.cmc, quantity: 1 },
    ...(h.partnerId && h.partnerName !== null
      ? [{ deckId: h.deckId, oracleId: h.partnerId, name: h.partnerName, typeLine: h.partnerTypeLine!, cmc: h.partnerCmc ?? 0, quantity: 1 }]
      : []),
  ]);
  return { list, commanders };
}

/** Each deck's build figures, or null for every deck when the labels or the prices could not be read. */
/**
 * The cards two or more decks play, basics left out, each with what the collection holds and what the claim
 * model gives each deck (lock 3: who holds a contested copy is the model's, never re-derived here): a
 * committed deck holds its allocation, a brew only what the player gave it, as the cart reads it. A row the deck
 * proxies is acquired, as Shopping and Money read it, so it is never short: the claim model leaves a proxied row
 * out of its claims, and counting it short would name a buy `/decks/shopping` does not have.
 */
export function sharedCards(
  lists: { deckId: string; oracleId: string; name: string; typeLine: string; quantity: number }[],
  availability: ReadonlyMap<string, Pick<Availability, "owned" | "claims">>,
  proxied: ReadonlySet<string> = new Set(),
): LineupShared[] {
  const byCard = new Map<string, { name: string; decks: Map<string, number> }>();
  for (const c of lists) {
    if (isBasicLand(c.typeLine)) continue;
    const row = byCard.get(c.oracleId) ?? { name: c.name, decks: new Map<string, number>() };
    row.decks.set(c.deckId, (row.decks.get(c.deckId) ?? 0) + c.quantity);
    byCard.set(c.oracleId, row);
  }
  return [...byCard].filter(([, r]) => r.decks.size >= 2).map(([oracleId, r]) => {
    const a = availability.get(oracleId);
    const held = new Map(a ? allocateClaims(a).map((c) => [c.deckId, c.brew ? c.granted : c.allocated]) : []);
    return {
      oracleId,
      name: r.name,
      owned: a?.owned ?? 0,
      decks: [...r.decks].map(([id, wants]) => ({ id, wants, held: proxied.has(`${id}|${oracleId}`) ? wants : Math.min(wants, held.get(id) ?? 0) })),
    };
  });
}

type ListRow = { deckId: string; oracleId: string; typeLine: string };

async function readBuilds(userId: string, ids: string[]): Promise<{ builds: Map<string, LineupBuild> | null; asOf: Date | null; shared: LineupShared[] | null; lists: ListRow[] | null }> {
  if (ids.length === 0) return { builds: new Map(), asOf: null, shared: [], lists: [] };
  let lists: Awaited<ReturnType<typeof readLists>>;
  let jobs: JobRowsByCard;
  let prices: PriceRead;
  let availability: Map<string, Availability>;
  let proxied: Set<string>;
  try {
    lists = await readLists(ids);
    const all = [...lists.list, ...lists.commanders];
    const priced = [...new Set(all.filter((c) => !isBasicLand(c.typeLine)).map((c) => c.oracleId))];
    const [labels, read, avail, proxyRows] = await Promise.all([
      readLabels([...new Set(lists.list.filter((c) => !isLandFace(c.typeLine)).map((c) => c.oracleId))]),
      readHeldPricePicks(userId, ids).then((picks) => loadPrices(priced, picks)),
      // The whole collection's claim model, once (lock 3, lock 4).
      loadAvailability(userId),
      db.select({ deckId: deckProxies.deckId, oracleId: deckProxies.oracleId }).from(deckProxies).where(inArray(deckProxies.deckId, ids)),
    ]);
    proxied = new Set(proxyRows.map((r) => `${r.deckId}|${r.oracleId}`));
    jobs = Object.fromEntries([...labels].map(([id, j]) => [id, jobRowsOf(j)]));
    prices = read;
    availability = avail;
  } catch (error) {
    recordSoftFailure();
    console.warn("loadLineup: the build figures could not be read", error);
    return { builds: null, asOf: null, shared: null, lists: null };
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
  const every = [...lists.list, ...lists.commanders];
  return { builds, asOf: prices.newestAsOf, shared: sharedCards(every, availability, proxied), lists: every };
}

export async function loadLineup(userId: string): Promise<LineupData> {
  // The bracket follows the tile's own switch: a bracket only the Analysis tab can explain is drawn
  // only while that tab exists.
  const decks = await listDecksWithStats(userId, DEFAULT_DECK_SORT, { includeBracket: analysisTabEnabled() });
  const ids = decks.map((d) => d.id);
  const [rows, built] = await Promise.all([ids.length === 0
    ? []
    : db
      .select({ deckId: deckGames.deckId, result: deckGames.result, podSize: deckGames.podSize, playedAt: deckGames.playedAt })
      .from(deckGames)
      .where(and(eq(deckGames.userId, userId), inArray(deckGames.deckId, ids)))
      // `listDeckGames`' order, so a deck's games read newest first here as on its Games tab.
      .orderBy(desc(deckGames.playedAt), desc(deckGames.createdAt)),
  readBuilds(userId, ids)]);
  const games = new Map<string, LineupGame[]>();
  for (const r of rows) {
    const list = games.get(r.deckId) ?? [];
    list.push({ result: r.result as LineupGame["result"], playedAt: r.playedAt.toISOString(), podSize: r.podSize });
    games.set(r.deckId, list);
  }
  const brews = new Set(decks.filter((d) => d.lastCommittedAt === null).map((d) => d.id));
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
      build: built.builds?.get(d.id) ?? null,
    })),
    pricesAsOf: built.asOf ? built.asOf.toISOString() : null,
    shared: built.shared,
  };
}
