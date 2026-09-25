import { describe, expect, it } from "vitest";

import { recommendedMix, type RecommendedMix } from "../decks/mix";
import { mixKey } from "../decks/deck-mix";
import { shapeFits, type DeckRow, type FitsRead } from "./fits";

const birds: FitsRead["card"] = { oracleId: "o-birds", name: "Birds of Paradise", colorIdentity: ["G"], commanderLegal: true, role: "ramp" };
const deck = (over: Partial<DeckRow> & { id: string; name: string }): DeckRow => ({
  commander_oracle_id: `c-${over.id}`, partner_oracle_id: null, commander_names: [`Cmdr ${over.id}`],
  identity: ["G", "R"], holds: 0, leads: false, inclusion: null, synergy: null, ...over,
});
const measured = { ...recommendedMix(null, false), rolesUsable: true, landMeasured: true };
const flat = recommendedMix(null, false);
const mixesFor = (rows: DeckRow[], mix: RecommendedMix = measured) =>
  new Map(rows.map((r) => [mixKey({ commanderOracleId: r.commander_oracle_id, partnerOracleId: r.partner_oracle_id }), mix]));

describe("mixKey", () => {
  // The skeleton's fallback reads the first commander's row, so the order is part of the question.
  it("keys a pair by its column order, as the deck page asks it", () => {
    expect(mixKey({ commanderOracleId: "a", partnerOracleId: "b" })).not.toBe(mixKey({ commanderOracleId: "b", partnerOracleId: "a" }));
    expect(mixKey({ commanderOracleId: "a", partnerOracleId: null })).not.toBe(mixKey({ commanderOracleId: "a", partnerOracleId: "b" }));
  });
});

describe("shapeFits", () => {
  it("sorts the decks into fit, holds and ruled out by colors; with no synergy figure, each by name", () => {
    const rows = [
      deck({ id: "k", name: "Kinnan" }),
      deck({ id: "g", name: "Gishath", inclusion: "58.2" }),
      deck({ id: "t", name: "Tymna", holds: 1 }),
      deck({ id: "a", name: "Atraxa", leads: true }),
      deck({ id: "u", name: "Urza", identity: ["U"] }),
    ];
    const r = shapeFits(birds, rows, new Map([["g", 7], ["k", 11]]), mixesFor(rows), { owned: 2, free: 1 });
    expect(r.fits.map((d) => d.name)).toEqual(["Gishath", "Kinnan"]);
    expect(r.fits[0]).toMatchObject({ inclusion: 58.2, need: { role: "ramp", have: 7, target: 10 } });
    expect(r.fits[1].inclusion).toBeNull();
    // A deck the card leads holds it too.
    expect(r.holds).toEqual([{ id: "a", name: "Atraxa", quantity: 1 }, { id: "t", name: "Tymna", quantity: 1 }]);
    expect(r.excluded).toEqual([{ id: "u", name: "Urza", commanders: ["Cmdr u"], outside: ["G"] }]);
    expect(r).toMatchObject({ owned: 2, free: 1, staple: false });
  });

  // v2 item 9: by each commander's synergy for the card, the deck with no figure last, then by name.
  it("ranks the decks that could take it by synergy, never by inclusion", () => {
    const r = shapeFits(birds, [
      deck({ id: "a", name: "Alpha", inclusion: 90, synergy: 0.05 }),
      deck({ id: "b", name: "Bravo", inclusion: 20, synergy: 0.61 }),
      deck({ id: "c", name: "Charlie" }),
      deck({ id: "d", name: "Delta", synergy: "0.3" }),
    ], new Map(), new Map(), { owned: 1, free: 1 });
    expect(r.fits.map((f) => f.name)).toEqual(["Bravo", "Delta", "Alpha", "Charlie"]);
  });

  it("keeps a staple's list by name, since its figure is about every commander", () => {
    const r = shapeFits(birds, [
      deck({ id: "a", name: "Alpha", synergy: 0.05 }),
      deck({ id: "b", name: "Bravo", synergy: 0.61 }),
    ], new Map(), new Map(), { owned: 1, free: 1 }, true);
    expect(r.fits.map((f) => f.name)).toEqual(["Alpha", "Bravo"]);
  });

  it("carries the staple flag through, for the picker's staple form", () => {
    const rows = [deck({ id: "g", name: "Gishath" })];
    expect(shapeFits(birds, rows, new Map(), mixesFor(rows), { owned: 0, free: null }, true).staple).toBe(true);
  });

  it("names no need when the card has no role, or its role's target was not measured (F9)", () => {
    const rows = [deck({ id: "g", name: "Gishath" })];
    expect(shapeFits({ ...birds, role: "other" }, rows, new Map(), mixesFor(rows), { owned: 0, free: null }).fits[0].need).toBeNull();
    expect(shapeFits(birds, rows, new Map([["g", 7]]), mixesFor(rows, flat), { owned: 0, free: null }).fits[0].need).toBeNull();
  });

  it("measures a land against the land count, which has its own half", () => {
    const rows = [deck({ id: "g", name: "Gishath" })];
    const land = { ...birds, role: "land" as const };
    const landOnly = { ...flat, landMeasured: true };
    expect(shapeFits(land, rows, new Map([["g", 33]]), mixesFor(rows, landOnly), { owned: 0, free: null }).fits[0].need)
      .toEqual({ role: "land", have: 33, target: landOnly.cells.land.target });
  });

  it("counts a deck with none of the role as zero of it, not as no need", () => {
    const rows = [deck({ id: "g", name: "Gishath" })];
    expect(shapeFits(birds, rows, new Map(), mixesFor(rows), { owned: 0, free: null }).fits[0].need)
      .toEqual({ role: "ramp", have: 0, target: 10 });
  });
});
