import { describe, expect, it } from "vitest";
import { readReportParams, reportHref } from "./report-link";

describe("reportHref", () => {
  it("carries the digest as ref and the path as from, URL-encoded", () => {
    expect(reportHref("7f3a91c2", "/decks/abc")).toBe("/report?ref=7f3a91c2&from=%2Fdecks%2Fabc");
  });
  it("draws neither without a digest or a path, and keeps from a path only", () => {
    expect(reportHref(undefined, "")).toBe("/report");
    expect(reportHref("d1", null)).toBe("/report?ref=d1");
    expect(reportHref("a b", "https://x.test/p")).toBe("/report");
    expect(reportHref(null, "//evil.test")).toBe("/report");
  });
  it("redacts a link token in the path, as the action does", () => {
    expect(reportHref(null, "/join/AB1234")).not.toContain("AB1234");
  });
});

describe("readReportParams", () => {
  it("round-trips what reportHref wrote", () => {
    const url = new URL(reportHref("7f3a91c2", "/decks/abc"), "https://the99.test");
    expect(readReportParams(Object.fromEntries(url.searchParams))).toEqual({ ref: "7f3a91c2", from: "/decks/abc" });
  });
  it("takes the first of a repeated value and drops what is not a code or a path", () => {
    expect(readReportParams({ ref: ["a1", "b2"], from: "/x" })).toEqual({ ref: "a1", from: "/x" });
    expect(readReportParams({ ref: "x".repeat(65), from: "x" })).toEqual({ ref: null, from: null });
    expect(readReportParams({})).toEqual({ ref: null, from: null });
  });
});
