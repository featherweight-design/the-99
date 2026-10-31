import { describe, expect, it } from "vitest";
import { DOING_MAX, WHAT_MAX, deviceSummary, pageOf, parseReport } from "./report-rule";

const ok = { what: "The deck page went blank", doing: "", page: "/decks/abc", source: "error", digest: null, sentryEventId: null };

describe("parseReport", () => {
  it("trims, keeps the first box and turns an empty second box into null", () => {
    expect(parseReport({ ...ok, what: "  blank page  ", doing: "   " })).toMatchObject({ what: "blank page", doing: null, source: "error" });
  });

  it("drops NUL characters, which the jsonb answers cannot hold, and refuses a box that was only NULs", () => {
    expect(parseReport({ ...ok, what: "blank\u0000 page", doing: "\u0000" })).toMatchObject({ what: "blank page", doing: null });
    expect(parseReport({ ...ok, what: "\u0000\u0000" })).toBeNull();
  });

  it("refuses an empty first box, a non-string, and anything over its cap", () => {
    expect(parseReport({ ...ok, what: "   " })).toBeNull();
    expect(parseReport({ ...ok, what: 7 })).toBeNull();
    expect(parseReport({ ...ok, doing: null })).toBeNull();
    expect(parseReport({ ...ok, what: "x".repeat(WHAT_MAX + 1) })).toBeNull();
    expect(parseReport({ ...ok, doing: "x".repeat(DOING_MAX + 1) })).toBeNull();
    expect(parseReport({ ...ok, what: "x".repeat(WHAT_MAX), doing: "y".repeat(DOING_MAX) })).not.toBeNull();
  });

  it("knows only the three doors", () => {
    expect(parseReport({ ...ok, source: "report" })?.source).toBe("report");
    expect(parseReport({ ...ok, source: "about" })?.source).toBe("about");
    expect(parseReport({ ...ok, source: "elsewhere" })).toBeNull();
    expect(parseReport({ ...ok, source: undefined })).toBeNull();
  });

  it("keeps a digest and an event id made of word characters and drops anything else", () => {
    expect(parseReport({ ...ok, digest: "1234567890", sentryEventId: "9f8e7d6c5b4a39281706f5e4d3c2b1a0" })).toMatchObject({
      digest: "1234567890",
      sentryEventId: "9f8e7d6c5b4a39281706f5e4d3c2b1a0",
    });
    expect(parseReport({ ...ok, digest: "<script>", sentryEventId: "x".repeat(65) })).toMatchObject({ digest: null, sentryEventId: null });
    expect(parseReport({ ...ok, digest: 12 })?.digest).toBeNull();
  });
});

describe("pageOf", () => {
  it("keeps the path alone: no query, hash or origin", () => {
    expect(pageOf("/decks/abc?tab=stats#x")).toBe("/decks/abc");
    expect(pageOf("https://evil.example/decks")).toBeNull();
    expect(pageOf("//evil.example/decks")).toBeNull();
    expect(pageOf(undefined)).toBeNull();
  });

  it("replaces a link token", () => {
    expect(pageOf("/join/abcDEF123")).not.toContain("abcDEF123");
    expect(pageOf("/friend/sometoken")).not.toContain("sometoken");
  });

  it("redacts a token a control character was hiding in", () => {
    expect(pageOf("/join/AB\u0001CD")).not.toContain("ABCD");
    expect(pageOf("/join/AB\u0001CD")).not.toMatch(/[\u0000-\u001f]/);
  });

  it("caps its length", () => {
    expect(pageOf(`/${"a".repeat(500)}`)!.length).toBeLessThanOrEqual(200);
  });
});

describe("deviceSummary", () => {
  it("names the browser and the system, never the header", () => {
    const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
    expect(deviceSummary(ua)).toBe("Safari on iPhone");
    expect(deviceSummary("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36")).toBe("Chrome on Windows");
    expect(deviceSummary("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Gecko/20100101 Firefox/131.0")).toBe("Firefox on Mac");
  });

  it("reads a missing header as unknown", () => {
    expect(deviceSummary(null)).toBe("Unknown on Unknown");
  });
});
