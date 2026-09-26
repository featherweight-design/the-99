import { beforeEach, describe, expect, it, vi } from "vitest";

const generations: ((g: string) => void)[] = [];
vi.mock("../cache/catalog-generation", () => ({
  catalogGeneration: () => new Promise<string>((resolve) => generations.push(resolve)),
}));

let reads = 0;
vi.mock("../../db", () => ({
  db: {
    execute: async () => {
      reads += 1;
      // One shape serves both reads: the candidate read and the printings read.
      return {
        rows: [
          {
            oracle_id: `read-${reads}`,
            type_line: "Legendary Creature — Halfling",
            oracle_text: null,
            mana_cost: "{1}{G}",
            layout: "normal",
            set_code: "hob",
            name: "Hobbits",
            released_at: null,
          },
        ],
      };
    },
  },
}));

beforeEach(() => {
  generations.length = 0;
  reads = 0;
  vi.resetModules();
});

describe("loadCommanderPrintings", () => {
  it("never lets a call that started earlier replace the memo a later call wrote, even in the same millisecond", async () => {
    const { loadCommanderPrintings } = await import("./printed-in-read");
    const at = 1_000;
    const earlier = loadCommanderPrintings(at);
    const later = loadCommanderPrintings(at);
    // The later call learns the NEW generation first and writes the memo.
    generations[1]("new");
    await later;
    // The earlier call finishes last, on the old generation.
    generations[0]("old");
    await earlier;
    // A third call on the new generation is served from the later call's memo: no third read.
    const third = loadCommanderPrintings(at + 1);
    generations[2]("new");
    expect(Object.keys((await third).byOracle)).toEqual(Object.keys((await later).byOracle));
    // Two loads, two reads each: the candidates, then their printings.
    expect(reads).toBe(4);
  });
});
