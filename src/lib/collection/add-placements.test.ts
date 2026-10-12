import { describe, expect, it } from "vitest";
import { placedOf, whereItWent, type AddedPlacement } from "./add-placements";
import { addedCopyCopy as copy } from "../copy/added-copy";
import type { Availability } from "../decks/availability";

const claim = (id: string, name: string, since: number | null, granted = 0, mature = true) =>
  ({ id, name, quantity: 1, mature, since, granted }) as Availability["claims"][number];

describe("placedOf", () => {
  it("names the deck the save's copy went to, with a chooser built from the same read", () => {
    const after = { owned: 2, claims: [claim("a", "HD - Senior", 1), claim("b", "HD - Brago", 2)] } as Availability;
    const [p] = placedOf({ sol: { after, brought: 1, reservations: [] } }, { sol: "Sol Ring" });
    expect(p.went).toEqual({ kind: "held", decks: [{ deckId: "b", copies: 1, picked: false }], copies: 1, ownedBefore: 1 });
    expect(p.chooser).toMatchObject({ oracleId: "sol", cardName: "Sol Ring", arrived: 1, ownedBefore: 1, fromImport: true, owned: 2 });
    expect(p.chooser.claimants.map((c) => c.allocated)).toEqual([1, 1]);
  });

  it("leaves out a card whose copy no deck took or read", () => {
    const after = { owned: 2, claims: [claim("a", "HD - Senior", 1)] } as Availability;
    expect(placedOf({ sol: { after, brought: 1, reservations: [] } }, {})).toEqual([]);
  });
});

describe("whereItWent", () => {
  const placed = (oracleId: string, cardName: string): AddedPlacement => ({
    oracleId, cardName,
    went: { kind: "held", decks: [{ deckId: "b", copies: 1, picked: false }], copies: 1, ownedBefore: 0 },
    chooser: { oracleId, cardName, arrived: 1, ownedBefore: 0, fromImport: true, owned: 1, claimants: [
      { deckId: "b", deckName: "HD - Brago", quantity: 1, commanderCopies: 0, granted: 0, since: 1, versionNumber: 1, allocated: 1 },
    ] },
  });

  it("draws a row per card a deck took, in the sheet's order, in the long form", () => {
    const out = whereItWent([{ oracleId: "x", name: "Arcane Signet" }, { oracleId: "sol", name: "Sol Ring" }], [placed("sol", "Sol Ring"), placed("x", "Arcane Signet")]);
    expect(out.rows.map((r) => r.sentence)).toEqual([
      copy.line.goesTo("Arcane Signet", "HD - Brago"), copy.line.goesTo("Sol Ring", "HD - Brago"),
    ]);
    expect(out.rows.map((r) => r.decks)).toEqual([["HD - Brago"], ["HD - Brago"]]);
    expect(out.foot).toBeNull();
  });

  it("names a lone free card in the foot, counts the others under rows, and says `these` with no rows (L9)", () => {
    expect(whereItWent([{ oracleId: "sol", name: "Sol Ring" }, { oracleId: "g", name: "Lightning Greaves" }], [placed("sol", "Sol Ring")]).foot)
      .toBe(copy.line.nobodyOne("Lightning Greaves"));
    expect(whereItWent(
      [{ oracleId: "sol", name: "Sol Ring" }, { oracleId: "g", name: "Lightning Greaves" }, { oracleId: "h", name: "Swiftfoot Boots" }],
      [placed("sol", "Sol Ring")],
    ).foot).toBe(copy.line.nobodyRest(2));
    expect(whereItWent([{ oracleId: "g", name: "Lightning Greaves" }, { oracleId: "h", name: "Swiftfoot Boots" }], []))
      .toEqual({ rows: [], foot: copy.line.nobodyMany });
  });

  it("counts a card listed twice once", () => {
    expect(whereItWent([{ oracleId: "g", name: "Lightning Greaves" }, { oracleId: "g", name: "Lightning Greaves" }], []).foot)
      .toBe(copy.line.nobodyOne("Lightning Greaves"));
  });
});
