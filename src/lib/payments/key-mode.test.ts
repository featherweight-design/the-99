import { describe, expect, it } from "vitest";
import { keyAllowed, keyMode } from "./key-mode";

describe("keyMode", () => {
  it("reads restricted keys in both modes, and nothing else: an account secret key is refused", () => {
    expect(keyMode("rk_test_abc")).toBe("test");
    expect(keyMode("rk_live_abc")).toBe("live");
    for (const k of [undefined, "", "sk_test_abc", "sk_live_abc", "pk_test_abc", "whsec_abc", "rk_abc", "rk_live_", "xrk_live_abc"]) {
      expect(keyMode(k)).toBeNull();
    }
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

  it("refuses a key it cannot read, wherever it is, an account secret key included", () => {
    expect(keyAllowed("pk_live_abc", "production")).toBe(false);
    expect(keyAllowed("sk_live_abc", "production")).toBe(false);
    expect(keyAllowed("sk_test_abc", "staging")).toBe(false);
    expect(keyAllowed(undefined, "staging")).toBe(false);
  });
});
