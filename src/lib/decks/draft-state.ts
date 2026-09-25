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
import { cards, collectionItems, deckCards, decks, deckVersionCards } from "../../db/schema";
import {
  bucketAdds, draftDiff,
  type AddBucket, type CardQty, type DraftChange,
} from "./draft-diff";
import type { DraftAdd, DraftState } from "./draft-shape";
import { proxiedOracleIds } from "./proxies";
import { releasableClaims } from "./draft-shape";
import { pullSources, type Availability } from "./availability";
import { loadAvailability } from "./availability-query";
import { loadPrices, type PriceRead } from "./price-query";
import { formatCents, formatPriceFigure, priceState, summarisePrices } from "./price";
import { newestVersion, versionCards } from "./versions";
import { isBasicLand, type DeckDetailCard } from "./grouping";
import { cardTypeGroup, primaryRole } from "./read";
import { changeCommanderEnabled } from "../commander-change/flag";
import { commanderMoved, type CommanderPair } from "../commander-change/pending";
import { loadCommanderRows } from "../commander-change/draft-rows";

// `DraftState`, `DraftAdd`, the two counts and the two claim selectors live in
// `draft-shape.ts` — the banner and the pull control are client components and
// cannot value-import a module that reaches `db`. Re-exported here so a server
// caller has one import for the whole model.
export type { DraftAdd, DraftState } from "./draft-shape";
export {
  changeCount, hasChanges, heldElsewhere, printsPair, pullCandidate, releasableClaims,
  releasedCopies,
} from "./draft-shape";

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
  basics: ReadonlySet<string> = new Set(),
  /** The cards this deck prints. Answered ahead of everything below, including
   *  a failed claim read: a printed card asks the collection for nothing, and
   *  that is true whether or not the claim query succeeded. */
  proxied: ReadonlySet<string> = new Set(),
): DraftAdd[] {
  if (!availability) {
    // A basic is free whatever the claim read did, because it was never part of
    // that read: nothing was asked, so nothing failed. Left as a null bucket it
    // would drop out of the column's `free · sleeved · buy` breakdown and make
    // the three terms disagree with the count above them.
    return adds.map((c) => (
      proxied.has(c.oracleId)
        ? {
            oracleId: c.oracleId, needed: c.to - c.from, shortfall: 0,
            bucket: "proxied" as const, heldBy: [],
          }
        : basics.has(c.oracleId)
        ? {
            oracleId: c.oracleId, needed: c.to - c.from, shortfall: 0,
            bucket: "free" as const, heldBy: [],
          }
        : {
            oracleId: c.oracleId, needed: c.to - c.from, shortfall: 0,
            bucket: null, heldBy: [],
          }
    ));
  }
  return bucketAdds(adds, new Map(
    [...availability].map(([oracleId, a]) => [
      oracleId,
      // pullSources, not the raw claims and not hardDecks: a brew "holding" a
      // card holds nothing, and a junior sleeved holder's copy is already
      // outside this deck's `free`, so taking it moves no figure. A bucket is
      // `claimed` only where a pull would actually relieve the shortfall.
      { free: a.free, claims: pullSources(a) },
    ]),
  ), basics, proxied);
}

/**
 * The deck a pull could be taken from, per add that offers one.
 *
 * Claimed adds only. A free add has a spare copy in the collection, so there is
 * nothing to pull even when another deck also holds one — and `pullableCount`
 * counts the same two conditions, so a hint drawn on a free row would name a
 * card the count does not include.
 *
 * The map and the count are derived from this one list for exactly that reason:
 * two filters over the same facts are how a hint and a figure come to disagree.
 */
export function pullHints(
  bucketed: DraftAdd[],
  availability: Map<string, Availability> | null,
): Map<string, string> {
  const hints = new Map<string, string>();
  for (const add of bucketed) {
    if (add.bucket !== "claimed") continue;
    const holder = releasableClaims(availability?.get(add.oracleId))[0];
    if (holder) hints.set(add.oracleId, holder.name);
  }
  return hints;
}

/** The adds that cost something. A null bucket is excluded with the free ones,
 *  for the opposite reason: not known to be free, but not known to be anything.
 *
 *  `proxied` is excluded for a third reason again — it is not unknown and it is
 *  not a spare copy, it is a card the deck is not asking the collection for.
 *  Left in, it counted toward `unfreeCount`, had a price loaded for it, and
 *  reached the banner that says N of the M adds are *short of spare copies* —
 *  about a card with a shortfall of zero. */
export function unfreeAdds(bucketed: DraftAdd[]): DraftAdd[] {
  return bucketed.filter(
    (a) => a.bucket !== "free" && a.bucket !== "proxied" && a.bucket !== null,
  );
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
 * so the further reads are never issued.
 *
 * The deck's live commander columns ARE the draft's commander, so they are read
 * in the same snapshot as the draft's cards — but only with
 * `CHANGE_COMMANDER_ENABLED` on. Off, nothing writes those columns after
 * creation, and the deck page pays for no fourth query.
 */
async function readSnapshot(deckId: string) {
  return db.transaction(async (tx) => {
    const version = await newestVersion(deckId, tx);
    if (!version) {
      return { version, before: [] as CardQty[], draft: [] as CardQty[], live: null };
    }
    // Sequential, not `Promise.all`: a transaction is one connection, and two
    // statements racing down it buy nothing but a queue.
    const before = await versionCards(version.id, tx);
    const draft = await tx.select({
      oracleId: deckCards.oracleId, quantity: deckCards.quantity,
    }).from(deckCards).where(eq(deckCards.deckId, deckId));
    let live: CommanderPair | null = null;
    if (changeCommanderEnabled()) {
      [live = null] = await tx.select({
        commanderOracleId: decks.commanderOracleId, partnerOracleId: decks.partnerOracleId,
      }).from(decks).where(eq(decks.id, deckId));
    }
    return { version, before, draft, live };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}

/** Name, type line and mana value per card, over the CHANGED cards. The strip's
 *  average reads the whole draft through `loadDraftShape`, which is its own
 *  three-column query; nothing here needs a row the draft did not touch. */
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
  /** The cards this deck prints. Empty on a failed read, which is how every
   *  rendering surface read before proxies existed. */
  proxied: ReadonlySet<string>;
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
  const { version, before, draft, live } = await readSnapshot(deckId);

  const empty: DraftState = {
    version, adds: [], addChanges: [], removes: [],
    names: new Map(), costs: new Map(), prices: new Map(), pullFrom: new Map(),
    claimsKnown: true,
    buyCount: 0, unfreeCount: 0, pullableCount: 0, total: null,
    pricedCopies: 0, newestAsOf: null, commander: null,
  };
  const bare = (state: DraftState): DraftRead => ({
    state, availability: null, prices: null, names: new Map(), detail: new Map(),
    // A brew and a clean deck have no changes to draw, so nothing reads this.
    proxied: new Set<string>(),
  });

  // A brew has no version to differ from, so it has no draft state at all — not
  // an empty one, and the snapshot above stopped at the one query that proved it.
  if (!version) return bare(empty);

  const diff = draftDiff(draft, before);
  const changedIds = [...diff.adds, ...diff.removes].map((c) => c.oracleId);
  const commander = live && commanderMoved(version, live)
    ? {
        from: { commanderOracleId: version.commanderOracleId, partnerOracleId: version.partnerOracleId },
        to: live,
      }
    : null;
  // The moved commanders' names, for the banner's and the review page's commander line. Their
  // own read, merged into `names` only: a commander is not a card row, so it must not reach the
  // cost track, the basics set or the row facts.
  // The version's body goes with them: a half that arrives out of the 99 keeps that card's copy.
  const commanderRows = commander
    ? await loadCommanderRows(userId, commander.from, commander.to, new Set(before.map((c) => c.oracleId)))
    : null;
  const commanderNames = new Map((commanderRows?.rows ?? []).map((r) => [r.oracleId, r.name]));
  // A commander-only draft has changes and no card row: its state is the empty
  // one plus the move and its names, so nothing below reads a card it does not have.
  if (changedIds.length === 0) return bare({ ...empty, commander, commanderRows, names: commanderNames });

  // The changed cards, basics among them. A basic stays in both lists and is
  // drawn like any other row: cutting five Swamps to make room for five other
  // lands is exactly the edit this page exists to describe, and the player has
  // to know how many to take out of the sleeve. What a basic is kept OUT of is
  // the money — see `bucketAdds`, and the two reads scoped below.
  const facts = await loadNameFacts(changedIds);
  const basics = new Set(facts.filter((f) => isBasicLand(f.typeLine)).map((f) => f.oracleId));
  const adds = diff.adds;
  const removes = diff.removes;

  const changed = changedIds;
  const names = new Map([...commanderNames, ...facts.map((f) => [f.oracleId, f.name] as const)]);
  // Same scope as `names`, and the cost track is drawn beside a changed name and
  // nowhere else. A card the catalog gives no cost stays out of the map rather
  // than entering it as a null, so its track draws nothing.
  const costs = new Map(
    facts
      .filter((f) => f.manaCost !== null)
      .map((f) => [f.oracleId, f.manaCost as string]),
  );
  // Excluding this deck: the question is what OTHER decks hold, which is the
  // same question the commit asks. Scoped to the adds unless a caller is drawing
  // rows, which need the `out` side too.
  //
  // Basics are asked about on NEITHER side. They are outside the claim model —
  // `loadAvailability`'s own header says so — and an id that reaches it comes
  // back with no row, which is how an added Forest became an `unowned` add on a
  // shopping list. They are rows on the page and absences in this read, and the
  // two are not in tension: what the page draws for one is a name and a count.
  const notBasic = (id: string) => !basics.has(id);
  const asked = (detailed ? changed : adds.map((a) => a.oracleId)).filter(notBasic);
  const availability = asked.length > 0
    ? await loadAvailability(userId, { oracleIds: asked, excludeDeckId: deckId })
        .catch(() => null)
    : new Map<string, Availability>();

  const claimsKnown = availability !== null;
  // This deck's printed cards, membership-scoped like every other proxy read.
  // Without it the review screen prices a card the player has decided not to
  // buy — the shipped `AvailabilitySlot` draws a buy tag on any unowned add.
  const proxied = await proxiedOracleIds(deckId, userId);
  const bucketed = bucketDraftAdds(adds, availability, basics, proxied);
  const unfree = unfreeAdds(bucketed);
  const priceAsked = (detailed ? changed : unfree.map((a) => a.oracleId)).filter(notBasic);
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
  // neither carries a figure. `formatPriceFigure` answers null for a sold-out or
  // unpriced card, and those stay out of the map rather than entering it as
  // `$0.00`.
  //
  // Formatted by the one formatter `BuyTag` uses, so the figure carries its
  // `foil` / `etched` qualifier: a foil-only price stated bare is the normal
  // printing's price, which is a figure the feed never gave.
  const priceTags = new Map<string, string>();
  for (const add of unfree) {
    const fact = prices?.prices.get(add.oracleId);
    if (!fact) continue;
    const figure = formatPriceFigure(fact, priceState(fact, prices?.newestAsOf ?? null));
    if (figure !== null) priceTags.set(add.oracleId, figure);
  }

  // The releasable holder, not the first mature one: `heldBy` includes the decks
  // a pull is refused from, and offering one of those names an act that fails.
  //
  // Read after `readSnapshot`'s transaction has closed, deliberately. A claim is
  // point-in-time whatever boundary we draw around it: another deck can commit
  // between this read and the reader's click, so no shared snapshot can make the
  // offer true at the moment it is taken. What makes a pull safe is that the
  // server action re-reads every claim in its own transaction and refuses with a
  // named reason, which the control prints. Folding `loadAvailability`'s raw SQL,
  // the price join and the detail read into the diff's repeatable-read
  // transaction would buy display-internal consistency for a figure that is
  // advisory either way, at the cost of holding that transaction open across
  // three more round trips.
  const pullFrom = pullHints(bucketed, availability);

  const detail = detailed
    ? new Map((await loadDetailFacts(userId, changed)).map((d) => [d.oracleId, d]))
    : new Map<string, DetailFact>();

  return {
    proxied,
    state: {
      version,
      adds: bucketed,
      // Index-aligned with `bucketed` because both branches above map `adds` one
      // to one and preserve its order — this is the list they were given.
      addChanges: adds,
      removes,
      names,
      costs,
      prices: priceTags,
      pullFrom,
      claimsKnown,
      buyCount: unfree.reduce((n, a) => n + a.shortfall, 0),
      unfreeCount: unfree.length,
      // The size of the hint map, not a second filter over the same facts: the
      // count and the hints answer one question, so they read one list.
      pullableCount: pullFrom.size,
      // `pricedCopies`, not a positive total: the feed can stock a card at
      // nothing, and a real $0.00 is a price the player should see rather than a
      // purchase the app claims it cannot quote.
      total: summary.pricedCopies > 0 ? formatCents(summary.totalCents) : null,
      pricedCopies: summary.pricedCopies,
      newestAsOf: prices?.newestAsOf ?? null,
      commander,
      commanderRows,
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
  /** So the strip averages its own curve off the same two lists it tallies every
   *  other cell from. A figure carried separately would have to be computed for
   *  a basics-only draft too, where every other draft figure is deliberately
   *  empty — and the cell would vanish on the one edit that cannot move it. */
  cmc: number;
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
    cmc: cards.cmc,
    oracleText: cards.oracleText,
    keywords: cards.keywords,
  }).from(deckVersionCards)
    .innerJoin(cards, eq(cards.oracleId, deckVersionCards.oracleId))
    .where(eq(deckVersionCards.versionId, versionId));
  return rows.map((r) => ({
    role: primaryRole(r), quantity: r.quantity, typeLine: r.typeLine, cmc: r.cmc,
  }));
}

/**
 * The same shape, read off the live draft.
 *
 * `getDeckDetail` would answer this too, and carries a whole deck's art, prices
 * and availability to do it — the review route deliberately does not read one,
 * which is why `getDeckReviewHeader` exists. Tallying the strip needs three
 * columns per row and nothing else.
 */
export async function loadDraftShape(deckId: string): Promise<ShapeCard[]> {
  const rows = await db.select({
    quantity: deckCards.quantity,
    typeLine: cards.typeLine,
    cmc: cards.cmc,
    oracleText: cards.oracleText,
    keywords: cards.keywords,
  }).from(deckCards)
    .innerJoin(cards, eq(cards.oracleId, deckCards.oracleId))
    .where(eq(deckCards.deckId, deckId));
  return rows.map((r) => ({
    role: primaryRole(r), quantity: r.quantity, typeLine: r.typeLine, cmc: r.cmc,
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
  /** Copies this add must buy, from the same bucketing. 0 on an `out` row, on a
   *  free add, and on every row when the claim read failed. The row needs it
   *  because `owned` is not the question: a player holding one copy of a card
   *  they are adding four of owns it and still buys three. */
  shortfall: number;
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
      // A basic land is owned, whatever the collection says. The column is the
      // one thing standing between a basic row and a buy tag —
      // `AvailabilitySlot` draws that tag on `!owned` — and a player whose CSV
      // happens to list no Swamp would otherwise be told to go and buy five,
      // on the one card every Shopping surface in this app already treats as
      // unlimited. Stated here rather than in the row, so no component has to
      // learn what a basic is.
      owned: isBasicLand(name.typeLine) || detail.owned,
      // The deck's own statement about this slot, carried so the review row has
      // it. `owned` is NOT set true for a printed card — the collection has not
      // moved — so the flag rides beside it and the row decides what to draw.
      proxied: read.proxied?.has(change.oracleId) ?? false,
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
      shortfall: add ? add.shortfall : 0,
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
