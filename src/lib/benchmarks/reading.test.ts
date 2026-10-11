import { beforeEach, describe, expect, it, vi } from "vitest";
import { card, job, land } from "./fixtures";

const load = vi.fn();
vi.mock("./load", () => ({ loadBenchmarkInput: (...a: unknown[]) => load(...a) }));
// The newest label among the list's cards, as the key's read returns it (or a throw).
const labelRead = vi.fn(async (): Promise<unknown[]> => [{ millis: "1000" }]);
vi.mock("../../db", () => ({ db: { select: () => ({ from: () => ({ where: () => labelRead() }) }) } }));
// The data cache, as a map: a key it has seen is served without running the loader.
const store = new Map<string, unknown>();
const keys: string[][] = [];
vi.mock("../cache/user-lists", () => ({
  cacheForUser: async (_user: string, key: string[], loader: () => Promise<unknown>) => {
    keys.push(key);
    const k = JSON.stringify(key);
    if (!store.has(k)) store.set(k, await loader());
    return store.get(k);
  },
}));

const { readingBenchmarks } = await import("./reading");
const profile = { cards: [{ oracleId: "a", quantity: 1 }], commanderOracleIds: ["c"] } as never;
const input = () => ({ cards: [card("Sol Ring", { manaValue: 1, jobs: [job({ kind: "ramp" })] }), land("Forest", { quantity: 98 })], lines: [], castRamp: 1 });

describe("readingBenchmarks", () => {
  beforeEach(() => { load.mockReset(); store.clear(); keys.length = 0; labelRead.mockReset(); labelRead.mockResolvedValue([{ millis: "1000" }]); });

  it("reads nothing with the switch off", async () => {
    expect(await readingBenchmarks(profile, "u", false)).toBeNull();
    expect(load).not.toHaveBeenCalled();
  });

  it("is null when the read fails, so the reading draws as before", async () => {
    load.mockResolvedValueOnce(null);
    expect(await readingBenchmarks(profile, "u", true)).toBeNull();
    // ...and the failure is not stored: the next open reads again.
    load.mockResolvedValueOnce(input());
    expect(await readingBenchmarks(profile, "u", true)).not.toBeNull();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("serves a repeat open from the cache, and reads again when a label moves", async () => {
    load.mockResolvedValue(input());
    await readingBenchmarks(profile, "u", true);
    await readingBenchmarks(profile, "u", true);
    expect(load).toHaveBeenCalledTimes(1);
    labelRead.mockResolvedValue([{ millis: "2000" }]);
    await readingBenchmarks(profile, "u", true);
    expect(load).toHaveBeenCalledTimes(2);
    expect(keys[0][0]).toBe("deck-benchmarks");
    expect(keys[2][2]).toBe("2000");
  });

  it("keys on the list: a different count is a different entry", async () => {
    load.mockResolvedValue(input());
    await readingBenchmarks(profile, "u", true);
    await readingBenchmarks({ cards: [{ oracleId: "a", quantity: 2 }], commanderOracleIds: ["c"] } as never, "u", true);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("runs uncached when the key's read fails, rather than keying wrongly", async () => {
    labelRead.mockRejectedValue(new Error("down"));
    load.mockResolvedValue(input());
    expect(await readingBenchmarks(profile, "u", true)).not.toBeNull();
    expect(keys).toEqual([]);
  });

  it("sends steps and ledger cards, never a card's jobs or rules text", async () => {
    const cmd = card("Selvala", { commander: true, manaValue: 3, typeLine: "Legendary Creature", jobs: [job({ kind: "ramp" })], oracleText: "secret text" });
    load.mockResolvedValueOnce({ cards: [cmd, card("Sol Ring", { manaValue: 1, jobs: [job({ kind: "ramp" })] }), land("Forest", { quantity: 97 })], lines: [], castRamp: 1 });
    const wire = await readingBenchmarks(profile, "u", true);
    expect(wire?.velocity.commanderName).toBe("Selvala");
    expect(wire?.velocity.step).toBeGreaterThanOrEqual(1);
    expect(wire?.win).toBeNull();
    const json = JSON.stringify(wire);
    expect(json).not.toContain("secret text");
    expect(json).not.toContain("\"jobs\"");
  });
});
