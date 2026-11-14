import { describe, expect, it, vi } from "vitest";
import { evictOtherModelCaches, modelBytes, modelCacheName, sha256Hex, MODEL_CACHE_PREFIX, type ModelCacheDeps } from "./model-cache";

const BYTES = new Uint8Array([1, 2, 3, 4]);

/** An in-memory Cache Storage: enough of the API for the helper. */
function fakeCaches() {
  const stores = new Map<string, Map<string, Response>>();
  const storage = {
    async open(name: string) {
      if (!stores.has(name)) stores.set(name, new Map());
      const m = stores.get(name)!;
      return {
        async match(url: string) {
          return m.get(url)?.clone();
        },
        async put(url: string, res: Response) {
          m.set(url, res);
        },
      } as unknown as Cache;
    },
    async keys() {
      return [...stores.keys()];
    },
    async delete(name: string) {
      return stores.delete(name);
    },
  };
  return { stores, storage: storage as unknown as CacheStorage };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("modelBytes", () => {
  it("downloads a model once, checked against its hash, and answers it from the cache after", async () => {
    const sha256 = await sha256Hex(BYTES.buffer.slice(0));
    const { storage } = fakeCaches();
    const fetchFn = vi.fn(async () => new Response(BYTES.slice()));
    const deps: ModelCacheDeps = { caches: storage, fetch: fetchFn as unknown as typeof fetch, sha256: sha256Hex };
    const file = { url: "https://models.test/a.onnx", sha256 };
    const first = await modelBytes(file, "scan-models-x", deps);
    expect(first.from).toBe("network");
    expect([...first.bytes]).toEqual([...BYTES]);
    await flush();
    const second = await modelBytes(file, "scan-models-x", deps);
    expect(second.from).toBe("cache");
    expect([...second.bytes]).toEqual([...BYTES]);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("refuses and never caches a download that does not hash to the pinned file (a cut-off download)", async () => {
    const { stores, storage } = fakeCaches();
    const deps: ModelCacheDeps = { caches: storage, fetch: (async () => new Response(BYTES.slice(0, 2))) as unknown as typeof fetch, sha256: sha256Hex };
    const file = { url: "https://models.test/a.onnx", sha256: await sha256Hex(BYTES.buffer.slice(0)) };
    await expect(modelBytes(file, "scan-models-x", deps)).rejects.toThrow(/pinned hash/);
    await flush();
    expect(stores.get("scan-models-x")?.size ?? 0).toBe(0);
  });

  it("refuses a failed download", async () => {
    const deps: ModelCacheDeps = { caches: null, fetch: (async () => new Response("no", { status: 503 })) as unknown as typeof fetch, sha256: sha256Hex };
    await expect(modelBytes({ url: "https://models.test/a.onnx", sha256: "x" }, "scan-models-x", deps)).rejects.toThrow(/503/);
  });

  it("still downloads and checks the file when there is no Cache Storage, or it throws", async () => {
    const sha256 = await sha256Hex(BYTES.buffer.slice(0));
    const file = { url: "https://models.test/a.onnx", sha256 };
    const fetchFn = (async () => new Response(BYTES.slice())) as unknown as typeof fetch;
    expect((await modelBytes(file, "n", { caches: null, fetch: fetchFn, sha256: sha256Hex })).from).toBe("network");
    const broken = { open: async () => { throw new Error("blocked"); } } as unknown as CacheStorage;
    expect((await modelBytes(file, "n", { caches: broken, fetch: fetchFn, sha256: sha256Hex })).from).toBe("network");
  });
});

describe("model caches", () => {
  it("names the cache by both files' hashes, so a new revision is a new cache", () => {
    const a = modelCacheName([{ url: "u", sha256: "a".repeat(64) }, { url: "v", sha256: "b".repeat(64) }]);
    const b = modelCacheName([{ url: "u", sha256: "a".repeat(64) }, { url: "v", sha256: "c".repeat(64) }]);
    expect(a.startsWith(MODEL_CACHE_PREFIX)).toBe(true);
    expect(a).not.toBe(b);
  });

  it("deletes the scanner's other model caches and leaves every other cache alone", async () => {
    const { stores, storage } = fakeCaches();
    for (const n of ["scan-models-old", "scan-models-new", "static-v3", "offline-v1"]) await storage.open(n);
    await evictOtherModelCaches("scan-models-new", storage);
    expect([...stores.keys()].sort()).toEqual(["offline-v1", "scan-models-new", "static-v3"]);
  });
});
