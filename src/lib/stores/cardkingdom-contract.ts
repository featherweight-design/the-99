import { parseCardKingdomPricelist } from "./cardkingdom";

const REQUIRED = ["scryfall_id", "price_retail", "qty_retail", "is_foil", "variation", "url"] as const;

/** Every problem the payload shows, for `main` to report. Here, not in the script, so the failure path is unit-tested. */
export function cardKingdomContractProblems(raw: unknown): string[] {
  const problems: string[] = [];
  const payload = raw as { meta?: { created_at?: unknown; base_url?: unknown }; data?: unknown[] } | null;
  if (typeof payload?.meta?.created_at !== "string") problems.push("meta.created_at is not a string");
  if (typeof payload?.meta?.base_url !== "string") problems.push("meta.base_url is not a string");
  if (!Array.isArray(payload?.data)) return [...problems, "data is not an array"];
  const first = payload.data[0];
  if (first === undefined) return [...problems, "data is empty"];
  if (typeof first !== "object" || first === null) return [...problems, "first entry is not an object"];
  for (const key of REQUIRED) {
    if (!(key in first)) problems.push(`first entry is missing ${key}`);
  }
  if (problems.length > 0) return problems;

  // The parser is the real contract: a feed we can fetch but not parse is as broken as one we cannot fetch.
  let feed;
  try {
    feed = parseCardKingdomPricelist(raw);
  } catch (error) {
    return [`parser refused the payload: ${error instanceof Error ? error.message : String(error)}`];
  }
  const total = payload.data.length;
  // On 2026-11-22, 612 of 154,942 rows (0.4%) had no Scryfall id and every price parsed. A skip share far above that
  // means a field changed type or units (dollars to cents, a number where a string was), which drains rows silently.
  const skippedRatio = feed.skipped / total;
  if (skippedRatio > 0.05) {
    problems.push(`${(skippedRatio * 100).toFixed(1)}% of rows were unusable, against 0.4% on 2026-11-22`);
  }
  if (feed.rows.length < 50_000) {
    problems.push(`only ${feed.rows.length} printings parsed, against about 100,000 on 2026-11-22`);
  }
  return problems;
}
