import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));
const settled = vi.hoisted(() => [] as unknown[][]);
vi.mock("../model/allowance", () => ({ settleModelCall: async (...args: unknown[]) => { settled.push(args); } }));

import { REAPER_CUTOFF_MS, V2_REAPER_CUTOFF_MS } from "./limits";
import { reapableReaderRuns, reapIn } from "./reap-runs";
import type { Tx } from "./run-store";

const dialect = new PgDialect();

describe("reapableReaderRuns", () => {
  it("names this deck, this reader, pending runs past the cutoff of their own kind, and nothing else", () => {
    const now = new Date("2026-10-11T12:00:00Z");
    const q = dialect.sqlToQuery(reapableReaderRuns("deck", "me", now)!);
    expect(q.sql).toBe('("deck_suggestion_runs"."deck_id" = $1 and "deck_suggestion_runs"."user_id" = $2 and "deck_suggestion_runs"."status" = $3 and '
      + '(("deck_suggestion_runs"."requested_count" is null and "deck_suggestion_runs"."created_at" < $4) or '
      + '("deck_suggestion_runs"."requested_count" is not null and "deck_suggestion_runs"."created_at" < $5)))');
    expect(q.params.slice(0, 3)).toEqual(["deck", "me", "pending"]);
    // v10 and Proposed cuts keep five minutes; a v2 run is reaped only past the deck page's 600s limit.
    expect(new Date(q.params[3] as string).getTime()).toBe(now.getTime() - REAPER_CUTOFF_MS);
    expect(new Date(q.params[4] as string).getTime()).toBe(now.getTime() - V2_REAPER_CUTOFF_MS);
  });
});

describe("reapIn (plan P4)", () => {
  it("settles a v2 run with saved lines ok and refunded FIRST, then fails what is left, refunding each unit", async () => {
    const updates: { set: Record<string, unknown>; where: string }[] = [];
    const returned = [[{ id: "v2run", callId: "call_v2" }], [{ callId: "call_old" }]];
    const order: string[] = [];
    const tx = {
      execute: async (q: Parameters<PgDialect["sqlToQuery"]>[0]) => { order.push(dialect.sqlToQuery(q).sql); return { rows: [] }; },
      update: () => ({
        set: (set: Record<string, unknown>) => ({
          where: (where: Parameters<PgDialect["sqlToQuery"]>[0]) => ({
            returning: async () => {
              updates.push({ set, where: dialect.sqlToQuery(where).sql });
              order.push("update");
              return returned[updates.length - 1];
            },
          }),
        }),
      }),
    } as unknown as Tx;
    settled.length = 0;
    const now = new Date("2026-10-11T12:00:00Z");
    await reapIn(tx, reapableReaderRuns("deck", "me", now)!, now);
    // The run rows are locked `for update` before the settle reads their saved lines, as `persistV2` does.
    expect(order[0]).toMatch(/for update$/);
    expect(order[0]).toContain(`"deck_suggestion_runs"."requested_count" is not null`);
    expect(order.slice(1)).toEqual(["update", "update"]);
    expect(updates[0].set.status).toBe("ok");
    expect(updates[0].where).toContain(`"deck_suggestion_runs"."requested_count" is not null`);
    expect(updates[0].where).toContain(`exists (select 1 from "deck_suggestion_items" si where si.run_id = "deck_suggestion_runs".id)`);
    expect(updates[1].set).toEqual({ status: "failed", errorClass: "interrupted" });
    expect(settled.map((a) => [a[1], a[2], a[5]])).toEqual([["call_v2", "refunded", "reaped"], ["call_old", "refunded", "reaped"]]);
  });
});
