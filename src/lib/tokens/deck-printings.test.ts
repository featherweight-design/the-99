import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));

import { chooseTokenPrinting, orderHeld } from "./deck-printings";
import { assembleTokenDetail } from "./detail";

const art = () => true;

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
    expect(chooseTokenPrinting(null, [{ tokenPrintingId: "a", quantity: 5 }, { tokenPrintingId: "b", quantity: 1 }], "c", (id) => id === "b"))
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
