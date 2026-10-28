// The count-mechanism eval's pure pieces: what it reads from a Moxfield export, how it changes the app's prompt for a
// count, what the refill asks, and how the blind board hides its arms. A drift in any of them measures something else.
import { describe, expect, it } from "vitest";

import { lettersFor, quantile, VARIANTS } from "../count-mechanism-report.mjs";
import { parseMoxfield } from "../count-mechanism-seed.mjs";
import { ceilingFor, comingInBlock, overAsk, patchFlow, reasonFor, refillBlock } from "../count-mechanism.mjs";
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

describe("patchFlow", () => {
  const { system } = buildPrompt(pack);

  it("asks the additions stage for additions alone, first, for the request and the deck's weaknesses", () => {
    const patched = patchFlow(system, { adds: 30, cuts: 0 }, 20);
    expect(patched).toContain("Propose exactly 30 cards to add, and leave the cuts list empty.");
    expect(patched).toContain("The player wants 20 cards in. Choose the additions first");
    expect(patched).not.toMatch(/up to \d+ cards|offer fewer of either/);
  });

  it("asks the cuts stage for cuts that make room for what is coming in, by the count that is", () => {
    const patched = patchFlow(system, { adds: 0, cuts: 20 }, 20, 17);
    expect(patched).toContain("Propose exactly 20 cards to cut, and leave the additions list empty.");
    expect(patched).toContain('The player is adding 17 cards, listed under "Coming in"');
    // A one-call refill short only on cuts has no "Coming in" list: it names the kept additions in its own Kept line.
    expect(patchFlow(system, { adds: 0, cuts: 5 }, 20)).not.toContain("Coming in");
    expect(comingInBlock(["Mesmeric Orb", "Hedron Crab"])).toBe("\nComing in (2): Mesmeric Orb; Hedron Crab.");
  });

  it("asks one reply for both, additions first and then the cuts that make room", () => {
    const patched = patchFlow(system, { adds: 15, cuts: 15 }, 10);
    expect(patched).toContain("Propose exactly 15 cards to add and exactly 15 cards to cut, as two separate lists.");
    expect(patched).toMatch(/Choose the additions first.*Then choose the cuts that make room for them/);
  });

  it("refuses a prompt whose sentences moved, rather than measuring it unchanged", () => {
    expect(() => patchFlow(system.replace("Aim for as many cuts", "Aim for"), { adds: 3, cuts: 3 }, 3)).toThrow(/aim sentence/);
    expect(() => patchFlow("no size here", { adds: 3, cuts: 3 }, 3)).toThrow(/size sentence/);
  });
});

describe("the refill's question", () => {
  it("names what was kept, what fell and why, and asks for exactly the shortfall", () => {
    const block = refillBlock({ adds: ["Mesmeric Orb"], cuts: [] }, [{ card: "Lightning Bolt", side: "add", reason: reasonFor({ rule: "colourIdentity" }) }], { adds: 4, cuts: 5 });
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
  it("gives every case a permutation of the six variants, not the same order each time", () => {
    const orders = [0, 1, 2, 3, 4, 5].map((i) => lettersFor(i));
    for (const o of orders) expect(new Set(Object.values(o))).toEqual(new Set(VARIANTS));
    expect(new Set(orders.map((o) => Object.values(o).join(","))).size).toBeGreaterThan(1);
  });

  it("puts every variant in every position across many cases, so no letter is biased", () => {
    const seen = new Map<string, Set<string>>();
    for (let i = 0; i < 720; i++) for (const [letter, v] of Object.entries(lettersFor(i))) {
      if (!seen.has(letter)) seen.set(letter, new Set());
      seen.get(letter)!.add(v);
    }
    for (const vs of seen.values()) expect(vs.size).toBe(VARIANTS.length);
  });

  it("reads a quantile off the sorted values", () => {
    expect(quantile([30, 10, 20], 0.5)).toBe(20);
    expect(quantile([], 0.9)).toBe(0);
  });
});
