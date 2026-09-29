// `pnpm catalog:fetch <dir>`: download every upstream file the catalog ingests read, ONCE, into
// <dir>, with a manifest (plan `2026-09-28-card-data-replicate.md`, §4a). `Catalog refresh` runs
// it in its `fetch` job, which needs no database, and hands <dir> to both legs as one artifact;
// each leg then ingests with CATALOG_FETCH_DIR=<dir> and reads these files instead of the network.
//
// The manifest records, per source, every file's URL, byte length and sha256, and the source's
// `updated_at`: upstream's own where it gives one (a bulk index), the moment that source's own
// request started where it does not.
// `db:catalog-sources verify` checks a leg's copy of the artifact against it before any ingest.
import "./lib/env.mjs";
import { createWriteStream, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  FETCH_SOURCES, fetchedPath, MANIFEST_FILE, sha256File,
  type FetchSource, type Manifest, type ManifestFile, type ManifestSource,
} from "../src/lib/catalog/fetch-dir";
import { MANAPOOL_HEADERS, MANAPOOL_SINGLES_URL } from "../src/lib/manapool/client";
import { SCRYFALL_HEADERS, SETS_INDEX } from "../src/lib/scryfall/http";

const dir = process.argv[2] ?? process.env.CATALOG_FETCH_DIR;
if (!dir) throw new Error("usage: catalog:fetch <dir> (or set CATALOG_FETCH_DIR)");
mkdirSync(dir, { recursive: true });

async function download(url: string, file: string, headers: Record<string, string>, timeoutMs: number): Promise<ManifestFile> {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok || !res.body) throw new Error(`${url}: ${res.status}`);
  await pipeline(Readable.fromWeb(res.body as import("node:stream/web").ReadableStream), createWriteStream(fetchedPath(dir!, file)));
  return { file, url, ...(await sha256File(fetchedPath(dir!, file))) };
}

async function bulk(type: "oracle_cards" | "default_cards"): Promise<ManifestSource> {
  const [indexFile, bodyFile] = FETCH_SOURCES[type].files;
  const index = await download(`https://api.scryfall.com/bulk-data/${type}`, indexFile, SCRYFALL_HEADERS, 30_000);
  const record = JSON.parse(readFileSync(fetchedPath(dir!, indexFile), "utf8")) as
    { jsonl_download_uri?: string; updated_at?: string };
  if (!record.jsonl_download_uri || !record.updated_at) throw new Error(`${type}: index lacks jsonl_download_uri or updated_at`);
  const body = await download(record.jsonl_download_uri, bodyFile, SCRYFALL_HEADERS, 1_800_000);
  return { source: type, updatedAt: new Date(record.updated_at).toISOString(), sha256: body.sha256, files: [index, body] };
}

// A source with no upstream date is stamped with the moment ITS OWN request starts, never the run's
// start: two fetch runs can overlap, and a run that began earlier but reached this source later
// would otherwise carry an older date over newer bytes, and the rollback guard would take them.
async function single(source: FetchSource, url: string, headers: Record<string, string>, timeoutMs: number): Promise<ManifestSource> {
  const at = new Date().toISOString();
  const f = await download(url, FETCH_SOURCES[source].files[0], headers, timeoutMs);
  return { source, updatedAt: at, sha256: f.sha256, files: [f] };
}

async function main() {
  const fetchedAt = new Date().toISOString();
  const sources = [
    await single("sets", SETS_INDEX, SCRYFALL_HEADERS, 30_000),
    await bulk("oracle_cards"),
    await bulk("default_cards"),
    await single("prices", MANAPOOL_SINGLES_URL, MANAPOOL_HEADERS, 5 * 60_000),
  ];
  const manifest: Manifest = { fetchedAt, sources };
  writeFileSync(fetchedPath(dir!, MANIFEST_FILE), JSON.stringify(manifest, null, 2));
  for (const s of sources) {
    console.log(`${s.source}: updated ${s.updatedAt} · ${s.files.map((f) => `${f.file} ${f.bytes} bytes`).join(", ")}`);
  }
}

main().then(() => process.exit(0), (error) => { console.error(error); process.exit(1); });
