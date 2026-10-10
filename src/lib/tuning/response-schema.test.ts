import { describe, expect, it } from "vitest";

import { tuningResponseSchema } from "./response-schema";

const one = {
  card: "Cultivate",
  rationale: "Mana was marked as hurting in 3 of 5 games.",
  rationaleShort: "Mana hurt in 3 of 5",
  evidence: [{ kind: "games", value: "Mana: 3 of 5 games" }],
};
const ok = { additions: [one], cuts: [{ ...one, card: "Wastes" }] };

describe("tuningResponseSchema", () => {
  it("accepts a well-formed reply, and an empty one", () => {
    expect(tuningResponseSchema.safeParse(ok).success).toBe(true);
    expect(tuningResponseSchema.safeParse({ additions: [], cuts: [] }).success).toBe(true);
  });

  it("accepts one list empty: an answer may be all additions or all cuts", () => {
    expect(tuningResponseSchema.safeParse({ additions: [one], cuts: [] }).success).toBe(true);
    expect(tuningResponseSchema.safeParse({ additions: [], cuts: [one] }).success).toBe(true);
  });

  it("takes up to six a list (ASK_PER_LIST) and rejects a seventh in either", () => {
    const six = new Array(6).fill(one);
    expect(tuningResponseSchema.safeParse({ additions: six, cuts: six }).success).toBe(true);
    expect(tuningResponseSchema.safeParse({ additions: [...six, one], cuts: [] }).success).toBe(false);
    expect(tuningResponseSchema.safeParse({ additions: [], cuts: [...six, one] }).success).toBe(false);
  });

  it("requires both lists: a reply in the old swap shape is refused", () => {
    expect(tuningResponseSchema.safeParse({ additions: [one] }).success).toBe(false);
    expect(tuningResponseSchema.safeParse({ suggestions: [{ add: "A", cut: "B", ...one }] }).success).toBe(false);
  });

  it("rejects a line with no evidence, or no card", () => {
    expect(tuningResponseSchema.safeParse({ additions: [{ ...one, evidence: [] }], cuts: [] }).success).toBe(false);
    expect(tuningResponseSchema.safeParse({ additions: [], cuts: [{ ...one, card: "" }] }).success).toBe(false);
  });

  it("caps the short rationale", () => {
    expect(tuningResponseSchema.safeParse({ additions: [{ ...one, rationaleShort: "x".repeat(81) }], cuts: [] }).success).toBe(false);
  });

  it("rejects a citation of a source the run never read", () => {
    expect(tuningResponseSchema.safeParse({ additions: [{ ...one, evidence: [{ kind: "price", value: "$2" }] }], cuts: [] }).success).toBe(false);
  });
});
