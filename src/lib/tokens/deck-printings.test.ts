import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));

import { chooseTokenPrinting, heldGroups, orderHeld } from "./deck-printings";
import { assembleTokenDetail } from "./detail";

// Each id is its own set and number unless a test says otherwise; `withArt` says which carry an image.
const facts = (withArt: (id: string) => boolean) => (id: string) => ({ setCode: id, collectorNumber: "1", imageUri: withArt(id) ? `img-${id}` : null });
const art = facts(() => true);

describe("chooseTokenPrinting", () => {
  it("takes the deck's pick while it is held", () => {
    expect(chooseTokenPrinting("b", [{ tokenPrintingId: "a", quantity: 3 }, { tokenPrintingId: "b", quantity: 1 }], "c", art))
      .toEqual({ tokenPrintingId: "b", source: "deck" });
  });

  it("ignores a pick no longer held, for the most-held printing", () => {
    expect(chooseTokenPrinting("x", [{ tokenPrintingId: "a", quantity: 1 }, { tokenPrintingId: "b", quantity: 3 }], "c", art))
      .toEqual({ tokenPrintingId: "b", source: "held" });
  });

  it("passes over a held printing with no art when another has some", () => {
    expect(chooseTokenPrinting(null, [{ tokenPrintingId: "a", quantity: 5 }, { tokenPrintingId: "b", quantity: 1 }], "c", facts((id) => id === "b")))
      .toEqual({ tokenPrintingId: "b", source: "held" });
  });

  it("falls back to the catalog's printing, and to nothing", () => {
    expect(chooseTokenPrinting("x", [], "c", art)).toEqual({ tokenPrintingId: "c", source: "catalog" });
    expect(chooseTokenPrinting(null, [], null, art)).toBeNull();
  });

  it("orders ties by id, never by the read's row order", () => {
    expect(orderHeld([{ tokenPrintingId: "b", quantity: 2 }, { tokenPrintingId: "a", quantity: 2 }]).map((h) => h.tokenPrintingId))
      .toEqual(["a", "b"]);
  });
});

describe("assembleTokenDetail with held printings", () => {
  const token = { oracleId: "t", name: "Soldier", typeLine: "Token Creature — Soldier", colors: ["W"], oracleText: null, layout: "token" };
  const p = (scryfallId: string, setCode: string, imageUri: string | null = `img-${scryfallId}`) =>
    ({ scryfallId, setCode, collectorNumber: "1", imageUri, backImageUri: null });

  it("lists only the shown printing, at no copies, when the player holds none", () => {
    const card = assembleTokenDetail(token, [p("a", "aaa"), p("b", "bbb")], null, null);
    expect(card.printings.map((x) => [x.scryfallId, x.quantity])).toEqual([["a", 0]]);
  });

  it("lists the held printings, most copies first, and shows the first with art", () => {
    const card = assembleTokenDetail(token, [p("a", "aaa"), p("b", "bbb", null), p("c", "ccc")], null, null,
      [{ tokenPrintingId: "c", quantity: 1 }, { tokenPrintingId: "b", quantity: 4 }]);
    expect(card.printings.map((x) => [x.scryfallId, x.setCode, x.quantity])).toEqual([["b", "BBB", 4], ["c", "CCC", 1]]);
    expect(card.imageUri).toBe("img-c");
  });
});

describe("when no held printing has art", () => {
  it("the row takes the catalog's picture, and a held one only when the catalog has none", () => {
    expect(chooseTokenPrinting(null, [{ tokenPrintingId: "a", quantity: 5 }], "c", facts((id) => id === "c")))
      .toEqual({ tokenPrintingId: "c", source: "catalog" });
    expect(chooseTokenPrinting(null, [{ tokenPrintingId: "a", quantity: 5 }], null, facts(() => false)))
      .toEqual({ tokenPrintingId: "a", source: "held" });
    // An explicit pick still wins, art or none.
    expect(chooseTokenPrinting("a", [{ tokenPrintingId: "a", quantity: 5 }], "c", facts((id) => id === "c")))
      .toEqual({ tokenPrintingId: "a", source: "deck" });
  });

  it("the sheet shows the catalog's art, listed after the held rows at no copies", () => {
    const token = { oracleId: "t", name: "Soldier", typeLine: "Token Creature — Soldier", colors: ["W"], oracleText: null, layout: "token" };
    const card = assembleTokenDetail(token, [
      // The catalog's own choice (first by set) is "c", which has art; the held "a" has none.
      { scryfallId: "a", setCode: "zzz", collectorNumber: "1", imageUri: null, backImageUri: null },
      { scryfallId: "c", setCode: "ccc", collectorNumber: "1", imageUri: "img-c", backImageUri: null },
    ], null, null, [{ tokenPrintingId: "a", quantity: 2 }]);
    expect(card.imageUri).toBe("img-c");
    expect(card.printings.map((x) => [x.scryfallId, x.quantity])).toEqual([["a", 2], ["c", 0]]);
  });
});

describe("held sibling variants in the details sheet", () => {
  it("are one row per set and number, the most-held standing for both, with their copies summed", () => {
    const token = { oracleId: "t", name: "Soldier", typeLine: "Token Creature — Soldier", colors: ["W"], oracleText: null, layout: "token" };
    const card = assembleTokenDetail(token, [
      { scryfallId: "a", setCode: "aaa", collectorNumber: "1", imageUri: "img-a", backImageUri: null },
      { scryfallId: "a2", setCode: "aaa", collectorNumber: "1", imageUri: "img-a2", backImageUri: null },
      { scryfallId: "b", setCode: "bbb", collectorNumber: "2", imageUri: "img-b", backImageUri: null },
    ], null, null, [{ tokenPrintingId: "a", quantity: 1 }, { tokenPrintingId: "a2", quantity: 3 }, { tokenPrintingId: "b", quantity: 2 }]);
    expect(card.printings.map((x) => [x.scryfallId, x.quantity])).toEqual([["a2", 4], ["b", 2]]);
  });
});

describe("held sibling variants where only one has art", () => {
  it("the tile stands for the one with art, so the sheet and the row agree", () => {
    const token = { oracleId: "t", name: "Soldier", typeLine: "Token Creature — Soldier", colors: ["W"], oracleText: null, layout: "token" };
    const card = assembleTokenDetail(token, [
      { scryfallId: "a", setCode: "aaa", collectorNumber: "1", imageUri: null, backImageUri: null },
      { scryfallId: "a2", setCode: "aaa", collectorNumber: "1", imageUri: "img-a2", backImageUri: null },
    ], null, null, [{ tokenPrintingId: "a", quantity: 4 }, { tokenPrintingId: "a2", quantity: 1 }]);
    expect(card.printings.map((x) => [x.scryfallId, x.quantity])).toEqual([["a2", 5]]);
    expect(card.imageUri).toBe("img-a2");
  });
});

describe("heldGroups: the one list the deck's row and the sheet read", () => {
  // a and a2 are siblings (one set and number); a has no art.
  const siblings = (id: string) => ({
    a: { setCode: "aaa", collectorNumber: "1", imageUri: null },
    a2: { setCode: "AAA", collectorNumber: "1", imageUri: "img-a2" },
    b: { setCode: "bbb", collectorNumber: "2", imageUri: "img-b" },
  } as Record<string, { setCode: string; collectorNumber: string; imageUri: string | null }>)[id];

  it("sums a pair, stands it for its member with art, and orders the groups by their sums", () => {
    expect(heldGroups([{ tokenPrintingId: "a", quantity: 4 }, { tokenPrintingId: "a2", quantity: 1 }, { tokenPrintingId: "b", quantity: 3 }], siblings))
      .toEqual([{ tokenPrintingId: "a2", quantity: 5 }, { tokenPrintingId: "b", quantity: 3 }]);
  });

  it("makes the row and the sheet show the same printing for an unpicked token", () => {
    const held = [{ tokenPrintingId: "a", quantity: 4 }, { tokenPrintingId: "a2", quantity: 1 }, { tokenPrintingId: "b", quantity: 3 }];
    const row = chooseTokenPrinting(null, held, null, siblings);
    const token = { oracleId: "t", name: "Soldier", typeLine: "Token Creature — Soldier", colors: ["W"], oracleText: null, layout: "token" };
    const card = assembleTokenDetail(token, ["a", "a2", "b"].map((id) => ({ scryfallId: id, ...siblings(id)!, backImageUri: null })), null, null, held);
    expect(row?.tokenPrintingId).toBe("a2");
    expect(card.imageUri).toBe("img-a2");
    expect(card.printings.find((p) => p.imageUri !== null)?.scryfallId).toBe("a2");
  });
});
