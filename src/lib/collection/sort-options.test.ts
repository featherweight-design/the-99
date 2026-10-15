import { describe, expect, it } from "vitest";
import {
  buildSortOptions,
  nextSortState,
  parseSortDirection,
  sortOrderLabel,
} from "./sort-options";

describe("buildSortOptions", () => {
  it("lists every sort key with only the chosen one carrying a direction hint", () => {
    const options = buildSortOptions("quantity", "desc");
    expect(options.map((o) => o.code)).toEqual(["name", "quantity", "set", "rarity", "color", "price", "added"]);
    expect(options.filter((o) => o.hint !== undefined).map((o) => [o.code, o.hint])).toEqual([
      ["quantity", "Most"],
    ]);
  });
  it("never disables a row — a sort order cannot be unavailable", () => {
    expect(buildSortOptions("name", "asc").every((o) => !o.disabled)).toBe(true);
  });
});

describe("nextSortState", () => {
  it("switching keys adopts the new key's natural direction", () => {
    expect(nextSortState({ sort: "name", direction: "desc" }, "quantity")).toEqual({
      sort: "quantity",
      direction: "desc",
    });
    expect(nextSortState({ sort: "quantity", direction: "asc" }, "name")).toEqual({
      sort: "name",
      direction: "asc",
    });
  });
  it("picking the current key reverses it", () => {
    expect(nextSortState({ sort: "name", direction: "asc" }, "name")).toEqual({
      sort: "name",
      direction: "desc",
    });
    expect(nextSortState({ sort: "name", direction: "desc" }, "name")).toEqual({
      sort: "name",
      direction: "asc",
    });
  });
});

describe("parseSortDirection", () => {
  it("falls back to the key's default for absent or junk values", () => {
    expect(parseSortDirection(null, "quantity")).toBe("desc");
    expect(parseSortDirection("sideways", "name")).toBe("asc");
  });
  it("honours an explicit direction even when it is the non-default one", () => {
    expect(parseSortDirection("asc", "quantity")).toBe("asc");
  });
});

describe("sortOrderLabel", () => {
  it("reads as the whole order, not just the key", () => {
    expect(sortOrderLabel("name", "asc")).toBe("Name · A–Z");
    expect(sortOrderLabel("rarity", "desc")).toBe("Rarity · Mythic first");
  });
});

describe("the Price sort", () => {
  it("opens highest first, and reverses to lowest first", () => {
    expect(nextSortState({ sort: "name", direction: "asc" }, "price")).toEqual({ sort: "price", direction: "desc" });
    expect(sortOrderLabel("price", "desc")).toBe("Price · Highest first");
    expect(sortOrderLabel("price", "asc")).toBe("Price · Lowest first");
  });
});

describe("the Date added sort", () => {
  it("opens newest first, and reverses to oldest first", () => {
    expect(nextSortState({ sort: "name", direction: "asc" }, "added")).toEqual({ sort: "added", direction: "desc" });
    expect(sortOrderLabel("added", "desc")).toBe("Date added · Newest");
    expect(sortOrderLabel("added", "asc")).toBe("Date added · Oldest");
  });
});
