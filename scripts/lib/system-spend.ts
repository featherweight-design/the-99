import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { modelCalls } from "../../src/db/schema";

export type SystemFeature = "labels" | "prose";

export type SystemSpend = {
  feature: SystemFeature;
  model: string;
  /** The dollars the caller's own pricing module already measured. Rounded UP to a micro-dollar. */
  usd: number;
  /** Names the batch. The same key written twice is the same row, so a re-collect cannot double-count. */
  key?: string;
  tokens?: { input: number; output: number; cacheRead: number; cacheWrite: number };
};

/** `model_calls.user_id` is not null and a batch has no player. */
export const SYSTEM_USER_ID = "system";

/** A stable uuid for a batch key (sha256, with the version and variant bits a uuid carries). */
export function systemCallId(key: string): string {
  const h = createHash("sha256").update(key).digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const hex = h.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function systemSpendRow(s: SystemSpend, now: Date = new Date()): typeof modelCalls.$inferInsert {
  if (!(Number.isFinite(s.usd) && s.usd >= 0)) throw new Error(`system spend: usd must be a dollar amount, not ${s.usd}`);
  return {
    ...(s.key ? { id: systemCallId(s.key) } : {}),
    userId: SYSTEM_USER_ID,
    feature: s.feature,
    origin: "system",
    status: "spent",
    model: s.model,
    inputTokens: s.tokens?.input ?? null,
    outputTokens: s.tokens?.output ?? null,
    cacheReadTokens: s.tokens?.cacheRead ?? null,
    cacheWriteTokens: s.tokens?.cacheWrite ?? null,
    costMicroUsd: Math.ceil(s.usd * 1_000_000 - 1e-6),
    createdAt: now,
  };
}

/**
 * ONE summary row for a batch, written beside the script's own ledger. A keyed row that already
 * exists is replaced, not added to, so repeating a step moves no total. Never throws into the
 * caller's run: the batch already spent the money and wrote its own record, so a failure here is
 * reported and the run goes on.
 */
export async function recordSystemSpend(s: SystemSpend): Promise<void> {
  try {
    const { db } = await import("../../src/db");
    const row = systemSpendRow(s);
    await db.insert(modelCalls).values(row).onConflictDoUpdate({
      target: modelCalls.id,
      set: { costMicroUsd: sql`excluded.cost_micro_usd`, inputTokens: sql`excluded.input_tokens`,
        outputTokens: sql`excluded.output_tokens`, cacheReadTokens: sql`excluded.cache_read_tokens`,
        cacheWriteTokens: sql`excluded.cache_write_tokens` },
    });
    console.log(`model_calls: recorded $${s.usd.toFixed(4)} as system/${s.feature}`);
  } catch (err) {
    console.error(`model_calls: could not record the ${s.feature} spend (the script's own ledger still holds it) — ${String(err)}`);
  }
}
