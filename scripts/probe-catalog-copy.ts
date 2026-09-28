// `pnpm probe:catalog-copy` proves the catalog copy harness and `db:copy:combos` against two real
// Postgres branches (plan `2026-09-28-card-data-replicate.md`, PR 1). Every refusal is a fact about
// what two databases hold, and the transaction is a fact about what one of them committed, so no
// unit test here can reach them.
//
// It WRITES to both branches it is given (ledger rows, a card's text, flag and variant rows) and
// puts the card text back. Point it at TWO SCRATCH branches cut from staging, never staging,
// production or local-dev:
//
//   PROBE_COPY_SOURCE_URL=… PROBE_COPY_SOURCE_BRANCH=br-… \
//   PROBE_COPY_TARGET_URL=… PROBE_COPY_TARGET_BRANCH=br-… pnpm probe:catalog-copy
//
// Both must be migrated to 0074 (`catalog_builds`). Each branch's id is checked against what it
// reports, and the run refuses the three named branches outright. PROBE_COPY_SOURCE_READER_URL,
// optional, names a read-only role on the source branch for section 8.
import "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "../src/db/schema";
import { finishBuild, startBuild } from "../src/lib/catalog/builds";
import { withCatalogIngestLock } from "../src/lib/catalog/ingest-lock";
import { CopyRefused, readTableFigure, runCopy, type CopySpec } from "./lib/catalog-copy";
import { combosCopySpec, type CombosSnapshot } from "./lib/combos-copy";

neonConfig.webSocketConstructor = ws;

const NEVER = new Set(["br-noisy-violet-a6vw4ess", "br-polished-pond-a6e63y0b", "br-patient-hall-a6nbonvo"]);

const need = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
};
const SOURCE_URL = need("PROBE_COPY_SOURCE_URL");
const SOURCE_BRANCH = need("PROBE_COPY_SOURCE_BRANCH");
const TARGET_URL = need("PROBE_COPY_TARGET_URL");
const TARGET_BRANCH = need("PROBE_COPY_TARGET_BRANCH");

const connect = (url: string) => {
  const pool = new Pool({ connectionString: url });
  return { pool, db: drizzle(pool, { schema }) };
};
const source = connect(SOURCE_URL);
const target = connect(TARGET_URL);

let failures = 0;
const check = (label: string, ok: boolean, detail = "") => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
};

const quiet = () => {};
const setEnv = (targetBranch = TARGET_BRANCH, targetUrl = TARGET_URL) => {
  process.env.CATALOG_COPY_SOURCE_URL = SOURCE_URL;
  process.env.CATALOG_COPY_TARGET_URL = targetUrl;
  process.env.CATALOG_COPY_TARGET_BRANCH = targetBranch;
};

/** The refusal's message, or "copied" when the run published. */
async function attempt<S>(spec: CopySpec<S>): Promise<string> {
  try {
    await runCopy(spec, quiet);
    return "copied";
  } catch (error) {
    if (error instanceof CopyRefused) return `refused: ${error.message}`;
    throw error;
  }
}

const TABLES = combosCopySpec.tables;
const figures = async (db: typeof target.db) => {
  const out: Record<string, string> = {};
  for (const t of TABLES) {
    const f = await readTableFigure(db, t.name, t.cols);
    out[t.name] = `${f.rows}:${f.md5}`;
  }
  return out;
};
const same = (a: Record<string, string>, b: Record<string, string>) =>
  Object.keys(a).every((k) => a[k] === b[k]);

const branchOf = async (db: typeof target.db) =>
  ((await db.execute(sql`select current_setting('neon.branch_id', true) as b`)).rows[0] as { b: string }).b;

async function recordBuild(ok: boolean, kind: "combos" | "index" = "combos") {
  const row = await startBuild(source.db, kind);
  await finishBuild(source.db, row.id, kind, ok, null);
}

async function main() {
  // ---- 0 · the branches are what they claim, and none is a real database -------------------
  const [sb, tb] = await Promise.all([branchOf(source.db), branchOf(target.db)]);
  if (sb !== SOURCE_BRANCH || tb !== TARGET_BRANCH) {
    throw new Error(`branches report ${sb} / ${tb}, not the named ${SOURCE_BRANCH} / ${TARGET_BRANCH}`);
  }
  if (NEVER.has(sb) || NEVER.has(tb)) throw new Error("refusing: a named branch is production, staging or local-dev");
  await source.db.execute(sql`delete from catalog_builds`);

  // A card whose text the fingerprint must notice, and its text to put back.
  const { rows: [card] } = await target.db.execute(
    sql`select oracle_id, oracle_text from cards where oracle_text is not null order by oracle_id limit 1`,
  ) as { rows: { oracle_id: string; oracle_text: string }[] };

  try {
    // ---- 1 · identity ------------------------------------------------------------------------
    await recordBuild(true);
    setEnv("br-not-this-one");
    check("a target that is not the named branch is refused",
      (await attempt(combosCopySpec)).includes("not the named"));
    setEnv(SOURCE_BRANCH, SOURCE_URL);
    check("a target that is the source is refused",
      (await attempt(combosCopySpec)).includes("same branch"));
    setEnv();

    // ---- 2 · the ledger ----------------------------------------------------------------------
    await source.db.execute(sql`delete from catalog_builds`);
    check("a source with no recorded build is refused", (await attempt(combosCopySpec)).includes("no build"));
    await recordBuild(false);
    check("a source whose newest build failed is refused", (await attempt(combosCopySpec)).includes("failed"));
    await startBuild(source.db, "combos");
    check("a source whose newest build has not finished is refused",
      (await attempt(combosCopySpec)).includes("not finished"));
    await source.db.execute(sql`delete from catalog_builds`);
    const open = await startBuild(source.db, "combos");
    const refused = async (f: () => Promise<unknown>) => { try { await f(); return false; } catch { return true; } };
    check("finishing a build as the other kind fails", await refused(() => finishBuild(source.db, open.id, "index", true, null)));
    await finishBuild(source.db, open.id, "combos", true, null);
    check("finishing an already finished build fails", await refused(() => finishBuild(source.db, open.id, "combos", true, null)));
    await source.db.execute(sql`delete from catalog_builds`);

    // ---- 3 · the catalogs: ids equal, one card's TEXT different ---------------------------
    await recordBuild(true);
    await target.db.execute(sql`update cards set oracle_text = oracle_text || ' ' where oracle_id = ${card.oracle_id}`);
    check("a target whose card TEXT differs is refused, though every id matches",
      (await attempt(combosCopySpec)).includes("catalogs disagree"));
    await target.db.execute(sql`update cards set oracle_text = ${card.oracle_text} where oracle_id = ${card.oracle_id}`);

    await source.db.execute(sql`update cards set oracle_text = oracle_text || ' ' where oracle_id = ${card.oracle_id}`);
    check("a source whose catalog moved since the build is refused",
      (await attempt(combosCopySpec)).includes("moved since the build"));
    await source.db.execute(sql`update cards set oracle_text = ${card.oracle_text} where oracle_id = ${card.oracle_id}`);

    // ---- 4 · the floors ----------------------------------------------------------------------
    check("an empty source is under the builders' floors",
      combosCopySpec.floors({ flags: [], variants: [], members: [] }).length > 0);
    // The field floors too: the real source's variants with their steps stripped.
    const real = await source.db.transaction((tx) => combosCopySpec.readSource(tx));
    const stripped = { ...real, variants: real.variants.map((v) => ({ ...v, steps: null })) };
    check("a source whose variants lost their steps is under the field floor",
      combosCopySpec.floors(stripped).some((b) => b.startsWith("steps ")) && combosCopySpec.floors(real).length === 0);
    // And the harness acts on them: a source under a floor is refused before any target write.
    const underFloor: CopySpec<CombosSnapshot> = { ...combosCopySpec, floors: () => ["forced by the probe"] };
    check("a source under a floor is refused by the copy itself",
      (await attempt(underFloor)).includes("under the builders' floors"));

    // ---- 5 · a verified copy -----------------------------------------------------------------
    // Make the target differ: drop some mass-land-denial flags (so the notice log has a diff to
    // record) and some variants.
    await target.db.execute(sql`delete from card_bracket_flags where oracle_id in (
      select oracle_id from card_bracket_flags where mass_land_denial order by oracle_id limit 5)`);
    await target.db.execute(sql`delete from spellbook_variants where variant_id in (
      select variant_id from spellbook_variants order by variant_id limit 25)`);
    const sourceFigures = await figures(source.db);
    check("the fixture makes the target differ from the source", !same(sourceFigures, await figures(target.db)));
    const logBefore = Number(((await target.db.execute(sql`select count(*)::int as n from deck_data_changes`)).rows[0] as { n: number }).n);
    const stampBefore = ((await target.db.execute(sql`select refreshed_at from catalog_refreshes where id = 1`)).rows[0] as { refreshed_at: Date } | undefined)?.refreshed_at;

    check("a copy of a successful build publishes", (await attempt(combosCopySpec)) === "copied");
    check("the target's three tables now equal the source's, row for row", same(sourceFigures, await figures(target.db)));
    const logAfter = Number(((await target.db.execute(sql`select count(*)::int as n from deck_data_changes`)).rows[0] as { n: number }).n);
    check("production's own notice log records the diff", logAfter > logBefore, `${logBefore} -> ${logAfter}`);
    const stampAfter = ((await target.db.execute(sql`select refreshed_at from catalog_refreshes where id = 1`)).rows[0] as { refreshed_at: string }).refreshed_at;
    check("the target's catalog stamp moved", !stampBefore || new Date(stampAfter).getTime() > new Date(stampBefore).getTime(),
      `${String(stampBefore)} -> ${stampAfter}`);

    // ---- 6 · verification rolls a bad publish back -------------------------------------------
    await target.db.execute(sql`delete from spellbook_variants where variant_id in (
      select variant_id from spellbook_variants order by variant_id desc limit 3)`);
    const beforeBad = await figures(target.db);
    const tampering: CopySpec<CombosSnapshot> = {
      ...combosCopySpec,
      publish: async (tx, s) => {
        await combosCopySpec.publish(tx, s);
        await tx.execute(sql`delete from card_bracket_flags where oracle_id = (select oracle_id from card_bracket_flags order by oracle_id limit 1)`);
      },
    };
    check("a publish that does not match the source is refused",
      (await attempt(tampering)).includes("verification failed"));
    check("and rolled back: the target is exactly as it was", same(beforeBad, await figures(target.db)));

    // ---- 7 · the catalog-ingest lock ---------------------------------------------------------
    // The hold is tied to the copy's own progress, never to a clock: it lets go 6s after the copy
    // has finished READING the source, so a copy that skipped the lock would publish inside that
    // window. A fixed sleep measured nothing, because the source reads alone outlast it.
    let released = 0;
    let publishStarted = 0;
    let readsDone!: () => void;
    const afterReads = new Promise<void>((r) => { readsDone = r; });
    let locked!: () => void;
    const lockHeld = new Promise<void>((r) => { locked = r; });
    const holder = withCatalogIngestLock(TARGET_URL, async () => {
      locked();
      await afterReads;
      await new Promise((r) => setTimeout(r, 6000));
      released = Date.now();
    });
    await lockHeld;
    const timed: CopySpec<CombosSnapshot> = {
      ...combosCopySpec,
      readSource: async (tx) => { try { return await combosCopySpec.readSource(tx); } finally { readsDone(); } },
      publish: async (tx, s) => { publishStarted = Date.now(); await combosCopySpec.publish(tx, s); },
    };
    const outcome = await attempt(timed);
    await holder;
    check("a copy waits for a running catalog ingest", outcome === "copied" && publishStarted >= released,
      `${outcome}; publish began ${publishStarted - released}ms after the ingest let go`);

    // The source half: an ingest publishes in more than one transaction, so a copy reading the
    // source mid-ingest would snapshot a mixed generation. The copy must not START reading until
    // a lock held on the source lets go.
    let srcReleased = 0;
    let readStarted = 0;
    let srcLocked!: () => void;
    const srcLockHeld = new Promise<void>((r) => { srcLocked = r; });
    const srcHolder = withCatalogIngestLock(SOURCE_URL, async () => {
      srcLocked();
      await new Promise((r) => setTimeout(r, 6000));
      srcReleased = Date.now();
    });
    await srcLockHeld;
    const reading: CopySpec<CombosSnapshot> = {
      ...combosCopySpec,
      readSource: async (tx) => { readStarted = Date.now(); return combosCopySpec.readSource(tx); },
    };
    const srcOutcome = await attempt(reading);
    await srcHolder;
    check("a copy does not read the source while an ingest there holds the lock",
      srcOutcome === "copied" && readStarted >= srcReleased,
      `${srcOutcome}; the read began ${readStarted - srcReleased}ms after the source ingest let go`);

    // ---- 8 · a read-only source role -----------------------------------------------------------
    // Production's copy reads staging as `catalog_copy_reader`: SELECT only and
    // `default_transaction_read_only = on`. Nothing in the copy may need more than that, and the
    // branch id the identity check reads must be visible to it. Set PROBE_COPY_SOURCE_READER_URL to
    // such a role on the source branch; without it this section is reported as not measured.
    const readerUrl = process.env.PROBE_COPY_SOURCE_READER_URL;
    if (!readerUrl) {
      console.log("note  PROBE_COPY_SOURCE_READER_URL unset: the read-only source role was not measured");
    } else {
      const reader = connect(readerUrl);
      try {
        check("a read-only role reads the source's branch id", (await branchOf(reader.db)) === SOURCE_BRANCH);
        let wrote = true;
        try { await reader.db.execute(sql`delete from catalog_builds where false`); } catch { wrote = false; }
        check("the role cannot write, so the fixture is the role production uses", !wrote);
      } finally {
        await reader.pool.end();
      }
      setEnv();
      process.env.CATALOG_COPY_SOURCE_URL = readerUrl;
      check("a copy through the read-only role publishes", (await attempt(combosCopySpec)) === "copied");
      setEnv();
    }
  } finally {
    await target.db.execute(sql`update cards set oracle_text = ${card.oracle_text} where oracle_id = ${card.oracle_id}`);
    await source.db.execute(sql`update cards set oracle_text = ${card.oracle_text} where oracle_id = ${card.oracle_id}`);
    await Promise.all([source.pool.end(), target.pool.end()]);
  }
}

main().then(
  () => {
    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
    process.exitCode = failures === 0 ? 0 : 1;
  },
  (error) => { console.error(error); process.exitCode = 1; },
);
