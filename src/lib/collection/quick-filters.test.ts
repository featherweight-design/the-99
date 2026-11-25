import { describe, expect, it } from "vitest";
import { filterCards, toListCards, type BrowseCard, type BrowseFilters, type BrowseListCard } from "./browse";
import { quickCounts } from "./quick-counts";
import { QUICK_KEYS, isFreeAlone, matchesQuick, parseQuick, quickMask } from "./quick-filters";
import { parseBrowseParams } from "./window";
import { decodeCollection, encodeCollection } from "./list-wire";

const none: BrowseFilters = { search: "", colors: [], types: [], setCodes: [], availability: [] };
const params = (qs: string) => {
  const q = new URLSearchParams(qs);
  return parseBrowseParams((k) => q.get(k), true);
};
const listCard = (id: string, over: Partial<BrowseListCard> = {}): BrowseListCard =>
  ({
    oracleId: id, name: id, typeLine: "Instant", manaCost: "{U}", rarity: "common", colorIdentity: ["U"],
    imageUri: null, printedName: null, quantity: 1, setCounts: [["RTR", 1]], primarySetCode: "RTR", ...over,
  }) as BrowseListCard;

describe("quickMask", () => {
  it("sets one bit per fact the card carries", () => {
    const q = quickMask(["gameChanger", "tutor"], []);
    expect(matchesQuick({ q }, "gc")).toBe(true);
    expect(matchesQuick({ q }, "tutor")).toBe(true);
    expect(matchesQuick({ q }, "turns")).toBe(false);
    expect(matchesQuick({ q }, "mld")).toBe(false);
    expect(matchesQuick({ q }, "foil")).toBe(false);
  });

  // The review's finding: `foil` on the card is the SOLE finish of the drawn printing, so a mixed holding, or a foil
  // in another printing, drew no film and would have dropped out of the chip.
  it("counts any foil or etched copy, in any printing, as Foil", () => {
    for (const finishes of [{ foil: 1 }, { etched: 1 }, { nonfoil: 1, foil: 1 }]) {
      expect(matchesQuick({ q: quickMask(undefined, [{ finishes: { nonfoil: 2 } }, { finishes }]) }, "foil")).toBe(true);
    }
    expect(matchesQuick({ q: quickMask(undefined, [{ finishes: { nonfoil: 3, foil: 0 } }]) }, "foil")).toBe(false);
  });

  it("is 0 for a card with nothing, so the list drops the key", () => {
    expect(quickMask(undefined, [{ finishes: { nonfoil: 1 } }])).toBe(0);
    expect(matchesQuick({}, "gc")).toBe(false);
  });
});

describe("toListCards", () => {
  const base = { oracleId: "a", name: "A", printings: [{ setCode: "rtr", quantity: 1, finishes: { nonfoil: 1, foil: 1 } }] } as unknown as BrowseCard;

  it("writes q from the facts and the printings, before the printings are dropped", () => {
    const [list] = toListCards([{ ...base, facts: ["extraTurns"] }]);
    expect(matchesQuick(list, "turns")).toBe(true);
    expect(matchesQuick(list, "foil")).toBe(true);
  });

  it("drops the key when 0", () => {
    const [list] = toListCards([{ ...base, printings: [{ setCode: "rtr", quantity: 1, finishes: { nonfoil: 1 } }] } as unknown as BrowseCard]);
    expect(Object.hasOwn(list, "q")).toBe(false);
  });
});

describe("the wire", () => {
  it("keeps q on a card whose draw fields are withheld", () => {
    const cards = [listCard("a", { q: quickMask(["tutor"], []), facts: ["tutor"] }), listCard("b")];
    const decoded = decodeCollection(encodeCollection(cards, null, new Set(["b"])));
    const a = decoded.find((c) => c.oracleId === "a")!;
    expect("withheld" in a).toBe(true);
    expect(matchesQuick(a, "tutor")).toBe(true);
  });
});

describe("filterCards with a quick chip", () => {
  const list = [
    listCard("gc", { q: quickMask(["gameChanger"], []) }),
    listCard("tu", { q: quickMask(["tutor"], []), colorIdentity: ["B"] }),
    listCard("plain"),
  ];

  it.each([["gc", ["gc"]], ["tutor", ["tu"]], ["foil", []]] as const)("%s keeps its cards", (key, ids) => {
    expect(filterCards(list, { ...none, quick: key }).map((c) => c.oracleId)).toEqual(ids);
  });

  it("ANDs with the other filters", () => {
    expect(filterCards(list, { ...none, colors: ["B"], quick: "gc" })).toEqual([]);
  });
});

describe("quickCounts", () => {
  const list = [
    listCard("a", { q: quickMask(["gameChanger"], []), colorIdentity: ["B"] }),
    listCard("b", { q: quickMask(["gameChanger", "tutor"], []) }),
    listCard("c", { availability: { owned: 1, hard: 1, soft: 0, free: 0, claims: [] } }),
  ];

  it("counts the rows the other filters leave", () => {
    expect(quickCounts(list, none)).toMatchObject({ gc: 2, tutor: 1, turns: 0, free: 2 });
    expect(quickCounts(list, { ...none, colors: ["B"] })).toMatchObject({ gc: 1, tutor: 0 });
  });

  it("keeps a pressed chip's own figure", () => {
    expect(quickCounts(list, { ...none, quick: "gc" }).gc).toBe(2);
  });

  it("counts In no deck without the availability selection, which is the chip's own", () => {
    expect(quickCounts(list, { ...none, availability: ["free"] }).free).toBe(2);
    expect(quickCounts(list, { ...none, availability: ["hard"] }).free).toBe(2);
  });
});

// The figure on a chip is the length of the list its press shows: `pressQuick` (browser.tsx) sets the chip, takes the
// free-only selection back out for a fact or foil chip, and sets it for In no deck. Pinned from rest and from In no deck.
describe("quickCounts equals the list the chip's press shows", () => {
  const free = { owned: 1, hard: 0, soft: 0, free: 1, claims: [] };
  const list = [
    listCard("a", { q: quickMask(["gameChanger"], []), availability: free }),
    listCard("b", { q: quickMask(["gameChanger", "tutor"], []) }),
    listCard("c", { q: quickMask(["extraTurns"], []), availability: free }),
    listCard("d", { q: quickMask(undefined, [{ finishes: { foil: 1 } }]) }),
  ];
  const press = (f: BrowseFilters, key: "free" | (typeof QUICK_KEYS)[number]): BrowseFilters =>
    key === "free"
      ? { ...f, quick: undefined, availability: ["free"] }
      : { ...f, quick: key, availability: isFreeAlone(f) ? [] : f.availability };

  it.each([
    ["rest", none],
    ["In no deck pressed", { ...none, availability: ["free"] } as BrowseFilters],
    ["a colour held", { ...none, colors: ["U"] } as BrowseFilters],
  ])("from %s", (_name, from) => {
    const counts = quickCounts(list, from);
    for (const key of ["free", ...QUICK_KEYS] as const) {
      expect(counts[key], key).toBe(filterCards(list, press(from, key)).length);
    }
  });
});

describe("the URL", () => {
  it.each(QUICK_KEYS)("reads quick=%s", (key) => {
    expect(params(`quick=${key}`).filters.quick).toBe(key);
  });

  it("falls back to no chip on an unknown value", () => {
    for (const qs of ["quick=nope", "quick=", "quick=GC", ""]) expect(params(qs).filters.quick).toBeUndefined();
    expect(parseQuick(null)).toBeUndefined();
  });

  // One chip at a time: In no deck is `avail=free`, so a link naming both keeps the availability.
  it("keeps avail=free and drops a quick chip beside it", () => {
    const { filters } = params("avail=free&quick=gc");
    expect(filters.quick).toBeUndefined();
    expect(isFreeAlone(filters)).toBe(true);
  });

  it("lets a quick chip stand beside another availability", () => {
    expect(params("avail=inuse&quick=gc").filters.quick).toBe("gc");
  });
});
