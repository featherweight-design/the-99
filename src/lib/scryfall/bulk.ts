import { Readable } from "node:stream";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";
import { SCRYFALL_HEADERS } from "./http";

export type BulkType = "oracle_cards" | "default_cards";

export type BulkIndex = {
  jsonlDownloadUri: string;
  compressedSize: number;
};

/**
 * Shape the bulk-data index must have for the seeds to work.
 *
 * Scryfall replaced `download_uri`/`size` with `jsonl_download_uri`/`compressed_size` and
 * switched the payload from a JSON array to gzipped JSONL some time before 2026-07-29 (#103).
 * The old fields still appear on some responses, so presence of `download_uri` is not
 * evidence the new contract holds — only the new names are checked.
 */
export function parseBulkIndex(payload: unknown): BulkIndex {
  const p = payload as Record<string, unknown> | null;
  const uri = p?.jsonl_download_uri;
  const size = p?.compressed_size;
  if (typeof uri !== "string" || uri.length === 0) {
    throw new Error("unexpected bulk-data index shape: missing jsonl_download_uri");
  }
  if (typeof size !== "number" || !Number.isFinite(size) || size <= 0) {
    throw new Error("unexpected bulk-data index shape: missing compressed_size");
  }
  return { jsonlDownloadUri: uri, compressedSize: size };
}

export async function fetchBulkIndex(type: BulkType): Promise<BulkIndex> {
  const res = await fetch(`https://api.scryfall.com/bulk-data/${type}`, {
    headers: SCRYFALL_HEADERS,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`bulk-data index ${res.status}`);
  return parseBulkIndex(await res.json());
}

/**
 * Yields one parsed object per line of a gzipped JSONL bulk download.
 *
 * The timeout spans the whole request including body streaming. 30 minutes is generous for
 * the largest bulk (~77MB compressed) and still fails loudly inside the refresh workflow's
 * timeout-minutes: 60.
 */
export async function* streamBulkEntries(
  index: BulkIndex,
): AsyncGenerator<Record<string, unknown>> {
  const res = await fetch(index.jsonlDownloadUri, {
    headers: SCRYFALL_HEADERS,
    signal: AbortSignal.timeout(1_800_000),
  });
  if (!res.ok || !res.body) throw new Error(`bulk download ${res.status}`);

  const source = Readable.fromWeb(res.body as import("node:stream/web").ReadableStream);
  const gunzip = createGunzip();
  // pipe() does not forward errors, so a mid-download network failure would otherwise hang
  // the reader instead of rejecting it.
  source.on("error", (err) => gunzip.destroy(err));
  source.pipe(gunzip);

  for await (const line of createInterface({ input: gunzip, crlfDelay: Infinity })) {
    // Scryfall's JSONL has no wrapper, but a trailing newline yields one empty line.
    if (line.length === 0) continue;
    yield JSON.parse(line) as Record<string, unknown>;
  }
}
