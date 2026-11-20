import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CardBracketFlags } from "../../bracket/flags-read";

const read = vi.hoisted(() => ({
  rows: [] as unknown[],
  selected: [] as string[][],
  flags: new Map<string, CardBracketFlags>(),
  flagIds: [] as (readonly string[])[],
  flagsFail: false,
  ordered: [] as { dir: "asc" | "desc"; col: string }[][],
}));
type Order = { dir: "asc" | "desc"; col: { name: string } };
vi.mock("drizzle-orm", async (orig) => ({
  ...(await orig<typeof import("drizzle-orm")>()),
  asc: (col: { name: string }): Order => ({ dir: "asc", col }),
  desc: (col: { name: string }): Order => ({ dir: "desc", col }),
}));
vi.mock("../../../db", () => ({
  db: {
    select: (fields: Record<string, unknown>) => {
      read.selected.push(Object.keys(fields));
      let order: Order[] = [];
      const b: Record<string, unknown> = {};
      for (const k of ["from", "where"]) b[k] = () => b;
      b.orderBy = (...keys: Order[]) => {
        order = keys;
        read.ordered.push(keys.map((o) => ({ dir: o.dir, col: o.col.name })));
        return b;
      };
      const field: Record<string, string> = { created_at: "createdAt", id: "id" };
      b.then = (res: (v: unknown) => unknown) => {
        const rows = [...(read.rows as Record<string, string | number>[])].sort((x, y) => {
          for (const o of order) {
            const f = field[o.col.name]!;
            const c = x[f]! < y[f]! ? -1 : x[f]! > y[f]! ? 1 : 0;
            if (c !== 0) return o.dir === "desc" ? -c : c;
          }
          return 0;
        });
        return Promise.resolve(rows).then(res);
      };
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

const { readCardFacts, readRunDecks } = await import("./facts");
const { recordSoftFailure } = await import("../../cache/soft-failure");

const flags = (over: Partial<CardBracketFlags>): CardBracketFlags => ({
  massLandDenial: false, massLandDenialSources: [], extraTurn: false, extraTurnSources: [], tutor: false, ...over,
});

beforeEach(() => {
  read.rows = []; read.selected.length = 0; read.ordered.length = 0; read.flags = new Map(); read.flagIds.length = 0; read.flagsFail = false;
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

  it("reads the type line, art and text the result's lists group and draw by (fresh start R2), in the same select", async () => {
    read.rows = [{ id: "bolt", cmc: 1, identity: ["R"], gameChanger: false, typeLine: "Instant", image: "https://img/bolt.jpg", oracleText: "Deal 3.", keywords: [] }];
    const out = await readCardFacts(["bolt"]);
    expect(read.selected).toHaveLength(1);
    expect(read.selected[0]).toEqual(expect.arrayContaining(["typeLine", "image", "oracleText", "keywords"]));
    expect(out.get("bolt")).toMatchObject({ typeLine: "Instant", image: "https://img/bolt.jpg", oracleText: "Deal 3.", keywords: [] });
  });

  it("makes no read for no ids", async () => {
    expect(await readCardFacts([])).toEqual(new Map());
    expect(read.selected).toHaveLength(0);
    expect(read.flagIds).toHaveLength(0);
  });
});

describe("readRunDecks (fresh start 1/4)", () => {
  it("maps each run to its newest deck, reading newest first, and leaves a run with none out", async () => {
    // Fixtures arrive oldest first; only the read's own ordering (newest, then the higher id on a tie) puts the newest deck first.
    read.rows = [
      { run: "r1", id: "d-old", name: "First try", createdAt: 1 },
      { run: "r2", id: "d-two-a", name: "Other", createdAt: 2 },
      { run: "r2", id: "d-two-b", name: "Other again", createdAt: 2 },
      { run: "r1", id: "d-new", name: "Second try", createdAt: 3 },
    ];
    const out = await readRunDecks("u1", ["r1", "r2", "r3"]);
    expect(read.selected[0]).toEqual(["run", "id", "name"]);
    expect(read.ordered[0]).toEqual([{ dir: "desc", col: "created_at" }, { dir: "desc", col: "id" }]);
    expect(out).toEqual(new Map([["r1", { id: "d-new", name: "Second try" }], ["r2", { id: "d-two-b", name: "Other again" }]]));
    expect(out.has("r3")).toBe(false);
  });

  it("makes no read for no runs", async () => {
    expect(await readRunDecks("u1", [])).toEqual(new Map());
    expect(read.selected).toHaveLength(0);
  });
});
