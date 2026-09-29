import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";
import { fetchDir, fetchedPath, readFetchedJson } from "../catalog/fetch-dir";
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

/**
 * With `CATALOG_FETCH_DIR` set, the index is the file the `fetch` job saved, and its download
 * points at the body saved beside it, so `streamBulkEntries` reads the same bytes on every leg.
 */
export async function fetchBulkIndex(type: BulkType): Promise<BulkIndex> {
  const dir = fetchDir();
  if (dir) {
    const index = parseBulkIndex(readFetchedJson(dir, `bulk-${type}.json`));
    return { ...index, jsonlDownloadUri: pathToFileURL(fetchedPath(dir, `bulk-${type}.jsonl.gz`)).href };
  }
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
  // A consumer that stops early — the canary reads one line of ~77MB — would otherwise leave
  // the download running to completion, with any later socket error surfacing unhandled after
  // the generator is gone. Aborting the fetch in the finally below cancels it for real.
  const controller = new AbortController();
  let source: Readable;
  if (index.jsonlDownloadUri.startsWith("file:")) {
    // A body the `fetch` job saved (`fetchBulkIndex` under CATALOG_FETCH_DIR): the same pipeline
    // from here on, over the file's bytes.
    source = createReadStream(fileURLToPath(index.jsonlDownloadUri));
  } else {
    const res = await fetch(index.jsonlDownloadUri, {
      headers: SCRYFALL_HEADERS,
      // The timeout spans the whole request including body streaming. 30 minutes is generous for
      // the largest bulk and still fails loudly inside the refresh workflow's timeout-minutes: 60.
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(1_800_000)]),
    });
    if (!res.ok || !res.body) throw new Error(`bulk download ${res.status}`);
    source = Readable.fromWeb(res.body as import("node:stream/web").ReadableStream);
  }
  const gunzip = createGunzip();
  // pipe() does not forward errors, so a mid-download network failure would otherwise hang
  // the reader instead of rejecting it.
  source.on("error", (err) => gunzip.destroy(err));
  source.pipe(gunzip);
  const lines = createInterface({ input: gunzip, crlfDelay: Infinity });

  try {
    for await (const line of lines) {
      // Scryfall's JSONL has no wrapper, but a trailing newline yields one empty line.
      if (line.length === 0) continue;
      const parsed: unknown = JSON.parse(line);
      // Without this the generator's own type is a lie, and a stray null or array would fail
      // somewhere downstream in the transforms with a far less actionable message.
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error(`bulk entry is not a JSON object: ${line.slice(0, 80)}`);
      }
      yield parsed as Record<string, unknown>;
    }
  } finally {
    lines.close();
    // Teardown errors say nothing a caller can act on — a real streaming failure has already
    // rejected the loop above — but an unhandled 'error' event would crash the process.
    source.on("error", () => {});
    gunzip.on("error", () => {});
    // Abort before destroying: destroying the source alone leaves fetch's own reader holding
    // the connection.
    controller.abort();
    source.destroy();
    gunzip.destroy();
  }
}
