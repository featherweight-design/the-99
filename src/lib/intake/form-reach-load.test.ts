import { describe, expect, it, vi } from "vitest";
import { ENV_VIEW } from "@/test/env-view";

// Only the payload's BOUNDS are under test: the builder's own (Commander-legal, front face not a
// land), so the form never counts a raiser the fill could not place. Facts, claims and prices are flat.
const queries: string[] = [];
vi.mock("../../db", () => ({
  db: {
    execute: vi.fn(async (q: unknown) => {
      const text = JSON.stringify(q);
      queries.push(text);
      if (text.includes("type_line")) {
        return { rows: [
          { oracle_id: "rift", type_line: "Instant" },
          { oracle_id: "tomb", type_line: "Land" },
          { oracle_id: "mdfc", type_line: "Sorcery // Land" },
        ] };
      }
      const ids = ["rift", "mdfc"];
      return { rows: ids.map((id) => ({ oracle_id: id, name: id, color_identity: ["U"] })) };
    }),
  },
}));
vi.mock("./fill-facts", () => ({
  loadBracketGateFacts: vi.fn(async () => ({
    flagsOf: () => ({ gameChanger: true, massLandDenial: false, extraTurn: false }),
    combosOf: () => [], searches: () => false, reaches: () => false,
  })),
}));
vi.mock("../decks/availability-query", () => ({ loadAvailability: vi.fn(async () => new Map()) }));
vi.mock("../discovery/price", () => ({ loadPrices: vi.fn(async (ids: string[]) => new Map(ids.map((id) => [id, { liveCents: 100 }]))) }));
vi.mock("../cache/page-cache", () => ({ cachePageForUser: vi.fn() }));
vi.mock("../cache/catalog-generation", () => ({ catalogGeneration: vi.fn() }));
// Every result can offer only the universal staples: "rift" is one, "mdfc" is not.
vi.mock("../staples/universal", () => ({ loadUniversalStaples: vi.fn(async () => new Set(["rift"])) }));

import { loadBracketGateFacts } from "./fill-facts";
import { loadBuyableGameChangers, loadOwnedMovers } from "./form-reach-load";

describe("the form's payload keeps to the builder's bounds", () => {
  it("reads only Commander-legal owned cards, and drops a land, keeping a spell with a land back", async () => {
    queries.length = 0;
    const cards = await loadOwnedMovers("u", ENV_VIEW);
    expect(queries[0]).toContain("commander_legal");
    expect(vi.mocked(loadBracketGateFacts).mock.calls[0][0]).toEqual(["rift", "mdfc"]);
    expect(cards.map((c) => c.id)).toEqual(["rift", "mdfc"]);
  });

  it("offers only Commander-legal, nonland Game Changers that every result can offer (universal staples)", async () => {
    queries.length = 0;
    await loadBuyableGameChangers();
    expect(queries[0]).toContain("commander_legal");
    // The names are read for the kept ids alone: never the land, never a card some rows lack.
    expect(queries[1]).toContain("rift");
    expect(queries[1]).not.toContain("tomb");
    expect(queries[1]).not.toContain("mdfc");
  });
});
