// The count-mechanism eval's pure pieces: what it reads from a Moxfield export, how it changes the app's prompt for a
// count, what the refill asks, and how the blind board hides its arms. A drift in any of them measures something else.
import { describe, expect, it } from "vitest";

import { lettersFor, quantile } from "../count-mechanism-report.mjs";
import { parseMoxfield } from "../count-mechanism-seed.mjs";
import { ceilingFor, overAsk, patchCount, reasonFor, refillBlock } from "../count-mechanism.mjs";
import { buildPrompt } from "../../../src/lib/tuning/prompt";
import { buildPlayGroup } from "../../../src/lib/profile/play";
import type { EvidencePack } from "../../../src/lib/tuning/evidence";

const pack: EvidencePack = {
  commanders: [{ oracleId: "cmd", name: "Commander" }],
  colorIdentity: ["G"],
  cards: [{ oracleId: "cmd", name: "Commander", typeLine: "Legendary Creature", roles: [], quantity: 1, owned: true, commander: true }],
  targets: { roles: [], thin: false },
  staples: [],
  play: buildPlayGroup([]),
  intent: null,
  notes: null,
  year: 2026,
  limits: { capCents: null, sets: [], ownedOnly: false },
};

describe("parseMoxfield", () => {
  it("reads the mainboard to the blank line, skips the header and the sideboard, and writes a split card's two slashes", () => {
    const text = "# header\n1 The Wise Mothman (PIP) 4 *F*\n2 Find / Finality (GRN) 225\n1 Ash Barrens (PIP) 253\n\nSIDEBOARD:\n1 Not Played (XYZ) 1\n";
    expect(parseMoxfield(text)).toEqual([
      { quantity: 1, name: "The Wise Mothman" },
      { quantity: 2, name: "Find // Finality" },
      { quantity: 1, name: "Ash Barrens" },
    ]);
  });

  it("stops on a line it cannot read rather than skipping a card", () => {
    expect(() => parseMoxfield("1 The Wise Mothman\n")).toThrow(/cannot read/);
  });
});

describe("patchCount", () => {
  const { system } = buildPrompt(pack);

  it("replaces the app's 'up to six' and 'offer fewer' with the count, once each", () => {
    const patched = patchCount(system, 30, 30, 20);
    expect(patched).toContain("Propose exactly 30 cards to add and exactly 30 cards to cut, as two separate lists.");
    expect(patched).toContain("The player asked for 20 additions and 20 cuts");
    expect(patched).not.toMatch(/up to \d+ cards|offer fewer of either/);
  });

  it("refuses a prompt whose sentences moved, rather than measuring it unchanged", () => {
    expect(() => patchCount(system.replace("Aim for as many cuts", "Aim for"), 3, 3, 3)).toThrow(/aim sentence/);
    expect(() => patchCount("no size here", 3, 3, 3)).toThrow(/size sentence/);
  });
});

describe("the refill's question", () => {
  it("names what was kept, what fell and why, and asks for exactly the shortfall", () => {
    const block = refillBlock({ adds: ["Mesmeric Orb"], cuts: [] }, [{ card: "Lightning Bolt", side: "add", reason: reasonFor({ rule: "colourIdentity" }) }], 4, 5);
    expect(block).toContain("Kept, additions: Mesmeric Orb.");
    expect(block).toContain("Kept, cuts: none.");
    expect(block).toContain("- Lightning Bolt (addition): it is outside the commander's colors");
    expect(block).toContain("Propose exactly 4 more additions and exactly 5 more cuts");
  });

  it("says which citation failed", () => {
    expect(reasonFor({ rule: "citation", cite: "intent" })).toBe("its intent citation is not supported by the evidence");
  });
});

describe("sizes", () => {
  it("over-asks half again, rounded up, and gives the reply room for its lines", () => {
    expect([overAsk(3), overAsk(10), overAsk(20)]).toEqual([5, 15, 30]);
    expect(ceilingFor(6)).toBe(8_000);
    expect(ceilingFor(60)).toBe(40_000);
  });
});

describe("the blind board", () => {
  it("gives every case a permutation of the three arms, not the same order each time", () => {
    const orders = [0, 1, 2, 3, 4, 5].map((i) => lettersFor(i));
    for (const o of orders) expect(new Set(Object.values(o))).toEqual(new Set(["A", "B", "C"]));
    expect(new Set(orders.map((o) => o.X + o.Y + o.Z)).size).toBeGreaterThan(1);
  });

  it("reads a quantile off the sorted values", () => {
    expect(quantile([30, 10, 20], 0.5)).toBe(20);
    expect(quantile([], 0.9)).toBe(0);
  });
});
