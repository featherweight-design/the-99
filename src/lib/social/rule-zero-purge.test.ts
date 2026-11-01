// The account purge takes a closer's id out of Rule 0 as it takes a setter's: `closed_by` is a user id, so a table the
// account set or closed is locked and deleted with it. The transaction is faked; the SQL it is handed is what is asserted.
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { purgeRuleZeroIn } from "./rule-zero";

const dialect = new PgDialect();

describe("purgeRuleZeroIn", () => {
  it("locks and deletes every table the account set or closed", async () => {
    const executed: string[] = [];
    const deleted: string[] = [];
    const tx = {
      execute: async (q: Parameters<PgDialect["sqlToQuery"]>[0]) => {
        executed.push(dialect.sqlToQuery(q).sql);
        return { rows: [] };
      },
      delete: () => ({
        where: (c: Parameters<PgDialect["sqlToQuery"]>[0]) => {
          deleted.push(dialect.sqlToQuery(c).sql);
          return { returning: async () => [] };
        },
      }),
    };
    await purgeRuleZeroIn(tx as never, "user_gone");
    expect(executed[0]).toContain("t.closed_by = ");
    expect(deleted.some((d) => d.includes('"closed_by" = $') && d.includes('"set_by" = $'))).toBe(true);
  });
});
