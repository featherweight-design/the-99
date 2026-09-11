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
import { cards, collectionItems, deckCards } from "../../db/schema";
import {
  bucketAdds, draftDiff,
  type AddBucket, type BucketedAdd, type CardQty, type DraftChange,
} from "./draft-diff";
import { hardDecks, type Availability, type DeckClaim } from "./availability";
import { loadAvailability } from "./availability-query";
import { loadPrices, type PriceRead } from "./price-query";
import { formatCents, summarisePrices } from "./price";
import { averageManaValue } from "./mana-value";
import { newestVersion, versionCards, versionManaValue, type DeckVersion } from "./versions";
import { isBasicLand, type DeckDetailCard } from "./grouping";
import { cardTypeGroup, primaryRole } from "./read";

/**
 * An add as every draft surface reads it.
 *
 * `bucket` is null when the availability read failed, and that is the whole
 * reason this type exists rather than `BucketedAdd`: a card whose claims could
 * not be read is not an unowned card, and `bucketAdds` over an empty claimant
 * map would call it one. A null bucket stands `shortfall` down to zero with it —
 * with nothing known about free copies there is no purchase to quote.
 */
export type DraftAdd = Omit<BucketedAdd, "bucket"> & { bucket: AddBucket | null };

export type DraftState = {
  /** Null for a brew. Every pending surface is absent on a brew: there is no
   *  version for the draft to be pending against. */
  version: DeckVersion | null;
  /** Cards the draft added, bucketed, basics excluded. */
  adds: DraftAdd[];
  /** The same adds as raw diff entries, index-aligned with `adds`. `DraftAdd`
   *  carries `needed` and `shortfall` but not the `from`/`to` pair, and both the
   *  banner and the review row print that pair for a quantity move. */
  addChanges: DraftChange[];
  /** Cards the draft cut, basics excluded, each carrying `from` and `to`. */
  removes: DraftChange[];
  /** True when the draft differs from the version ONLY in basic lands. Basics are
   *  outside the availability model, so they are excluded from every list and
   *  every figure — but a deck whose land count moved has genuinely changed and
   *  must still be committable. Without this flag `changeCount` is 0, the banner
   *  takes its clean branch, and a real edit has no route to a commit. */
  basicsChanged: boolean;
  /** Oracle name per changed card, both lists — what the banner's inline
   *  density says at six changes or fewer. */
  names: Map<string, string>;
  /**
   * Whether the claim model could be read at all.
   *
   * False only when the availability read failed. Every money figure below is
   * zero or null in that case and states nothing — NOT "this commit is free",
   * which is what an empty claimant map would have made them say. A surface with
   * a false here draws the change lists and no purchase.
   */
  claimsKnown: boolean;
  /** Copies the player must obtain: the shortfall over every unfree add. Not a
   *  row count — one card wanted three times is three copies. */
  buyCount: number;
  /** Rows in `adds` that are not free. The banner's `unfree` figure. */
  unfreeCount: number;
  /** Adds a deliberate pull could satisfy: bucket `claimed`, and at least one
   *  holder that is neither pending nor holding it as a commander. Drawn as a
   *  count only — which row offers which control is `loadDraftRows`' answer. */
  pullableCount: number;
  /**
   * Formatted, because the figure is only ever printed. Null when NO copy could
   * be priced, which is not the same as a purchase of nothing: read it beside
   * `unfreeCount`, and say the free-copy sentence only when that is zero. A real
   * $0.00 is printed rather than nulled — the feed stocking a card at nothing is
   * a price, and hiding it would quote the purchase as unpriceable.
   */
  total: string | null;
  /** The draft's average, and the version's. Both null on an all-land list. */
  manaValue: number | null;
  manaValueBefore: number | null;
};

/** `adds.length + removes.length` — the figure every count chip is built on.
 *  Basics are not in either list, so this is a count of *nameable* changes and
 *  not a test of whether the draft differs. Use `hasChanges` for that. */
export function changeCount(state: DraftState): number {
  return state.adds.length + state.removes.length;
}

/** Whether the draft differs from the version at all. A basics-only edit counts
 *  here and in no figure, which is the only honest split: the app cannot price
 *  an Island, and it must not tell a player who cut three of them that the deck
 *  is unchanged. */
export function hasChanges(state: DraftState): boolean {
  return changeCount(state) > 0 || state.basicsChanged;
}

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
    manaCost: cards.manaCost,
    imageUri: cards.imageUri,
    layout: cards.layout,
    owned: sql<boolean>`exists (
      select 1 from ${collectionItems}
      where ${collectionItems.oracleId} = ${cards.oracleId}
      and ${collectionItems.userId} = ${userId}
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
    names: new Map(), claimsKnown: true,
    buyCount: 0, unfreeCount: 0, pullableCount: 0, total: null,
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
  const names = new Map(facts.map((f) => [f.oracleId, f.name]));

  // A basics-only edit: real, committable, and priceable by nothing. Every list
  // and every figure stays empty, and `basicsChanged` is the one signal that
  // says the draft differs — see `hasChanges`.
  if (adds.length === 0 && removes.length === 0) {
    return bare({ ...empty, basicsChanged: true });
  }

  const changed = [...adds, ...removes].map((c) => c.oracleId);
  // Excluding this deck: the question is what OTHER decks hold, which is the
  // same question the commit asks. Scoped to the adds unless a caller is drawing
  // rows, which need the `out` side too.
  const asked = detailed ? changed : adds.map((a) => a.oracleId);
  const availability = asked.length > 0
    ? await loadAvailability(userId, { oracleIds: asked, excludeDeckId: deckId })
        .catch(() => null)
    : new Map<string, Availability>();

  const claimsKnown = availability !== null;
  const bucketed: DraftAdd[] = availability
    ? bucketAdds(adds, new Map(
        [...availability].map(([oracleId, a]) => [
          oracleId,
          // hardDecks, not the raw claims: a brew "holding" a card holds nothing.
          { free: a.free, claims: hardDecks(a) },
        ]),
      ))
    // No claim model, so no answer: every add keeps its place in the list and
    // makes no statement about what it costs.
    : adds.map((c) => ({
        oracleId: c.oracleId, needed: c.to - c.from, shortfall: 0,
        bucket: null, heldBy: [],
      }));

  const unfree = bucketed.filter((a) => a.bucket !== "free" && a.bucket !== null);
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
      manaCost: detail.manaCost,
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
