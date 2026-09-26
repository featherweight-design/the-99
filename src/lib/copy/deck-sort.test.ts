import { describe, expect, it } from "vitest";
import {
  DECK_DEFAULT_SORT_DIRECTION,
  buildDeckSortOptions,
  deckSortCopy,
  deckSortOrderLabel,
  nextDeckSortState,
} from "./deck-sort";

describe("the orders a key names", () => {
  it("names each key's own two directions rather than saying ascending", () => {
    expect(deckSortOrderLabel("name", "asc")).toBe("Name · A–Z");
    expect(deckSortOrderLabel("name", "desc")).toBe("Name · Z–A");
    expect(deckSortOrderLabel("price", "asc")).toBe("Price · Lowest");
    expect(deckSortOrderLabel("price", "desc")).toBe("Price · Highest");
    expect(deckSortOrderLabel("mana", "asc")).toBe("Mana value · Curve up");
    expect(deckSortOrderLabel("mana", "desc")).toBe("Mana value · Curve down");
  });

  // #629 shipped the Shopping list highest-first on 2026-09-14, and this control
  // names that order rather than replacing it. A default of `asc` here would
  // silently re-sort every shopping list in the app on deploy.
  it("defaults price to highest-first, and the other two to ascending", () => {
    expect(DECK_DEFAULT_SORT_DIRECTION).toEqual({ name: "asc", price: "desc", mana: "asc" });
  });
});

describe("the rows one lane offers", () => {
  it("offers price under Shopping and withholds it under All", () => {
    expect(buildDeckSortOptions("all", "name", "asc").map((o) => o.code))
      .toEqual(["name", "mana"]);
    expect(buildDeckSortOptions("shopping", "name", "asc").map((o) => o.code))
      .toEqual(["name", "price", "mana"]);
  });

  // Absent rather than disabled: the order is not unavailable on that lane, it
  // is not a question there — and a greyed row would advertise it anyway.
  it("does not draw price as a disabled row under All", () => {
    expect(buildDeckSortOptions("all", "name", "asc").some((o) => o.disabled)).toBe(false);
  });

  it("hints exactly one row, and it is the chosen one", () => {
    const rows = buildDeckSortOptions("shopping", "price", "desc");
    expect(rows.filter((r) => r.hint !== undefined).map((r) => [r.code, r.hint]))
      .toEqual([["price", "Highest"]]);
  });
});

describe("picking a row", () => {
  it("adopts a new key's own default direction", () => {
    expect(nextDeckSortState({ key: "name", direction: "desc" }, "price"))
      .toEqual({ key: "price", direction: "desc" });
    expect(nextDeckSortState({ key: "price", direction: "desc" }, "mana"))
      .toEqual({ key: "mana", direction: "asc" });
  });

  // The re-pick IS the direction control — there is no asc/desc affordance, by
  // the brief's §2.2 and /collection's own ruling.
  it("reverses the key already chosen", () => {
    expect(nextDeckSortState({ key: "name", direction: "asc" }, "name"))
      .toEqual({ key: "name", direction: "desc" });
    expect(nextDeckSortState({ key: "name", direction: "desc" }, "name"))
      .toEqual({ key: "name", direction: "asc" });
  });
});

describe("the copy block", () => {
  // The one departure from `collectionFilterCopy.sort`. The prefix costs 38px,
  // which is the view well's place on the phone's arrangement line.
  it("prints the order with no `Sort:` prefix", () => {
    expect(deckSortCopy.triggerOne!("Name · A–Z")).toBe("Name · A–Z");
  });

  // Nothing else on screen says a second press reverses, so the chosen row's
  // accessible name is the only place the rule is stated.
  it("tells a screen reader that choosing the current order again reverses it", () => {
    expect(deckSortCopy.optionAria("Name · A–Z", 0, true))
      .toBe("Name · A–Z, current order, choose again to reverse");
    expect(deckSortCopy.optionAria("Price · Highest", 0, false)).toBe("Price · Highest");
  });

  it("names the list rather than the cards, because the page holds one list", () => {
    expect(deckSortCopy.panelAriaLabel).toBe("Sort the deck list");
  });
});
