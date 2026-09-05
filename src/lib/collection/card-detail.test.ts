import { describe, expect, it } from "vitest";
import { catalogCard, type CatalogCardRow, type CatalogPrintingRow } from "./card-detail";

const card = (over: Partial<CatalogCardRow> = {}): CatalogCardRow => ({
  oracleId: "o-1",
  scryfallId: "s-default",
  name: "Arcane Signet",
  typeLine: "Artifact",
  manaCost: "{2}",
  oracleText: "{T}: Add one mana of any color in your commander's identity.",
  keywords: [],
  rarity: "common",
  colorIdentity: [],
  imageUri: "https://img/oracle.jpg",
  ...over,
});

// The default id is deliberately NOT the card's: most of these cases exercise the
// fallback, which is what a card whose default printing never ingested falls to.
const printing = (over: Partial<CatalogPrintingRow> = {}): CatalogPrintingRow => ({
  scryfallId: "s-other",
  setCode: "c21",
  setName: "Commander 2021",
  collectorNumber: "263",
  releasedAt: "2021-04-23",
  imageUri: "https://img/c21-263.jpg",
  ...over,
});

describe("catalogCard", () => {
  it("carries the oracle fields through", () => {
    const c = catalogCard(card(), [printing()]);
    expect(c).toMatchObject({
      oracleId: "o-1",
      name: "Arcane Signet",
      typeLine: "Artifact",
      manaCost: "{2}",
      keywords: [],
      colorIdentity: [],
      rarity: "common",
    });
  });

  it("reports zero owned copies and no art preference", () => {
    const c = catalogCard(card(), [printing(), printing({ collectorNumber: "264" })]);
    expect(c.quantity).toBe(0);
    expect(c.preferredPrinting).toBeNull();
    expect(c.printings.every((p) => p.quantity === 0)).toBe(true);
    expect(c.printings.every((p) => Object.keys(p.finishes).length === 0)).toBe(true);
  });

  it("uppercases set codes for display, as owned printings are", () => {
    const c = catalogCard(card(), [printing({ setCode: "znr" })]);
    expect(c.printings[0].setCode).toBe("ZNR");
    expect(c.setCodes).toEqual(["ZNR"]);
  });

  it("sorts printings and de-duplicates set codes", () => {
    const c = catalogCard(card(), [
      printing({ setCode: "znr", collectorNumber: "12" }),
      printing({ setCode: "c21", collectorNumber: "263" }),
      printing({ setCode: "c21", collectorNumber: "9" }),
    ]);
    expect(c.printings.map((p) => `${p.setCode}-${p.collectorNumber}`))
      .toEqual(["C21-9", "C21-263", "ZNR-12"]);
    expect(c.setCodes).toEqual(["C21", "ZNR"]);
  });

  it("falls a printing with no art back to the oracle-level image", () => {
    const c = catalogCard(card(), [printing({ imageUri: null })]);
    expect(c.printings[0].imageUri).toBe("https://img/oracle.jpg");
  });

  // The tile that opened this modal draws the oracle-level image, so the modal has to
  // land on the printing that image came from — not on whichever set code sorts first.
  it("takes art and primary set from the printing the oracle image came from", () => {
    const c = catalogCard(card(), [
      printing({ setCode: "aaa", imageUri: "https://img/aaa.jpg" }),
      printing({ scryfallId: "s-default", setCode: "znr", imageUri: "https://img/znr.jpg" }),
    ]);
    expect(c.imageUri).toBe("https://img/znr.jpg");
    expect(c.primarySetCode).toBe("ZNR");
  });

  it("takes art and primary set from the first printing that has art", () => {
    const c = catalogCard(card({ imageUri: null }), [
      printing({ setCode: "aaa", imageUri: null }),
      printing({ setCode: "bbb", imageUri: "https://img/bbb.jpg" }),
    ]);
    expect(c.imageUri).toBe("https://img/bbb.jpg");
    expect(c.primarySetCode).toBe("BBB");
  });

  // A `cards` row whose printings never ingested still has to open — the modal
  // falls through to the identity gradient rather than rendering nothing.
  it("survives a card with no printings", () => {
    const c = catalogCard(card({ imageUri: null }), []);
    expect(c.printings).toEqual([]);
    expect(c.setCodes).toEqual([]);
    expect(c.primarySetCode).toBe("");
    expect(c.imageUri).toBeNull();
  });

  it("coerces a rarity outside the known vocabulary to common", () => {
    expect(catalogCard(card({ rarity: "bonus" }), []).rarity).toBe("common");
    expect(catalogCard(card({ rarity: "mythic" }), []).rarity).toBe("mythic");
  });
});
