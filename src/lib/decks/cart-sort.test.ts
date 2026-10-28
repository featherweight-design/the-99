import { describe, expect, it } from "vitest";
import type { SelectedLine } from "./cart";
import {
  CART_SORTS, DEFAULT_SORTS, MAX_QUERY, byCardOrder, cardCompare, deckCents, lineCents, matchesQuery, parseQuery,
  parseSort, searchLines, sortDecks, sortGroups,
} from "./cart-sort";

function line(name: string, over: Partial<SelectedLine> & { decks?: number } = {}): SelectedLine {
  const { decks = 1, ...rest } = over;
  return {
    oracleId: name.toLowerCase(), name, commander: false, owned: 0, heldElsewhere: 0, heldBy: [], rows: [],
    selectedRows: Array.from({ length: decks }, () => ({}) as SelectedLine["selectedRows"][number]),
    copies: decks, cents: 100, pricedCopies: 1,
    ...rest,
  };
}
const names = (ls: SelectedLine[]) => ls.map((l) => l.name);

describe("parseSort", () => {
  it("reads a value the view offers and anything else as that view's default (A15)", () => {
    expect(parseSort("card", "price-low")).toBe("price-low");
    expect(parseSort("deck", "cost")).toBe("cost");
    // `cost` belongs to By deck: on By card it is no sort at all.
    expect(parseSort("card", "cost")).toBe(DEFAULT_SORTS.card);
    expect(parseSort("friend", "price-high")).toBe(DEFAULT_SORTS.friend);
    expect(parseSort("deck", null)).toBe(DEFAULT_SORTS.deck);
    expect(parseSort("card", "")).toBe(DEFAULT_SORTS.card);
  });

  it("makes the first of each view's orders its default, as the handoff lists them", () => {
    for (const view of ["card", "deck", "friend"] as const) expect(CART_SORTS[view][0]).toBe(DEFAULT_SORTS[view]);
  });
});

describe("search", () => {
  it("matches a card's name case-blind, either face of a two-faced card, and everything when empty", () => {
    expect(matchesQuery("Sol Ring", "sol")).toBe(true);
    expect(matchesQuery("Sol Ring", "  RING ")).toBe(true);
    expect(matchesQuery("Delver of Secrets // Insectile Aberration", "aberration")).toBe(true);
    expect(matchesQuery("Sol Ring", "tower")).toBe(false);
    expect(matchesQuery("Sol Ring", "   ")).toBe(true);
  });

  it("caps what the address can hand it", () => {
    expect(parseQuery("x".repeat(MAX_QUERY + 40))).toHaveLength(MAX_QUERY);
    expect(parseQuery(null)).toBe("");
    expect(parseQuery("  sol ")).toBe("sol");
    expect(parseQuery("   ")).toBe("");
  });

  it("narrows lines and leaves them in order", () => {
    const ls = [line("Sol Ring"), line("Arcane Signet"), line("Solemn Simulacrum")];
    expect(names(searchLines(ls, "sol"))).toEqual(["Sol Ring", "Solemn Simulacrum"]);
    expect(searchLines(ls, "")).toHaveLength(3);
  });
});

describe("By card orders", () => {
  const none = () => 0;
  const ls = [
    line("Cheap", { cents: 50, decks: 1 }),
    line("Dear", { cents: 900, decks: 2 }),
    line("Unpriced", { cents: 0, pricedCopies: 0, decks: 3 }),
    line("Mid", { cents: 300, decks: 1 }),
    line("Cmdr", { commander: true, cents: 10, decks: 1 }),
  ];

  it("keeps the shipped order as Most decks: commanders first, then most decks, then A to Z", () => {
    expect(names([...ls].sort(cardCompare("decks", none)))).toEqual(["Cmdr", "Unpriced", "Dear", "Cheap", "Mid"]);
    expect(names([...ls].sort(byCardOrder))).toEqual(names([...ls].sort(cardCompare("decks", none))));
  });

  it("puts an unpriced line last in BOTH price directions (G4)", () => {
    expect(names([...ls].sort(cardCompare("price-high", none)))).toEqual(["Dear", "Mid", "Cheap", "Cmdr", "Unpriced"]);
    expect(names([...ls].sort(cardCompare("price-low", none)))).toEqual(["Cmdr", "Cheap", "Mid", "Dear", "Unpriced"]);
  });

  it("reads a sold-out line as unpriced, and a priced copy's sum as its figure", () => {
    expect(lineCents({ pricedCopies: 0, cents: 0 })).toBeNull();
    expect(lineCents({ pricedCopies: 2, cents: 0 })).toBeNull();
    expect(lineCents({ pricedCopies: 2, cents: 640 })).toBe(640);
  });

  it("orders by friends' spare copies, none last, ties by the shipped order", () => {
    const spare = (id: string) => ({ dear: 2, cheap: 2, mid: 5 })[id] ?? 0;
    expect(names([...ls].sort(cardCompare("spare", spare)))).toEqual(["Mid", "Dear", "Cheap", "Cmdr", "Unpriced"]);
  });

  it("orders by name alone, commanders no longer leading", () => {
    expect(names([...ls].sort(cardCompare("name", none)))).toEqual(["Cheap", "Cmdr", "Dear", "Mid", "Unpriced"]);
  });
});

describe("By deck orders", () => {
  const decks = [
    { name: "Kratos", cents: 3815, pricedCopies: 11 },
    { name: "Gishath", cents: 6140, pricedCopies: 18 },
    { name: "Brew", cents: 0, pricedCopies: 0 },
    { name: "Elves", cents: 2770, pricedCopies: 9 },
  ];
  it("keeps the read's order as Largest first", () => {
    expect(sortDecks(decks, "largest").map((d) => d.name)).toEqual(["Kratos", "Gishath", "Brew", "Elves"]);
  });
  it("orders by deck cents with an unpriced deck last, and by name", () => {
    expect(sortDecks(decks, "cost").map((d) => d.name)).toEqual(["Gishath", "Kratos", "Elves", "Brew"]);
    expect(sortDecks(decks, "name").map((d) => d.name)).toEqual(["Brew", "Elves", "Gishath", "Kratos"]);
    expect(deckCents({ cents: 0, pricedCopies: 3 })).toBeNull();
  });
});

describe("By friend orders", () => {
  const g = (name: string, spares: number, lines: number) => ({
    friend: { displayName: name, publicId: `p-${name}` }, spares, lines: Array.from({ length: lines }, () => 0),
  });
  const groups = [g("Chris", 4, 2), g("Colin", 5, 1), g("Max", 4, 3), g("Peter", 1, 1)];
  it("orders by spares (the shipped order), by cards, and by name", () => {
    expect(sortGroups(groups, "spare").map((x) => x.friend.displayName)).toEqual(["Colin", "Chris", "Max", "Peter"]);
    expect(sortGroups(groups, "cards").map((x) => x.friend.displayName)).toEqual(["Max", "Chris", "Colin", "Peter"]);
    expect(sortGroups(groups, "name").map((x) => x.friend.displayName)).toEqual(["Chris", "Colin", "Max", "Peter"]);
  });
});
