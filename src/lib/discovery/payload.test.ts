// `/discover`'s cached payload carries the basis its rows were counted by, and a list counted by the
// classifier only because the label read failed is served and never filed under the labels key
// (admin PR 6d-2, Copilot round 5): filed, it would be served as the labels' ranking until the ceiling.
import { describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({
  result: { basis: "labels", fellBack: false } as { basis: string; fellBack: boolean },
  stored: [] as unknown[],
  keys: [] as string[][],
  hidden: [] as string[],
  loadedWith: undefined as readonly string[] | undefined,
}));
vi.mock("../cache/user-lists", () => ({
  // The data cache as the real one behaves: the value is served, and filed only when `store` agrees.
  cacheForUser: async (_u: string, key: string[], load: () => Promise<unknown>, opts: { store?: (v: unknown) => boolean } = {}) => {
    stub.keys.push(key);
    const value = await load();
    if (!opts.store || opts.store(value)) stub.stored.push(value);
    return value;
  },
}));
vi.mock("../commanders/hidden", () => ({ loadHiddenIds: async () => stub.hidden }));
vi.mock("./list", () => ({
  discoveryKey: (sort: string, hiddenIds: readonly string[]) => ["discovery", sort, hiddenIds.join(",")],
  loadDiscoveryWithIds: async (_u: string, opts: { hiddenIds?: readonly string[] }) => {
    stub.loadedWith = opts.hiddenIds;
    return { list: { items: [], sort: "fit" }, oracleIds: [], ...stub.result };
  },
}));
vi.mock("./encode", () => ({ encodeDiscovery: () => "encoded" }));

const { loadDiscoveryPayload } = await import("./payload");
const on = { LABEL_ROLE_COUNTS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;

describe("loadDiscoveryPayload", () => {
  it("files a list counted by the basis it was asked for, with that basis on it", async () => {
    stub.stored.length = 0;
    stub.result = { basis: "labels", fellBack: false };
    expect((await loadDiscoveryPayload("u1", "fit", on)).basis).toBe("labels");
    expect(stub.stored).toHaveLength(1);
  });

  it("serves a fallback with the basis it was really counted by, and never files it", async () => {
    stub.stored.length = 0;
    stub.result = { basis: "classifier", fellBack: true };
    expect((await loadDiscoveryPayload("u1", "fit", on)).basis).toBe("classifier");
    expect(stub.stored).toHaveLength(0);
  });

  // Hide follow-up D1: the hidden set is read once, before the cached call, and both keys the entry and is handed to
  // the load, so a build that read the old set is filed under the old set's key and never served after the change.
  it("keys the entry on the hidden set and hands the load that same set", async () => {
    stub.keys.length = 0;
    stub.result = { basis: "labels", fellBack: false };
    stub.hidden = ["h1"];
    await loadDiscoveryPayload("u1", "fit", on);
    expect(stub.loadedWith).toEqual(["h1"]);
    stub.hidden = [];
    await loadDiscoveryPayload("u1", "fit", on);
    expect(stub.loadedWith).toEqual([]);
    expect(stub.keys).toEqual([["discovery", "fit", "h1"], ["discovery", "fit", ""]]);
  });
});
