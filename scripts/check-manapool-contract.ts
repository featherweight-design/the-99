/**
 * Canary for ManaPool's price-feed contract. Touches no database and needs no secrets.
 *
 * `/prices/singles` is a documented endpoint of the Mana Pool Public API, but its own docs
 * warn the v1 API "is still in active development and is subject to change without notice."
 * The ingest runs weekly, so a silent shape change would otherwise sit unnoticed for days.
 * Same reasoning as check-scryfall-contract.ts, which this mirrors.
 */
import { fetchManapoolSingles } from "../src/lib/manapool/client";
import { parseManapoolPayload } from "../src/lib/manapool/parse";

const REQUIRED = ["scryfall_id", "available_quantity", "price_cents", "url"] as const;

async function main(): Promise<void> {
  const raw = await fetchManapoolSingles();
  const payload = raw as { meta?: { as_of?: unknown }; data?: unknown[] };

  const problems: string[] = [];
  if (typeof payload?.meta?.as_of !== "string") problems.push("meta.as_of is not a string");
  if (!Array.isArray(payload?.data)) {
    problems.push("data is not an array");
  } else {
    const first = payload.data[0];
    if (first === undefined) {
      problems.push("data is empty");
    } else if (typeof first !== "object" || first === null) {
      // `in` throws a TypeError on a primitive, which would crash the canary
      // instead of reporting the contract break that caused it.
      problems.push(`first entry is ${first === null ? "null" : typeof first}, not an object`);
    } else {
      // `in`, not truthiness: price_cents is legitimately null on 13% of rows,
      // so a truthy check would fire on healthy data.
      for (const key of REQUIRED) {
        if (!(key in first)) problems.push(`first entry is missing ${key}`);
      }
    }
  }

  // The parser is the real contract: a feed we can fetch but not parse is
  // just as broken as one we cannot fetch.
  const feed = parseManapoolPayload(raw);
  if (feed.rows.length === 0) problems.push("parser produced zero rows");

  // The parser refuses a fractional price rather than rounding it, so a cents
  // field that quietly became dollars would drain every price to null while
  // still yielding rows — a break the row count alone cannot see. Sampling the
  // whole feed is cheap here because it is already parsed and in memory.
  if (feed.rows.length > 0) {
    const priced = feed.rows.filter((r) => r.priceCents !== null).length;
    const pricedRatio = priced / feed.rows.length;
    if (pricedRatio < 0.5) {
      problems.push(
        `only ${(pricedRatio * 100).toFixed(1)}% of rows carry a non-foil price, ` +
        `against roughly 87% observed on 2026-08-29 — price_cents may have changed units or type`,
      );
    }
  }

  // The dedup rule assumes the duplicate scryfall_ids are product-form variants
  // (foil/etched/condition) of one printing. On 2026-08-29 that was 2,879 surplus
  // rows out of 102,587 entries — 2.8%. A jump outside this band means the
  // duplicates are something else, and collapsing them by lowest price would be
  // silently wrong rather than loudly broken.
  const total = feed.rows.length + feed.collapsedDuplicates;
  const surplusRatio = total === 0 ? 0 : feed.collapsedDuplicates / total;
  if (surplusRatio < 0.005 || surplusRatio > 0.1) {
    problems.push(
      `scryfall_id duplication is ${(surplusRatio * 100).toFixed(2)}% of entries, ` +
      `outside the observed 0.5%-10% band (2.8% on 2026-08-29)`,
    );
  }

  if (problems.length > 0) {
    console.error("ManaPool contract check FAILED:");
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(
    `ManaPool contract OK — ${feed.rows.length} rows as of ${feed.asOf.toISOString()} ` +
    `(${feed.collapsedDuplicates} surplus duplicate rows collapsed).`,
  );
}

main().catch((err) => { console.error(err); process.exit(1); });
