// `loadChooseHistory` over a stubbed database: a hidden pick is neither drawn nor counted, and the hidden
// ids are read once per page, not once per row, and only when a row has picks to filter.
import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({ runs: [] as unknown[], art: [] as unknown[], selects: 0 }));

// A query builder whose every step returns itself and which awaits to the stubbed rows: the first select
// is the page, any later one the art.
vi.mock("../../db", () => {
  const chain = (result: () => unknown[]) => {
    const q: Record<string, unknown> = {};
    for (const step of ["from", "where", "orderBy", "limit"]) q[step] = () => q;
    q.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(result()).then(resolve, reject);
    q.catch = (reject: (e: unknown) => unknown) => Promise.resolve(result()).catch(reject);
    return q;
  };
  return {
    db: {
      select: () => {
        store.selects += 1;
        return chain(() => (store.selects === 1 ? store.runs : store.art));
      },
    },
  };
});
const loadHiddenIds = vi.hoisted(() => vi.fn(async (_u: string) => [] as string[]));
vi.mock("../commanders/hidden", () => ({ loadHiddenIds }));
vi.mock("./run-store", () => ({ loadTheRead: vi.fn(), reapAbandonedReads: vi.fn(async () => undefined) }));

const { loadChooseHistory } = await import("./history-read");

const OC = (n: number) => `0000bbbb-0000-4000-8000-00000000000${n}`;
const run = (id: string, picks: number[]) => ({
  id, createdAt: new Date("2026-10-13T21:40:00.123Z"), status: "ok", errorClass: null,
  ask: "w=a+graveyard+deck&v=results",
  result: { picks: picks.map((n) => ({ oracleId: OC(n), reason: [] })), pool: 164, weighed: 21 },
});

beforeEach(() => {
  store.runs = [];
  store.art = [];
  store.selects = 0;
  loadHiddenIds.mockReset();
  loadHiddenIds.mockResolvedValue([]);
});

describe("loadChooseHistory", () => {
  it("counts and draws every pick when nothing is hidden", async () => {
    store.runs = [run("0000aaaa-0000-4000-8000-000000000001", [1, 2, 3, 4])];
    const { rows } = await loadChooseHistory("u", { path: "/commanders/choose" });
    expect(rows[0]).toMatchObject({ picks: 4, thumbs: [OC(1), OC(2), OC(3)] });
  });

  it("drops a hidden pick from every row's count and thumbs, reading the hidden ids once", async () => {
    store.runs = [run("0000aaaa-0000-4000-8000-000000000001", [1, 2, 3, 4]), run("0000aaaa-0000-4000-8000-000000000002", [2])];
    loadHiddenIds.mockResolvedValue([OC(2)]);
    const { rows } = await loadChooseHistory("u", { path: "/commanders/choose" });
    expect(rows[0]).toMatchObject({ picks: 3, thumbs: [OC(1), OC(3), OC(4)] });
    expect(rows[1]).toMatchObject({ picks: 0, thumbs: [] });
    expect(loadHiddenIds).toHaveBeenCalledTimes(1);
    expect(loadHiddenIds).toHaveBeenCalledWith("u");
  });

  it("skips the hidden read when no row on the page has picks", async () => {
    store.runs = [run("0000aaaa-0000-4000-8000-000000000001", []), { ...run("0000aaaa-0000-4000-8000-000000000002", [1]), status: "pending", result: null }];
    const { rows } = await loadChooseHistory("u", { path: "/commanders/choose" });
    expect(rows).toHaveLength(2);
    expect(loadHiddenIds).not.toHaveBeenCalled();
  });
});
