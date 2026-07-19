import { describe, expect, it, vi } from "vitest";

// Mock db before importing read to avoid DATABASE_URL at module init.
vi.mock("../../db", () => ({ db: {} }));

import { statusPill, cardTypeGroup, primaryRole, colorIdentityMask, poolCountFromMaskTally } from "./read";
import { groupByCardType, groupByRole, shouldShowMetaRow } from "./grouping";
import type { DeckDetailCard } from "./grouping";

// ---------------------------------------------------------------------------
// colorIdentityMask
// ---------------------------------------------------------------------------
describe("colorIdentityMask", () => {
  it("colorless (empty) → 0", () => expect(colorIdentityMask([])).toBe(0));
  it("W → 1", () => expect(colorIdentityMask(["W"])).toBe(1));
  it("U → 2", () => expect(colorIdentityMask(["U"])).toBe(2));
  it("B → 4", () => expect(colorIdentityMask(["B"])).toBe(4));
  it("R → 8", () => expect(colorIdentityMask(["R"])).toBe(8));
  it("G → 16", () => expect(colorIdentityMask(["G"])).toBe(16));
  it("WU (Azorius) → 3", () => expect(colorIdentityMask(["W", "U"])).toBe(3));
  it("WUBRG → 31", () => expect(colorIdentityMask(["W", "U", "B", "R", "G"])).toBe(31));
  it("order-independent: GW same as WG", () =>
    expect(colorIdentityMask(["G", "W"])).toBe(colorIdentityMask(["W", "G"])));
});

// ---------------------------------------------------------------------------
// poolCountFromMaskTally
// ---------------------------------------------------------------------------
describe("poolCountFromMaskTally", () => {
  it("empty tally → 0", () =>
    expect(poolCountFromMaskTally(new Map(), colorIdentityMask(["W", "U", "B", "R", "G"]))).toBe(0));

  it("colorless card (mask 0) fits every commander", () => {
    const tally = new Map([[0, 3]]);
    expect(poolCountFromMaskTally(tally, colorIdentityMask(["W"]))).toBe(3);
  });

  it("W card fits WU commander but not U commander", () => {
    const tally = new Map([[colorIdentityMask(["W"]), 2]]);
    expect(poolCountFromMaskTally(tally, colorIdentityMask(["W", "U"]))).toBe(2);
    expect(poolCountFromMaskTally(tally, colorIdentityMask(["U"]))).toBe(0);
  });

  it("all submasks of WUBRG are included", () => {
    const tally = new Map<number, number>();
    // 5 single-colour cards, one each
    for (const c of ["W", "U", "B", "R", "G"]) tally.set(colorIdentityMask([c]), 1);
    expect(poolCountFromMaskTally(tally, colorIdentityMask(["W", "U", "B", "R", "G"]))).toBe(5);
  });

  it("cards outside identity are excluded", () => {
    // R card should not fit a WU commander
    const tally = new Map([[colorIdentityMask(["R"]), 4]]);
    expect(poolCountFromMaskTally(tally, colorIdentityMask(["W", "U"]))).toBe(0);
  });

  it("sums multiple fitting buckets", () => {
    const tally = new Map([
      [colorIdentityMask(["W"]), 5],
      [colorIdentityMask(["B"]), 3],
      [colorIdentityMask(["W", "B"]), 2],
      [colorIdentityMask(["R"]), 7],   // does not fit WB
    ]);
    // WB commander: W(5) + B(3) + WB(2) = 10
    expect(poolCountFromMaskTally(tally, colorIdentityMask(["W", "B"]))).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Minimal card factory
// ---------------------------------------------------------------------------
function makeCard(
  overrides: Partial<DeckDetailCard> & { name: string; typeLine: string },
): DeckDetailCard {
  return {
    oracleId: overrides.name.toLowerCase().replace(/\s+/g, "-"),
    cardTypeGroup: "Other",
    role: "other",
    owned: true,
    quantity: 1,
    ...overrides,
  };
}

describe("statusPill", () => {
  it("Draft at 0 cards", () => expect(statusPill({ built: 0, ownedCount: 0 })).toBe("Draft"));
  it("Building at 1–98", () => {
    expect(statusPill({ built: 1, ownedCount: 1 })).toBe("Building");
    expect(statusPill({ built: 98, ownedCount: 50 })).toBe("Building");
  });
  it("Playable at 99 with unowned gaps", () => expect(statusPill({ built: 99, ownedCount: 91 })).toBe("Playable"));
  it("Complete at 99 with all owned", () => expect(statusPill({ built: 99, ownedCount: 99 })).toBe("Complete"));
});

describe("cardTypeGroup", () => {
  it("puts DFC land // creature under Lands (lands read first)", () =>
    expect(cardTypeGroup("Land — Forest // Creature — Beast")).toBe("Lands"));
  it("Legendary Creature → Creatures", () =>
    expect(cardTypeGroup("Legendary Creature — Dragon")).toBe("Creatures"));
  it("Sorcery → Sorceries", () => expect(cardTypeGroup("Sorcery")).toBe("Sorceries"));
  it("Artifact Creature → Creatures (creature check before artifact)", () =>
    expect(cardTypeGroup("Artifact Creature — Golem")).toBe("Creatures"));
  it("unknown → Other", () => expect(cardTypeGroup("Tribal — Ally")).toBe("Other"));
});

describe("primaryRole", () => {
  it("returns first classified role", () =>
    expect(primaryRole({ typeLine: "Sorcery", oracleText: "Destroy all creatures.", keywords: [] })).toBe("wipes"));
  it("returns 'other' when nothing classifies", () =>
    expect(primaryRole({ typeLine: "Creature — Bear", oracleText: "", keywords: [] })).toBe("other"));
});

// ---------------------------------------------------------------------------
// shouldShowMetaRow
// ---------------------------------------------------------------------------
describe("shouldShowMetaRow", () => {
  it("Basic Forest qty 5 → shows meta row (+4 more)", () => {
    expect(shouldShowMetaRow({ quantity: 5, typeLine: "Basic Land — Forest" })).toBe(true);
  });

  it("Basic Forest qty 1 → no meta row", () => {
    expect(shouldShowMetaRow({ quantity: 1, typeLine: "Basic Land — Forest" })).toBe(false);
  });

  it("non-basic land qty 2 → no meta row", () => {
    // e.g. Llanowar Elves qty 2 — not a basic, so no meta row
    expect(shouldShowMetaRow({ quantity: 2, typeLine: "Creature — Elf Druid" })).toBe(false);
  });

  it("non-basic with qty 3 → no meta row", () => {
    expect(shouldShowMetaRow({ quantity: 3, typeLine: "Artifact" })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// groupByCardType
// ---------------------------------------------------------------------------
describe("groupByCardType", () => {
  it("empty input returns empty array", () => {
    expect(groupByCardType([])).toEqual([]);
  });

  it("empty groups are omitted", () => {
    const cards = [makeCard({ name: "Forest", typeLine: "Basic Land — Forest", cardTypeGroup: "Lands" })];
    const result = groupByCardType(cards);
    const labels = result.map(([label]) => label);
    expect(labels).toEqual(["Lands"]);
    expect(labels).not.toContain("Creatures");
  });

  it("group order is stable regardless of input order", () => {
    const cards = [
      makeCard({ name: "Forest", typeLine: "Basic Land — Forest", cardTypeGroup: "Lands" }),
      makeCard({ name: "Kodama", typeLine: "Sorcery", cardTypeGroup: "Sorceries" }),
      makeCard({ name: "Sol Ring", typeLine: "Artifact", cardTypeGroup: "Artifacts" }),
      makeCard({ name: "Llanowar Elves", typeLine: "Creature — Elf", cardTypeGroup: "Creatures" }),
      makeCard({ name: "Rhystic Study", typeLine: "Enchantment", cardTypeGroup: "Enchantments" }),
      makeCard({ name: "Counterspell", typeLine: "Instant", cardTypeGroup: "Instants" }),
      makeCard({ name: "Weird Tribal", typeLine: "Tribal", cardTypeGroup: "Other" }),
      makeCard({ name: "Jace", typeLine: "Legendary Planeswalker — Jace", cardTypeGroup: "Planeswalkers" }),
    ];
    const result = groupByCardType(cards);
    const labels = result.map(([label]) => label);
    expect(labels).toEqual(["Creatures", "Instants", "Sorceries", "Artifacts", "Enchantments", "Planeswalkers", "Lands", "Other"]);
  });

  it("creature-artifact classifies as Creatures (cardTypeGroup flows through)", () => {
    // cardTypeGroup("Artifact Creature — Construct") → "Creatures" per existing tests
    const c = makeCard({ name: "Hangarback Walker", typeLine: "Artifact Creature — Construct", cardTypeGroup: "Creatures" });
    const result = groupByCardType([c]);
    expect(result[0][0]).toBe("Creatures");
    expect(result[0][1][0].name).toBe("Hangarback Walker");
  });

  it("within a group cards are sorted by name ASC", () => {
    const cards = [
      makeCard({ name: "Zephyr", typeLine: "Creature — Bird", cardTypeGroup: "Creatures" }),
      makeCard({ name: "Angel", typeLine: "Creature — Angel", cardTypeGroup: "Creatures" }),
      makeCard({ name: "Mentor", typeLine: "Creature — Human", cardTypeGroup: "Creatures" }),
    ];
    const result = groupByCardType(cards);
    const names = result[0][1].map((c) => c.name);
    expect(names).toEqual(["Angel", "Mentor", "Zephyr"]);
  });
});

// ---------------------------------------------------------------------------
// groupByRole
// ---------------------------------------------------------------------------
describe("groupByRole", () => {
  it("empty input returns empty array", () => {
    expect(groupByRole([])).toEqual([]);
  });

  it("empty groups are omitted", () => {
    const cards = [makeCard({ name: "Forest", typeLine: "Basic Land — Forest", cardTypeGroup: "Lands", role: "land" })];
    const result = groupByRole(cards);
    const labels = result.map(([label]) => label);
    expect(labels).toEqual(["Land"]);
    expect(labels).not.toContain("Ramp");
  });

  it("group order is stable regardless of input order", () => {
    const cards = [
      makeCard({ name: "Other Thing", typeLine: "Creature — Beast", cardTypeGroup: "Creatures", role: "other" }),
      makeCard({ name: "Wrath", typeLine: "Sorcery", cardTypeGroup: "Sorceries", role: "wipes" }),
      makeCard({ name: "Forest", typeLine: "Basic Land", cardTypeGroup: "Lands", role: "land" }),
      makeCard({ name: "Swords", typeLine: "Instant", cardTypeGroup: "Instants", role: "removal" }),
      makeCard({ name: "Brainstorm", typeLine: "Instant", cardTypeGroup: "Instants", role: "draw" }),
      makeCard({ name: "Cultivate", typeLine: "Sorcery", cardTypeGroup: "Sorceries", role: "ramp" }),
    ];
    const result = groupByRole(cards);
    const labels = result.map(([label]) => label);
    expect(labels).toEqual(["Ramp", "Draw", "Removal", "Wipes", "Land", "Other"]);
  });

  it("card with role='other' lands in Other group", () => {
    const c = makeCard({ name: "Bear", typeLine: "Creature — Bear", cardTypeGroup: "Creatures", role: "other" });
    const result = groupByRole([c]);
    expect(result[0][0]).toBe("Other");
    expect(result[0][1][0].name).toBe("Bear");
  });

  it("within a group cards are sorted by name ASC", () => {
    const cards = [
      makeCard({ name: "Zenith", typeLine: "Sorcery", cardTypeGroup: "Sorceries", role: "ramp" }),
      makeCard({ name: "Arcane Signet", typeLine: "Artifact", cardTypeGroup: "Artifacts", role: "ramp" }),
    ];
    const result = groupByRole(cards);
    const names = result[0][1].map((c) => c.name);
    expect(names).toEqual(["Arcane Signet", "Zenith"]);
  });
});
