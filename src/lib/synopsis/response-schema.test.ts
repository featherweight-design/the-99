import { describe, expect, it } from "vitest";

import { synopsisResponseSchema, synopsisResponseSchemaV8, synopsisResponseSchemaV8Wire } from "./response-schema";

const reply = {
  overview: "A deck.",
  primer: { strategy: [], mulligan: { keep: [], sendBack: [] }, tips: [] },
  keyCards: [],
  weaknesses: [],
};

describe("synopsisResponseSchema", () => {
  it("takes a reply whose counts are wrong, because counts are the validator's refusal to make", () => {
    expect(synopsisResponseSchema.safeParse(reply).success).toBe(true);
  });

  it("rejects a missing section and a claim outside the categories", () => {
    const missing: Partial<typeof reply> = { ...reply };
    delete missing.weaknesses;
    expect(synopsisResponseSchema.safeParse(missing).success).toBe(false);
    expect(synopsisResponseSchema.safeParse({ ...reply, keyCards: [{ card: "X", claims: ["finisher"], job: "Wins." }] }).success).toBe(false);
  });
});

describe("synopsisResponseSchemaV8", () => {
  const v8 = {
    plans: { primary: "Wins in combat.", backups: [] },
    overview: "A deck.",
    primer: { strategy: [], mulligan: { keep: [], sendBack: [] }, tips: [{ text: "T.", evidence: ["c1", "c2"] }] },
    keyCards: [{ card: "X", claims: [], job: "Wins.", evidence: ["c1"] }],
    assessment: [{ topic: "win_path", verdict: "weakness", tier: "minor", line: "One finisher.", evidence: [] }, { topic: "mana_and_colors", verdict: "unknown", evidence: [] }],
  };

  it("takes a reply with lines, refs and a partial checklist, since completeness is the validator's refusal to make", () => {
    expect(synopsisResponseSchemaV8.safeParse(v8).success).toBe(true);
  });

  it("rejects a topic or verdict outside the closed sets, a missing evidence field, and a contract-7 weaknesses-only reply", () => {
    expect(synopsisResponseSchemaV8.safeParse({ ...v8, assessment: [{ topic: "vibes", verdict: "weakness", evidence: [] }] }).success).toBe(false);
    expect(synopsisResponseSchemaV8.safeParse({ ...v8, assessment: [{ topic: "win_path", verdict: "bad", evidence: [] }] }).success).toBe(false);
    expect(synopsisResponseSchemaV8.safeParse({ ...v8, assessment: [{ topic: "win_path", verdict: "weakness" }] }).success).toBe(false);
    expect(synopsisResponseSchemaV8.safeParse({ ...v8, assessment: undefined, weaknesses: ["x"] }).success).toBe(false);
  });

  it("requires the plans, which the model fills before anything else", () => {
    expect(synopsisResponseSchemaV8.safeParse({ ...v8, plans: undefined }).success).toBe(false);
    expect(Object.keys(synopsisResponseSchemaV8.shape)[0]).toBe("plans");
  });
});

describe("synopsisResponseSchemaV8Wire", () => {
  const reply = (assessment: unknown[]) => ({
    plans: { primary: "P.", backups: [] }, overview: "O.", primer: { strategy: [], mulligan: { keep: [], sendBack: [] }, tips: [] }, keyCards: [], assessment,
  });

  // The strict schema failed the whole reply (retried and billed twice) on one stray word.
  it("accepts a closed word the strict schema refuses", () => {
    const stray = reply([{ topic: "win_path", verdict: "n/a", tier: "severe", evidence: [] }]);
    expect(synopsisResponseSchemaV8.safeParse(stray).success).toBe(false);
    expect(synopsisResponseSchemaV8Wire.safeParse(stray).success).toBe(true);
  });

  it("still refuses a reply missing a required field", () => {
    expect(synopsisResponseSchemaV8Wire.safeParse(reply([{ topic: "win_path", evidence: [] }])).success).toBe(false);
    expect(synopsisResponseSchemaV8Wire.safeParse({ overview: "O." }).success).toBe(false);
  });
});
