import { describe, expect, it } from "vitest";
import { db } from "../../db";
import { markChooseIntroSeenWrite } from "./intro-seen";

describe("markChooseIntroSeenWrite", () => {
  const { sql, params } = markChooseIntroSeenWrite("user_1", db).toSQL();

  it("stamps the reader's row with the time of the mark", () => {
    expect(sql).toContain(`on conflict ("user_id") do update set "choose_intro_seen_at" = now()`);
    expect(params).toContain("user_1");
  });

  it("updates only while the mark is null, so a later submit moves no stamp", () => {
    expect(sql).toMatch(/ where "user_prefs"\."choose_intro_seen_at" is null returning /);
  });

  it("returns a row only from the write that set the mark", () => {
    expect(sql).toMatch(/ returning "choose_intro_seen_at"$/);
  });
});
