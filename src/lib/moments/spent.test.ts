import { describe, expect, it } from "vitest";
import { db } from "../../db";
import { spendMomentWrite } from "./spent";

describe("spendMomentWrite", () => {
  const { sql, params } = spendMomentWrite("user_1", "top-off", db).toSQL();

  it("unions the id into the reader's row, once", () => {
    expect(sql).toContain(
      `on conflict ("user_id") do update set "moments_spent" = array(select distinct unnest("user_prefs"."moments_spent" || excluded.moments_spent))`,
    );
    expect(params).toContain("user_1");
  });

  it("updates only when it adds the id, so a repeat spend moves no stamp", () => {
    expect(sql).toMatch(/ where not \(excluded\.moments_spent <@ "user_prefs"\.moments_spent\)$/);
  });
});
