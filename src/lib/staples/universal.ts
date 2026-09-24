/**
 * UNIVERSAL STAPLES: the cards nearly every Commander deck plays whatever it is doing (Hugh,
 * 2026-09-24). ONE definition, app-wide. The overview is its first reader, keeping them off its Key
 * cards; tuning and the swap tools are to import this module rather than restate the rule, so no
 * two surfaces disagree about which cards are "just staples".
 *
 * DERIVED, NEVER NAMED. A card is universal when it is a staple in at least three quarters of the
 * `format_staples` conditions: 12 of 16 when the table was measured (staging, 2026-09-24), which
 * named five cards, with the next two at 11. The share rather than a count, so a condition added
 * to the table moves the bar with it. No card name appears in code: the monthly index job
 * rewrites the table, and the set follows it.
 */
import { sql } from "drizzle-orm";

import { db } from "../../db";

/** The share of conditions a card must be a staple in to count as universal. */
export const UNIVERSAL_STAPLE_SHARE = 3 / 4;

/**
 * The universal staples in a table of (card, condition) staple rows. Pure. The bar is
 * `ceil(share × distinct conditions)`, so 16 conditions need 12. An empty table names none.
 */
export function universalStaples(rows: readonly { oracleId: string; condition: string }[]): Set<string> {
  const conditions = new Set(rows.map((r) => r.condition));
  if (conditions.size === 0) return new Set();
  const bar = Math.ceil(UNIVERSAL_STAPLE_SHARE * conditions.size);
  const seen = new Map<string, Set<string>>();
  for (const r of rows) {
    const set = seen.get(r.oracleId) ?? new Set<string>();
    set.add(r.condition);
    seen.set(r.oracleId, set);
  }
  return new Set([...seen].filter(([, c]) => c.size >= bar).map(([id]) => id));
}

type Reader = { execute: (q: ReturnType<typeof sql>) => Promise<{ rows: unknown[] }> };

/** The universal staples as the table holds them now: their oracle ids. */
export async function loadUniversalStaples(on: Reader = db as unknown as Reader): Promise<Set<string>> {
  const { rows } = await on.execute(sql`select distinct oracle_id as "oracleId", condition from format_staples`);
  return universalStaples(rows as { oracleId: string; condition: string }[]);
}
