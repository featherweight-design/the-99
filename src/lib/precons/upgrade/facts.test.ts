import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CardBracketFlags } from "../../bracket/flags-read";

const read = vi.hoisted(() => ({
  rows: [] as { id: string; cmc: number; identity: string[]; gameChanger: boolean }[],
  selected: [] as string[][],
  flags: new Map<string, CardBracketFlags>(),
  flagIds: [] as (readonly string[])[],
  flagsFail: false,
}));
vi.mock("../../../db", () => ({
  db: {
    select: (fields: Record<string, unknown>) => {
      read.selected.push(Object.keys(fields));
      const b: Record<string, unknown> = {};
      for (const k of ["from", "where"]) b[k] = () => b;
      b.then = (res: (v: unknown) => unknown) => Promise.resolve(read.rows).then(res);
      return b;
    },
  },
}));
vi.mock("../../bracket/flags-read", () => ({
  loadBracketFlags: vi.fn(async (ids: readonly string[]) => {
    read.flagIds.push(ids);
    if (read.flagsFail) throw new Error("flags down");
    return read.flags;
  }),
}));
vi.mock("../../cache/soft-failure", () => ({ recordSoftFailure: vi.fn() }));

const { readCardFacts } = await import("./facts");
const { recordSoftFailure } = await import("../../cache/soft-failure");

const flags = (over: Partial<CardBracketFlags>): CardBracketFlags => ({
  massLandDenial: false, massLandDenialSources: [], extraTurn: false, extraTurnSources: [], tutor: false, ...over,
});

beforeEach(() => {
  read.rows = []; read.selected.length = 0; read.flags = new Map(); read.flagIds.length = 0; read.flagsFail = false;
  vi.mocked(recordSoftFailure).mockClear();
});

describe("readCardFacts (G19)", () => {
  it("reads the game changer column and the bracket flags, and maps them through factsFor in its fixed order", async () => {
    read.rows = [
      { id: "remora", cmc: 1, identity: ["U"], gameChanger: true },
      { id: "armageddon", cmc: 4, identity: ["W"], gameChanger: false },
      { id: "both", cmc: 2, identity: ["U"], gameChanger: true },
    ];
    read.flags = new Map([
      ["armageddon", flags({ massLandDenial: true })],
      ["both", flags({ tutor: true, extraTurn: true })],
    ]);
    const out = await readCardFacts(["remora", "armageddon", "both"]);
    expect(read.selected[0]).toContain("gameChanger");
    expect(read.flagIds[0]).toEqual(["remora", "armageddon", "both"]);
    expect(out.get("remora")).toEqual({ cmc: 1, identity: ["U"], facts: ["gameChanger"] });
    expect(out.get("armageddon")).toEqual({ cmc: 4, identity: ["W"], facts: ["massLandDenial"] });
    expect(out.get("both")).toEqual({ cmc: 2, identity: ["U"], facts: ["gameChanger", "extraTurns", "tutor"] });
  });

  it("leaves facts off a card that carries none, never []", async () => {
    read.rows = [{ id: "plain", cmc: 3, identity: ["G"], gameChanger: false }];
    read.flags = new Map([["plain", flags({})]]);
    const out = await readCardFacts(["plain"]);
    expect(out.get("plain")).toEqual({ cmc: 3, identity: ["G"] });
    expect("facts" in out.get("plain")!).toBe(false);
  });

  it("draws every card without facts when the flags read fails, mana value and identity still, and records the fallback", async () => {
    read.rows = [{ id: "remora", cmc: 1, identity: ["U"], gameChanger: true }];
    read.flagsFail = true;
    const out = await readCardFacts(["remora"]);
    expect(out.get("remora")).toEqual({ cmc: 1, identity: ["U"] });
    expect(recordSoftFailure).toHaveBeenCalledTimes(1);
  });

  it("makes no read for no ids", async () => {
    expect(await readCardFacts([])).toEqual(new Map());
    expect(read.selected).toHaveLength(0);
    expect(read.flagIds).toHaveLength(0);
  });
});
