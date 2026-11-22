import { describe, expect, it } from "vitest";
import {
  NO_SPARE_FILTERS, activeSpareDimensions, buildSpareTypeOptions, buildWantedOptions, filterSpares, parseSpareParams, sortSpares,
  withDeckNeed, writeSpareParams, type SpareBrowseLine,
} from "./spare-browse";
import type { FriendSpareLine } from "./spares";

const line = (name: string, over: Partial<FriendSpareLine> = {}): FriendSpareLine => ({
  oracleId: name.toLowerCase().replace(/\W/g, "-"), name, imageUri: null, spare: 1, onWishlist: false, typeLine: "Creature — Human", colorIdentity: [], ...over,
});
const LINES: SpareBrowseLine[] = withDeckNeed(
  [
    line("Sol Ring", { typeLine: "Artifact", spare: 3 }),
    line("Zombie Cleric", { typeLine: "Creature — Zombie Cleric", colorIdentity: ["B"] }),
    line("Saga of Old", { typeLine: "Enchantment — Saga", colorIdentity: ["W"], onWishlist: true }),
    line("Plains", { typeLine: "Basic Land — Plains" }),
  ],
  { "zombie-cleric": 2 },
);
const names = (l: readonly SpareBrowseLine[]) => l.map((x) => x.name);

describe("filterSpares", () => {
  it("searches a name or a word prefix of the type line", () => {
    expect(names(filterSpares(LINES, { ...NO_SPARE_FILTERS, search: "zom" }))).toEqual(["Zombie Cleric"]);
    expect(names(filterSpares(LINES, { ...NO_SPARE_FILTERS, search: "saga" }))).toEqual(["Saga of Old"]);
    expect(names(filterSpares(LINES, { ...NO_SPARE_FILTERS, search: "sol" }))).toEqual(["Sol Ring"]);
  });
  it("ORs the Wanted values and ANDs the dimensions", () => {
    expect(names(filterSpares(LINES, { ...NO_SPARE_FILTERS, wanted: ["wishlist", "deck"] }))).toEqual(["Zombie Cleric", "Saga of Old"]);
    expect(names(filterSpares(LINES, { ...NO_SPARE_FILTERS, wanted: ["deck"], colors: ["W"] }))).toEqual([]);
  });
  it("filters by type, any of the chosen", () => {
    expect(names(filterSpares(LINES, { ...NO_SPARE_FILTERS, types: ["Artifact", "Land"] }))).toEqual(["Sol Ring", "Plains"]);
  });
});

describe("option counts", () => {
  it("count cards under the other filters and dim a zero", () => {
    const f = { ...NO_SPARE_FILTERS, wanted: ["wishlist" as const] };
    const types = buildSpareTypeOptions(LINES, f);
    expect(types.find((o) => o.code === "Enchantment")).toMatchObject({ count: 1, disabled: false });
    expect(types.find((o) => o.code === "Creature")).toMatchObject({ count: 0, disabled: true });
  });
  it("leaves its own dimension out, and the search", () => {
    const f = { ...NO_SPARE_FILTERS, search: "sol", wanted: ["deck" as const] };
    const wanted = buildWantedOptions(LINES, f, { wishlist: "w", deck: "d" });
    expect(wanted.map((o) => o.count)).toEqual([1, 1]);
  });
});

describe("sortSpares", () => {
  it("puts wishlist, then deck need, then the rest, each by name", () => {
    expect(names(sortSpares(LINES, "wanted"))).toEqual(["Saga of Old", "Zombie Cleric", "Plains", "Sol Ring"]);
  });
  it("orders by name and by most spares", () => {
    expect(names(sortSpares(LINES, "name"))).toEqual(["Plains", "Saga of Old", "Sol Ring", "Zombie Cleric"]);
    expect(names(sortSpares(LINES, "most"))[0]).toBe("Sol Ring");
  });
});

describe("address round trip", () => {
  it("writes and reads every dimension, leaving ?spare= alone", () => {
    const url = new URL("https://x.test/friends/a/spares?spare=abc");
    const f = { search: "zom", colors: ["W", "U"], match: "exactly" as const, types: ["Creature"], wanted: ["deck" as const] };
    writeSpareParams(url, f, "name");
    expect(url.searchParams.get("spare")).toBe("abc");
    expect(parseSpareParams(url.searchParams)).toEqual({ filters: f, sort: "name" });
  });

  it("ignores a colors value that is not WUBRG letters", () => {
    expect(parseSpareParams(new URLSearchParams("colors=blue")).filters.colors).toEqual([]);
    expect(parseSpareParams(new URLSearchParams("colors=ug")).filters.colors).toEqual(["U", "G"]);
  });
  it("writes nothing for the rest state", () => {
    const url = new URL("https://x.test/friends/a/spares?q=x&sort=name&colors=W");
    writeSpareParams(url, NO_SPARE_FILTERS, "wanted");
    expect(url.search).toBe("");
  });
  it("counts dimensions, never the search", () => {
    expect(activeSpareDimensions({ ...NO_SPARE_FILTERS, search: "x", colors: ["W"], types: ["Land"] })).toBe(2);
  });
});
