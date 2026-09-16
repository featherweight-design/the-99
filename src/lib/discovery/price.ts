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
 * `loadPrices`, but a failure costs the prices rather than the page.
 *
 * A PRICE IS THE ONE FIGURE ON THESE SURFACES THAT ALREADY HAS AN ABSENT STATE.
 * `PriceSlot`'s `absent` member exists because the feed omits out-of-stock
 * cards, so every row already knows how to draw without one — which makes a
 * rejected price read the cheapest thing on the page to lose and the most
 * expensive to fail on. Unguarded it takes `/commanders` and `/discover` down
 * whole, and both of them rank perfectly well with no prices at all.
 *
 * Deliberately NOT how the availability reads fail: those set an `availOk` flag,
 * because losing them removes a CLAIM the reader would otherwise believe (an
 * empty availability map counts every owned card as uncommitted).
 *
 * An empty price map reads as `absent`, which is `slotFor(undefined)` — the
 * state of a printing the feed has never carried. It is NOT `notStocked`, which
 * this module reserves for a printing that WAS priced and is missing from the
 * newest run: that one is a claim about the market, and a transient read failure
 * has no business making it. An earlier version of this comment called the
 * fallback "not stocked" and so conflated the two, which the states matrix above
 * already separates.
 *
 * `absent` makes no claim at all, which is why there is nothing for the surface
 * to announce and no flag to thread.
 */
export async function pricesOrEmpty(
  oracleIds: string[],
  /**
   * The read, injectable ONLY so the catch can be tested.
   *
   * Not stylistic: a spy on this module's own export cannot intercept an
   * internal call, so `vi.spyOn(priceModule, "loadPrices")` left the real
   * database-backed read in place. The rejection case then passed because that
   * read threw on its own — a test green for a reason that had nothing to do
   * with the spy — and the success case failed outright. The same binding is why
   * `list-wiring.test.ts` mocking `loadPrices` never reached this wrapper.
   */
  load: (ids: string[]) => Promise<Map<string, PriceAggRow>> = loadPrices,
): Promise<Map<string, PriceAggRow>> {
  try {
    return await load(oracleIds);
  } catch {
    return new Map();
  }
}
