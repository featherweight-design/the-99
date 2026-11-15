// The scanner's two model files, kept in the browser's Cache Storage so only a device's first scanner downloads them.
// Hugging Face answers each pinned file with a redirect marked `no-store` to a signed URL that changes per request, so
// the browser's own HTTP cache never keeps them: every scanner open fetched about 18MB again (lane 58, 2026-11-13).
// A download is kept only when it hashes to the file's pinned SHA-256, so a cut-off download over mobile data, or a
// file that is not the model, is never run and never pinned. The cache is named after the hashes, so a new revision
// starts a new cache and the old one is deleted.

import { scanMark, type ScanMark } from "./marks";

/** `size`: the file's pinned size in bytes, the loading bar's total when the download names none (or another). */
export type ModelFile = { url: string; sha256: string; size?: number };
/**
 * What one file's load reports as it goes, for the scanner's loading bar: `cache` the moment a copy is found in Cache
 * Storage (its hash not yet checked; one that fails is reported again as a download), `network` as each downloaded
 * chunk lands. `total` is the pinned size, else the response's `content-length`, else null (the bar runs
 * indeterminate), whichever still covers the bytes read. `keeps`: whether Cache Storage opened for this load, so the
 * download can be kept (false where there is none, or it refused to open: some private windows, blocked storage).
 */
export type ModelProgress = { from: "cache" } | { from: "network"; loaded: number; total: number | null; keeps: boolean };
/** `hashMs`: how long the hash check took, for the start-up marks. */
export type ModelBytes = { bytes: Uint8Array; from: "cache" | "network"; hashMs: number };

export const MODEL_CACHE_PREFIX = "scan-models-";
/** The WebGPU runtime's WASM has a cache of its own, so a new runtime pin never evicts the models, nor the reverse. */
export const RUNTIME_CACHE_PREFIX = "scan-ort-";

/** The cache that holds exactly these files: named by their hashes, so another revision is another cache. Pure. */
export function modelCacheName(files: readonly ModelFile[], prefix = MODEL_CACHE_PREFIX): string {
  return prefix + files.map((f) => f.sha256.slice(0, 12)).join("-");
}

export type ModelCacheDeps = {
  /** The browser's Cache Storage; null where there is none (an insecure page, some private windows). */
  caches: CacheStorage | null;
  fetch: typeof fetch;
  sha256: (bytes: ArrayBuffer) => Promise<string>;
};

export async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(d, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function browserModelCacheDeps(): ModelCacheDeps {
  let store: CacheStorage | null = null;
  try {
    store = typeof caches === "undefined" ? null : caches;
  } catch {
    store = null;
  }
  return { caches: store, fetch: (...a) => fetch(...a), sha256: sha256Hex };
}

/**
 * One model file's bytes: from `cacheName` when it holds them, else downloaded, and checked against the pinned hash
 * either way. A cached copy that fails the check (storage cut it short) is deleted and downloaded again. Cache Storage
 * failing in any way (none, a quota, a blocked store) only costs the download: the file is still fetched and checked,
 * never refused for want of a cache.
 */
export async function modelBytes(
  file: ModelFile, cacheName: string, deps: ModelCacheDeps, onProgress?: (p: ModelProgress) => void,
): Promise<ModelBytes> {
  let cache: Cache | null = null;
  try {
    cache = deps.caches ? await deps.caches.open(cacheName) : null;
  } catch {
    cache = null;
  }
  if (cache) {
    try {
      const hit = await cache.match(file.url);
      if (hit) {
        onProgress?.({ from: "cache" });
        const buf = await hit.arrayBuffer();
        const t = performance.now();
        if ((await deps.sha256(buf)) === file.sha256) return { bytes: new Uint8Array(buf), from: "cache", hashMs: performance.now() - t };
        await cache.delete(file.url);
      }
    } catch {
      // an unreadable entry is downloaded again
    }
  }
  onProgress?.({ from: "network", loaded: 0, total: file.size ?? null, keeps: cache !== null });
  const res = await deps.fetch(file.url);
  if (!res.ok) throw new Error(`model download failed: ${res.status}`);
  // The cache is handed the response's own stream (a clone), so the page holds one copy of the bytes, not two.
  const kept = cache ? cache.put(file.url, res.clone()).then(() => true, () => false) : Promise.resolve(false);
  const buf = await readCounting(res, file, onProgress && ((loaded, total) => onProgress({ from: "network", loaded, total, keeps: cache !== null })));
  const t = performance.now();
  const ok = (await deps.sha256(buf)) === file.sha256;
  const hashMs = performance.now() - t;
  if (!ok) {
    // A download that is not the file (cut off, or something else) is never left in the cache.
    if (cache && (await kept)) await cache.delete(file.url).catch(() => false);
    throw new Error("model download does not match its pinned hash");
  }
  return { bytes: new Uint8Array(buf), from: "network", hashMs };
}

/**
 * A download's whole body, read as a stream so each chunk is reported against the file's total (`ModelProgress`).
 * The chunks are written into one buffer of the pinned size, grown only if the body runs past it, so the page never
 * holds the model twice while it reads. Nobody listening, or no stream to read, it is read in one go as before. The
 * hash is checked on the whole buffer by the caller either way.
 */
async function readCounting(res: Response, file: ModelFile, onProgress?: (loaded: number, total: number | null) => void): Promise<ArrayBuffer> {
  const header = Number(res.headers.get("content-length")) || null;
  const totalFor = (loaded: number) =>
    file.size && loaded <= file.size ? file.size : header && loaded <= header ? header : null;
  if (!onProgress || !res.body) {
    const buf = await res.arrayBuffer();
    onProgress?.(buf.byteLength, totalFor(buf.byteLength));
    return buf;
  }
  const reader = res.body.getReader();
  let out = new Uint8Array(file.size ?? header ?? 0);
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (loaded + value.byteLength > out.byteLength) {
      const grown = new Uint8Array(Math.max(loaded + value.byteLength, out.byteLength * 2));
      grown.set(out.subarray(0, loaded));
      out = grown;
    }
    out.set(value, loaded);
    loaded += value.byteLength;
    onProgress(loaded, totalFor(loaded));
  }
  // A body shorter than the pinned size is cut to what came (it then fails the hash, as a short download should).
  return loaded === out.byteLength ? out.buffer : out.slice(0, loaded).buffer;
}

/** Deletes every scanner cache under `prefix` but `keep`: the files of a revision no longer pinned. */
export async function evictOtherModelCaches(keep: string, store: CacheStorage | null, prefix = MODEL_CACHE_PREFIX): Promise<void> {
  if (!store) return;
  try {
    for (const name of await store.keys()) {
      if (name.startsWith(prefix) && name !== keep) await store.delete(name);
    }
  } catch {
    // nothing to tidy is not worth a failure
  }
}

/** The cache for exactly `files` under `prefix`, with that prefix's caches of other pins deleted (in the background). */
export function pinnedCache(files: readonly ModelFile[], deps: ModelCacheDeps, prefix = MODEL_CACHE_PREFIX): string {
  const name = modelCacheName(files, prefix);
  void evictOtherModelCaches(name, deps.caches, prefix);
  return name;
}

/** One pinned file's bytes (`modelBytes`, reporting to `onProgress` when given), marking `mark` with where they came from, their size and the hash check's time. */
export async function pinnedBytes(
  file: ModelFile, cacheName: string, deps: ModelCacheDeps, mark: ScanMark, onProgress?: (p: ModelProgress) => void,
): Promise<Uint8Array> {
  const m = await modelBytes(file, cacheName, deps, onProgress);
  scanMark(mark, { from: m.from, bytes: m.bytes.byteLength, hashMs: Math.round(m.hashMs) });
  return m.bytes;
}
