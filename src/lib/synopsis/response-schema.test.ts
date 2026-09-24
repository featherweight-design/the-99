import { describe, expect, it } from "vitest";

import { synopsisResponseSchema } from "./response-schema";

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
