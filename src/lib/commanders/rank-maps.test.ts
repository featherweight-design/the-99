import { describe, it, expect } from "vitest";
import { rankMap } from "./rank-maps";

describe("rankMap", () => {
  it("numbers the full candidate set from 1 in list order", () => {
    const m = rankMap([{ slug: "a" }, { slug: "b" }, { slug: "c" }]);
    expect([...m.entries()]).toEqual([
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ]);
  });

  // The invariant that survives the re-rank: the map is built over EVERYTHING,
  // so a filtered render shows 2, 3, 4 with a gap where rank 1 was hidden.
  it("is independent of any filter applied afterwards", () => {
    const all = [{ slug: "a" }, { slug: "b" }, { slug: "c" }];
    const m = rankMap(all);
    const filtered = all.filter((x) => x.slug !== "a");
    expect(filtered.map((x) => m.get(x.slug))).toEqual([2, 3]);
  });

  // Two maps over the same commanders in different orders is the whole point of
  // the toggle. Neither map may leak into the other.
  it("gives the same commander a different rank in each mode's ordering", () => {
    const all = rankMap([{ slug: "a" }, { slug: "b" }]);
    const free = rankMap([{ slug: "b" }, { slug: "a" }]);
    expect([all.get("a"), free.get("a")]).toEqual([1, 2]);
  });
});
