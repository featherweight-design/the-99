import { describe, expect, it } from "vitest";
import { readReportParams } from "./report-link";

describe("readReportParams", () => {
  it("takes a code and a path", () => {
    expect(readReportParams({ ref: "7f3a91c2", from: "/decks/abc" })).toEqual({ ref: "7f3a91c2", from: "/decks/abc" });
  });
  it("takes the first of a repeated value and drops what is not a code or a path", () => {
    expect(readReportParams({ ref: ["a1", "b2"], from: "/x" })).toEqual({ ref: "a1", from: "/x" });
    expect(readReportParams({ ref: "x".repeat(65), from: "x" })).toEqual({ ref: null, from: null });
    expect(readReportParams({})).toEqual({ ref: null, from: null });
  });
  it("redacts a link token in the path, as the action does", () => {
    expect(readReportParams({ from: "/join/AB1234" }).from ?? "").not.toContain("AB1234");
  });
});
