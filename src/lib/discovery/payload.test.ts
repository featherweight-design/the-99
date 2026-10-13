// `/discover`'s cached payload carries the basis its rows were counted by, and a list counted by the
// classifier only because the label read failed is served and never filed under the labels key
// (admin PR 6d-2, Copilot round 5): filed, it would be served as the labels' ranking until the ceiling.
import { describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({
  result: { basis: "labels", fellBack: false } as { basis: string; fellBack: boolean },
  stored: [] as unknown[],
}));
vi.mock("../cache/user-lists", () => ({
  // The data cache as the real one behaves: the value is served, and filed only when `store` agrees.
  cacheForUser: async (_u: string, _k: string[], load: () => Promise<unknown>, opts: { store?: (v: unknown) => boolean } = {}) => {
    const value = await load();
    if (!opts.store || opts.store(value)) stub.stored.push(value);
    return value;
  },
}));
vi.mock("./list", () => ({
  discoveryKey: (sort: string) => ["discovery", sort],
  loadDiscoveryWithIds: async () => ({ list: { items: [], sort: "fit" }, oracleIds: [], ...stub.result }),
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
});
