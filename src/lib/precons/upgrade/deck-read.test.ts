import { beforeEach, describe, expect, it, vi } from "vitest";

const queue: unknown[][] = [];
const enabled = { on: true };
const panel = { boxBracket: 2, commanders: [{ key: "c", isFace: true, cards: [], line: "", strategies: [{ key: "s" }] }], runs: [], listFp: "x", cards: {}, allowance: {} };
const arrival = { name: "Box", setCode: "box", cards: 100, unmapped: 0, owned: 4, of: 8 };
vi.mock("../../../db", () => {
  const chain = () => {
    const b: Record<string, unknown> = {};
    for (const k of ["from", "innerJoin", "where", "orderBy"]) b[k] = () => b;
    b.then = (res: (v: unknown) => unknown) => Promise.resolve(queue.shift() ?? []).then(res);
    return b;
  };
  return { db: { select: () => chain() } };
});
vi.mock("./flag", () => ({ preconUpgradeEnabled: () => enabled.on }));
vi.mock("./run", () => ({ LIVE_DEPS: {}, readUpgrade: vi.fn(async () => panel) }));
vi.mock("./flow", () => ({ upgradeOffered: (p: unknown) => p !== null }));
vi.mock("../arrival-read", () => ({ readPreconArrival: vi.fn(async () => arrival) }));

const { readDeckUpgrade } = await import("./deck-read");
const { readUpgrade } = await import("./run");

const cards = [{ oracleId: "a", quantity: 1, imageUri: "img-a" }, { oracleId: "island", quantity: 9, imageUri: null }];
const origin = (startVersionId: string | null) => ({
  summary: { fileName: "box.json", name: "Box", commanderOracleId: "cmd", partnerOracleId: null, startVersionId },
  cards, nonBasic: [],
}) as never;
const ENV = {} as NodeJS.ProcessEnv;
const helm = [{ commanderOracleId: "cmd", partnerOracleId: null }];
const live = cards.map(({ oracleId, quantity }) => ({ oracleId, quantity }));

beforeEach(() => { queue.length = 0; enabled.on = true; vi.mocked(readUpgrade).mockClear(); });

describe("readDeckUpgrade (G16, G18)", () => {
  it("reads the band for a started deck still at its v0, with v1 next", async () => {
    queue.push([{ id: "v0", number: 0 }], helm, live);
    const r = await readDeckUpgrade("u1", "d1", origin("v0"), ENV);
    expect(r).toMatchObject({ fileName: "box.json", kind: "started", nextVersion: 1, arrival });
    expect(r?.art).toEqual([["a", "img-a"], ["island", null]]);
    expect(readUpgrade).toHaveBeenCalledWith("u1", "box.json", {}, ENV);
  });

  it("says v2 is next above a legacy start whose box is its v1, and v1 for a linked brew", async () => {
    queue.push([{ id: "v1", number: 1 }], helm, live);
    expect((await readDeckUpgrade("u1", "d1", origin("v1"), ENV))?.nextVersion).toBe(2);
    queue.push([], helm, live);
    expect(await readDeckUpgrade("u1", "d1", origin(null), ENV)).toMatchObject({ kind: "linked", nextVersion: 1 });
  });

  it("reads nothing more once a version past v0 exists, and draws no band", async () => {
    queue.push([{ id: "v0", number: 0 }, { id: "v1", number: 1 }]);
    expect(await readDeckUpgrade("u1", "d1", origin("v0"), ENV)).toBeNull();
    queue.push([{ id: "v1", number: 1 }]);
    expect(await readDeckUpgrade("u1", "d1", origin(null), ENV)).toBeNull();
    expect(readUpgrade).not.toHaveBeenCalled();
  });

  it("draws no band over changes since v0, with no origin, or with the switch off", async () => {
    queue.push([{ id: "v0", number: 0 }], helm, live.slice(1));
    expect(await readDeckUpgrade("u1", "d1", origin("v0"), ENV)).toBeNull();
    expect(await readDeckUpgrade("u1", "d1", null, ENV)).toBeNull();
    enabled.on = false;
    // A deck the gate would open: off, the switch alone answers, before any read.
    queue.push([{ id: "v0", number: 0 }], helm, live);
    expect(await readDeckUpgrade("u1", "d1", origin("v0"), ENV)).toBeNull();
    expect(queue).toHaveLength(3);
    expect(readUpgrade).not.toHaveBeenCalled();
  });
});
