import { describe, it, expect } from "vitest";
import { proxiedCardCount } from "./proxy-count";

// The PRODUCTION derivation, imported. An earlier version of this file
// reimplemented the expression locally, which meant the shell could drop a
// commander, count quantities, or lose the deduplication with the suite green.

describe("one mark is one proxy, per card", () => {
  it("folds a commander that is also on its own list", () => {
    expect(proxiedCardCount(
      [{ oracleId: "cmd", proxied: true }],
      { oracleId: "cmd", proxied: true },
      null,
    )).toBe(1);
  });

  it("counts a commander and a separate list card as two", () => {
    expect(proxiedCardCount(
      [{ oracleId: "a", proxied: true }],
      { oracleId: "cmd", proxied: true },
      null,
    )).toBe(2);
  });

  it("counts each half of a proxied pair", () => {
    expect(proxiedCardCount(
      [], { oracleId: "c1", proxied: true }, { oracleId: "c2", proxied: true },
    )).toBe(2);
  });

  it("counts a marked playset once", () => {
    // Ruling 5: a proxy covers the whole ask and has no quantity.
    expect(proxiedCardCount([{ oracleId: "a", proxied: true }], { oracleId: "cmd" }, null)).toBe(1);
  });

  it("is zero when nothing is printed", () => {
    expect(proxiedCardCount([{ oracleId: "a" }], { oracleId: "cmd" }, null)).toBe(0);
  });
});
