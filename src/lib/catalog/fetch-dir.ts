/**
 * Fetch once, ingest on each side (plan `2026-09-28-card-data-replicate.md`, §4a).
 *
 * `Catalog refresh` downloads Scryfall's sets list, both bulk files and ManaPool's feed ONCE, in a
 * `fetch` job, and each leg ingests those same bytes into its own database. Every network read the
 * ingests make has one seam: when `CATALOG_FETCH_DIR` names a directory, the read comes from the
 * file this module names in it instead of the URL. Unset, every ingest fetches exactly as it did,
 * which is what a local `pnpm db:seed` still does. Everything after the read (the transforms, the
 * upserts, the refusals, the stamp) is unchanged and runs per database.
 */
import { createHash } from "node:crypto";
import { createReadStream, readFileSync } from "node:fs";
import { join } from "node:path";

/** One upstream source, and the files it arrives as. A bulk source is an index plus its body. */
export const FETCH_SOURCES = {
  sets: { files: ["sets.json"] },
  oracle_cards: { files: ["bulk-oracle_cards.json", "bulk-oracle_cards.jsonl.gz"] },
  default_cards: { files: ["bulk-default_cards.json", "bulk-default_cards.jsonl.gz"] },
  prices: { files: ["manapool-singles.json"] },
} as const;

export type FetchSource = keyof typeof FETCH_SOURCES;

export function fetchDir(): string | null {
  const dir = process.env.CATALOG_FETCH_DIR;
  return dir && dir.length > 0 ? dir : null;
}

export function fetchedPath(dir: string, file: string): string {
  return join(dir, file);
}

export function readFetchedJson(dir: string, file: string): unknown {
  return JSON.parse(readFileSync(fetchedPath(dir, file), "utf8"));
}

export type ManifestFile = { file: string; url: string; bytes: number; sha256: string };

/**
 * `updatedAt` is upstream's own date where it gives one (a bulk index's `updated_at`) and the
 * moment of the fetch where it does not (the sets list, ManaPool's feed). `sha256` identifies the
 * source as a whole: its body's hash, the file whose bytes the ingest reads rows from.
 */
export type ManifestSource = { source: FetchSource; updatedAt: string; sha256: string; files: ManifestFile[] };

export type Manifest = { fetchedAt: string; sources: ManifestSource[] };

export const MANIFEST_FILE = "manifest.json";

export function sha256File(path: string): Promise<{ bytes: number; sha256: string }> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    let bytes = 0;
    createReadStream(path)
      .on("data", (chunk) => { hash.update(chunk); bytes += chunk.length; })
      .on("error", reject)
      .on("end", () => resolve({ bytes, sha256: hash.digest("hex") }));
  });
}

/** What a database last ingested of one source (`catalog_sources`). */
export type Ingested = { updatedAt: Date; sha256: string };

/**
 * Why a leg may not ingest this manifest, or an empty list.
 *
 * - A file whose bytes are not the ones the manifest recorded: a corrupt or swapped artifact.
 * - A source OLDER than what the database already ingested: a re-run of an old artifact would
 *   roll the catalog back. An identical source (same date, same hash) is let through, because a
 *   retry of today's artifact is a no-op, not a rollback.
 */
export function manifestRefusal(
  manifest: Manifest,
  actual: ReadonlyMap<string, { bytes: number; sha256: string }>,
  ingested: ReadonlyMap<FetchSource, Ingested>,
): string[] {
  const out: string[] = [];
  for (const source of manifest.sources) {
    for (const f of source.files) {
      const got = actual.get(f.file);
      if (!got) out.push(`${f.file}: missing from the artifact`);
      else if (got.sha256 !== f.sha256 || got.bytes !== f.bytes) {
        out.push(`${f.file}: ${got.bytes} bytes ${got.sha256}, manifest says ${f.bytes} bytes ${f.sha256}`);
      }
    }
    const last = ingested.get(source.source);
    const at = new Date(source.updatedAt);
    if (Number.isNaN(at.getTime())) out.push(`${source.source}: updated_at ${source.updatedAt} is not a date`);
    else if (last && at.getTime() < last.updatedAt.getTime()) {
      out.push(`${source.source}: updated ${source.updatedAt}, older than the ${last.updatedAt.toISOString()} this database already ingested`);
    }
  }
  return out;
}
