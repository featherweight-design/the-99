// A carried-over precon overview (`deck_synopses.precon_file` set) holds NO allowance unit: its
// `model_call_id` is null and no `model_calls` row is written for it. Every figure that counts
// model calls is kept off it by that alone, as long as each one reads `model_calls`, and the one
// that starts from `deck_synopses` reaches calls through an INNER join. These pin both halves from
// the emitted SQL, so a left join or a count over `deck_synopses` fails here, without a database.
// `pnpm probe:precon-overview-ledger` proves the figures themselves on a scratch branch.
import { describe, expect, it } from "vitest";
import { db } from "../../db";
import { callRowsQuery, dayRowsQuery, monthFiguresQuery, partRowsQuery } from "../admin/costs";
import { freeRunsFor } from "./method-notice";

/** Runs a reader against a stand-in that records the SQL it would send and answers no rows. */
async function emittedBy(run: (q: Pick<typeof db, "select">) => Promise<unknown>): Promise<string> {
  let sent = "";
  const wrap = (b: object): unknown => new Proxy(b, {
    get(target, key, receiver) {
      if (key === "then") {
        sent = (target as { toSQL(): { sql: string } }).toSQL().sql;
        return (resolve: (rows: unknown[]) => void) => resolve([]);
      }
      const v = Reflect.get(target, key, receiver);
      return typeof v === "function" ? (...a: unknown[]) => wrap(v.apply(target, a)) : v;
    },
  });
  await run({ select: ((...a: Parameters<typeof db.select>) => wrap(db.select(...a))) as typeof db.select });
  return sent;
}

describe("a carried-over overview is counted by nothing that counts model calls", () => {
  it("freeRunsFor reaches each run's call through an inner join, so a run with no call is not an attempt", async () => {
    const q = await emittedBy((q) => freeRunsFor(q, "00000000-0000-0000-0000-000000000000"));
    expect(q).toMatch(/inner join "model_calls" on "model_calls"\."id" = "deck_synopses"\."model_call_id"/);
    expect(q).not.toMatch(/left join "model_calls"/);
  });

  it("the admin costs figures read model_calls, never deck_synopses", () => {
    const now = new Date();
    for (const q of [dayRowsQuery(now, now), monthFiguresQuery(now, now, now, null), callRowsQuery(now, now), partRowsQuery(now, now)]) {
      const sql = q.toSQL().sql;
      expect(sql).toContain('"model_calls"');
      expect(sql).not.toContain("deck_synopses");
    }
  });
});
