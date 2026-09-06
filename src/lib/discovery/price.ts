import { inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { printingPrices, printings } from "../../db/schema";

export type PriceAggRow = {
  oracleId: string;
  /** Cheapest non-null `price_cents` among printings priced at the newest `as_of`. */
  liveCents: number | null;
  /** True when some printing has ever carried a non-null `price_cents`. */
  everPriced: boolean;
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
    })
    .from(printings)
    .innerJoin(printingPrices, sql`${printingPrices.scryfallId} = ${printings.scryfallId}`)
    .where(inArray(printings.oracleId, oracleIds))
    .groupBy(printings.oracleId);

  return new Map(rows.map((r) => [r.oracleId, { ...r, everPriced: r.everPriced ?? false }]));
}
