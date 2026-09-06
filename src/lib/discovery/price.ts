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
 * reserved height. A never-priced printing is not free and not unknown; the
 * handoff's answer to "we have no figure" is to say nothing, and an owned
 * commander is not something the player is being priced on at all.
 */
export function slotFor(row: PriceAggRow | undefined, ownedCommander: boolean): PriceSlot {
  if (ownedCommander) return { kind: "absent" };
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
