import { describe, expect, it } from "vitest";

import { lineSchemaV2, suggestedChangesV2ReplySchema, tuningResponseSchema } from "./response-schema";
import { askFor, MAX_COUNT, schemaCapFor } from "./v2/count";

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

describe("suggestedChangesV2ReplySchema", () => {
  const v2 = { ...one, n: 1, evidence: [{ kind: "request", value: "more ramp" }] };
  it("is one list under the neutral key `lines`, the same for additions, cuts and both refills", () => {
    expect(suggestedChangesV2ReplySchema.safeParse({ lines: [v2] }).success).toBe(true);
    expect(suggestedChangesV2ReplySchema.safeParse({ lines: [] }).success).toBe(true);
    expect(suggestedChangesV2ReplySchema.safeParse({ additions: [v2] }).success).toBe(false);
    expect(suggestedChangesV2ReplySchema.safeParse({ cuts: [v2] }).success).toBe(false);
  });

  it("caps the list at the largest any call asks, loose: twice N=20's ask (60)", () => {
    const cap = schemaCapFor(askFor(MAX_COUNT));
    expect(cap).toBe(60);
    expect(suggestedChangesV2ReplySchema.safeParse({ lines: Array(cap).fill(v2) }).success).toBe(true);
    expect(suggestedChangesV2ReplySchema.safeParse({ lines: Array(cap + 1).fill(v2) }).success).toBe(false);
  });

  it("asks each line for its number `n` (prompt v14), any integer, and the line parse ignores it", () => {
    expect(suggestedChangesV2ReplySchema.safeParse({ lines: [{ ...v2, n: 7 }] }).success).toBe(true);
    expect(suggestedChangesV2ReplySchema.safeParse({ lines: [{ ...v2, n: 0 }] }).success).toBe(true);
    const { n: _n, ...bare } = v2;
    expect(suggestedChangesV2ReplySchema.safeParse({ lines: [bare] }).success).toBe(false);
    // The engine parses each streamed line with `lineSchemaV2`: a missing or wrong number never drops a line.
    expect(lineSchemaV2.safeParse(bare).success).toBe(true);
    const parsed = lineSchemaV2.safeParse({ ...v2, n: 99 });
    expect(parsed.success && "n" in parsed.data).toBe(false);
  });

  // The v14 eval: 6 of 22 first calls failed this parse on one line's empty `rationaleShort`, every other field valid.
  it("rebuilds an empty or degenerate short reason from the rationale, so one bad summary never fails the reply", () => {
    for (const short of ["", "x"]) {
      const parsed = suggestedChangesV2ReplySchema.safeParse({ lines: [{ ...v2, rationaleShort: short }] });
      expect(parsed.success && parsed.data.lines[0].rationaleShort).toBe(v2.rationale);
    }
    expect(suggestedChangesV2ReplySchema.safeParse({ lines: [{ ...v2, rationale: "" }] }).success).toBe(false);
    // v10's whole-reply schema is unchanged.
    expect(tuningResponseSchema.safeParse({ additions: [{ ...one, rationaleShort: "" }], cuts: [] }).success).toBe(false);
  });

  it("cites the run's request, not v10's notes", () => {
    expect(suggestedChangesV2ReplySchema.safeParse({ lines: [{ ...one, n: 1, evidence: [{ kind: "notes", value: "x" }] }] }).success).toBe(false);
  });
});
