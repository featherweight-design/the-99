import { parseCardKingdomPricelist } from "./cardkingdom";

const REQUIRED = ["scryfall_id", "price_retail", "qty_retail", "is_foil", "variation", "url"] as const;

/** Every problem the payload shows, for `main` to report. Here, not in the script, so the failure path is unit-tested. */
export function cardKingdomContractProblems(raw: unknown): string[] {
  const problems: string[] = [];
  const payload = raw as { meta?: { created_at?: unknown; base_url?: unknown }; data?: unknown[] } | null;
  if (typeof payload?.meta?.created_at !== "string") problems.push("meta.created_at is not a string");
  if (typeof payload?.meta?.base_url !== "string") problems.push("meta.base_url is not a string");
  if (!Array.isArray(payload?.data)) return [...problems, "data is not an array"];
  if (payload.data.length === 0) return [...problems, "data is empty"];
  // Across every entry, not the first alone: one odd first SKU must not fail the check, and a field that went missing
  // from a fifth of the feed must not pass it. A key may hold null (612 ids were null on 2026-11-22); it must exist.
  const entries = payload.data.length;
  for (const key of REQUIRED) {
    const missing = payload.data.filter((e) => typeof e !== "object" || e === null || !(key in e)).length;
    if (missing / entries > 0.05) problems.push(`${key} is missing from ${missing} of ${entries} entries`);
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
