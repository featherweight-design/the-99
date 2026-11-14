// The scanner's two model files, kept in the browser's Cache Storage so only a device's first scanner downloads them.
// Hugging Face answers each pinned file with a redirect marked `no-store` to a signed URL that changes per request, so
// the browser's own HTTP cache never keeps them: every scanner open fetched about 18MB again (lane 58, 2026-11-13).
// A download is kept only when it hashes to the file's pinned SHA-256, so a cut-off download over mobile data, or a
// file that is not the model, is never run and never pinned. The cache is named after the hashes, so a new revision
// starts a new cache and the old one is deleted.

export type ModelFile = { url: string; sha256: string };
export type ModelBytes = { bytes: Uint8Array; from: "cache" | "network" };

export const MODEL_CACHE_PREFIX = "scan-models-";

/** The cache that holds exactly these files: named by their hashes, so another revision is another cache. Pure. */
export function modelCacheName(files: readonly ModelFile[]): string {
  return MODEL_CACHE_PREFIX + files.map((f) => f.sha256.slice(0, 12)).join("-");
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
export async function modelBytes(file: ModelFile, cacheName: string, deps: ModelCacheDeps): Promise<ModelBytes> {
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
        const buf = await hit.arrayBuffer();
        if ((await deps.sha256(buf)) === file.sha256) return { bytes: new Uint8Array(buf), from: "cache" };
        await cache.delete(file.url);
      }
    } catch {
      // an unreadable entry is downloaded again
    }
  }
  const res = await deps.fetch(file.url);
  if (!res.ok) throw new Error(`model download failed: ${res.status}`);
  // The cache is handed the response's own stream (a clone), so the page holds one copy of the bytes, not two.
  const kept = cache ? cache.put(file.url, res.clone()).then(() => true, () => false) : Promise.resolve(false);
  const buf = await res.arrayBuffer();
  if ((await deps.sha256(buf)) !== file.sha256) {
    // A download that is not the file (cut off, or something else) is never left in the cache.
    if (cache && (await kept)) await cache.delete(file.url).catch(() => false);
    throw new Error("model download does not match its pinned hash");
  }
  return { bytes: new Uint8Array(buf), from: "network" };
}

/** Deletes every scanner model cache but `keep`: the files of a revision no longer pinned. */
export async function evictOtherModelCaches(keep: string, store: CacheStorage | null): Promise<void> {
  if (!store) return;
  try {
    for (const name of await store.keys()) {
      if (name.startsWith(MODEL_CACHE_PREFIX) && name !== keep) await store.delete(name);
    }
  } catch {
    // nothing to tidy is not worth a failure
  }
}
