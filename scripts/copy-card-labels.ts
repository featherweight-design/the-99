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

/**
 * The model the TARGET would label with, which is what its hashes must be computed against.
 * Same default as `build-card-labels.ts`, so the two agree unless someone overrides both.
 */
const TARGET_MODEL = process.env.LABEL_MODEL ?? "claude-sonnet-4-5";
const connect = (connectionString: string) => drizzle(new Pool({ connectionString }), { schema });
const source = connect(LABEL_COPY_SOURCE_URL);
const target = connect(LABEL_COPY_TARGET_URL);

type CardRow = {
  oracleId: string; name: string; mana_cost: string | null; type_line: string;
  oracle_text: string | null; layout: string;
};

async function main(): Promise<void> {
  // THE SAME-DATABASE GUARD COMPARES `neon.branch_id`, NOT THE URLS.
  //
  // Comparing connection strings is the check this repository has already learned is not one:
  // `pull:staging` records that two URLs can address the same Neon branch through different
  // credentials, hosts or query parameters, so a text comparison passes and the tool writes onto
  // its own source. It also records why `system_identifier` is the wrong discriminator — every
  // branch of one Neon project reports the same cluster identifier, so that is byte-identical here
  // too. The branch id is the only thing that distinguishes them.
  //
  // FAILS CLOSED: a database that reports no branch id is refused rather than assumed distinct.
  const branchOf = async (db: typeof source, which: string): Promise<string> => {
    const r = await db.execute<{ branch: string | null }>(
      sql`select current_setting('neon.branch_id', true) as branch`,
    );
    const branch = ((r as { rows?: { branch: string | null }[] }).rows
      ?? (r as unknown as { branch: string | null }[]))[0]?.branch ?? null;
    if (branch === null || branch === "") {
      throw new Error(`${which} reports no neon.branch_id, so this cannot prove the two databases `
        + `are different. Refusing rather than guessing: this script WRITES to the target.`);
    }
    return branch;
  };
  const [srcBranch, tgtBranch] = await Promise.all([
    branchOf(source, "LABEL_COPY_SOURCE_URL"),
    branchOf(target, "LABEL_COPY_TARGET_URL"),
  ]);
  if (srcBranch === tgtBranch) {
    throw new Error(`source and target are the same Neon branch (${srcBranch}). A URL comparison `
      + `would have passed this — different credentials or host spellings reach one branch.`);
  }
  console.log(`source branch ${srcBranch} → target branch ${tgtBranch}`);

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

  // THE TARGET'S OWN MODEL, not the source row's, and that distinction is pay-once itself.
  //
  // The hash includes the model. Computing it with each source row's model made the comparison
  // self-consistent and answered the wrong question: a Sonnet row would install onto a target
  // configured for a different model and look fresh, and then the target's next `db:build:labels`
  // would see the model-inclusive mismatch and PAY to regenerate a label it had just been given.
  // The copy exists to stop exactly that, so the comparison has to be against the model the
  // target would use.
  //
  // I reasoned about this earlier and concluded the source's model was right, having checked that
  // the comparison agreed with itself rather than that it served the guarantee.
  const differentModel = comparable.filter((r) => r.model !== TARGET_MODEL);
  const usable = comparable.filter((r) => r.model === TARGET_MODEL);
  if (differentModel.length > 0) {
    console.log(`  ${differentModel.length} source row(s) were produced by `
      + `${[...new Set(differentModel.map((r) => r.model))].join(", ")} and the target builds with `
      + `${TARGET_MODEL} — NOT copied. Installing them would look fresh and then be regenerated at `
      + `full price by the target's next build. Set LABEL_MODEL to match, or re-generate.`);
  }

  const labelledByTarget = new Set(usable.map((r) => r.oracleId));
  const targetHashes: TargetHash[] = [];
  for (const c of catalog) {
    if (!labelledByTarget.has(c.oracleId)) continue; // nothing comparable from the source
    targetHashes.push({ oracleId: c.oracleId, inputHash: labelInputHash(c, TARGET_MODEL) });
  }

  // What the target holds, MINUS anything the source has under a stale prompt version or another
  // model. Those are reported in their own buckets; leaving them here made the summary claim the
  // target had a row "absent from the source" when the source has it and simply cannot be
  // compared — one fact in two buckets, and the wrong one.
  const otherwiseKnown = new Set([...staleVersion, ...differentModel].map((r) => r.oracleId));
  const held = new Set((await target.select({ id: cardLabels.oracleId }).from(cardLabels))
    .map((r) => r.id).filter((id) => !otherwiseKnown.has(id)));
  const plan = planCopy(usable, targetHashes, held);

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
