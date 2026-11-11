/**
 * A list payload as one gzip-and-base64 string, for an entry the data cache would refuse.
 *
 * `unstable_cache` stores JSON and refuses an entry over 2 MB (`user-lists.ts`): it logs a warning
 * and the loader then runs on every request. A browse list is the same keys on every card, so it
 * gzips to under a third of its size even after base64 (measured 0.28 at 2,926 cards, 1.19 MB to
 * 0.33 MB), which moves the limit from about 5,400 cards to about 20,000. Packed whole rather than
 * re-shaped, so what comes back is exactly what went in: no second encoder to keep equal to the first.
 *
 * Level 6, the default: level 1 packed 13% larger for 4 ms less (measured).
 */
import { gunzipSync, gzipSync } from "node:zlib";

export function packJson(value: unknown): string {
  return gzipSync(JSON.stringify(value)).toString("base64");
}

export function unpackJson<T>(packed: string): T {
  return JSON.parse(gunzipSync(Buffer.from(packed, "base64")).toString("utf8")) as T;
}
