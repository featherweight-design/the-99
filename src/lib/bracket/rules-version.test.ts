import { describe, expect, it } from "vitest";

import { BRACKET_RULES_VERSION, RULES_CHANGES } from "./rules-version";

// A bump without its words would ship a rules notice with nothing to say, so the deploy refuses it
// (`recordRulesVersion`); this is the check that stops the bump reaching a deploy at all.
describe("the bracket rules version", () => {
  it("has words for every version above 1", () => {
    for (let v = 2; v <= BRACKET_RULES_VERSION; v++) {
      expect(RULES_CHANGES[v]?.rule, `RULES_CHANGES[${v}].rule`).toBeTruthy();
      expect(RULES_CHANGES[v]?.reads, `RULES_CHANGES[${v}].reads`).toBeTruthy();
    }
  });
});
