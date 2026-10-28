// The precon Overview copy, run for real between two scratch branches (no model is called). The
// source's rows are written by the build's stub and relabelled as a real model's, because the copy
// never carries a stub's row. Each check reads `precon_synopses` back on the TARGET:
//   THE INSTALL: both rows land, current, with the source's hash, which is the target's own
//   request hash (the two branches hold the same catalog).
//   THE REPLACE: a target row whose inputs moved is replaced, current, by the source's row that fits.
//   THE RE-CHECK: a target row whose source and target no longer agree with the target's request is
//   marked not current, and is not overwritten by the source's row that does not fit either.
//   THE RESTAMP: once the target's row fits again, the next copy marks it current again.
// It deletes the rows it wrote on both branches. Both branches must be scratch branches
// (`assertScratchBranch`), named by `PROBE_SOURCE_URL` and `PROBE_TARGET_URL`.
//
//   PROBE_SOURCE_URL=<scratch> PROBE_TARGET_URL=<other scratch> pnpm probe:precon-overview-copy
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
import { execFileSync } from "node:child_process";
import { Pool } from "@neondatabase/serverless";
import { and, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";

const env = requireEnv(["PROBE_SOURCE_URL", "PROBE_TARGET_URL"]);

let failures = 0;
const check = (label: string, ok: boolean, detail: string) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — ${detail}`);
};

async function main() {
  const schema = await import("../src/db/schema");
  const { precons, preconSynopses } = schema;
  const open = (url: string) => {
    const pool = new Pool({ connectionString: url });
    return { pool, db: drizzle(pool, { schema }) };
  };
  const source = open(env.PROBE_SOURCE_URL);
  const target = open(env.PROBE_TARGET_URL);
  const branchOf = async (d: typeof source.db) =>
    (await d.execute<{ id: string | null }>(sql`select current_setting('neon.branch_id', true) as id`)).rows[0]?.id ?? null;
  const [sourceBranch, targetBranch] = [await branchOf(source.db), await branchOf(target.db)];
  assertScratchBranch(sourceBranch, "probe:precon-overview-copy (source)");
  assertScratchBranch(targetBranch, "probe:precon-overview-copy (target)");

  const run = (script: string, extra: Record<string, string>) => execFileSync("pnpm", ["-s", script, ...(script.includes("build") ? ["--stub", "--limit", "2"] : [])], {
    encoding: "utf8", env: { ...process.env, PRECON_OVERVIEW_ROLE_BASIS: "classifier", ...extra },
  });
  const copy = () => run("db:copy:precon-overviews", {
    CATALOG_COPY_SOURCE_URL: env.PROBE_SOURCE_URL, CATALOG_COPY_TARGET_URL: env.PROBE_TARGET_URL, CATALOG_COPY_TARGET_BRANCH: targetBranch!,
  });

  const files = (await source.db.select({ f: precons.fileName }).from(precons).where(sql`${precons.twinOf} is null`).orderBy(precons.fileName).limit(2)).map((r) => r.f);
  const mine = and(eq(preconSynopses.contractVersion, 12), eq(preconSynopses.roleBasis, "classifier"), inArray(preconSynopses.preconFile, files));
  const targetRows = () => target.db.select().from(preconSynopses).where(mine);
  try {
    await source.db.delete(preconSynopses).where(mine);
    await target.db.delete(preconSynopses).where(mine);
    run("db:build:precon-overviews", { PRECON_OVERVIEW_DB_URL: env.PROBE_SOURCE_URL, PRECON_OVERVIEW_TARGET_BRANCH: sourceBranch! });
    // The copy carries no stub: these stand in for a real model's rows.
    await source.db.update(preconSynopses).set({ model: "probe-model" }).where(mine);
    const sourceRows = await source.db.select().from(preconSynopses).where(mine);

    copy();
    const installed = await targetRows();
    check("both rows are installed on the target, current", installed.length === 2 && installed.every((r) => r.current), JSON.stringify(installed.map((r) => [r.preconFile, r.current])));
    check("each carries the source's hash", installed.every((r) => r.inputHash === sourceRows.find((s) => s.preconFile === r.preconFile)?.inputHash), "");

    // The target's row no longer fits (its hash moved) but the source's still does: the copy REPLACES
    // it, current, and does not then mark the row it just installed stale.
    await target.db.update(preconSynopses).set({ inputHash: "target-old" }).where(and(mine, eq(preconSynopses.preconFile, files[1])));
    copy();
    const [replaced] = (await targetRows()).filter((r) => r.preconFile === files[1]);
    const want = sourceRows.find((x) => x.preconFile === files[1])!.inputHash;
    check("a target row whose inputs moved is replaced by the source's fitting row, current", replaced.current && replaced.inputHash === want, `current ${replaced.current}, hash ${replaced.inputHash.slice(0, 12)}`);

    // Neither side now fits the target's own request for the first precon.
    await source.db.update(preconSynopses).set({ inputHash: "source-moved" }).where(and(mine, eq(preconSynopses.preconFile, files[0])));
    await target.db.update(preconSynopses).set({ inputHash: "target-moved" }).where(and(mine, eq(preconSynopses.preconFile, files[0])));
    copy();
    const [rechecked] = (await targetRows()).filter((r) => r.preconFile === files[0]);
    check("a target row the target's inputs no longer fit is marked not current", !rechecked.current, `current ${rechecked.current}`);
    check("and the source row that does not fit either is not installed over it", rechecked.inputHash === "target-moved", `hash ${rechecked.inputHash}`);

    // The target's row fits again (its hash is the target's request's): the next copy re-stamps it.
    const good = sourceRows.find((s) => s.preconFile === files[0])!.inputHash;
    await target.db.update(preconSynopses).set({ inputHash: good }).where(and(mine, eq(preconSynopses.preconFile, files[0])));
    copy();
    const [restamped] = (await targetRows()).filter((r) => r.preconFile === files[0]);
    check("a row that fits again is marked current again", restamped.current, `current ${restamped.current}`);
  } finally {
    await source.db.delete(preconSynopses).where(mine);
    await target.db.delete(preconSynopses).where(mine);
    await Promise.all([source.pool.end(), target.pool.end()]);
  }
  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
