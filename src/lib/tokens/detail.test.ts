import { describe, expect, it, vi } from "vitest";

// The loader's failure contract (round 4): a failed printing or price read costs that block, never
// the token. The database stands in as two `select` chains: the token row, then its printings.
const reads = vi.hoisted(() => ({ printings: async (): Promise<unknown[]> => [], prices: async (): Promise<unknown> => ({ prices: new Map(), newestAsOf: null }) }));
vi.mock("../../db", () => {
  let call = 0;
  return {
    db: {
      select: () => ({
        from: () => ({
          where: () => {
            call += 1;
            if (call % 2 === 1) return Promise.resolve([{ oracleId: "t-1", name: "Goblin", typeLine: "Token Creature — Goblin", colors: ["R"], oracleText: "Haste", layout: "token" }]);
            return reads.printings();
          },
        }),
      }),
    },
  };
});
vi.mock("./publish", () => ({ tokenTablesExist: async () => true, tokenPriceTablesExist: async () => true }));
vi.mock("./price", () => ({ loadTokenPrices: () => reads.prices() }));

const { loadTokenDetail } = await import("./detail");

describe("loadTokenDetail", () => {
  it("keeps the token when its printings read fails, with no art and no set", async () => {
    reads.printings = async () => { throw new Error("down"); };
    const card = await loadTokenDetail("t-1");
    expect(card?.name).toBe("Goblin");
    expect(card?.oracleText).toBe("Haste");
    expect(card?.printings).toEqual([]);
  });

  it("keeps the token when its price read fails, with no price and no buy link", async () => {
    reads.printings = async () => [{ scryfallId: "p-1", setCode: "tm21", collectorNumber: "9", imageUri: "https://img/1.jpg", backImageUri: null }];
    reads.prices = async () => { throw new Error("down"); };
    const card = await loadTokenDetail("t-1");
    expect(card?.imageUri).toBe("https://img/1.jpg");
    expect(card?.prices).toBeNull();
    expect(card?.tokenBuyUrl).toBeNull();
  });
});
