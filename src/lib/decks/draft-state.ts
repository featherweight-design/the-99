// What the draft has changed, and what it will cost — read once, rendered three
// times.
//
// The banner, the review page's chips and the commit sheet's buy block all state
// the same purchase. Addendum R3 rules that one list with three appearances, so
// the arithmetic lives here and no surface repeats it. `loadDraftState` is the
// cheap read every visit to the deck page pays for; `loadDraftRows` asks the same
// loader for the per-card detail only the review page draws, so the two never
// repeat a read between them.

import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, collectionItems, deckCards, deckVersionCards } from "../../db/schema";
import {
  bucketAdds, draftDiff,
  type AddBucket, type CardQty, type DraftChange,
} from "./draft-diff";
import type { DraftAdd, DraftState } from "./draft-shape";
import { hardDecks, type Availability, type DeckClaim } from "./availability";
import { loadAvailability } from "./availability-query";
import { loadPrices, type PriceRead } from "./price-query";
import { formatCents, priceOf, priceState, summarisePrices } from "./price";
import { averageManaValue } from "./mana-value";
import { newestVersion, versionCards, versionManaValue } from "./versions";
import { isBasicLand, type DeckDetailCard } from "./grouping";
import { cardTypeGroup, primaryRole } from "./read";

// `DraftState`, `DraftAdd`, `changeCount` and `hasChanges` live in
// `draft-shape.ts` — the banner is a client component and cannot value-import a
// module that reaches `db`. Re-exported here so a server caller has one import
// for the whole model.
export type { DraftAdd, DraftState } from "./draft-shape";
export { changeCount, hasChanges } from "./draft-shape";

/**
 * The holders a pull could actually be offered against.
 *
 * Both guards, and both of them the server's own: a deck with pending changes
 * would have them swept into a version nobody asked for, and no route releases a
 * commander. A control that can only fail is worse than no control.
 *
 * Filtered off `claims` rather than through `hardDecks`, whose projection drops
 * the two guard flags — the maturity test is repeated here for that reason.
 */
export function releasableClaims(a: Availability | undefined): DeckClaim[] {
  if (!a) return [];
  return a.claims.filter((c) => c.mature && !c.pending && !c.commander);
}

/**
 * The adds, bucketed against a claim read that may have failed.
 *
 * A null `availability` is the failed read, and it is not an empty one: every add
 * keeps its place in the list and makes no statement about what it costs. Zero
 * `shortfall` is what stands the purchase down — `unfreeAdds` returns nothing over
 * null buckets, so no total is quoted for a cost nobody could read.
 */
export function bucketDraftAdds(
  adds: DraftChange[],
  availability: Map<string, Availability> | null,
): DraftAdd[] {
  if (!availability) {
    return adds.map((c) => ({
      oracleId: c.oracleId, needed: c.to - c.from, shortfall: 0,
      bucket: null, heldBy: [],
    }));
  }
  return bucketAdds(adds, new Map(
    [...availability].map(([oracleId, a]) => [
      oracleId,
      // hardDecks, not the raw claims: a brew "holding" a card holds nothing.
      { free: a.free, claims: hardDecks(a) },
    ]),
  ));
}

/** The adds that cost something. A null bucket is excluded with the free ones,
 *  for the opposite reason: not known to be free, but not known to be anything. */
export function unfreeAdds(bucketed: DraftAdd[]): DraftAdd[] {
  return bucketed.filter((a) => a.bucket !== "free" && a.bucket !== null);
}

/**
 * The newest version, its cards and the deck's own rows as of one instant.
 *
 * One read-only `repeatable read` transaction, because these three reads ARE the
 * comparison. Read separately, a commit landing between them pairs v1's snapshot
 * with the draft that has already become v2, and the deck page tells a player
 * with nothing pending that every card in their newest version is a pending
 * change. Under one snapshot that pairing cannot happen, which is a stronger
 * guarantee than re-reading the version id and retrying.
 *
 * A brew stops at the first query: with no version there is nothing to compare,
 * so the two further reads are never issued.
 */
async function readSnapshot(deckId: string) {
  return db.transaction(async (tx) => {
    const version = await newestVersion(deckId, tx);
    if (!version) return { version, before: [] as CardQty[], draft: [] as CardQty[] };
    // Sequential, not `Promise.all`: a transaction is one connection, and two
    // statements racing down it buy nothing but a queue.
    const before = await versionCards(version.id, tx);
    const draft = await tx.select({
      oracleId: deckCards.oracleId, quantity: deckCards.quantity,
    }).from(deckCards).where(eq(deckCards.deckId, deckId));
    return { version, before, draft };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}

/** Name, type line and mana value per card — the columns every draft figure is
 *  built from, read over the whole draft because the mana value averages it. */
function loadNameFacts(oracleIds: string[]) {
  return db.select({
    oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine, cmc: cards.cmc,
    manaCost: cards.manaCost,
  }).from(cards).where(inArray(cards.oracleId, oracleIds));
}

/**
 * The wider columns only a drawn row needs, over the changed cards alone.
 *
 * `owned` is an `exists` against the collection, exactly as `getDeckDetail`
 * derives it, rather than being inferred from the availability rollup: that
 * rollup can fail, and a failed read must not become "the player owns none of
 * these" on a row that draws an ownership dot and a buy tag.
 */
function loadDetailFacts(userId: string, oracleIds: string[]) {
  return db.select({
    oracleId: cards.oracleId,
    oracleText: cards.oracleText,
    keywords: cards.keywords,
    imageUri: cards.imageUri,
    layout: cards.layout,
    // The `ci` alias and the qualified outer column are both load-bearing, and
    // `pnpm probe:draft` is what proved it: drizzle omits table prefixes
    // entirely on a single-table select, so column references written through
    // the schema objects render as a bare `"oracle_id" = "oracle_id"` that
    // Postgres resolves to the SUBQUERY's column twice. The `exists` stops
    // correlating and answers "does this player own anything at all", which is
    // `true` for every changed card the moment the collection is not empty.
    // `read.ts` writes the same clause safely only because its join makes
    // drizzle qualify; nothing here does.
    owned: sql<boolean>`exists (
      select 1 from ${collectionItems} ci
      where ci.oracle_id = ${cards}.oracle_id
      and ci.user_id = ${userId}
    )`,
  }).from(cards).where(inArray(cards.oracleId, oracleIds));
}

type NameFact = Awaited<ReturnType<typeof loadNameFacts>>[number];
type DetailFact = Awaited<ReturnType<typeof loadDetailFacts>>[number];

/** The state plus the reads it was built from, so a caller needing rows does not
 *  ask the same three questions a second time. */
type DraftRead = {
  state: DraftState;
  /** Null when the read FAILED — never an empty map, which would mean "nothing
   *  competes for any of them". Mirrors `state.claimsKnown`. */
  availability: Map<string, Availability> | null;
  prices: PriceRead | null;
  names: Map<string, NameFact>;
  /** Empty unless the caller asked for detail. */
  detail: Map<string, DetailFact>;
};

/**
 * Everything both readers need, in one pass.
 *
 * `detailed` widens two of the reads rather than adding any: the row columns come
 * back for the changed cards, and availability and prices are scoped to both
 * change lists instead of the adds alone, because a drawn `out` row carries the
 * same markers an `in` row does.
 */
async function readDraft(
  deckId: string,
  userId: string,
  detailed: boolean,
): Promise<DraftRead> {
  const { version, before, draft } = await readSnapshot(deckId);

  const empty: DraftState = {
    version, adds: [], addChanges: [], removes: [], basicsChanged: false,
    names: new Map(), costs: new Map(), prices: new Map(), pullFrom: new Map(),
    claimsKnown: true,
    buyCount: 0, unfreeCount: 0, pullableCount: 0, total: null,
    pricedCopies: 0, newestAsOf: null,
    manaValue: null, manaValueBefore: null,
  };
  const bare = (state: DraftState): DraftRead => ({
    state, availability: null, prices: null, names: new Map(), detail: new Map(),
  });

  // A brew has no version to differ from, so it has no draft state at all — not
  // an empty one, and the snapshot above stopped at the one query that proved it.
  if (!version) return bare(empty);

  const diff = draftDiff(draft, before);
  const changedIds = [...diff.adds, ...diff.removes].map((c) => c.oracleId);
  if (changedIds.length === 0) return bare(empty);

  // Over the WHOLE draft rather than only the changed cards: the mana value below
  // averages every row the draft holds, and a row whose cmc was missing from this
  // map would average as a zero. Basics come out of both lists for the reason the
  // commit receipt drops them: they are outside the availability model, so
  // neither list has a figure to print.
  const facts = await loadNameFacts([
    ...new Set([...changedIds, ...draft.map((c) => c.oracleId)]),
  ]);
  const basics = new Set(facts.filter((f) => isBasicLand(f.typeLine)).map((f) => f.oracleId));
  const adds = diff.adds.filter((a) => !basics.has(a.oracleId));
  const removes = diff.removes.filter((r) => !basics.has(r.oracleId));

  // A basics-only edit: real, committable, and priceable by nothing. Every list
  // and every figure stays empty, and `basicsChanged` is the one signal that
  // says the draft differs — see `hasChanges`.
  if (adds.length === 0 && removes.length === 0) {
    return bare({ ...empty, basicsChanged: true });
  }

  const changed = [...adds, ...removes].map((c) => c.oracleId);
  // Changed cards only, per `DraftState.names`: `facts` spans the whole draft
  // because the mana average needs every row, and a consumer enumerating this map
  // would otherwise draw cards the draft never touched.
  const changedSet = new Set(changed);
  const names = new Map(
    facts.filter((f) => changedSet.has(f.oracleId)).map((f) => [f.oracleId, f.name]),
  );
  // Same scope as `names`, and the cost track is drawn beside a changed name and
  // nowhere else. A card the catalog gives no cost stays out of the map rather
  // than entering it as a null, so its track draws nothing.
  const costs = new Map(
    facts
      .filter((f) => changedSet.has(f.oracleId) && f.manaCost !== null)
      .map((f) => [f.oracleId, f.manaCost as string]),
  );
  // Excluding this deck: the question is what OTHER decks hold, which is the
  // same question the commit asks. Scoped to the adds unless a caller is drawing
  // rows, which need the `out` side too.
  const asked = detailed ? changed : adds.map((a) => a.oracleId);
  const availability = asked.length > 0
    ? await loadAvailability(userId, { oracleIds: asked, excludeDeckId: deckId })
        .catch(() => null)
    : new Map<string, Availability>();

  const claimsKnown = availability !== null;
  const bucketed = bucketDraftAdds(adds, availability);
  const unfree = unfreeAdds(bucketed);
  const priceAsked = detailed ? changed : unfree.map((a) => a.oracleId);
  const prices = priceAsked.length > 0
    ? await loadPrices(priceAsked).catch(() => null)
    : null;
  // `shortfall`, never `needed`: one free copy against an ask of three is a
  // purchase of two, and charging for three quotes a card already on the table.
  const summary = summarisePrices(
    unfree.map((a) => ({
      quantity: a.shortfall,
      price: prices?.prices.get(a.oracleId) ?? null,
    })),
    prices?.newestAsOf ?? null,
  );

  // Unfree adds only: a free add buys nothing and a remove buys nothing, so
  // neither carries a figure. `priceOf` answers null for a sold-out or unpriced
  // card, and those stay out of the map rather than entering it as `$0.00`.
  const priceTags = new Map<string, string>();
  for (const add of unfree) {
    const fact = prices?.prices.get(add.oracleId);
    if (!fact) continue;
    const cents = priceOf(fact, priceState(fact, prices?.newestAsOf ?? null));
    if (cents !== null) priceTags.set(add.oracleId, formatCents(cents));
  }

  // The releasable holder, not the first mature one: `heldBy` includes the decks
  // a pull is refused from, and offering one of those names an act that fails.
  const pullFrom = new Map<string, string>();
  for (const add of bucketed) {
    const holder = releasableClaims(availability?.get(add.oracleId))[0];
    if (holder) pullFrom.set(add.oracleId, holder.name);
  }

  const cmcByOracle = new Map(facts.map((f) => [f.oracleId, f.cmc]));
  const typeByOracle = new Map(facts.map((f) => [f.oracleId, f.typeLine]));

  const detail = detailed
    ? new Map((await loadDetailFacts(userId, changed)).map((d) => [d.oracleId, d]))
    : new Map<string, DetailFact>();

  return {
    state: {
      version,
      adds: bucketed,
      // Index-aligned with `bucketed` because both branches above map `adds` one
      // to one and preserve its order — this is the list they were given.
      addChanges: adds,
      removes,
      basicsChanged: false,
      names,
      costs,
      prices: priceTags,
      pullFrom,
      claimsKnown,
      buyCount: unfree.reduce((n, a) => n + a.shortfall, 0),
      unfreeCount: unfree.length,
      pullableCount: bucketed.filter((a) =>
        a.bucket === "claimed" && releasableClaims(availability?.get(a.oracleId)).length > 0,
      ).length,
      // `pricedCopies`, not a positive total: the feed can stock a card at
      // nothing, and a real $0.00 is a price the player should see rather than a
      // purchase the app claims it cannot quote.
      total: summary.pricedCopies > 0 ? formatCents(summary.totalCents) : null,
      pricedCopies: summary.pricedCopies,
      newestAsOf: prices?.newestAsOf ?? null,
      manaValue: averageManaValue(draft.map((c) => ({
        cmc: cmcByOracle.get(c.oracleId) ?? 0,
        quantity: c.quantity,
        typeLine: typeByOracle.get(c.oracleId) ?? "",
      }))),
      manaValueBefore: await versionManaValue(version.id),
    },
    availability,
    prices,
    names: new Map(facts.map((f) => [f.oracleId, f])),
    detail,
  };
}

export async function loadDraftState(deckId: string, userId: string): Promise<DraftState> {
  return (await readDraft(deckId, userId, false)).state;
}

/** The committed list reduced to what the mix strip and the type distribution
 *  count. `versionCards` returns `oracleId`/`quantity` only, with no role to
 *  tally, which is why this read exists at all. */
export type ShapeCard = {
  role: DeckDetailCard["role"];
  quantity: number;
  typeLine: string;
};

/**
 * The committed list as the mix strip counts it.
 *
 * `role` is derived exactly as `getDeckDetail` derives it — `primaryRole` over
 * the real oracle text — because a role tallied two ways is two different decks
 * on one screen, and the deck page draws both figures in the same cell.
 */
export async function loadVersionShape(versionId: string): Promise<ShapeCard[]> {
  const rows = await db.select({
    quantity: deckVersionCards.quantity,
    typeLine: cards.typeLine,
    oracleText: cards.oracleText,
    keywords: cards.keywords,
  }).from(deckVersionCards)
    .innerJoin(cards, eq(cards.oracleId, deckVersionCards.oracleId))
    .where(eq(deckVersionCards.versionId, versionId));
  return rows.map((r) => ({
    role: primaryRole(r), quantity: r.quantity, typeLine: r.typeLine,
  }));
}

/** One changed card, as the review page draws it. `DeckDetailCard` shaped, so
 *  the row reuses the shipped ownership dot, availability marker, buy tag and
 *  cost pips without a second card type in the codebase. */
export type DraftRow = DeckDetailCard & {
  /** Where the card is going. */
  direction: "in" | "out";
  /** The draft's count before and after, for `recountedItem`. Equal counts are
   *  impossible: `draftDiff` files a change only when they differ. */
  from: number;
  to: number;
  /** Which of the three answers this add got. Null on an `out` row — a card
   *  leaving makes no purchase decision — and null on every `in` row when
   *  `state.claimsKnown` is false, where it means the answer is unknown. */
  bucket: AddBucket | null;
};

/** Split at the source, not in the component. The review page draws two columns
 *  and every consumer would otherwise filter on `direction` itself — which is
 *  one `in`/`out` split per surface and a chance for two of them to disagree. */
export type DraftRows = {
  state: DraftState;
  rows: { in: DraftRow[]; out: DraftRow[] };
};

/**
 * Every changed card with the facts a row draws.
 *
 * Read from `cards` directly rather than through `getDeckDetail`: a removed card
 * is not in `deck_cards` any more, so the deck's own decklist cannot describe
 * it. `quantity` on each row is the DELTA, which is what the row's figure means
 * — `3 → 1` is one row that lost two copies, never a row for two copies.
 */
export async function loadDraftRows(deckId: string, userId: string): Promise<DraftRows> {
  const read = await readDraft(deckId, userId, true);
  const { state } = read;

  const built: DraftRow[] = [];
  // Driven by the state's own two lists, in their order, rather than by the rows
  // a query happened to return: `draftDiff` sorts both lists, and adopting DB
  // order here would let the drawn rows drift out of step with every count and
  // every name the other surfaces print.
  for (const change of [...state.adds, ...state.removes]) {
    const name = read.names.get(change.oracleId);
    const detail = read.detail.get(change.oracleId);
    // A changed card the catalog cannot describe. Dropping it is the only
    // honest option — a row with no name and no type is not a row.
    if (!name || !detail) continue;

    const add = "bucket" in change ? (change as DraftAdd) : null;
    const pair = add
      ? state.addChanges.find((c) => c.oracleId === change.oracleId)
      : (change as DraftChange);
    const from = pair?.from ?? 0;
    const to = pair?.to ?? 0;

    built.push({
      oracleId: change.oracleId,
      name: name.name,
      typeLine: name.typeLine,
      cardTypeGroup: cardTypeGroup(name.typeLine),
      role: primaryRole({ ...detail, typeLine: name.typeLine }),
      cmc: name.cmc,
      owned: detail.owned,
      quantity: Math.abs(to - from),
      auto: false,
      availability: read.availability?.get(change.oracleId) ?? null,
      price: read.prices?.prices.get(change.oracleId) ?? null,
      manaCost: name.manaCost,
      imageUri: detail.imageUri,
      // Null, all three, and deliberately: a changed-card row names the card
      // the deck is gaining or losing, and there is no owned printing to resolve
      // for a card being bought. The shipped `printedNameOf` reads null as "use
      // the oracle name", which is the right rendering here.
      printedName: null,
      printedSetCode: null,
      printedCollectorNumber: null,
      layout: detail.layout,
      direction: add ? "in" : "out",
      from,
      to,
      bucket: add ? add.bucket : null,
    });
  }

  return {
    state,
    rows: {
      in: built.filter((r) => r.direction === "in"),
      out: built.filter((r) => r.direction === "out"),
    },
  };
}
