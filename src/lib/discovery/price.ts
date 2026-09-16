import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { printingPrices, printings } from "../../db/schema";

export type PriceAggRow = {
  oracleId: string;
  /** Cheapest non-null `price_cents` among printings priced at the newest `as_of`. */
  liveCents: number | null;
  /** True when some printing has ever carried a non-null `price_cents`. */
  everPriced: boolean;
  /**
   * True when some printing sits at the newest `as_of`. Separate from
   * `liveCents` because the two disagree exactly in the case the states matrix
   * calls "live but priceless": the printing is in this run's feed but carries
   * no non-foil `price_cents`, which is not the same claim as a sold-out
   * printing whose last row is frozen at an older `as_of`.
   */
  live: boolean;
};

export type PriceSlot =
  | { kind: "priced"; cents: number }
  | { kind: "notStocked" }
  | { kind: "absent" };

/**
 * The six-row matrix in `STATES-price-and-empties.md`, as three outcomes.
 *
 * "Absent" means the slot is not rendered — no dot, no dash, no hairline, no
 * reserved height. A never-priced printing is not free and not unknown, and the
 * handoff's answer to "we have no figure" is to say nothing.
 *
 * Row 5 of that matrix — an owned commander, priced at nothing — has no case
 * here any more: discover lists only commanders the player does not own, so
 * there is no owned row left to reach it.
 */
export function slotFor(row: PriceAggRow | undefined): PriceSlot {
  if (!row) return { kind: "absent" };
  if (row.liveCents != null) return { kind: "priced", cents: row.liveCents };
  // Row 6 before row 3: a printing in this run's feed with no non-foil figure
  // has not sold out, so "not stocked" would be a false claim. Saying nothing
  // is the handoff's answer whenever there is no figure to print.
  if (row.live) return { kind: "absent" };
  return row.everPriced ? { kind: "notStocked" } : { kind: "absent" };
}

/**
 * `as_of` liveness is measured against the newest `as_of` in the WHOLE table,
 * not per printing: the ingest upserts and never deletes, so a sold-out
 * printing keeps its last row with a frozen `as_of`. That is the distinction
 * between "priced" and "not stocked", and it is the reason `everPriced` is a
 * separate column rather than an inference from a missing row.
 */
export async function loadPrices(oracleIds: string[]): Promise<Map<string, PriceAggRow>> {
  if (oracleIds.length === 0) return new Map();
  const newest = sql`(select max(${printingPrices.asOf}) from ${printingPrices})`;

  const rows = await db
    .select({
      oracleId: printings.oracleId,
      liveCents: sql<number | null>`min(${printingPrices.priceCents})
        filter (where ${printingPrices.asOf} = ${newest}
                  and ${printingPrices.priceCents} is not null)`.as("live_cents"),
      everPriced: sql<boolean>`bool_or(${printingPrices.priceCents} is not null)`
        .as("ever_priced"),
      live: sql<boolean>`bool_or(${printingPrices.asOf} = ${newest})`.as("live"),
    })
    .from(printings)
    .innerJoin(printingPrices, eq(printingPrices.scryfallId, printings.scryfallId))
    .where(inArray(printings.oracleId, oracleIds))
    .groupBy(printings.oracleId);

  // No `?? false` on `everPriced`: `bool_or` over a `is not null` predicate is
  // non-null for every group the join produced, and a coalesce here would
  // quietly absorb a real change in the query's shape.
  return new Map(rows.map((r) => [r.oracleId, r]));
}

/**
 * `loadPrices`, and whether it READ — never a silent empty map.
 *
 * A PRICE FAILURE MUST NOT BECOME A CACHED CLAIM. Both lanes assemble inside
 * `cacheForUser`, so a result computed from a failed read is stored for up to
 * the hour ceiling: an empty map makes every row draw `absent`, which this
 * module defines as a printing the feed has never carried. That is a statement
 * about the market, it stays wrong after prices recover, and nothing
 * distinguishes it from the truth. An earlier version of this wrapper returned
 * the bare map and argued the absence "makes no claim"; it does.
 *
 * So the read's status travels with it, and the surface omits the figure rather
 * than asserting absence — which is ruling D3 of the commander-row handoff, *a
 * figure with no reading is omitted, never zeroed*, applied to the reading
 * itself rather than to the value. Omitting needs no new drawn state: it is the
 * `Unpriced` state the row already has.
 *
 * Still soft rather than thrown, for round 1's reason: every row draws without a
 * price, so taking two whole routes down over the cheapest figure on them is the
 * wrong trade. What changes is that the lost read is now VISIBLE in the payload
 * instead of being indistinguishable from a sold-out card.
 */
export type PriceRead = {
  prices: Map<string, PriceAggRow>;
  /** False when the read failed. The surface omits every price figure rather
      than drawing `absent`, and a fresh payload after the hour ceiling — or
      after any write that drops the tag — reads prices again. */
  ok: boolean;
};

export async function readPrices(
  oracleIds: string[],
  /**
   * The read, injectable ONLY so the failure path can be tested.
   *
   * Not stylistic: a spy on this module's own export cannot intercept an
   * internal call, so `vi.spyOn(priceModule, "loadPrices")` left the real
   * database-backed read in place. The rejection case then passed because that
   * read threw on its own — green for a reason unrelated to the spy — and the
   * success case failed outright. The same binding is why `list-wiring.test.ts`
   * mocking `loadPrices` never reached this wrapper.
   */
  load: (ids: string[]) => Promise<Map<string, PriceAggRow>> = loadPrices,
): Promise<PriceRead> {
  try {
    return { prices: await load(oracleIds), ok: true };
  } catch {
    return { prices: new Map(), ok: false };
  }
}
