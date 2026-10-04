import { describe, expect, it } from "vitest";

import { tuningResponseSchema } from "./response-schema";

const ok = {
  suggestions: [{
    add: "Cultivate", cut: "Wastes",
    rationale: "Mana was marked as hurting in 3 of 5 games.",
    rationaleShort: "Mana hurt in 3 of 5",
    evidence: [{ kind: "games", value: "Mana: 3 of 5 games" }],
  }],
};
const one = ok.suggestions[0];

describe("tuningResponseSchema", () => {
  it("accepts a well-formed reply, and an empty one", () => {
    expect(tuningResponseSchema.safeParse(ok).success).toBe(true);
    expect(tuningResponseSchema.safeParse({ suggestions: [] }).success).toBe(true);
  });

  it("takes up to eight suggestions (ASK_SUGGESTIONS) and rejects a ninth", () => {
    const eight = new Array(8).fill(one);
    expect(tuningResponseSchema.safeParse({ suggestions: eight }).success).toBe(true);
    expect(tuningResponseSchema.safeParse({ suggestions: [...eight, one] }).success).toBe(false);
  });

  it("rejects a suggestion with no evidence", () => {
    expect(tuningResponseSchema.safeParse({ suggestions: [{ ...one, evidence: [] }] }).success).toBe(false);
  });

  it("requires a cut: every suggestion is one out and one in", () => {
    expect(tuningResponseSchema.safeParse({ suggestions: [{ ...one, cut: null }] }).success).toBe(false);
    const noCut: Record<string, unknown> = { ...one };
    delete noCut.cut;
    expect(tuningResponseSchema.safeParse({ suggestions: [noCut] }).success).toBe(false);
  });

  it("caps the short rationale", () => {
    expect(tuningResponseSchema.safeParse({ suggestions: [{ ...one, rationaleShort: "x".repeat(81) }] }).success).toBe(false);
  });

  it("rejects a citation of a source the run never read", () => {
    expect(tuningResponseSchema.safeParse({ suggestions: [{ ...one, evidence: [{ kind: "price", value: "$2" }] }] }).success).toBe(false);
  });
});
