import { describe, expect, it } from "vitest";
import { db } from "../../db";
import { markInstalledWrite } from "./installed";

describe("markInstalledWrite", () => {
  const { sql, params } = markInstalledWrite("user_1", db).toSQL();

  it("stamps the reader's row with the time of the first launch", () => {
    expect(sql).toContain(`on conflict ("user_id") do update set "installed_at" = now()`);
    expect(params).toContain("user_1");
  });

  it("updates only while the stamp is null, so a later launch moves no stamp and fires no touch trigger", () => {
    expect(sql).toMatch(/ where "user_prefs"\."installed_at" is null$/);
  });
});
