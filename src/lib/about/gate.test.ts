import { describe, expect, it } from "vitest";
import { ABOUT_VERSION } from "../copy/about";
import { cookieIsCurrent, cookieValue, gateApplies, gateHandles, safeNext } from "./gate";

describe("safeNext", () => {
  it("keeps a same-origin path and its query", () => {
    expect(safeNext("/decks?sort=name")).toBe("/decks?sort=name");
  });

  it("leaves the destination's own escapes alone", () => {
    // Both callers hand over a decoded value, so decoding again here would eat
    // the escapes that belong to the query: this destination is ONE parameter
    // whose value contains an ampersand, and a second decode makes it two.
    expect(safeNext("/commanders?q=a%26b")).toBe("/commanders?q=a%26b");
    expect(safeNext("/collection?q=%23foil")).toBe("/collection?q=%23foil");
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
    // Not a path, so it never reaches the resolver.
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

describe("gateHandles", () => {
  const h = (init: Record<string, string>) => new Headers(init);

  it("gates a hard navigation", () => {
    expect(gateHandles("GET", h({ accept: "text/html,application/xhtml+xml" }))).toBe(true);
  });

  it("gates a client transition, which is how the reader actually moves", () => {
    // Every <Link> press in the shell carries RSC: 1. Skipping those was the
    // first version of this rule, and it meant a reader who landed on the
    // public "/" and clicked Decks never met the gate at all.
    expect(gateHandles("GET", h({ RSC: "1" }))).toBe(true);
  });

  it("never gates a prefetch", () => {
    // The gated response writes the cookie, so gating a prefetch would mark the
    // page shown because a pointer passed over a link.
    expect(gateHandles("GET", h({ RSC: "1", "Next-Router-Prefetch": "1" }))).toBe(false);
    expect(gateHandles("GET", h({ RSC: "1", purpose: "prefetch" }))).toBe(false);
  });

  it("never gates a write, or a request for something that is not a page", () => {
    expect(gateHandles("POST", h({ accept: "text/html" }))).toBe(false);
    expect(gateHandles("GET", h({ accept: "application/json" }))).toBe(false);
  });
});
