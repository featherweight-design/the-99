import { describe, expect, it, vi } from "vitest";

// Mock db before importing read to avoid DATABASE_URL at module init.
vi.mock("../../db", () => ({ db: {} }));

import { statusPill, cardTypeGroup, primaryRole } from "./read";

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
