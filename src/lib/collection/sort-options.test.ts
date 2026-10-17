import { describe, expect, it } from "vitest";
import {
  buildSortOptions,
  nextSortState,
  parseSortCookie,
  parseSortDirection,
  serializeSortCookie,
  withStoredSort,
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

describe("the stored sort", () => {
  it("round-trips through the cookie, and reads anything else as none", () => {
    expect(parseSortCookie(serializeSortCookie({ sort: "price", direction: "desc" }))).toEqual({ sort: "price", direction: "desc" });
    for (const bad of [undefined, null, "", "price", "price.up", "bogus.asc", "price.desc.x", ".asc"]) expect(parseSortCookie(bad)).toBeNull();
  });

  it("is the URL's default: a URL naming sort or dir wins whole, one naming neither reads as the stored sort", () => {
    const stored = { sort: "price", direction: "desc" } as const;
    const url = (q: string) => withStoredSort((k) => new URLSearchParams(q).get(k), stored);
    expect([url("")("sort"), url("")("dir")]).toEqual(["price", "desc"]);
    expect(url("q=bolt")("q")).toBe("bolt");
    expect([url("sort=name")("sort"), url("sort=name")("dir")]).toEqual(["name", null]);
    expect([url("dir=asc")("sort"), url("dir=asc")("dir")]).toEqual([null, "asc"]);
    expect(withStoredSort((k) => new URLSearchParams("").get(k), null)("sort")).toBeNull();
  });
});
