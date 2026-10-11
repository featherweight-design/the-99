import { beforeEach, describe, expect, it, vi } from "vitest";
import { card, job, land } from "./fixtures";

const load = vi.fn();
vi.mock("./load", () => ({ loadBenchmarkInput: (...a: unknown[]) => load(...a) }));

const { readingBenchmarks } = await import("./reading");
const profile = {} as never;

describe("readingBenchmarks", () => {
  beforeEach(() => load.mockReset());

  it("reads nothing with the switch off", async () => {
    expect(await readingBenchmarks(profile, false)).toBeNull();
    expect(load).not.toHaveBeenCalled();
  });

  it("is null when the read fails, so the reading draws as before", async () => {
    load.mockResolvedValueOnce(null);
    expect(await readingBenchmarks(profile, true)).toBeNull();
  });

  it("sends steps and ledger cards, never a card's jobs or rules text", async () => {
    const cmd = card("Selvala", { commander: true, manaValue: 3, typeLine: "Legendary Creature", jobs: [job({ kind: "ramp" })], oracleText: "secret text" });
    load.mockResolvedValueOnce({ cards: [cmd, card("Sol Ring", { manaValue: 1, jobs: [job({ kind: "ramp" })] }), land("Forest", { quantity: 97 })], lines: [], castRamp: 1 });
    const wire = await readingBenchmarks(profile, true);
    expect(wire?.velocity.commanderName).toBe("Selvala");
    expect(wire?.velocity.step).toBeGreaterThanOrEqual(1);
    expect(wire?.win).toBeNull();
    const json = JSON.stringify(wire);
    expect(json).not.toContain("secret text");
    expect(json).not.toContain("\"jobs\"");
  });
});
