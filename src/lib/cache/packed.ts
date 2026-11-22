/**
 * A list payload as one compressed-and-base64 string, for an entry the data cache would refuse.
 *
 * `unstable_cache` stores JSON and refuses an entry over 2 MB (`user-lists.ts`): it logs a warning
 * and the loader then runs on every request. Packed whole rather than re-shaped, so what comes
 * back is exactly what went in: the shaping (columns, short UUIDs) is `columns.ts`'s, and this
 * only compresses.
 *
 * Brotli, not gzip: gzip's 32 KB window cannot see a column's repeats across thousands of
 * records. Measured on a 23,960-card list as columns, gzip packed 1.91 MB and brotli 1.83 MB; the
 * level hardly matters (6 against 9: 1.832 MB against 1.821 MB), so the cheaper one.
 */
import { brotliCompressSync, brotliDecompressSync, constants } from "node:zlib";

export function packJson(value: unknown): string {
  return brotliCompressSync(JSON.stringify(value), {
    params: { [constants.BROTLI_PARAM_QUALITY]: 6 },
  }).toString("base64");
}

export function unpackJson<T>(packed: string): T {
  return JSON.parse(brotliDecompressSync(Buffer.from(packed, "base64")).toString("utf8")) as T;
}
