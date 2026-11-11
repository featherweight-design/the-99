import { describe, expect, it } from "vitest";
import type { DeckDetailCard } from "../../../lib/decks/grouping";
import { carriesMark } from "./demo-step-deck";

const row = (over: Record<string, unknown>) => ({ owned: true, proxied: false, locked: false, foil: false, facts: [], comboPartner: null, imageUri: "x", typeLine: "Creature", ...over }) as unknown as DeckDetailCard;

describe("carriesMark", () => {
  it("is true for each mark the key decodes: buy, proxy, lock, foil, a bracket fact, a combo partner", () => {
    expect(carriesMark(row({ owned: false }))).toBe(true);
    expect(carriesMark(row({ proxied: true }))).toBe(true);
    expect(carriesMark(row({ locked: true }))).toBe(true);
    expect(carriesMark(row({ foil: true }))).toBe(true);
    expect(carriesMark(row({ facts: ["tutor"] }))).toBe(true);
    expect(carriesMark(row({ comboPartner: { name: "Partner" } }))).toBe(true);
  });

  it("is false for a plain owned row, and for a foil basic land (its stepper row draws no glint)", () => {
    expect(carriesMark(row({}))).toBe(false);
    expect(carriesMark(row({ foil: true, typeLine: "Basic Land — Mountain" }))).toBe(false);
  });
});
