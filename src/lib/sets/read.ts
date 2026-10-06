// The set-collection queries. These fetch rows and compute nothing: placement, counting
// and cost all live in completion.ts and cost.ts, where they are unit tested. This is the
// untested-query pattern browse.ts and set-filter.ts already follow.
//
// Everything returned here is JSON-safe — arrays and ISO strings, never a Map or a Date —
// because these payloads pass through `cacheForUser`, which stores them as JSON.
//
// EVERY comparison against `collection_items.set_code` is wrapped in `lower()`. Migration
// 0008 normalised the column, so this guards only rows written by a build older than that
// deploy — the same guard browse.ts applies, for the same reason.
//
// It does NOT need a functional index. Every one of these reads filters on `user_id` first,
// and that is the selective predicate: checked with EXPLAIN against a branch of production,
// the planner takes an index-only scan on the primary key's `user_id` prefix and applies
// `lower(set_code)` as a filter over that one reader's rows. An index on the expression was
// written, measured, and removed unused.

import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { cardArtPreferences, cards, collectionItems, printings, sets } from "../../db/schema";
import {
  orderWithSubsetsAfterParent, placeCells, sectionsOf,
  type ArtPick, type Holding, type SetPrinting,
} from "./completion";

/** The longest query worth scanning for. Matches the card search's own guard. */
const MAX_QUERY = 100;

/**
 * Set types with no base run to EVER publish — not a backlog state `baseSetSizeOf` will
 * fill in once the catalog catches up, a structural fact about the product. A masterpiece
 * bonus sheet (Edge of Eternities: Stellar Sights) is made entirely of variant printings;
 * a token or memorabilia sheet is not a Magic card at all. Gates the GRID alone: a reader
 * who holds one still gets a row on "Your sets" (Hugh's ruling — every held set gets a
 * row), with an owned count and no percent, and the grid page's existing "no set to
 * complete" page, which already handles that correctly.
 *
 * `art_series` is Scryfall's fourth such type; none exist in this catalog today, named
 * defensively rather than waiting for one to ship broken.
 */
const NO_BASE_RUN_SET_TYPES = ["token", "memorabilia", "art_series", "masterpiece"] as const;

/**
 * Set types a BLIND "Find any set" search should reach. Narrower than the grid gate on
 * purpose: nobody hunting for a set to complete wants 215 token sets or 99 memorabilia
 * products in the results, but a masterpiece bonus sheet is a real, findable product —
 * it lands on the same "no set to complete" page a direct link to one already does.
 */
const SEARCHABLE_SET_TYPES_EXCLUDED = ["token", "memorabilia", "art_series"] as const;

/** Whether `setType` has a base run worth gridding — see `NO_BASE_RUN_SET_TYPES`. */
export function hasGridableBaseRun(setType: string): boolean {
  return !(NO_BASE_RUN_SET_TYPES as readonly string[]).includes(setType);
}

export type SetIndexRow = {
  code: string;
  name: string;
  releasedAt: string | null;
  iconSvgUri: string | null;
  setType: string;
  /** Scryfall's own parent — see `orderWithSubsetsAfterParent`. Null for a standalone product. */
  parentSetCode: string | null;
  owned: number;
  baseSetSize: number | null;
  /** Extras owned and in total, counted apart from the headline exactly as the grid does. */
  extrasOwned: number;
  extrasTotal: number;
  /** Null when the set has not been indexed. Never 0 in that case. */
  percent: number | null;
  /**
   * True for a search result, whose completion was deliberately not computed — running
   * placement over every match would cost the whole catalogue. A row with no percentage
   * because nobody asked for one is NOT the same fact as a set whose catalog has not been
   * indexed, and the index must not announce the second when it means the first.
   */
  uncounted?: boolean;
};

/** A price for one printing, as JSON. `asOf` is parsed by the caller that renders it. */
export type PrintingPriceRow = {
  scryfallId: string;
  cents: number | null;
  foilCents: number | null;
  etchedCents: number | null;
  asOf: string;
};

export type SetGrid = {
  set: {
    code: string;
    name: string;
    iconSvgUri: string | null;
    setType: string;
    digital: boolean;
    releasedAt: string | null;
    baseSetSize: number | null;
  };
  printings: SetPrinting[];
  holdings: Holding[];
  picks: ArtPick[];
  prices: PrintingPriceRow[];
  newestAsOf: string | null;
  /**
   * Copies held from this set, summed over quantity. Only meaningful on the
   * non-collectible branch, which is the only place it is read; a collectible grid
   * returns 0 rather than paying for a count it does not show.
   */
  heldCopies: number;
};

/**
 * The set's printings AND its denominator, in one statement.
 *
 * They have to share a snapshot. Read separately, a refresh running between them can hand
 * back one run's `base_set_size` beside another run's rows, and comparing the two counts
 * does not catch it — a refresh that preserves the number of booster rows passes while the
 * contents are mixed. One statement cannot straddle the refresh.
 */
function catalogFor(code: string) {
  return db
    .select({
      baseSetSize: sets.baseSetSize,
      scryfallId: printings.scryfallId,
      oracleId: printings.oracleId,
      collectorNumber: printings.collectorNumber,
      name: cards.name,
      imageUriSmall: printings.imageUriSmall,
      imageUri: printings.imageUri,
      // Both faces travel together or the modal draws one printing's front against
      // another's back — see `SetPrinting.backImageUri`.
      backImageUri: printings.backImageUri,
      colorIdentity: cards.colorIdentity,
      rarity: printings.rarity,
      booster: printings.booster,
      isVariant: printings.isVariant,
    })
    .from(printings)
    .innerJoin(cards, eq(cards.oracleId, printings.oracleId))
    .innerJoin(sets, eq(sets.code, printings.setCode))
    .where(eq(printings.setCode, code));
}

/** Total copies held from one set — a SUM of quantities, not a count of rows. */
async function heldCopies(userId: string, code: string): Promise<number> {
  const [row] = await db
    .select({ copies: sql<number>`coalesce(sum(${collectionItems.quantity}), 0)::int` })
    .from(collectionItems)
    .where(and(
      eq(collectionItems.userId, userId),
      // set_code is stored lowercase on both sides since 0008; lower() keeps a row written
      // by an older build from reading as a card you do not own. browse.ts does the same.
      eq(sql`lower(${collectionItems.setCode})`, code),
    ));
  return row?.copies ?? 0;
}

/** The reader's chosen printings within one set, which decide where a fill lands. */
function picksFor(userId: string, code: string) {
  return db
    .select({
      oracleId: cardArtPreferences.oracleId,
      collectorNumber: cardArtPreferences.collectorNumber,
    })
    .from(cardArtPreferences)
    .where(and(
      eq(cardArtPreferences.userId, userId),
      eq(sql`lower(${cardArtPreferences.setCode})`, code),
    ));
}

function holdingsFor(userId: string, code: string) {
  return db
    .select({
      oracleId: collectionItems.oracleId,
      collectorNumber: collectionItems.collectorNumber,
      finish: collectionItems.finish,
    })
    .from(collectionItems)
    .where(and(
      eq(collectionItems.userId, userId),
      // Lowercased for the same reason as everywhere else in this file: a row written
      // before 0008 carries an uppercase set_code and would read as a card you do not own.
      eq(sql`lower(${collectionItems.setCode})`, code),
    ));
}

/**
 * The sets a reader holds cards from, each with a real completion figure.
 *
 * The owned count is NOT a count over `collection_items`. Foil and nonfoil rows collapse
 * to one cell, and rows with no collector number need the same `oracle_id` resolution the
 * grid uses — so this runs `placeCells`, the one placement rule in the feature, rather
 * than a second approximation of it.
 *
 * Ordered newest first with **nulls last**: `released_at` is nullable and Postgres sorts
 * nulls first under `desc`, which would put undated sets at the head of the list.
 * `set-filter.ts` already orders this way. Then a subset is moved to sit directly after its
 * held parent (Hugh's ruling, the friend-reported gap: Edge of Eternities: Stellar Sights
 * was missing entirely, not merely out of order) — see `orderWithSubsetsAfterParent`.
 *
 * NO set-type filter. Hugh's ruling: every set the reader holds cards in gets a row, full
 * stop — a promo, a token sheet, a masterpiece bonus sheet included. Only `digital` is
 * excluded, because a digital product's printings are never ingested (`seed-printings.ts`
 * skips them), so it has nothing a row here could ever show. What differs by type is
 * whether the row carries a PERCENT: `sectionsOf`'s `baseSetSize === null` branch already
 * reports an owned count with no ratio for a set with no base run to divide by.
 */
export async function loadOwnedSets(userId: string): Promise<SetIndexRow[]> {
  const heldRows = await db
    .select({
      code: sets.code,
      name: sets.name,
      releasedAt: sets.releasedAt,
      iconSvgUri: sets.iconSvgUri,
      setType: sets.setType,
      parentSetCode: sets.parentSetCode,
      baseSetSize: sets.baseSetSize,
    })
    .from(collectionItems)
    .innerJoin(sets, eq(sets.code, sql`lower(${collectionItems.setCode})`))
    .where(and(
      eq(collectionItems.userId, userId),
      eq(sets.digital, false),
    ))
    .groupBy(
      sets.code, sets.name, sets.releasedAt, sets.iconSvgUri, sets.setType,
      sets.parentSetCode, sets.baseSetSize,
    )
    .orderBy(sql`${sets.releasedAt} desc nulls last`, sets.code);

  if (heldRows.length === 0) return [];
  const held = orderWithSubsetsAfterParent(heldRows);
  const codes = held.map((s) => s.code);

  // Three queries for the whole index, not three per set: a reader with 34 held sets would
  // otherwise cost a hundred round trips and re-read the same ~13k catalog rows a set at a
  // time. Picks ride along because the grid places with them, and an index that placed
  // without them would report a different completion for the same set.
  const [catalog, holdings, picks] = await Promise.all([
    db
      .select({
        // The denominator rides with the ROWS, not with the metadata read above: the two
        // are separate statements, and a refresh between them can pair one run's
        // base_set_size with another run's booster flags. The grid path takes it from its
        // own join for the same reason.
        baseSetSize: sets.baseSetSize,
        setCode: printings.setCode,
        scryfallId: printings.scryfallId,
        oracleId: printings.oracleId,
        collectorNumber: printings.collectorNumber,
        name: cards.name,
        imageUriSmall: printings.imageUriSmall,
        colorIdentity: cards.colorIdentity,
        rarity: printings.rarity,
        booster: printings.booster,
        isVariant: printings.isVariant,
      })
      .from(printings)
      .innerJoin(cards, eq(cards.oracleId, printings.oracleId))
      .innerJoin(sets, eq(sets.code, printings.setCode))
      .where(inArray(printings.setCode, codes)),
    db
      .select({
        setCode: sql<string>`lower(${collectionItems.setCode})`.as("set_code"),
        oracleId: collectionItems.oracleId,
        collectorNumber: collectionItems.collectorNumber,
        finish: collectionItems.finish,
      })
      .from(collectionItems)
      .where(and(
        eq(collectionItems.userId, userId),
        inArray(sql`lower(${collectionItems.setCode})`, codes),
      )),
    db
      .select({
        setCode: sql<string>`lower(${cardArtPreferences.setCode})`.as("set_code"),
        oracleId: cardArtPreferences.oracleId,
        collectorNumber: cardArtPreferences.collectorNumber,
      })
      .from(cardArtPreferences)
      .where(and(
        eq(cardArtPreferences.userId, userId),
        inArray(sql`lower(${cardArtPreferences.setCode})`, codes),
      )),
  ]);

  const groupBySet = <T extends { setCode: string }>(rows: T[]) => {
    const byCode = new Map<string, T[]>();
    for (const r of rows) {
      const list = byCode.get(r.setCode);
      if (list) list.push(r); else byCode.set(r.setCode, [r]);
    }
    return byCode;
  };
  const catalogByCode = groupBySet(catalog);
  const holdingsByCode = groupBySet(holdings);
  const picksByCode = groupBySet(picks);

  return held.map((s) => {
    const rows = (catalogByCode.get(s.code) ?? []) as unknown as SetPrinting[];
    const mine = (holdingsByCode.get(s.code) ?? []) as unknown as Holding[];
    const picked = (picksByCode.get(s.code) ?? []) as unknown as ArtPick[];
    // The denominator comes from the CATALOG rows, which carry it on the join, and never
    // from the metadata query above: those are two statements, and a refresh between them
    // can pair one run's base_set_size with another run's booster flags.
    //
    // It is also authoritative when null, which means NO DENOMINATOR IS CURRENTLY PUBLISHED
    // — not that none ever was. A set whose printings stop being classified goes back to
    // null on the next successful run, and a half-finished refresh leaves the previous
    // denominator standing (#704). Recomputing one here from partially rewritten rows would
    // replace either state with a figure nobody published. The owned
    // count is still honest either way — it says what you hold, not what fraction of what.
    const snapshotSize = rows.length > 0
      ? ((rows[0] as unknown as { baseSetSize: number | null }).baseSetSize ?? null)
      : null;
    const counted = sectionsOf(placeCells(rows, mine, picked), snapshotSize);
    return {
      ...s,
      owned: counted.baseOwned,
      extrasOwned: counted.extrasOwned,
      extrasTotal: counted.extrasTotal,
      baseSetSize: snapshotSize,
      percent: snapshotSize === null ? null : counted.percent,
    };
  });
}

/**
 * Any set browsable by name or code, held or not, so a set can be opened at 0%. Carries no
 * owned count: the reader is looking for a set, not reading a figure, and costing every
 * result would run the placement rule over the whole catalogue.
 *
 * `SEARCHABLE_SET_TYPES_EXCLUDED`, not `NO_BASE_RUN_SET_TYPES`: a masterpiece bonus sheet
 * is still findable here, landing on the same "no set to complete" page a direct link
 * already does. A token or memorabilia sheet nobody is browsing to complete is excluded
 * from a BLIND search only — a reader who holds one still gets it on "Your sets".
 */
export async function searchSets(query: string): Promise<SetIndexRow[]> {
  const q = query.trim();
  if (q === "") return [];
  // Bounded like the card search, which rejects over 100 characters: this is reachable
  // from the client with an arbitrary string, and every one of them becomes a
  // leading-wildcard scan no index can serve.
  if (q.length > MAX_QUERY) return [];
  // Escaped, because `%` and `_` are LIKE wildcards: unescaped, a search for "%" matched
  // every set in the catalogue and "_" matched any character rather than an underscore.
  const escaped = q.toLowerCase().replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const like = `%${escaped}%`;

  const rows = await db
    .select({
      code: sets.code,
      name: sets.name,
      releasedAt: sets.releasedAt,
      iconSvgUri: sets.iconSvgUri,
      setType: sets.setType,
      parentSetCode: sets.parentSetCode,
      baseSetSize: sets.baseSetSize,
    })
    .from(sets)
    .where(and(
      eq(sets.digital, false),
      notInArray(sets.setType, [...SEARCHABLE_SET_TYPES_EXCLUDED]),
      sql`(lower(${sets.name}) like ${like} escape '\\' or lower(${sets.code}) like ${like} escape '\\')`,
    ))
    .orderBy(sql`${sets.releasedAt} desc nulls last`, sets.code);
    // Uncapped. The contract is that search reaches any browsable set, and a silent
    // ceiling contradicted it: a one-letter query could match more than the cap and the
    // result line would report the truncation as the answer. The predicates above already
    // bound this to a few hundred rows of name and code.

  return rows.map((s) => ({
    ...s, owned: 0, extrasOwned: 0, extrasTotal: 0, percent: null, uncounted: true,
  }));
}

/**
 * Prices for every printing in one set, keyed by printing rather than by oracle card:
 * a cell IS a printing, so the deck-side oracle-keyed read cannot answer this.
 *
 * One statement, for the reason price-query.ts documents at length — `newestAsOf` and the
 * rows must share a snapshot, or an ingest committing between two statements makes every
 * card on the page read as sold out at once. Liveness is deliberately NOT filtered here;
 * `priceState` decides it, and a stale row reaching the caller is what sold out means.
 */
async function loadSetPrices(code: string): Promise<{
  prices: PrintingPriceRow[];
  newestAsOf: string | null;
}> {
  const result = await db.execute(sql`
    with newest as (select max(as_of) as as_of from printing_prices)
    select n.as_of::text                    as newest_as_of,
           pp.scryfall_id                   as scryfall_id,
           pp.price_cents                   as cents,
           pp.price_cents_foil              as foil_cents,
           pp.price_cents_etched            as etched_cents,
           pp.as_of::text                   as as_of
      from newest n
      left join printings p on p.set_code = ${code}
      left join printing_prices pp on pp.scryfall_id = p.scryfall_id
  `);

  const rows = result.rows as Array<{
    newest_as_of: string | null;
    scryfall_id: string | null;
    cents: number | null;
    foil_cents: number | null;
    etched_cents: number | null;
    as_of: string | null;
  }>;

  const newestAsOf = rows[0]?.newest_as_of ?? null;
  const prices: PrintingPriceRow[] = [];
  for (const r of rows) {
    if (!r.scryfall_id || !r.as_of) continue;
    prices.push({
      scryfallId: r.scryfall_id,
      cents: r.cents,
      foilCents: r.foil_cents,
      etchedCents: r.etched_cents,
      asOf: r.as_of,
    });
  }
  return { prices, newestAsOf };
}

/**
 * What the reader owns in one set: holdings and picks, and nothing else.
 *
 * The delta strip polls this on every window focus, so it reads exactly what the
 * fingerprint is built from. It used to pull the catalogue too — every printing in the set
 * joined to `cards` — for a value that has not depended on the catalogue since the
 * fingerprint stopped being derived from placed cells.
 */
export async function loadOwnershipInSet(userId: string, code: string): Promise<{
  holdings: Holding[];
  picks: ArtPick[];
} | null> {
  const lower = code.toLowerCase();
  const [meta] = await db.select({ code: sets.code }).from(sets)
    .where(eq(sets.code, lower)).limit(1);
  if (!meta) return null;
  const [holdings, picks] = await Promise.all([
    holdingsFor(userId, lower),
    picksFor(userId, lower),
  ]);
  return { holdings: holdings as Holding[], picks: picks as ArtPick[] };
}

/** Everything one set page needs. Null when no such set exists. */
export async function loadSetGrid(userId: string, code: string): Promise<SetGrid | null> {
  const lower = code.toLowerCase();
  const [meta] = await db
    .select({
      code: sets.code,
      name: sets.name,
      iconSvgUri: sets.iconSvgUri,
      setType: sets.setType,
      digital: sets.digital,
      releasedAt: sets.releasedAt,
      baseSetSize: sets.baseSetSize,
    })
    .from(sets)
    .where(eq(sets.code, lower))
    .limit(1);
  if (!meta) return null;

  // Gridability is decided BEFORE the expensive half. A direct link to a digital product
  // or a type with no base run to ever publish is answered by the metadata alone; loading
  // every printing and the price join first only to discard them is work nobody reads.
  const gridable = !meta.digital && hasGridableBaseRun(meta.setType);
  if (!gridable) {
    return {
      set: meta,
      printings: [],
      holdings: [],
      picks: [],
      prices: [],
      newestAsOf: null,
      heldCopies: await heldCopies(userId, lower),
    };
  }

  // No heldCopies here: only the non-collectible branch reads it, and that branch has
  // already returned above. Running it for every grid scanned the reader's collection a
  // second time for a number this page never shows.
  const [catalog, holdings, priced, picks] = await Promise.all([
    catalogFor(lower),
    holdingsFor(userId, lower),
    // NOT caught. Swallowing a failed price read into an empty result was worse than the
    // error it avoided: `price === null` means "never stocked" to both the cell and the
    // cost figure, so a transient outage would tell every reader that nothing in the set
    // has ever been carried — and `cacheForUser` would remember that for an hour. An
    // error page is loud, wrong for one request, and recovers on the next.
    loadSetPrices(lower),
    picksFor(userId, lower),
  ]);

  return {
    // The denominator comes from the CATALOG query, not from the metadata read above: the
    // two are separate statements and only the joined one shares a snapshot with the rows
    // it is a denominator for.
    // No `?? meta.baseSetSize`: falling back to the separately-read value reintroduces
    // exactly the pairing this join exists to prevent. An empty catalog has no denominator
    // to report, and null is the honest answer.
    set: { ...meta, baseSetSize: catalog[0]?.baseSetSize ?? null },
    printings: catalog as SetPrinting[],
    holdings: holdings as Holding[],
    picks: picks as ArtPick[],
    prices: priced.prices,
    newestAsOf: priced.newestAsOf,
    heldCopies: 0,
  };
}
