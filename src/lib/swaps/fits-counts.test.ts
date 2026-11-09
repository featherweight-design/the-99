import { describe, expect, it } from "vitest";

import type { FitsRead } from "./fits";
import { fitsCounts } from "./fits-counts";

const card = { name: "Swords to Plowshares", printedName: null, quantity: 1, availability: { free: 1 } };
const read = { owned: 3, free: 2 } as unknown as FitsRead;

describe("fitsCounts, the free list's name and copies line", () => {
  it("takes the list's read once it landed, whatever was spent, and never draws fewer than none free", () => {
    expect(fitsCounts({ card, read, spent: true })).toEqual({ name: "Swords to Plowshares", owned: 3, freeNow: 2, countsKnown: true });
    expect(fitsCounts({ card, read: { ...read, free: -1 }, spent: false }).freeNow).toBe(0);
    expect(fitsCounts({ card, read: { ...read, free: null }, spent: false }).freeNow).toBe(0);
  });

  it("before a read, counts off the card, known only while nothing is spent and its availability read worked", () => {
    expect(fitsCounts({ card, read: null, spent: false })).toEqual({ name: "Swords to Plowshares", owned: 1, freeNow: 1, countsKnown: true });
    expect(fitsCounts({ card, read: null, spent: true }).countsKnown).toBe(false);
    expect(fitsCounts({ card: { ...card, availability: null }, read: null, spent: false })).toMatchObject({ freeNow: 0, countsKnown: false });
    expect(fitsCounts({ card: { ...card, availability: undefined }, read: null, spent: false }).countsKnown).toBe(false);
  });

  it("heads with the opened copy's printed name, else the card's (a payload with none reads as none)", () => {
    expect(fitsCounts({ card: { ...card, printedName: "Flavor Swords" }, read: null, spent: false }).name).toBe("Flavor Swords");
    expect(fitsCounts({ card: { name: "Swords to Plowshares", quantity: 1 }, read: null, spent: false }).name).toBe("Swords to Plowshares");
  });
});

describe("the picker counts through fitsCounts", () => {
  it("calls it with the card, the read and whether anything was spent, and derives no count inline", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(join(process.cwd(), "src/components/cards/fits-picker.tsx"), "utf8");
    expect(src).toMatch(/fitsCounts\(\{ card, read, spent: wrote \|\| added\.length > 0 \}\)/);
    expect(src).not.toMatch(/card\.availability != null/);
  });
});
