// What the draft has changed, and what it will cost — read once, rendered three
// times.
//
// The banner, the review page's chips and the commit sheet's buy block all state
// the same purchase. Addendum R3 rules that one list with three appearances, so
// the arithmetic lives here and no surface repeats it. `loadDraftState` is the
// cheap read every visit to the deck page pays for; `loadDraftRows` adds the
// per-card facts only the review page draws.

import { eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards, deckCards } from "../../db/schema";
import { bucketAdds, draftDiff, type BucketedAdd, type DraftChange } from "./draft-diff";
import { hardDecks, type Availability, type DeckClaim } from "./availability";
import { loadAvailability } from "./availability-query";
import { loadPrices } from "./price-query";
import { formatCents, summarisePrices } from "./price";
import { averageManaValue } from "./mana-value";
import { newestVersion, versionCards, versionManaValue, type DeckVersion } from "./versions";
import { isBasicLand, type DeckDetailCard } from "./grouping";
import { cardTypeGroup, primaryRole } from "./read";

export type DraftState = {
  /** Null for a brew. Every pending surface is absent on a brew: there is no
   *  version for the draft to be pending against. */
  version: DeckVersion | null;
  /** Cards the draft added, bucketed, basics excluded. */
  adds: BucketedAdd[];
  /** The same adds as raw diff entries, index-aligned with `adds`. `BucketedAdd`
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
  /** Copies the player must obtain: the shortfall over every unfree add. Not a
   *  row count — one card wanted three times is three copies. */
  buyCount: number;
  /** Rows in `adds` that are not free. The banner's `unfree` figure. */
  unfreeCount: number;
  /** Adds a deliberate pull could satisfy: bucket `claimed`, and at least one
   *  holder that is neither pending nor holding it as a commander. Drawn as a
   *  count only — which row offers which control is `loadDraftRows`' answer. */
  pullableCount: number;
  /** Formatted, because the figure is only ever printed. Null when nothing
   *  priced — never "$0.00", which would claim the purchase is free. */
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

export async function loadDraftState(deckId: string, userId: string): Promise<DraftState> {
  const version = await newestVersion(deckId);
  const before = version ? await versionCards(version.id) : [];
  const draft = await db.select({
    oracleId: deckCards.oracleId, quantity: deckCards.quantity,
  }).from(deckCards).where(eq(deckCards.deckId, deckId));

  const empty: DraftState = {
    version, adds: [], addChanges: [], removes: [], basicsChanged: false,
    names: new Map(),
    buyCount: 0, unfreeCount: 0, pullableCount: 0, total: null,
    manaValue: null, manaValueBefore: null,
  };
  // A brew has no version to differ from, so it has no draft state at all —
  // not an empty one. Returning early also keeps every query below off the
  // page load of a deck that has never been committed.
  if (!version) return empty;

  const diff = draftDiff(draft, before);
  const changed = [...diff.adds, ...diff.removes].map((c) => c.oracleId);
  if (changed.length === 0) return { ...empty, version };

  // Names and type lines in one read, over the WHOLE draft rather than only the
  // changed cards: the mana value below averages every row the draft holds, and
  // a row whose cmc was missing from this map would average as a zero. Basics
  // come out of both lists for the reason the commit receipt drops them: they
  // are outside the availability model, so neither list has a figure to print.
  const facts = await db.select({
    oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine, cmc: cards.cmc,
  }).from(cards).where(inArray(
    cards.oracleId,
    [...new Set([...changed, ...draft.map((c) => c.oracleId)])],
  ));
  const basics = new Set(facts.filter((f) => isBasicLand(f.typeLine)).map((f) => f.oracleId));
  const adds = diff.adds.filter((a) => !basics.has(a.oracleId));
  const removes = diff.removes.filter((r) => !basics.has(r.oracleId));
  const names = new Map(facts.map((f) => [f.oracleId, f.name]));

  // A basics-only edit: real, committable, and priceable by nothing. Every list
  // and every figure stays empty, and `basicsChanged` is the one signal that
  // says the draft differs — see `hasChanges`.
  if (adds.length === 0 && removes.length === 0) {
    return { ...empty, basicsChanged: true };
  }

  // Scoped to the adds, and excluding this deck: the question is what OTHER
  // decks hold, which is the same question the commit asks.
  const availability = adds.length > 0
    ? await loadAvailability(userId, {
        oracleIds: adds.map((a) => a.oracleId), excludeDeckId: deckId,
      }).catch(() => null)
    : null;
  const claimants = new Map(
    [...(availability ?? new Map<string, Availability>())].map(([oracleId, a]) => [
      oracleId,
      // hardDecks, not the raw claims: a brew "holding" a card holds nothing.
      { free: a.free, claims: hardDecks(a) },
    ]),
  );
  const bucketed = bucketAdds(adds, claimants);

  const unfree = bucketed.filter((a) => a.bucket !== "free");
  const priced = unfree.length > 0
    ? await loadPrices(unfree.map((a) => a.oracleId)).catch(() => null)
    : null;
  // `shortfall`, never `needed`: one free copy against an ask of three is a
  // purchase of two, and charging for three quotes a card already on the table.
  const summary = summarisePrices(
    unfree.map((a) => ({
      quantity: a.shortfall,
      price: priced?.prices.get(a.oracleId) ?? null,
    })),
    priced?.newestAsOf ?? null,
  );

  const cmcByOracle = new Map(facts.map((f) => [f.oracleId, f.cmc]));
  const typeByOracle = new Map(facts.map((f) => [f.oracleId, f.typeLine]));

  return {
    version,
    adds: bucketed,
    // Index-aligned with `bucketed` because `bucketAdds` maps `adds` one to one
    // and preserves its order — this is the list it was given.
    addChanges: adds,
    removes,
    basicsChanged: false,
    names,
    buyCount: unfree.reduce((n, a) => n + a.shortfall, 0),
    unfreeCount: unfree.length,
    pullableCount: bucketed.filter((a) =>
      a.bucket === "claimed" && releasableClaims(availability?.get(a.oracleId)).length > 0,
    ).length,
    total: summary.totalCents > 0 ? formatCents(summary.totalCents) : null,
    manaValue: averageManaValue(draft.map((c) => ({
      cmc: cmcByOracle.get(c.oracleId) ?? 0,
      quantity: c.quantity,
      typeLine: typeByOracle.get(c.oracleId) ?? "",
    }))),
    manaValueBefore: await versionManaValue(version.id),
  };
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
  /** Which of the three answers this add got. Null on an `out` row: a card
   *  leaving makes no purchase decision. */
  bucket: BucketedAdd["bucket"] | null;
};

/** Split at the source, not in the component. The review page draws two columns
 *  and every consumer would otherwise filter on `direction` itself — which is
 *  one `in`/`out` split per surface and a chance for two of them to disagree. */
export type DraftRows = {
  state: DraftState;
  rows: { in: DraftRow[]; out: DraftRow[] };
};

/** The `from`/`to` pair behind an add. `BucketedAdd` carries `needed` and
 *  `shortfall` but not the pair, so read it off `addChanges` — the raw diff
 *  `bucketAdds` was given — rather than recomputing the diff. An oracle id that
 *  is not an add has no pair, and `0 → 0` is the honest answer for a caller
 *  that asked the wrong question. */
function findChange(state: DraftState, oracleId: string): { from: number; to: number } {
  const change = state.addChanges.find((c) => c.oracleId === oracleId);
  return { from: change?.from ?? 0, to: change?.to ?? 0 };
}

/**
 * Every changed card with the facts a row draws.
 *
 * Read from `cards` directly rather than through `getDeckDetail`: a removed card
 * is not in `deck_cards` any more, so the deck's own decklist cannot describe
 * it. `quantity` on each row is the DELTA, which is what the row's figure means
 * — `3 → 1` is one row that lost two copies, never a row for two copies.
 */
export async function loadDraftRows(deckId: string, userId: string): Promise<DraftRows> {
  const state = await loadDraftState(deckId, userId);
  const changed = [...state.adds, ...state.removes].map((c) => c.oracleId);
  if (changed.length === 0) return { state, rows: { in: [], out: [] } };

  const facts = await db.select({
    oracleId: cards.oracleId,
    name: cards.name,
    typeLine: cards.typeLine,
    oracleText: cards.oracleText,
    keywords: cards.keywords,
    manaCost: cards.manaCost,
    cmc: cards.cmc,
    imageUri: cards.imageUri,
    layout: cards.layout,
  }).from(cards).where(inArray(cards.oracleId, changed));

  const availability = await loadAvailability(userId, {
    oracleIds: changed, excludeDeckId: deckId,
  }).catch(() => null);
  const priced = await loadPrices(changed).catch(() => null);

  const built: DraftRow[] = [];
  for (const fact of facts) {
    const add = state.adds.find((a) => a.oracleId === fact.oracleId);
    const remove = state.removes.find((r) => r.oracleId === fact.oracleId);
    const change = add
      ? findChange(state, fact.oracleId)
      : { from: remove!.from, to: remove!.to };
    built.push({
      oracleId: fact.oracleId,
      name: fact.name,
      typeLine: fact.typeLine,
      cardTypeGroup: cardTypeGroup(fact.typeLine),
      role: primaryRole(fact),
      cmc: fact.cmc,
      // Whether the player has a copy at all, which is what the dot draws. The
      // availability map is driven by the collection, so absence is the answer.
      owned: availability?.has(fact.oracleId) ?? false,
      quantity: Math.abs(change.to - change.from),
      auto: false,
      availability: availability?.get(fact.oracleId) ?? null,
      price: priced?.prices.get(fact.oracleId) ?? null,
      manaCost: fact.manaCost,
      imageUri: fact.imageUri,
      // Null, both of them, and deliberately: a changed-card row names the card
      // the deck is gaining or losing, and there is no owned printing to resolve
      // for a card being bought. The shipped `printedNameOf` reads null as "use
      // the oracle name", which is the right rendering here.
      printedName: null,
      printedSetCode: null,
      printedCollectorNumber: null,
      layout: fact.layout,
      direction: add ? "in" : "out",
      from: change.from,
      to: change.to,
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
