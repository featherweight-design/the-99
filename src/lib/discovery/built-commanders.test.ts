// A partner helms its deck exactly as the primary does, so the "what should I
// build next" exclusion has to name both halves of a pair. It did not, and a
// partner the player had already built kept appearing in the owned lane.
import { describe, expect, it, vi } from "vitest";

type DeckRow = { oracleId: string; partnerOracleId: string | null };
const deckRows: DeckRow[] = [];

vi.mock("../../db", () => ({
  db: { select: () => ({ from: () => ({ where: async () => deckRows }) }) },
}));

const { loadBuiltCommanderIds } = await import("../decks/built");

describe("loadBuiltCommanderIds", () => {
  it("names the commander of every deck", async () => {
    deckRows.length = 0;
    deckRows.push({ oracleId: "atraxa", partnerOracleId: null });
    expect([...(await loadBuiltCommanderIds("user-1"))]).toEqual(["atraxa"]);
  });

  it("names both halves of a partner pair", async () => {
    deckRows.length = 0;
    deckRows.push({ oracleId: "thrasios", partnerOracleId: "tymna" });
    expect([...(await loadBuiltCommanderIds("user-1"))].sort()).toEqual(["thrasios", "tymna"]);
  });

  it("keeps a null partner out of the set, rather than carrying it as one", async () => {
    deckRows.length = 0;
    deckRows.push({ oracleId: "korvold", partnerOracleId: null });
    deckRows.push({ oracleId: "thrasios", partnerOracleId: "tymna" });
    const built = await loadBuiltCommanderIds("user-1");
    expect(built.size).toBe(3);
    expect(built.has("korvold")).toBe(true);
  });
});
