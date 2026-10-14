import { describe, it, expect } from "vitest";
import { issueInspectorCopy } from "./issue-inspector";

// The mock only draws the plural, three-row case. A one-row import is reachable
// and must not read "1 rows"; a four-figure one must not read "1418".
describe("issueInspectorCopy.entry", () => {
  it("pins the Surfaces v2 body, repunctuated", () => {
    expect(issueInspectorCopy.entry.body(3)).toBe(
      "3 rows were skipped: quantity columns, mostly. Nothing fatal. Want to see the carnage?",
    );
  });

  it("uses singular forms for a one-row import", () => {
    expect(issueInspectorCopy.entry.body(1)).toContain("1 row was skipped");
    expect(issueInspectorCopy.entry.cta(1)).toBe("View 1 issue");
  });

  it("groups thousands in both the body and the CTA", () => {
    expect(issueInspectorCopy.entry.body(1418)).toContain("1,418 rows");
    expect(issueInspectorCopy.entry.cta(1418)).toBe("View 1,418 issues");
  });
});
