import { describe, expect, it } from "vitest";
import { ABOUT_VERSION } from "../copy/about";
import { cookieIsCurrent, cookieValue, gateApplies, safeNext } from "./gate";

describe("safeNext", () => {
  it("keeps a same-origin path and its query", () => {
    expect(safeNext("/decks?sort=name")).toBe("/decks?sort=name");
    expect(safeNext(encodeURIComponent("/collection?view=rows"))).toBe("/collection?view=rows");
  });

  it("falls back home rather than leaving the origin", () => {
    // The one that matters: a browser reads a protocol-relative URL as another
    // origin, and it passes a naive "starts with a slash" test.
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("/\\evil.example")).toBe("/");
    expect(safeNext("https://evil.example/decks")).toBe("/");
    expect(safeNext("javascript:alert(1)")).toBe("/");
  });

  it("falls back home on nothing, and on a value that cannot be decoded", () => {
    expect(safeNext(null)).toBe("/");
    expect(safeNext(undefined)).toBe("/");
    expect(safeNext("")).toBe("/");
    // decodeURIComponent throws on a lone escape rather than returning input.
    expect(safeNext("%")).toBe("/");
  });
});

describe("the cookie", () => {
  it("is bound to the reader as well as the version", () => {
    expect(cookieIsCurrent(cookieValue("user_a"), "user_a")).toBe(true);
    // A second account on the same browser must not inherit the first's
    // acknowledgement, or they never see the page at all.
    expect(cookieIsCurrent(cookieValue("user_a"), "user_b")).toBe(false);
  });

  it("goes stale when the version moves", () => {
    expect(cookieIsCurrent(`user_a.${ABOUT_VERSION - 1}`, "user_a")).toBe(false);
    expect(cookieIsCurrent(undefined, "user_a")).toBe(false);
  });
});

describe("gateApplies", () => {
  it("exempts the page itself, or the redirect loops", () => {
    expect(gateApplies("/about")).toBe(false);
  });

  it("exempts what is not a reader's page", () => {
    expect(gateApplies("/api/health")).toBe(false);
    expect(gateApplies("/_next/static/chunk.js")).toBe(false);
  });

  it("applies to the routes a reader is actually sent away from", () => {
    expect(gateApplies("/")).toBe(true);
    expect(gateApplies("/decks")).toBe(true);
    expect(gateApplies("/decks/abc/changes")).toBe(true);
  });
});
