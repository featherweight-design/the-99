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
    const out = whereItWent([{ oracleId: "x", name: "Arcane Signet", quantity: 1 }, { oracleId: "sol", name: "Sol Ring", quantity: 1 }], [placed("sol", "Sol Ring"), placed("x", "Arcane Signet")]);
    expect(out.rows.map((r) => r.sentence)).toEqual([
      copy.line.goesTo("Arcane Signet", "HD - Brago"), copy.line.goesTo("Sol Ring", "HD - Brago"),
    ]);
    expect(out.rows.map((r) => r.parts.filter((p) => p.em === "deck").map((p) => p.text))).toEqual([["HD - Brago"], ["HD - Brago"]]);
    expect(out.foot).toBeNull();
  });

  it("names a lone free card in the foot, counts the others under rows, and says `these` with no rows (L9)", () => {
    expect(whereItWent([{ oracleId: "sol", name: "Sol Ring", quantity: 1 }, { oracleId: "g", name: "Lightning Greaves", quantity: 1 }], [placed("sol", "Sol Ring")]).foot)
      .toBe(copy.line.nobodyOne("Lightning Greaves"));
    expect(whereItWent(
      [{ oracleId: "sol", name: "Sol Ring", quantity: 1 }, { oracleId: "g", name: "Lightning Greaves", quantity: 1 }, { oracleId: "h", name: "Swiftfoot Boots", quantity: 1 }],
      [placed("sol", "Sol Ring")],
    ).foot).toBe(copy.line.nobodyRest(2));
    expect(whereItWent([{ oracleId: "g", name: "Lightning Greaves", quantity: 1 }, { oracleId: "h", name: "Swiftfoot Boots", quantity: 1 }], []))
      .toEqual({ rows: [], foot: copy.line.nobodyMany });
  });

  it("accounts for every copy: the rest of a card a deck took fewer of, and each copy of a free line", () => {
    // Three Sol Rings, one taken: the row, and the other two in the foot.
    const solThree = [{ oracleId: "sol", name: "Sol Ring", quantity: 3 }];
    const one = whereItWent(solThree, [placed("sol", "Sol Ring")]);
    expect(one.rows.map((r) => r.sentence)).toEqual([copy.line.goesTo("Sol Ring", "HD - Brago")]);
    expect(one.foot).toBe(copy.line.nobodyRest(2));
    // A wholly free line of three beside a row is three copies, not one card.
    expect(whereItWent(
      [{ oracleId: "sol", name: "Sol Ring", quantity: 1 }, { oracleId: "g", name: "Lightning Greaves", quantity: 3 }, { oracleId: "h", name: "Swiftfoot Boots", quantity: 1 }],
      [placed("sol", "Sol Ring")],
    ).foot).toBe(copy.line.nobodyRest(4));
    // A card's copies are summed over its lines.
    expect(whereItWent([{ oracleId: "sol", name: "Sol Ring", quantity: 1 }, { oracleId: "sol", name: "Sol Ring", quantity: 2 }], [placed("sol", "Sol Ring")]).foot)
      .toBe(copy.line.nobodyRest(2));
    // One copy left over is named, since `the other 1` is not a sentence.
    expect(whereItWent([{ oracleId: "sol", name: "Sol Ring", quantity: 2 }], [placed("sol", "Sol Ring")]).foot)
      .toBe(copy.line.nobodyOne("Sol Ring"));
  });

  it("counts the foot from each row's last Change read-back, both ways", () => {
    const two = [{ oracleId: "sol", name: "Sol Ring", quantity: 2 }];
    const claimant = (deckId: string, deckName: string, o: Partial<AddedPlacement["chooser"]["claimants"][number]>) =>
      ({ deckId, deckName, quantity: 1, commanderCopies: 0, granted: 0, since: 1, versionNumber: 1, allocated: 0, ...o });
    const live = (...claimants: AddedPlacement["chooser"]["claimants"]) =>
      ({ oracleId: "sol", cardName: "Sol Ring", arrived: 2, ownedBefore: 0, fromImport: true, owned: 2, claimants });
    expect(whereItWent(two, [placed("sol", "Sol Ring")]).foot).toBe(copy.line.nobodyOne("Sol Ring"));
    // The free copy given to a brew: nothing is free any more.
    const given = live(claimant("b", "HD - Brago", { allocated: 1 }), claimant("w", "HD - Brew", { brew: true, granted: 1, allocated: 1 }));
    expect(whereItWent(two, [placed("sol", "Sol Ring")], { sol: given }).foot).toBeNull();
    // A cleared pick that leaves both copies with no deck: both are free.
    expect(whereItWent(two, [placed("sol", "Sol Ring")], { sol: live(claimant("w", "HD - Brew", { brew: true })) }).foot)
      .toBe(copy.line.nobodyRest(2));
    // The copies went in another tab: the foot claims nothing about them.
    expect(whereItWent(two, [placed("sol", "Sol Ring")], { sol: null }).foot).toBeNull();
  });

  it("counts a card listed twice once", () => {
    expect(whereItWent([{ oracleId: "g", name: "Lightning Greaves", quantity: 1 }, { oracleId: "g", name: "Lightning Greaves", quantity: 1 }], []).foot)
      .toBe(copy.line.nobodyOne("Lightning Greaves"));
  });
});
