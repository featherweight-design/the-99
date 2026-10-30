import { describe, expect, it } from "vitest";
import { pathWithQuery } from "./place-redirect";

describe("pathWithQuery", () => {
  it("keeps the query, repeated parameters included", () => {
    expect(pathWithQuery("/commanders/discover", { c: "R,G", m: "exact", q: ["a", "b"] })).toBe(
      "/commanders/discover?c=R%2CG&m=exact&q=a&q=b",
    );
  });
  it("is the bare path with no query", () => {
    expect(pathWithQuery("/commanders/choose", {})).toBe("/commanders/choose");
    expect(pathWithQuery("/commanders/choose", { x: undefined })).toBe("/commanders/choose");
  });
});
