// The Commanders place head's figures: the two list figures and the Hidden tab's count, and the no-cards rule
// (hide-commander READINESS Y8). The database is stubbed by table.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { commanderScores, commanderSupport, hiddenCommanders } from "../../db/schema";

const stats = vi.hoisted(() => ({ uniqueCards: 0, totalCards: 0 }));
vi.mock("../home/summary", () => ({ getCollectionStats: async () => stats }));

const asked = vi.hoisted(() => ({ tables: [] as unknown[] }));
vi.mock("../../db", () => ({
  db: {
    select: () => ({
      from: (table: unknown) => {
        asked.tables.push(table);
        const q: Record<string, unknown> = {};
        q.innerJoin = () => q;
        q.where = async () => [{ n: figures.get(table) ?? -1 }];
        return q;
      },
    }),
  },
}));
const figures = new Map<unknown, number>([
  [commanderScores, 228],
  [commanderSupport, 3068],
  [hiddenCommanders, 3],
]);

const { loadCommanderCounts, loadHiddenCount, loadPlaceCounts } = await import("./counts");

beforeEach(() => {
  asked.tables = [];
  stats.uniqueCards = 0;
});

describe("the Commanders place counts", () => {
  it("counts the reader's hidden commanders", async () => {
    expect(await loadHiddenCount("u")).toBe(3);
  });

  it("reads all three figures for a reader with cards, the hidden count once", async () => {
    expect(await loadCommanderCounts("u")).toEqual({ owned: 228, discover: 3068 });
    asked.tables = [];
    stats.uniqueCards = 40;
    expect(await loadPlaceCounts("u")).toEqual({ owned: 228, discover: 3068, hidden: 3 });
    expect(asked.tables.filter((t) => t === hiddenCommanders)).toHaveLength(1);
  });

  // No cards: nothing can be ranked, so neither list figure is read, but the Hidden list still holds its hides.
  it("keeps the Hidden count, and reads no list figure, for a reader with no collection", async () => {
    expect(await loadPlaceCounts("u")).toEqual({ owned: 0, discover: 0, hidden: 3 });
    expect(asked.tables).toEqual([hiddenCommanders]);
  });
});
