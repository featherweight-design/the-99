import { describe, expect, it } from "vitest";
import { FLYER_FALLBACK_ORIGIN, flyerJoinUrl, flyerPrintable, flyerQr, flyerTypedParts } from "./print-rule";

describe("flyerJoinUrl", () => {
  it("uses the deployment's origin, and the board's domain when it names none", () => {
    expect(flyerJoinUrl(new URL("https://staging.the-99.dev"), "MOX4QK")).toBe("https://staging.the-99.dev/join/MOX4QK");
    expect(flyerJoinUrl(undefined, "MOX4QK")).toBe(`${FLYER_FALLBACK_ORIGIN}/join/MOX4QK`);
  });
});

describe("flyerTypedParts", () => {
  it("splits the printed address from the code it underlines", () => {
    expect(flyerTypedParts("https://the-99.dev/join/MOX4QK")).toEqual({ prefix: "the-99.dev/join/", code: "MOX4QK" });
  });
});

describe("flyerQr", () => {
  it("is a square grid with a two-module quiet zone, one square per dark module", () => {
    const q = flyerQr("https://the-99.dev/join/MOX4QK");
    expect(q.size).toBe(33);
    expect(q.d.startsWith("M")).toBe(true);
    expect(q.d).toContain("h1v1h-1z");
  });
});

describe("flyerPrintable", () => {
  it("prints a live code and not a revoked one", () => {
    expect(flyerPrintable({ revokedAt: null })).toBe(true);
    expect(flyerPrintable({ revokedAt: new Date() })).toBe(false);
  });
});
