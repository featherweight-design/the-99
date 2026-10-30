// The combo writer's two seams (menu and Home PR 5, review round 1): the watch follows the reader's RESOLVED switches,
// and the three places of one write are filled by combos actually written, not by ones already told.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ record: vi.fn(), env: {} as Record<string, string> }));
vi.mock("../social/feed-write", () => ({ recordFeedItem: m.record }));
vi.mock("../switches/snapshot", () => ({ resolveSwitchEnv: async () => m.env }));

import { comboWatchIn, COMBOS_PER_WRITE, noticeCombos } from "./combo-writer";

const row = (n: number, popularity: number) => ({
  variant_id: `v${n}`, produces: ["Infinite mana"], popularity, ids: ["a", `b${n}`], names: ["A", `B${n}`],
});
const q = (rows: unknown[]) => ({ execute: vi.fn().mockResolvedValue({ rows }) });

beforeEach(() => {
  vi.clearAllMocks();
  m.env = {};
});

describe("comboWatchIn", () => {
  it("watches the held cards once the kind is chosen", async () => {
    const tx = { execute: vi.fn().mockResolvedValueOnce({ rows: [{ yes: 1 }] }).mockResolvedValueOnce({ rows: [{ oracle_id: "a" }] }) };
    expect([...(await comboWatchIn(tx as never, "u1"))!]).toEqual(["a"]);
  });
});

describe("noticeCombos", () => {
  const delta = { added: ["a"], held: new Set(["a", "b1", "b2", "b3", "b4"]) };

  it("gives every pair one call writes ONE batch key, and a later call its own, so they are one push however long it takes", async () => {
    m.record.mockResolvedValue(true);
    await noticeCombos(q([row(1, 50), row(2, 40)]) as never, "u1", delta);
    await noticeCombos(q([row(3, 50)]) as never, "u1", delta);
    const keys = m.record.mock.calls.map((c) => (c[1] as { batchKey?: string }).batchKey);
    expect(keys[0]).toMatch(/^combo:/);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[2]).toMatch(/^combo:/);
    expect(keys[2]).not.toBe(keys[0]);
  });

  it("does not let variants already told use up the three places", async () => {
    const rows = [row(1, 50), row(2, 40), row(3, 30), row(4, 20)];
    m.record.mockImplementation(async (_q: unknown, item: { variantId: string }) => item.variantId === "v4");
    const written = await noticeCombos(q(rows) as never, "u1", delta);
    expect(written).toBe(1);
    expect(m.record).toHaveBeenCalledTimes(4);
  });

  it("stops at three written", async () => {
    const rows = [row(1, 50), row(2, 40), row(3, 30), row(4, 20)];
    m.record.mockResolvedValue(true);
    expect(await noticeCombos(q(rows) as never, "u1", delta)).toBe(COMBOS_PER_WRITE);
    expect(m.record).toHaveBeenCalledTimes(COMBOS_PER_WRITE);
  });
});
