// The build ledger's two steps, run by a replicated job's BUILD leg around its builder
// (plan `2026-09-28-card-data-replicate.md`, §3 item 7):
//
//   pnpm db:catalog-build start index     # before db:build:index; records the catalog fingerprint
//   pnpm db:catalog-build finish index ok # only after every builder step succeeded
//   pnpm db:catalog-build finish index failed
//
// `start` writes the row id to CATALOG_BUILD_ID_FILE (default `.catalog-build-id`) and `finish`
// reads it back, so the two steps of one job refer to one row. A build nobody recorded, or one
// whose `finish` never ran, is a build a copy refuses.
import "./lib/env.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { db } from "../src/db";
import { finishBuild, startBuild, type BuildKind } from "../src/lib/catalog/builds";

const [command, kind, outcome] = process.argv.slice(2);
const idFile = process.env.CATALOG_BUILD_ID_FILE ?? ".catalog-build-id";

async function main() {
  if (kind !== "index" && kind !== "combos") throw new Error(`kind must be index or combos, not ${kind}`);
  if (command === "start") {
    const row = await startBuild(db, kind as BuildKind);
    writeFileSync(idFile, row.id);
    console.log(`build ${row.id} started · ${kind} · catalog ${row.catalogFingerprint}`);
    return;
  }
  if (command === "finish") {
    if (outcome !== "ok" && outcome !== "failed") throw new Error(`outcome must be ok or failed, not ${outcome}`);
    const id = readFileSync(idFile, "utf8").trim();
    await finishBuild(db, id, kind as BuildKind, outcome === "ok", process.env.CATALOG_BUILD_REPORT ?? null);
    console.log(`build ${id} finished · ${kind} · ${outcome}`);
    return;
  }
  throw new Error(`usage: db:catalog-build start|finish <index|combos> [ok|failed]`);
}

main().then(() => process.exit(0), (error) => { console.error(error); process.exit(1); });
