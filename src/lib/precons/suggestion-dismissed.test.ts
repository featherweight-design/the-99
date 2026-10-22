import { describe, expect, it } from "vitest";
import { db } from "../../db";
import { dismissSuggestionsWrite, suggestionDismissKey } from "./suggestion-dismissed";

describe("dismissSuggestionsWrite", () => {
  const { sql, params } = dismissSuggestionsWrite("user_1", ["d1:A"], db).toSQL();

  it("unions the keys into the reader's row", () => {
    expect(sql).toContain(
      `on conflict ("user_id") do update set "precon_suggestions_dismissed" = array(select distinct unnest("user_prefs"."precon_suggestions_dismissed" || excluded.precon_suggestions_dismissed))`,
    );
    expect(params).toContain("user_1");
  });

  it("updates only when it adds a key, so a repeat close moves no stamp", () => {
    expect(sql).toMatch(/ where not \(excluded\.precon_suggestions_dismissed <@ "user_prefs"\.precon_suggestions_dismissed\)$/);
  });
});

describe("suggestionDismissKey", () => {
  it("is per deck AND precon, so a different precon crossing the rule later can still suggest", () => {
    expect(suggestionDismissKey("d1", "A")).not.toBe(suggestionDismissKey("d1", "B"));
    expect(suggestionDismissKey("d1", "A")).not.toBe(suggestionDismissKey("d2", "A"));
  });
});
