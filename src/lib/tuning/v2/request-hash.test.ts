import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";

import { requestHash } from "./request-hash";

const base = { count: 5, text: "More card draw", bracketChoice: "keep", bracketTarget: 3 };

describe("requestHash", () => {
  it("matches the same request read the way the player reads it", () => {
    expect(requestHash({ ...base, text: "  More   card draw " })).toBe(requestHash(base));
  });

  it("differs on the count, the words, the bracket choice or its target", () => {
    const h = requestHash(base);
    for (const change of [{ count: 6 }, { text: "more card draw" }, { bracketChoice: "up" }, { bracketTarget: 4 }]) {
      expect(requestHash({ ...base, ...change })).not.toBe(h);
    }
  });

  it("differs on a range's bottom, and leaves a hash without one as it always was", () => {
    expect(requestHash({ ...base, bracketLow: 1 })).not.toBe(requestHash(base));
    const words = base.text.trim().replace(/\s+/g, " ");
    expect(requestHash(base)).toBe(createHash("sha256").update(JSON.stringify([base.count, words, base.bracketChoice, base.bracketTarget])).digest("hex"));
  });
});
