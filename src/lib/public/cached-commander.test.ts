import { beforeEach, describe, expect, it, vi } from "vitest";

const load = vi.hoisted(() => vi.fn());
const generation = vi.hoisted(() => vi.fn(async () => "1000"));
const keys = vi.hoisted(() => [] as string[][]);
const store = vi.hoisted(() => new Map<string, unknown>());

vi.mock("./commander", () => ({ loadPublicCommander: load }));
vi.mock("../cache/catalog-generation", () => ({ catalogGeneration: generation }));
// A stand-in for Next's data cache: stores what the function returns under its key, and nothing that throws.
vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => Promise<unknown>, key: string[]) => async () => {
    keys.push(key);
    const k = key.join("|");
    if (store.has(k)) return store.get(k);
    const value = await fn();
    store.set(k, value);
    return value;
  },
}));
// `React.cache` memoizes per request; outside one it would hold across tests, so each call reads through here.
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));

import { publicCommanderImageKey, publicCommanderKey, readPublicCommander } from "./cached-commander";

const ok = { kind: "ok", commander: { name: "Sol Ring", state: "ok" }, canonicalSlug: "sol-ring-0b3f2c9e6a41" };

beforeEach(() => {
  load.mockReset();
  keys.length = 0;
  store.clear();
  generation.mockResolvedValue("1000");
});

describe("the public commander cache", () => {
  it("keys on the catalog generation, the deployment and the commander's id", () => {
    expect(publicCommanderKey("1000", "0b3f2c9e6a41", "dpl_1")).toEqual(["public-commander", "gen:1000", "dep:dpl_1", "id:0b3f2c9e6a41"]);
    // The link-preview image is stored under its own name, the same generation, deployment and id.
    expect(publicCommanderImageKey("1000", "0b3f2c9e6a41", "dpl_1")).toEqual(["public-commander-image", "gen:1000", "dep:dpl_1", "id:0b3f2c9e6a41"]);
  });

  it("stores one copy of a commander however its name part is spelled", async () => {
    load.mockResolvedValue(ok);
    await readPublicCommander("sol-ring-0b3f2c9e6a41");
    await readPublicCommander("anything-at-all-0b3f2c9e6a41");
    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith("0b3f2c9e6a41");
    expect(store.size).toBe(1);
  });

  it("answers an address with no id part from the loader and stores nothing", async () => {
    load.mockResolvedValue({ kind: "not-found" });
    expect(await readPublicCommander("sol-ring")).toEqual({ kind: "not-found" });
    expect(store.size).toBe(0);
  });

  it("serves a found commander from the store until the catalog moves, then reads again", async () => {
    load.mockResolvedValue(ok);
    await readPublicCommander("sol-ring-0b3f2c9e6a41");
    await readPublicCommander("sol-ring-0b3f2c9e6a41");
    expect(load).toHaveBeenCalledTimes(1);
    generation.mockResolvedValue("2000");
    expect(await readPublicCommander("sol-ring-0b3f2c9e6a41")).toEqual(ok);
    expect(load).toHaveBeenCalledTimes(2);
    expect(keys.at(-1)).toContain("gen:2000");
  });

  it("never stores a not-found or ambiguous answer", async () => {
    load.mockResolvedValue({ kind: "not-found" });
    expect(await readPublicCommander("x-0b3f2c9e6a41")).toEqual({ kind: "not-found" });
    load.mockResolvedValue({ kind: "ambiguous" });
    expect(await readPublicCommander("x-0b3f2c9e6a41")).toEqual({ kind: "ambiguous" });
    expect(store.size).toBe(0);
  });

  it("stores a found commander whatever its support state, since only a rebuild changes it", async () => {
    for (const state of ["absent", "degraded"]) {
      store.clear();
      load.mockReset();
      const found = { ...ok, commander: { ...ok.commander, state } };
      load.mockResolvedValue(found);
      await readPublicCommander("sol-ring-0b3f2c9e6a41");
      expect(await readPublicCommander("sol-ring-0b3f2c9e6a41")).toEqual(found);
      expect(load).toHaveBeenCalledTimes(1);
      expect(store.size).toBe(1);
    }
  });

  it("lets a failed read throw, and stores nothing", async () => {
    load.mockRejectedValue(new Error("db down"));
    await expect(readPublicCommander("x-0b3f2c9e6a41")).rejects.toThrow("db down");
    expect(store.size).toBe(0);
  });
});
