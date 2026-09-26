// Installs labels one database has already generated onto another. PAYS NOTHING.
//
// Hugh's ruling of 2026-09-26: PAY ONCE. A label costs a model call to produce and nothing to
// move, so the weekly job generates against `catalog-staging` only and this carries the result to
// production. It is the reason the label workflow does NOT fan out over both environments the way
// every other refresh job here does — that fan-out would double the bill for an identical result.
//
// Never calls a model, never deletes a row, and refuses any label that does not describe the
// target's own catalog state. The rule is `planCopy`, which is pure and unit-tested; this is the
// I/O around it.
import { Pool, neonConfig } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

import * as schema from "../src/db/schema";
import { cardLabels } from "../src/db/schema";
import { planCopy, type SourceLabel, type TargetHash } from "../src/lib/labels/copy";
import { LABEL_PROMPT_VERSION, labelInputHash } from "../src/lib/labels/prompt";
import { requireEnv } from "./lib/env.mjs";

neonConfig.webSocketConstructor = ws;

// Two connections at once, so `src/db` — a module-scope singleton on DATABASE_URL — is the wrong
// tool and is deliberately not imported. Source and target are SEPARATE variables and the target
// is never defaulted, as `pull:staging` learned: "not the source" is not "safe to write to".
const { LABEL_COPY_SOURCE_URL, LABEL_COPY_TARGET_URL } = requireEnv([
  "LABEL_COPY_SOURCE_URL",
  "LABEL_COPY_TARGET_URL",
]);

const dryRun = process.argv.includes("--dry-run");
const connect = (connectionString: string) => drizzle(new Pool({ connectionString }), { schema });
const source = connect(LABEL_COPY_SOURCE_URL);
const target = connect(LABEL_COPY_TARGET_URL);

type CardRow = {
  oracleId: string; name: string; mana_cost: string | null; type_line: string;
  oracle_text: string | null; layout: string;
};

async function main(): Promise<void> {
  if (LABEL_COPY_SOURCE_URL === LABEL_COPY_TARGET_URL) {
    throw new Error("LABEL_COPY_SOURCE_URL and LABEL_COPY_TARGET_URL are the same database");
  }

  const srcRows = await source.select().from(cardLabels);
  const src: SourceLabel[] = srcRows.map((r) => ({
    oracleId: r.oracleId, labels: r.labels, model: r.model,
    promptVersion: r.promptVersion, inputHash: r.inputHash,
  }));
  console.log(`source holds ${src.length} label(s)`);

  // The TARGET's own hashes, computed from the target's catalog — which is the whole point. A
  // label is installed only when it describes the card as THIS database holds it.
  const rows = await target.execute<CardRow>(sql`
    select oracle_id as "oracleId", name, mana_cost, type_line, oracle_text, layout
      from cards where commander_legal = true`);
  const catalog = (rows as { rows?: CardRow[] }).rows ?? (rows as unknown as CardRow[]);
  // A row generated under a DIFFERENT prompt version can never match, because the version is in
  // the hash and `labelInputHash` uses the running checkout's. That is correct — the label was
  // produced by a different prompt — but it is not a catalog difference, and reporting it as one
  // would send somebody to re-run a catalog refresh that cannot fix it. Counted separately.
  const staleVersion = src.filter((r) => r.promptVersion !== LABEL_PROMPT_VERSION);
  const comparable = src.filter((r) => r.promptVersion === LABEL_PROMPT_VERSION);
  if (staleVersion.length > 0) {
    console.log(`  ${staleVersion.length} source row(s) were generated under prompt version `
      + `${[...new Set(staleVersion.map((r) => r.promptVersion))].join(", ")} against this `
      + `checkout's ${LABEL_PROMPT_VERSION} — not copied, and NOT a catalog difference. `
      + `Re-generate on the source, or check out the version that produced them.`);
  }

  const byModel = new Map<string, string>();
  const targetHashes: TargetHash[] = [];
  for (const row of comparable) byModel.set(row.oracleId, row.model);
  for (const c of catalog) {
    const model = byModel.get(c.oracleId);
    if (model === undefined) continue; // the source has not labelled it; nothing to compare
    targetHashes.push({ oracleId: c.oracleId, inputHash: labelInputHash(c, model) });
  }

  const held = new Set((await target.select({ id: cardLabels.oracleId }).from(cardLabels))
    .map((r) => r.id));
  const plan = planCopy(comparable, targetHashes, held);

  console.log(`  install ${plan.install.length}`);
  console.log(`  mismatched ${plan.mismatched.length} — the source's label describes a different `
    + `catalog state, so it is NOT installed and NOT rebuilt`);
  console.log(`  ${plan.notInTargetCatalog.length} skipped: not in the target catalog — normal for a `
    + `source generated against a newer catalog; a large figure means the target's catalog `
    + `refresh has stopped running`);
  console.log(`  already on the target and absent from the source: ${plan.absentFromSource.length} `
    + `(left alone; this never deletes)`);
  if (plan.mismatched.length > 0) {
    console.log(`  first few mismatched: ${plan.mismatched.slice(0, 5).join(", ")}`);
    console.log(`  the usual fix is to re-run the catalog refresh so both databases agree, NOT to `
      + `run db:build:labels against the target — that would pay the model twice.`);
  }

  if (dryRun) { console.log("\ndry run — nothing written"); return; }
  if (plan.install.length === 0) { console.log("\nnothing to install"); return; }

  // Batched, and upserted: the copy is idempotent, so running it twice installs the same rows and
  // changes nothing the second time.
  for (let i = 0; i < plan.install.length; i += 500) {
    await target.insert(cardLabels).values(plan.install.slice(i, i + 500).map((r) => ({
      oracleId: r.oracleId, labels: r.labels, model: r.model,
      promptVersion: r.promptVersion, inputHash: r.inputHash,
    }))).onConflictDoUpdate({
      target: cardLabels.oracleId,
      set: {
        labels: sql`excluded.labels`, model: sql`excluded.model`,
        promptVersion: sql`excluded.prompt_version`,
        inputHash: sql`excluded.input_hash`,
      },
    });
  }
  console.log(`\ninstalled ${plan.install.length} label(s)`);
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  // Both pools closed, as `copy-commander-prose.ts` does and for its stated reason: the open
  // sockets would keep the process alive past its work. Two connections, so two `end()`s, each
  // independently so one failing cannot skip the other.
  .finally(async () => {
    for (const pool of [source, target]) {
      try { await pool.$client.end(); } catch { /* going away regardless */ }
    }
    process.exit(process.exitCode ?? 0);
  });
