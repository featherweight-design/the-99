// The commanders who could lead THIS deck's 99 (change commander, plan decision 10).
//
// A candidate has the deck's exact color identity and its size — a single for a single, a pair
// for a pair (brief rulings 2 and 3) — an EDHREC sample of at least `MIN_CANDIDATE_DECKS` decks
// (H2), and is not the deck's current commander. Each is scored by `fitCount` and sorted into
// Yours (every half owned, or already in this deck's 99) and To buy (any half to buy; H1), each
// group by the figure, then by name (handoff §2.4). Price never orders.
//
// Availability is read EXCLUDING this deck (audit F8): the question is whether another deck
// holds the copy. A half already in this deck's 99 skips that question, because the trade keeps
// its copy. Grouping reads the collection directly, so a failed claim read loses the marks and
// never the groups (state 24).

import { resolveDeckOwnedPrintings } from "../decks/printings";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, collectionItems, commanderPairSupportCards, commanderSupportCards, deckCards, decks } from "../../db/schema";
import type { Availability } from "../decks/availability";
import { loadAvailability } from "../decks/availability-query";
import { isBasicLand } from "../decks/grouping";
import type { PriceFact } from "../decks/price";
import { loadPrices } from "../decks/price-query";
import { isCommanderCandidate } from "../recs/score";
import { loadUniversalStaples } from "../staples/universal";
import { MIN_CANDIDATE_DECKS, fitBody, fitCount, type Fit } from "./fit";
import { offerable } from "./pending";

export type CandidateHalf = {
  oracleId: string;
  /** The oracle name, for anything that matches or looks a card up. */
  name: string;
  /**
   * The name printed on the owned copy whose art `artCropUri` and `imageUri` draw, where it has
   * its own (a renamed Secret Lair printing); null otherwise. A caption draws this over `name`, so
   * the words beside a picture are the ones printed on it.
   */
  printedName?: string | null;
  manaCost: string | null;
  cmc: number;
  artCropUri: string | null;
  /** The whole card, for the confirm's plates. */
  imageUri: string | null;
  /** Already in this deck's 99: choosing it is a trade, and its copy is the one that moves. */
  inDeck: boolean;
  /** Owned at all, from the collection. Decides the group even when `availability` failed. */
  owned: boolean;
  /** Excluding this deck. Null when the claim read failed, or for a half in the 99. */
  availability: Availability | null;
  /** Null unless the half is to buy and the feed has a row for it. */
  price: PriceFact | null;
};

export type Candidate = {
  /** The candidate's oracle id, or the canonical pair's two ids joined by `+`. */
  key: string;
  halves: CandidateHalf[];
  fit: Fit;
  /** The body's cards the candidate's decks run, by name, for the figure's inline list. */
  matched: { oracleId: string; name: string; imageUri: string | null }[];
  deckCount: number;
};

export type ChangeCandidates = {
  /** The deck's current commander, or its pair: the confirm's "leaves" side and the mana-value
   *  comparison. */
  current: { oracleId: string; name: string; printedName?: string | null; cmc: number; manaCost: string | null; imageUri: string | null }[];
  /** The deck's color identity, sorted: the none state names it. */
  identity: string[];
  /** M: the body the figure counts over (`copy.counted(n)`). */
  counted: number;
  yours: Candidate[];
  toBuy: Candidate[];
  claimsKnown: boolean;
  newestAsOf: Date | null;
};

/** Yours when every half is owned or already in the 99; To buy otherwise. */
export function isYours(c: Pick<Candidate, "halves">): boolean {
  return c.halves.every((h) => h.inDeck || h.owned);
}

/** Figure descending, then the first half's name ascending (§2.4). */
export function byFit(a: Candidate, b: Candidate): number {
  return b.fit.n - a.fit.n || a.halves[0].name.localeCompare(b.halves[0].name);
}

export function groupCandidates(candidates: readonly Candidate[]): Pick<ChangeCandidates, "yours" | "toBuy"> {
  const yours = candidates.filter(isYours).sort(byFit);
  const toBuy = candidates.filter((c) => !isYours(c)).sort(byFit);
  return { yours, toBuy };
}

/** Sorted, so two identities compare as sets. */
function identityOf(rows: readonly { colorIdentity: string[] }[]): string[] {
  return [...new Set(rows.flatMap((r) => r.colorIdentity))].sort();
}

type CardFacts = {
  oracleId: string; name: string; manaCost: string | null; cmc: number; artCropUri: string | null;
  imageUri: string | null; typeLine: string; oracleText: string | null; layout: string | null; colorIdentity: string[];
};

function readCards(ids: string[]): Promise<CardFacts[]> {
  if (ids.length === 0) return Promise.resolve([]);
  return db.select({
    oracleId: cards.oracleId, name: cards.name, manaCost: cards.manaCost, cmc: cards.cmc,
    artCropUri: cards.artCropUri, imageUri: cards.imageUri, typeLine: cards.typeLine, oracleText: cards.oracleText,
    layout: cards.layout, colorIdentity: cards.colorIdentity,
  }).from(cards).where(inArray(cards.oracleId, ids));
}

/**
 * Candidate ids with their EDHREC deck counts. Exact identity is compared in SQL as a sorted
 * array; the floor is applied here, so a candidate below it is never read further.
 */
async function candidateKeys(
  current: string[], identity: string[], pair: boolean,
): Promise<{ ids: string[]; deckCount: number }[]> {
  const ident = sql.param(identity);
  const cur = sql.param(current);
  if (!pair) {
    const { rows } = await db.execute<{ id: string; deck_count: number }>(sql`
      select cs.commander_oracle_id as id, cs.deck_count
      from commander_support cs
      join cards c on c.oracle_id = cs.commander_oracle_id
      where cs.synergy_state = 'ok'
        and cs.deck_count >= ${MIN_CANDIDATE_DECKS}
        and c.commander_legal
        and array(select x from unnest(c.color_identity) x order by x) = ${ident}::text[]
        and not (cs.commander_oracle_id = any(${cur}::uuid[]))
    `);
    return rows.map((r) => ({ ids: [r.id], deckCount: r.deck_count }));
  }
  const { rows } = await db.execute<{ a: string; b: string; deck_count: number }>(sql`
    select ps.commander_oracle_id as a, ps.partner_oracle_id as b, ps.deck_count
    from commander_pair_support ps
    join cards ca on ca.oracle_id = ps.commander_oracle_id
    join cards cb on cb.oracle_id = ps.partner_oracle_id
    where ps.synergy_state = 'ok'
      and ps.deck_count >= ${MIN_CANDIDATE_DECKS}
      and ca.commander_legal and cb.commander_legal
      and array(
        select distinct x from unnest(ca.color_identity || cb.color_identity) x order by x
      ) = ${ident}::text[]
      and not (ps.commander_oracle_id = any(${cur}::uuid[])
               and ps.partner_oracle_id = any(${cur}::uuid[]))
  `);
  return rows.map((r) => ({ ids: [r.a, r.b], deckCount: r.deck_count }));
}

/** Which body cards each candidate's support list carries, keyed as `Candidate.key`. */
async function supportHits(
  keys: { ids: string[] }[], body: string[], pair: boolean,
): Promise<Map<string, string[]>> {
  const hits = new Map<string, string[]>();
  if (keys.length === 0 || body.length === 0) return hits;
  const add = (key: string, id: string) => {
    const list = hits.get(key);
    if (list) list.push(id);
    else hits.set(key, [id]);
  };
  if (!pair) {
    const rows = await db.select({
      c: commanderSupportCards.commanderOracleId, id: commanderSupportCards.oracleId,
    }).from(commanderSupportCards).where(and(
      inArray(commanderSupportCards.commanderOracleId, keys.map((k) => k.ids[0])),
      inArray(commanderSupportCards.oracleId, body),
    ));
    for (const r of rows) add(r.c, r.id);
    return hits;
  }
  const wanted = new Set(keys.map((k) => k.ids.join("+")));
  const rows = await db.select({
    a: commanderPairSupportCards.commanderOracleId,
    b: commanderPairSupportCards.partnerOracleId,
    id: commanderPairSupportCards.oracleId,
  }).from(commanderPairSupportCards).where(and(
    inArray(commanderPairSupportCards.commanderOracleId, keys.map((k) => k.ids[0])),
    inArray(commanderPairSupportCards.oracleId, body),
  ));
  for (const r of rows) {
    const key = `${r.a}+${r.b}`;
    if (wanted.has(key)) add(key, r.id);
  }
  return hits;
}

/**
 * The candidates for one deck the player owns. Null when the deck is not theirs.
 */
export async function loadChangeCandidates(
  deckId: string,
  userId: string,
  /** The reader's resolved switches (`requestSwitchEnv`). */
  env: NodeJS.ProcessEnv,
): Promise<ChangeCandidates | null> {
  const [deck] = await db.select({
    commander: decks.commanderOracleId, partner: decks.partnerOracleId,
  }).from(decks).where(and(eq(decks.id, deckId), eq(decks.userId, userId)));
  if (!deck) return null;

  const currentIds = [deck.commander, ...(deck.partner ? [deck.partner] : [])];
  const pair = currentIds.length === 2;
  const [currentCards, bodyRows, staples] = await Promise.all([
    readCards(currentIds),
    db.select({ oracleId: deckCards.oracleId, typeLine: cards.typeLine, name: cards.name, imageUri: cards.imageUri })
      .from(deckCards).innerJoin(cards, eq(cards.oracleId, deckCards.oracleId))
      .where(eq(deckCards.deckId, deckId)),
    loadUniversalStaples(),
  ]);
  const identity = identityOf(currentCards);
  const body = fitBody(
    bodyRows.map((r) => ({ oracleId: r.oracleId, basic: isBasicLand(r.typeLine) })),
    staples,
  );
  const inDeck = new Set(bodyRows.map((r) => r.oracleId));
  const bodyNames = new Map(bodyRows.map((r) => [r.oracleId, r.name]));
  const bodyArt = new Map(bodyRows.map((r) => [r.oracleId, r.imageUri]));

  const keys = await candidateKeys(currentIds, identity, pair);
  const halfIds = [...new Set(keys.flatMap((k) => k.ids))];
  const [facts, hits, ownedRows] = await Promise.all([
    readCards(halfIds),
    supportHits(keys, body, pair),
    halfIds.length === 0
      ? Promise.resolve([] as { oracleId: string }[])
      : db.selectDistinct({ oracleId: collectionItems.oracleId }).from(collectionItems)
          .where(and(eq(collectionItems.userId, userId), inArray(collectionItems.oracleId, halfIds))),
  ]);
  const factBy = new Map(facts.map((f) => [f.oracleId, f]));
  const owned = new Set(ownedRows.map((r) => r.oracleId));

  // `commander_legal` is checked in SQL; the right to LEAD is `isCommanderCandidate`'s, which the
  // create action applies too (a melded card or a back-face legend reads legal and leads nothing).
  const legal = keys.filter((k) => k.ids.every((id) => {
    const f = factBy.get(id);
    return f !== undefined && isCommanderCandidate(f);
  }))
    .filter((k) => offerable(k.ids, currentIds, inDeck));

  // Claims and prices for the halves outside the 99 only: a half in the 99 keeps its own copy.
  const asked = [...new Set(legal.flatMap((k) => k.ids))].filter((id) => !inDeck.has(id));
  // The art a reader OWNS for each owned half and for the commander(s) now leading, read beside the
  // claims: a candidate's thumbnail, its hover preview and its card's neighbor plate drew the
  // oracle-level printing while the card details drew the owned one (Hugh, 2026-10-05: Shirei,
  // Shizo's Caretaker jumped from an older frame to the CMM borderless on opening). The deck's own
  // printing picks come first, as they do in the details. Fail-soft: a failed read keeps the
  // oracle-level art.
  const [availability, ownedArt] = await Promise.all([
    asked.length > 0
      ? loadAvailability(userId, { oracleIds: asked, excludeDeckId: deckId, env }).catch(() => null)
      : Promise.resolve(new Map<string, Availability>()),
    // The matched cards are the deck's own, so they take the deck's printing the way the details do.
    resolveDeckOwnedPrintings(userId, deckId, [...new Set([...halfIds.filter((id) => owned.has(id)), ...currentIds, ...[...hits.values()].flat()])], env),
  ]);
  const toBuyIds = asked.filter((id) => !owned.has(id));
  const prices = toBuyIds.length > 0
    ? await loadPrices(toBuyIds).catch(() => null)
    : null;

  const candidates: Candidate[] = legal.map((k) => {
    const key = k.ids.join("+");
    const matchedIds = hits.get(key) ?? [];
    return {
      key,
      deckCount: k.deckCount,
      fit: fitCount(new Set(matchedIds), body),
      matched: matchedIds
        .map((id) => ({ oracleId: id, name: bodyNames.get(id) ?? "", imageUri: ownedArt.get(id)?.imageUri ?? bodyArt.get(id) ?? null }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      halves: k.ids.map((id) => {
        const f = factBy.get(id)!;
        const here = inDeck.has(id);
        return {
          oracleId: id, name: f.name, printedName: ownedArt.get(id)?.printedName ?? null, manaCost: f.manaCost, cmc: f.cmc,
          artCropUri: ownedArt.get(id)?.artCropUri ?? f.artCropUri,
          imageUri: ownedArt.get(id)?.imageUri ?? f.imageUri,
          inDeck: here,
          owned: owned.has(id),
          availability: here ? null : availability?.get(id) ?? null,
          price: here || owned.has(id) ? null : prices?.prices.get(id) ?? null,
        };
      }),
    };
  });

  return {
    current: currentIds.map((id) => {
      const f = currentCards.find((c) => c.oracleId === id);
      return {
        oracleId: id, name: f?.name ?? "", printedName: ownedArt.get(id)?.printedName ?? null, cmc: f?.cmc ?? 0,
        manaCost: f?.manaCost ?? null, imageUri: ownedArt.get(id)?.imageUri ?? f?.imageUri ?? null,
      };
    }),
    identity,
    counted: body.length,
    ...groupCandidates(candidates),
    claimsKnown: availability !== null,
    newestAsOf: prices?.newestAsOf ?? null,
  };
}
