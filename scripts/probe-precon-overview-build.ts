// The precon Overview build, run for real against a scratch branch with the synopsis stub (no
// model is called). Each check reads `precon_synopses` back rather than trusting the build's log:
//   THE WRITE: two precons' rows land at contract 12, with the stub's content, `current`, and the
//   list fingerprint of exactly the deck a start of that precon writes (`preparePreconDeck`).
//   THE SKIP: a second run leaves them as written: their request hash still matches.
//   THE MOVE: a row whose stored hash no longer matches its request is rewritten, not skipped, and
//   one held back by `--limit` is still marked not current.
//   THE CAP: under `--max-usd 0` nothing fits, nothing is sent and nothing is written.
// It deletes every stub row it wrote. Scratch branch only (`assertScratchBranch`), named by `PROBE_DB_URL`.
//
//   PROBE_DB_URL=<scratch> pnpm probe:precon-overview-build
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
import { execFileSync } from "node:child_process";
import { and, eq, inArray, sql } from "drizzle-orm";

requireEnv(["PROBE_DB_URL"]);
process.env.DATABASE_URL = process.env.PROBE_DB_URL;

let failures = 0;
const check = (label: string, ok: boolean, detail: string) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — ${detail}`);
};

async function main() {
  const { db } = await import("../src/db");
  const { precons, preconSynopses } = await import("../src/db/schema");
  const { preparePreconDeck } = await import("../src/lib/precons/start");
  const { listFingerprint } = await import("../src/lib/profile/fingerprint");

  const { rows: [branch] } = await db.execute<{ id: string | null }>(sql`select current_setting('neon.branch_id', true) as id`);
  assertScratchBranch(branch?.id ?? null, "probe:precon-overview-build");
  const build = (...args: string[]) => execFileSync("pnpm", ["-s", "db:build:precon-overviews", "--stub", ...args], {
    encoding: "utf8",
    env: { ...process.env, PRECON_OVERVIEW_DB_URL: process.env.PROBE_DB_URL, PRECON_OVERVIEW_TARGET_BRANCH: branch!.id!, PRECON_OVERVIEW_ROLE_BASIS: "classifier" },
  });

  // The first two plain precons the build orders by: start from none of their rows.
  const files = (await db.select({ f: precons.fileName }).from(precons).where(sql`${precons.twinOf} is null`).orderBy(precons.fileName).limit(2)).map((r) => r.f);
  await db.delete(preconSynopses).where(inArray(preconSynopses.preconFile, files));
  try {
    const capped = build("--limit", "2", "--max-usd", "0");
    const none = await db.select().from(preconSynopses).where(inArray(preconSynopses.preconFile, files));
    check("under a $0 cap nothing is written", none.length === 0 && /deferred 2/.test(capped), `${none.length} rows; ${capped.match(/stored .*$/m)?.[0]}`);

    build("--limit", "2");
    const rows = await db.select().from(preconSynopses).where(inArray(preconSynopses.preconFile, files));
    check("both precons' rows are written at contract 12", rows.length === 2 && rows.every((r) => r.contractVersion === 12 && r.current && r.model === "stub"), JSON.stringify(rows.map((r) => [r.preconFile, r.contractVersion, r.current, r.model])));
    for (const r of rows) {
      const fp = listFingerprint(await preparePreconDeck(r.preconFile));
      check(`${r.preconFile}'s list fingerprint is the started deck's`, r.listFingerprint === fp, `${r.listFingerprint.slice(0, 12)} vs ${fp.slice(0, 12)}`);
      check(`${r.preconFile}'s content passed every section`, r.content.verdicts.every((v) => v.status === "ok"), r.content.verdicts.map((v) => `${v.section}:${v.status}`).join(" "));
    }

    // A second run: both still current, so neither is rewritten (the build moves on to the next two).
    build("--limit", "2");
    const after = await db.select().from(preconSynopses).where(inArray(preconSynopses.preconFile, files));
    const same = after.length === 2 && after.every((r) => rows.find((w) => w.preconFile === r.preconFile)?.createdAt.getTime() === r.createdAt.getTime());
    check("a second run leaves both rows as written", same, after.map((r) => `${r.preconFile} ${r.createdAt.toISOString()}`).join(", "));

    // Both rows' inputs "move". Under --limit 1 the first is rewritten; the second is held back by the
    // limit, and must still be marked not current, never left current over inputs it does not fit.
    await db.update(preconSynopses).set({ inputHash: "moved" }).where(and(inArray(preconSynopses.preconFile, files), eq(preconSynopses.contractVersion, 12)));
    build("--limit", "1");
    const at = async (f: string) => (await db.select().from(preconSynopses).where(and(eq(preconSynopses.preconFile, f), eq(preconSynopses.contractVersion, 12))))[0];
    const moved = await at(files[0]);
    check("a row whose inputs moved is rewritten", moved.inputHash !== "moved" && moved.current, `hash ${moved.inputHash.slice(0, 12)}, current ${moved.current}`);
    const held = await at(files[1]);
    check("a moved row past --limit is marked not current", held.inputHash === "moved" && !held.current, `hash ${held.inputHash.slice(0, 12)}, current ${held.current}`);

    // A precon whose request cannot be built at all (the catalog refuses its commander) cannot show a
    // stored row still fits it: a current row for it is marked not current.
    let unbuildable: string | null = null;
    for (const { f } of await db.select({ f: precons.fileName }).from(precons).where(sql`${precons.twinOf} is null`).orderBy(precons.fileName)) {
      try { await preparePreconDeck(f); } catch { unbuildable = f; break; }
    }
    if (unbuildable) {
      await db.insert(preconSynopses).values({ preconFile: unbuildable, contractVersion: 12, roleBasis: "classifier", listFingerprint: "x", inputHash: "x", model: "stub", content: rows[0].content, current: true });
      build("--limit", "0");
      const gone = (await db.select().from(preconSynopses).where(and(eq(preconSynopses.preconFile, unbuildable), eq(preconSynopses.contractVersion, 12))))[0];
      check(`a row for a precon with no buildable request (${unbuildable}) is marked not current`, gone && !gone.current, `current ${gone?.current}`);
    } else {
      console.log("SKIP  no precon on this branch fails to build, so the unbuildable check has nothing to run on");
    }
  } finally {
    // Every row the runs wrote: the two precons, and the next ones the later runs moved on to.
    await db.delete(preconSynopses).where(eq(preconSynopses.model, "stub"));
  }
  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
