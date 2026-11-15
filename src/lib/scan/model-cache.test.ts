import { describe, expect, it, vi } from "vitest";
import { evictOtherModelCaches, modelBytes, modelCacheName, sha256Hex, MODEL_CACHE_PREFIX, RUNTIME_CACHE_PREFIX, type ModelCacheDeps, type ModelProgress } from "./model-cache";

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
          // as the browser does: the entry is stored once its body has been read whole
          m.set(url, new Response(await res.arrayBuffer()));
        },
        async delete(url: string) {
          return m.delete(url);
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

  it("deletes a cached copy that fails its hash and downloads the file again", async () => {
    const sha256 = await sha256Hex(BYTES.buffer.slice(0));
    const { stores, storage } = fakeCaches();
    const file = { url: "https://models.test/a.onnx", sha256 };
    await (await storage.open("scan-models-x")).put(file.url, new Response(BYTES.slice(0, 2)));
    const fetchFn = vi.fn(async () => new Response(BYTES.slice()));
    const got = await modelBytes(file, "scan-models-x", { caches: storage, fetch: fetchFn as unknown as typeof fetch, sha256: sha256Hex });
    expect(got.from).toBe("network");
    expect([...got.bytes]).toEqual([...BYTES]);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    await flush();
    const kept = await stores.get("scan-models-x")!.get(file.url)!.clone().arrayBuffer();
    expect([...new Uint8Array(kept)]).toEqual([...BYTES]);
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

/** A response whose body arrives in the given chunks, as a download does. */
const streamed = (chunks: Uint8Array[], headers?: HeadersInit) =>
  new Response(new ReadableStream<Uint8Array>({ start(c) { for (const x of chunks) c.enqueue(x); c.close(); } }), { headers });

describe("modelBytes progress (the scanner's loading bar)", () => {
  it("counts a download's bytes as they stream in, against the file's pinned size, and still checks the hash", async () => {
    const sha256 = await sha256Hex(BYTES.buffer.slice(0));
    const seen: ModelProgress[] = [];
    const fetchFn = (async () => streamed([BYTES.slice(0, 1), BYTES.slice(1, 3), BYTES.slice(3)])) as unknown as typeof fetch;
    const got = await modelBytes({ url: "https://models.test/a.onnx", sha256, size: 4 }, "n", { caches: null, fetch: fetchFn, sha256: sha256Hex }, (p) => seen.push(p));
    expect([...got.bytes]).toEqual([...BYTES]);
    expect(seen).toEqual([
      { from: "network", loaded: 0, total: 4 },
      { from: "network", loaded: 1, total: 4 },
      { from: "network", loaded: 3, total: 4 },
      { from: "network", loaded: 4, total: 4 },
    ]);
  });

  it("falls back to content-length past the pinned size, and to no total (an indeterminate bar) past both", async () => {
    const seen: ModelProgress[] = [];
    const fetchFn = (async () => streamed([BYTES.slice(0, 2), BYTES.slice(2, 3), BYTES.slice(3)], { "content-length": "3" })) as unknown as typeof fetch;
    await expect(modelBytes({ url: "u", sha256: "x", size: 2 }, "n", { caches: null, fetch: fetchFn, sha256: sha256Hex }, (p) => seen.push(p))).rejects.toThrow(/pinned hash/);
    expect(seen.slice(1).map((p) => (p.from === "network" ? p.total : "cache"))).toEqual([2, 3, null]);
  });

  it("says at once that a cached file is cached, and downloads nothing", async () => {
    const sha256 = await sha256Hex(BYTES.buffer.slice(0));
    const { storage } = fakeCaches();
    const file = { url: "https://models.test/a.onnx", sha256, size: 4 };
    await (await storage.open("scan-models-x")).put(file.url, new Response(BYTES.slice()));
    const fetchFn = vi.fn();
    const seen: ModelProgress[] = [];
    const got = await modelBytes(file, "scan-models-x", { caches: storage, fetch: fetchFn as unknown as typeof fetch, sha256: sha256Hex }, (p) => seen.push(p));
    expect(got.from).toBe("cache");
    expect(seen).toEqual([{ from: "cache" }]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("moves a cached copy that fails its hash to a counted download, and deletes it before fetching again", async () => {
    const sha256 = await sha256Hex(BYTES.buffer.slice(0));
    const { stores, storage } = fakeCaches();
    const file = { url: "https://models.test/a.onnx", sha256, size: 4 };
    await (await storage.open("scan-models-x")).put(file.url, new Response(BYTES.slice(0, 2)));
    let cachedAtFetch: boolean | null = null;
    const fetchFn = vi.fn(async () => {
      cachedAtFetch = stores.get("scan-models-x")!.has(file.url);
      return streamed([BYTES.slice()]);
    });
    const seen: ModelProgress[] = [];
    const got = await modelBytes(file, "scan-models-x", { caches: storage, fetch: fetchFn as unknown as typeof fetch, sha256: sha256Hex }, (p) => seen.push(p));
    expect(got.from).toBe("network");
    expect(cachedAtFetch).toBe(false);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(seen).toEqual([{ from: "cache" }, { from: "network", loaded: 0, total: 4 }, { from: "network", loaded: 4, total: 4 }]);
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

  it("keeps the WebGPU runtime's cache apart: evicting one prefix never touches the other", async () => {
    const { stores, storage } = fakeCaches();
    for (const n of ["scan-models-new", "scan-ort-old", "scan-ort-new"]) await storage.open(n);
    await evictOtherModelCaches("scan-ort-new", storage, RUNTIME_CACHE_PREFIX);
    await evictOtherModelCaches("scan-models-new", storage);
    expect([...stores.keys()].sort()).toEqual(["scan-models-new", "scan-ort-new"]);
  });
});
