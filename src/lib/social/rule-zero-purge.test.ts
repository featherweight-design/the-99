// The account purge takes a closer's id out of Rule 0 as it takes a setter's: `closed_by` is a user id, so a table the
// account set or closed is locked and deleted with it. The transaction is faked in order; each statement's SQL is asserted.
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { purgeRuleZeroIn } from "./rule-zero";

const dialect = new PgDialect();
type Q = Parameters<PgDialect["sqlToQuery"]>[0];

/** A tx whose deletes answer `returned` in call order: seats, seen marks, tables set/closed, then short tables. */
function fakeTx(returned: unknown[][]) {
  const executed: string[] = [];
  const deleted: string[] = [];
  const tx = {
    execute: async (q: Q) => {
      executed.push(dialect.sqlToQuery(q).sql.replace(/\s+/g, " "));
      return { rows: [] };
    },
    delete: () => ({
      where: (c: Q) => {
        deleted.push(dialect.sqlToQuery(c).sql);
        const rows = returned[deleted.length - 1] ?? [];
        return { returning: async () => rows };
      },
    }),
  };
  return { tx, executed, deleted };
}

describe("purgeRuleZeroIn", () => {
  it("locks and deletes every table the account set OR closed, in the same OR form", async () => {
    const { tx, executed, deleted } = fakeTx([[{ tableId: "t1" }], [], [{ id: "a" }, { id: "b" }], []]);
    await purgeRuleZeroIn(tx as never, "user_gone");
    expect(executed[0]).toMatch(/t\.set_by = \$\d+ or t\.closed_by = \$\d+ or t\.id in/);
    // The third delete (tables) is the set_by OR closed_by one; the seats and seen deletes name neither.
    expect(deleted[0]).not.toContain("closed_by");
    expect(deleted[1]).not.toContain("closed_by");
    expect(deleted[2]).toMatch(/"set_by" = \$\d+ or "closed_by" = \$\d+/);
  });

  it("also deletes a table the account's seat leaves with fewer than two seats, and counts both", async () => {
    const { tx, deleted } = fakeTx([[{ tableId: "t1" }, { tableId: "t1" }, { tableId: "t2" }], [], [{ id: "a" }], [{ id: "t2" }]]);
    const out = await purgeRuleZeroIn(tx as never, "user_gone");
    expect(deleted).toHaveLength(4);
    expect(deleted[3]).toContain("select count(*) from");
    expect(deleted[3]).toContain("rs.table_id =");
    expect(out).toEqual({ seats: 3, tables: 2 });
  });

  it("runs no short-table delete when the account held no seat", async () => {
    const { tx, deleted } = fakeTx([[], [], [{ id: "a" }]]);
    const out = await purgeRuleZeroIn(tx as never, "user_gone");
    expect(deleted).toHaveLength(3);
    expect(out).toEqual({ seats: 0, tables: 1 });
  });
});
