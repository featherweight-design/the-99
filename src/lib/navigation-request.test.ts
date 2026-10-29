import { describe, expect, it } from "vitest";
import { isNavigation } from "./navigation-request";

describe("isNavigation", () => {
  const h = (init: Record<string, string>) => new Headers(init);

  it("takes a hard navigation", () => {
    expect(isNavigation("GET", h({ accept: "text/html,application/xhtml+xml" }))).toBe(true);
  });

  it("takes a client transition, which is how the reader actually moves", () => {
    expect(isNavigation("GET", h({ RSC: "1" }))).toBe(true);
  });

  it("never takes a prefetch", () => {
    expect(isNavigation("GET", h({ RSC: "1", "Next-Router-Prefetch": "1" }))).toBe(false);
    expect(isNavigation("GET", h({ RSC: "1", purpose: "prefetch" }))).toBe(false);
  });

  it("never takes a write, or a request for something that is not a page", () => {
    expect(isNavigation("POST", h({ accept: "text/html" }))).toBe(false);
    expect(isNavigation("GET", h({ accept: "application/json" }))).toBe(false);
  });
});
