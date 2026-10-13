import { describe, expect, it } from "vitest";
import { keyAllowed, keyMode } from "./key-mode";

describe("keyMode", () => {
  it("reads secret and restricted keys in both modes, and nothing else", () => {
    expect(keyMode("sk_test_abc")).toBe("test");
    expect(keyMode("rk_test_abc")).toBe("test");
    expect(keyMode("sk_live_abc")).toBe("live");
    expect(keyMode("rk_live_abc")).toBe("live");
    for (const k of [undefined, "", "pk_test_abc", "whsec_abc", "sk_abc", "sk_live_", "xsk_live_abc"]) expect(keyMode(k)).toBeNull();
  });
});

describe("keyAllowed: test mode everywhere but production (payments scope §5.2)", () => {
  it("allows a live key only in production, and a test key everywhere else", () => {
    expect(keyAllowed("rk_live_abc", "production")).toBe(true);
    expect(keyAllowed("rk_test_abc", "production")).toBe(false);
    for (const label of ["staging", undefined, "", "preview"]) {
      expect(keyAllowed("rk_test_abc", label)).toBe(true);
      expect(keyAllowed("rk_live_abc", label)).toBe(false);
    }
  });

  it("refuses a key it cannot read, wherever it is", () => {
    expect(keyAllowed("pk_live_abc", "production")).toBe(false);
    expect(keyAllowed(undefined, "staging")).toBe(false);
  });
});
