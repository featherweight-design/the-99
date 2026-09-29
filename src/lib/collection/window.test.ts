import { describe, expect, it } from "vitest";
import { filterCards, sortCards, type BrowseListCard } from "./browse";
import { PAGE_SIZE, firstWindowIds, parseBrowseParams } from "./window";

const params = (qs: string, ok = true) => {
  const q = new URLSearchParams(qs);
  return parseBrowseParams((k) => q.get(k), ok);
};

const card = (i: number, over: Partial<BrowseListCard> = {}): BrowseListCard => ({
  oracleId: `o${i}`, name: `Card ${String(i).padStart(3, "0")}`, typeLine: i % 2 ? "Instant" : "Creature — Elf",
  manaCost: "{G}", rarity: i % 3 ? "common" : "rare", colorIdentity: i % 2 ? ["U"] : ["G"],
  imageUri: null, printedName: null, quantity: (i % 4) + 1, setCounts: [["RTR", 1]], primarySetCode: "RTR",
  ...over,
} as BrowseListCard);

describe("parseBrowseParams", () => {
  it("reads every parameter the browser reads", () => {
    const p = params("q=elf&c=G&t=Creature&sort=quantity&dir=asc");
    expect(p.filters.search).toBe("elf");
    expect(p.filters.colors).toEqual(["G"]);
    expect(p.filters.types).toEqual(["Creature"]);
    expect(p.sort).toBe("quantity");
    expect(p.direction).toBe("asc");
  });

  it("falls back to the default for an unknown sort, and ignores availability it cannot read", () => {
    const p = params("sort=nonsense&avail=free", false);
    expect(p.sort).toBe("name");
    expect(p.filters.availability).toEqual([]);
  });
});

describe("firstWindowIds", () => {
  const cards = Array.from({ length: 450 }, (_, i) => card(i));

  // The page's cut and the browser's window are one set of steps: this is the browser's own
  // pipeline written out, and the two must name the same cards for every URL.
  it.each(["", "sort=quantity&dir=asc", "c=G&sort=rarity", "q=card 1", "t=Instant&sort=name&dir=desc"])(
    "names exactly the browser's first window for %j",
    (qs) => {
      const p = params(qs);
      const browser = sortCards(filterCards(cards, p.filters), p.sort, p.direction).slice(0, PAGE_SIZE);
      expect([...firstWindowIds(cards, p)]).toEqual(browser.map((c) => c.oracleId));
    },
  );

  it("names no more than one window", () => {
    expect(firstWindowIds(cards, params("")).size).toBe(PAGE_SIZE);
  });
});
