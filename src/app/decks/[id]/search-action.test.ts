// The Add panel's search draws a row's art from `imageUri`. Card details opens the printing the player
// owns (the deck's pick where the deck holds it), so a row for an owned card must carry THAT art, not the
// catalog's one arbitrary printing per card (Hugh, 2026-10-12: Zombify showed a printing he does not own).
import { beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  chainArt: vi.fn(),
}));

// A select chain that answers `stub.rows` wherever it ends: every builder method returns the chain,
// and awaiting it yields the rows. The `.as(...)` subquery builder returns a column-bearing stand-in.
vi.mock("../../../db", () => {
  const chain: unknown = new Proxy(() => undefined, {
    get: (_t, prop) => {
      if (prop === "then") return (resolve: (v: unknown) => void) => resolve(stub.rows);
      if (prop === "as") return () => new Proxy({}, { get: () => ({}) });
      return chain;
    },
    apply: () => chain,
  });
  return { db: { select: () => chain } };
});
vi.mock("../../../lib/auth", () => ({ requireUserId: async () => "user-1" }));
vi.mock("../../../lib/switches/request", () => ({ requestSwitchEnv: async () => process.env }));
vi.mock("../../../lib/decks/availability-query", () => ({ loadAvailability: async () => new Map() }));
vi.mock("../../../lib/cards/chain-art", () => ({ chainArt: (...args: unknown[]) => stub.chainArt(...args) }));

const { searchCards } = await import("./search-action");

const row = (oracleId: string, ownedQty: number, imageUri: string | null) => ({
  oracleId, name: oracleId, typeLine: "Instant", ownedQty, oracleText: null, keywords: [], imageUri,
  manaCost: null, cmc: 1, flavorName: null, gameChanger: false, massLandDenial: null, extraTurn: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  stub.rows = [row("zombify", 1, "catalog-zombify.jpg"), row("unowned", 0, "catalog-unowned.jpg")];
  stub.chainArt.mockResolvedValue(new Map([["zombify", "owned-soa-36.jpg"]]));
});

describe("searchCards art", () => {
  it("draws an owned card with the printing the player owns and an unowned one with the printing it opens on", async () => {
    stub.chainArt.mockResolvedValue(new Map([["zombify", "owned-soa-36.jpg"], ["unowned", "opening-unowned.jpg"]]));
    const out = await searchCards("zom", null, false, "deck-1");
    expect(out.map((r) => r.imageUri)).toEqual(["owned-soa-36.jpg", "opening-unowned.jpg"]);
  });

  it("keeps the catalog's art for a row the chain has none for", async () => {
    const out = await searchCards("zom", null, false, "deck-1");
    expect(out.map((r) => r.imageUri)).toEqual(["owned-soa-36.jpg", "catalog-unowned.jpg"]);
  });

  it("asks the chain about every result, owned or not, in the deck's context", async () => {
    await searchCards("zom", null, false, "deck-1");
    expect(stub.chainArt).toHaveBeenCalledWith("user-1", "deck-1", ["zombify", "unowned"], process.env);
  });

  it("keeps the catalog art for every row when the chain answers nothing", async () => {
    stub.chainArt.mockResolvedValue(new Map());
    const out = await searchCards("zom", null, false);
    expect(out.map((r) => r.imageUri)).toEqual(["catalog-zombify.jpg", "catalog-unowned.jpg"]);
    expect(stub.chainArt).toHaveBeenCalledWith("user-1", null, ["zombify", "unowned"], process.env);
  });
});
