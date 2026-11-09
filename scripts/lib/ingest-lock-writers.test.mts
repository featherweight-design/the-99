import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Every script that writes a table a catalog copy publishes must hold the `catalog-ingest` lock
// the copy takes, or an ingest and a copy against one database can interleave and the copy can
// commit, or verify, a mixed generation. A writer added here without the lock fails this test.
const WRITERS = ["seed-sets.ts", "seed-cards.ts", "seed-printings.ts", "seed-prices.ts", "seed-combos.ts"];

describe("catalog writers hold the ingest lock", () => {
  it.each(WRITERS)("%s runs its ingest inside withCatalogIngestLock", (file) => {
    const src = readFileSync(join(import.meta.dirname, "..", file), "utf8");
    expect(src).toMatch(/withCatalogIngestLock\(\s*process\.env\.DATABASE_URL!,/);
  });

  // A builder whose output a copy publishes records its own ledger rows, so a run by hand that
  // dies part-way leaves a newest row the copy refuses rather than an older `ok` vouching for it.
  // The sweep stamps its phase when its row STARTS, so a sweep killed by the job's timeout is still
  // known as one (and a staples retry never looks past it).
  it("build-commander-index.ts stamps the sweep phase at its start and on failure", () => {
    const src = readFileSync(join(import.meta.dirname, "..", "build-commander-index.ts"), "utf8");
    expect(src).toMatch(/undefined, undefined, INDEX_SWEEP_PHASE\)/);
  });

  it("seed-combos.ts records its own build", () => {
    const src = readFileSync(join(import.meta.dirname, "..", "seed-combos.ts"), "utf8");
    expect(src).toMatch(/recordBuild\(db, "combos",/);
  });

  // The index is two steps, and each records itself, so the staples row is the newest and a
  // failed derivation leaves the build refused.
  it.each([["build-commander-index.ts"], ["build-staples.ts"]])("%s records its own index build", (file) => {
    const src = readFileSync(join(import.meta.dirname, "..", file), "utf8");
    expect(src).toMatch(/recordBuild\(db, "index",/);
  });

  // `staplesBase` walks the ledger, and the run stamps its own failure `phase=staples`, so a failed
  // staples step can be retried while anything else still refuses.
  it("build-staples.ts refuses unless the row it derives from finished ok (staplesBase), and stamps its failure", () => {
    const src = readFileSync(join(import.meta.dirname, "..", "build-staples.ts"), "utf8");
    expect(src).toMatch(/staplesBase\(rows\)[\s\S]*"refusal" in found[\s\S]*throw[\s\S]*const prev = found\.base;[\s\S]*recordBuild\(db, "index", main, \(\) => phaseReport\(INDEX_FINAL_PHASE, labelsDetail\(labelsOf\(prev\.report\)\)\), undefined, prev\.catalogFingerprint, INDEX_FINAL_PHASE\)/);
  });
});

// The two ledger readers outside the builders, pinned on their source: each is I/O around a pure rule
// that is tested on its own (`sweepStarts` in index-due.test.ts, `handCloseReport` in builds.test.ts).
describe("the ledger's other readers go through their rules", () => {
  // The gate must hand `indexDue` only the sweep's rows, with the report it reads the phase from.
  it("db:index-due reads each ok row's report and passes the rows through sweepStarts", () => {
    const src = readFileSync(join(import.meta.dirname, "..", "index-due.ts"), "utf8");
    expect(src).toMatch(/select\(\{ startedAt: catalogBuilds\.startedAt, report: catalogBuilds\.report \}\)/);
    expect(src).toMatch(/indexDue\(new Date\(\), setRows, sweepStarts\(builds\)\)/);
    expect(src).not.toMatch(/builds\.map\(\(b\) => b\.startedAt\)/);
  });

  // A hand close keeps the start's phase and can never type one.
  it("db:catalog-build finish writes the report handCloseReport gives it", () => {
    const src = readFileSync(join(import.meta.dirname, "..", "catalog-build.ts"), "utf8");
    expect(src).toMatch(/const report = handCloseReport\(row\?\.report \?\? null, process\.env\.CATALOG_BUILD_REPORT \?\? null\);\s*await finishBuild\(db, id, kind as BuildKind, outcome === "ok", report\);/);
    expect(src).not.toMatch(/finishBuild\([^)]*process\.env\.CATALOG_BUILD_REPORT/);
  });
});
