import { describe, expect, it } from "vitest";
import { searchParamsToQuery } from "./search-params";

describe("searchParamsToQuery", () => {
  it("keeps a single value and drops an absent one", () => {
    const q = searchParamsToQuery({ c: "b,g", q: undefined });
    expect(q.get("c")).toBe("b,g");
    expect(q.has("q")).toBe(false);
  });

  it("reads the first of a repeated key rather than joining them", () => {
    // The bug a cast would ship: `["b", "g"]` stringifies to `"b,g"`, which the
    // colour parser reads as two pips nobody asked for.
    expect(searchParamsToQuery({ c: ["b", "g"] }).get("c")).toBe("b");
  });
});
