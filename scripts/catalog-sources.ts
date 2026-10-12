// `pnpm db:catalog-sources verify|record`: the two ends of a `Catalog refresh` leg that ingests from
// the `fetch` job's artifact (CATALOG_FETCH_DIR), against the database DATABASE_URL names.
//
//   verify  before any ingest: every file's bytes are the ones the manifest recorded, and no
//           source is OLDER than what this database last ingested (`manifestRefusal`). Exits
//           non-zero on either, so a corrupt artifact or a re-run of an old one ingests nothing.
//   record  after every ingest succeeded: writes each source's `updated_at` and hash to
//           `catalog_sources`, which is what the next run's `verify` compares against.
//
// Both take the sources the run ingests (`sets oracle_cards default_cards prices precons`, default all),
// so a dispatch that ingests one source neither judges nor records the others.
import "./lib/env.mjs";
import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { catalogSources } from "../src/db/schema";
import {
  FETCH_SOURCES, fetchDir, fetchedPath, manifestRefusal, manifestShapeRefusal, MANIFEST_FILE, sha256File,
  type FetchSource, type Ingested, type Manifest,
} from "../src/lib/catalog/fetch-dir";
import { preconTablesExist } from "../src/lib/precons/ingest";

async function main() {
  const [command, ...named] = process.argv.slice(2);
  const dir = fetchDir();
  if (!dir) throw new Error("CATALOG_FETCH_DIR is not set");
  const whole = JSON.parse(readFileSync(fetchedPath(dir, MANIFEST_FILE), "utf8")) as Manifest;
  for (const n of named) {
    if (!(n in FETCH_SOURCES)) throw new Error(`unknown source ${n}`);
  }
  const required = (named.length === 0 ? Object.keys(FETCH_SOURCES) : named) as FetchSource[];
  const manifest: Manifest = { ...whole, sources: whole.sources.filter((s) => required.includes(s.source)) };
  // Both commands, before anything else: a manifest that does not wholly describe the sources
  // asked for verifies nothing and records nothing.
  const shape = manifestShapeRefusal(whole, required);
  if (shape.length > 0) {
    console.error(`REFUSED: the manifest is not whole:\n  ${shape.join("\n  ")}`);
    process.exit(2);
  }

  if (command === "verify") {
    const actual = new Map<string, { bytes: number; sha256: string }>();
    for (const s of manifest.sources) {
      for (const f of s.files) {
        try { actual.set(f.file, await sha256File(fetchedPath(dir, f.file))); } catch { /* reported as missing */ }
      }
    }
    const rows = await db.select().from(catalogSources);
    const ingested = new Map<FetchSource, Ingested>(rows.map((r) => [r.source as FetchSource, { updatedAt: r.updatedAt, sha256: r.sha256 }]));
    const refusals = manifestRefusal(manifest, actual, ingested);
    for (const s of manifest.sources) {
      const last = ingested.get(s.source);
      console.log(`${s.source}: artifact ${s.updatedAt} · last ingested ${last ? last.updatedAt.toISOString() : "never"}`);
    }
    if (refusals.length > 0) {
      console.error(`REFUSED:\n  ${refusals.join("\n  ")}`);
      process.exit(2);
    }
    console.log("artifact verified");
    return;
  }
  if (command === "record") {
    // A database the precon migration has not reached skipped that ingest (`db:seed:precons`), and
    // its `catalog_sources` check does not admit the source yet: record nothing for it.
    const skipPrecons = !(await preconTablesExist());
    for (const s of manifest.sources) {
      if (s.source === "precons" && skipPrecons) { console.log("precons: not recorded, no precon tables yet"); continue; }
      await db.insert(catalogSources)
        .values({ source: s.source, updatedAt: new Date(s.updatedAt), sha256: s.sha256 })
        .onConflictDoUpdate({
          target: catalogSources.source,
          set: { updatedAt: sql`excluded.updated_at`, sha256: sql`excluded.sha256`, ingestedAt: sql`now()` },
        });
    }
    console.log(`recorded ${manifest.sources.length - (skipPrecons && manifest.sources.some((s) => s.source === "precons") ? 1 : 0)} sources`);
    return;
  }
  throw new Error("usage: db:catalog-sources verify|record [source ...]");
}

main().then(() => process.exit(0), (error) => { console.error(error); process.exit(1); });
