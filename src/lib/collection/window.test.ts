import { describe, expect, it } from "vitest";
import { filterCards, sortCards, type BrowseListCard } from "./browse";
import { PAGE_SIZE, firstWindowIds, pageWindowIds, parseBrowseParams } from "./window";
import { decodeCollection, encodeCollection } from "./list-wire";
import type { AvailabilitySummary } from "../decks/availability";

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

  // H10: the colour match, the lanes' and Sets' `m=exact`. Parsed here, by the function the page
  // cuts its first window with, so the rows drawn first honour it too.
  it("reads m=exact as an exact colour match, and anything else as contains", () => {
    expect(params("c=R&m=exact").filters.match).toBe("exactly");
    for (const qs of ["c=R", "c=R&m=Exact", "c=R&m=1", "c=R&m="]) {
      expect(params(qs).filters.match).toBe("contains");
    }
  });

  // Sets' rule (#1172): with no colour this page recognises there is nothing to be exact about.
  it.each(["m=exact", "m=exact&c=Z"])("reads %s, with no colour it knows, as contains", (qs) => {
    expect(params(qs).filters.match).toBe("contains");
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

// THE PAGE'S CUT reads a list with no availability on it and joins the reading the page loaded
// beside it. `?avail=` is the one filter whose input the two sides hold differently, so the cut is
// compared with what the BROWSER filters: the decoded wire, which carries the reading on each card.
describe("pageWindowIds", () => {
  const cards = Array.from({ length: 450 }, (_, i) => card(i));
  const summary = (hard: number): AvailabilitySummary => ({ owned: 1, hard, soft: 0, free: hard ? 0 : 1, claims: [] });
  // Every third card is sleeved into a deck; the rest are free.
  const availability = new Map(cards.map((c, i) => [c.oracleId, summary(i % 3 === 0 ? 1 : 0)] as const));
  const decoded = decodeCollection(encodeCollection(cards, availability)) as BrowseListCard[];

  it.each(["avail=inuse", "avail=free&sort=quantity", "avail=inuse&c=G", ""])(
    "names the browser's own first window for %j",
    (qs) => {
      const q = new URLSearchParams(qs);
      const p = parseBrowseParams((k) => q.get(k), true);
      const browser = sortCards(filterCards(decoded, p.filters), p.sort, p.direction).slice(0, PAGE_SIZE);
      expect([...pageWindowIds(cards, availability, (k) => q.get(k))]).toEqual(browser.map((c) => c.oracleId));
    },
  );
});

describe("the Price sort's first window", () => {
  it("ships the cards the browser draws first whole, and the price rides every card on the wire", () => {
    // Priced from the bottom of the name order up, so the price window differs from the name one.
    const cards = Array.from({ length: PAGE_SIZE + 40 }, (_, i) => card(i, i % 5 === 0 ? {} : { price: i * 8 }));
    const p = params("sort=price");
    expect(p.sort).toBe("price");
    expect(p.direction).toBe("desc");
    const keep = firstWindowIds(cards, p);
    const drawnFirst = sortCards(filterCards(cards, p.filters), "price", "desc").slice(0, PAGE_SIZE).map((c) => c.oracleId);
    expect([...keep].sort()).toEqual([...drawnFirst].sort());
    expect(keep.has(`o${PAGE_SIZE + 39}`)).toBe(true);
    // 192 priced cards fill the top of the window; the unpriced follow A to Z, so the first eight
    // of them make it in and the rest do not.
    expect(keep.has("o0")).toBe(true);
    expect(keep.has("o40")).toBe(false);
    const decoded = decodeCollection(encodeCollection(cards, null));
    expect(decoded.map((c) => c.price)).toEqual(cards.map((c) => c.price));
  });
});
