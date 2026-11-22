// Installs judged labels one database has already built onto another. PAYS NOTHING.
//
// PAY ONCE (Hugh's ruling of 2026-09-26, applied to the judged themes): the build runs against
// `catalog-staging` only and this carries the result to production. It never calls a model and
// never deletes a row. A row is installed only when it is complete (the verifier has read it) and
// describes the target's own card text under the current prompt version. The rule is
// `planJudgedCopy`, pure and unit-tested; this is the I/O around it.
import "./lib/env.mjs";
import { sql } from "drizzle-orm";

import { judgedLabels } from "../src/db/schema";
import { planJudgedCopy, type JudgedTargetCard, type SourceJudged } from "../src/lib/labels/judged-copy";
import { JUDGED_PROMPT_VERSION } from "../src/lib/labels/judged";
import {
  publishOnTarget, readSourceSnapshot, runCopyMain, withCopyPair, type CopyDb, type CopyPair, type CopyTx,
} from "./lib/catalog-copy";

type CardRow = {
  oracleId: string; name: string; mana_cost: string | null; type_line: string;
  oracle_text: string | null; layout: string;
};

async function main({ source, sourceUrl, target, sourceBranch, targetBranch, dryRun }: CopyPair): Promise<void> {
  console.log(`source branch ${sourceBranch} → target branch ${targetBranch}`);

  const srcRows = await readSourceSnapshot({ source, sourceUrl }, (tx) => tx.select().from(judgedLabels));
  const src: SourceJudged[] = srcRows.map((r) => ({
    oracleId: r.oracleId, themes: r.themes, verifiedThemes: r.verifiedThemes, verifiedAt: r.verifiedAt,
    model: r.model, promptVersion: r.promptVersion, inputHash: r.inputHash,
  }));
  console.log(`source holds ${src.length} judged row(s), prompt ${JUDGED_PROMPT_VERSION} is this checkout's`);

  // Every read of the TARGET happens here, once unlocked to decide whether there is work, and again
  // INSIDE the locked target transaction, so a catalog refresh landing between the two can never
  // install a label judged against text the target no longer holds.
  const planFor = async (db: CopyDb | CopyTx) => {
    const rows = await db.execute<CardRow>(sql`
      select oracle_id as "oracleId", name, mana_cost, type_line, oracle_text, layout
        from cards where commander_legal = true`);
    const catalog = (rows as { rows?: CardRow[] }).rows ?? (rows as unknown as CardRow[]);
    const labelled = new Set(src.map((r) => r.oracleId));
    const targetCards: JudgedTargetCard[] = catalog.filter((c) => labelled.has(c.oracleId));
    return planJudgedCopy(src, targetCards);
  };

  const plan = await planFor(target);
  console.log(`  install ${plan.install.length}`);
  console.log(`  ${plan.unverified.length} skipped: the verifier has not finished them (left on the source)`);
  console.log(`  ${plan.otherVersion.length} skipped: written under another prompt version than ${JUDGED_PROMPT_VERSION}`);
  console.log(`  mismatched ${plan.mismatched.length}: the source's label describes a different catalog state, so it is NOT installed and NOT rebuilt`);
  console.log(`  ${plan.notInTargetCatalog.length} skipped: not in the target catalog`);
  if (plan.mismatched.length > 0) {
    console.log(`  first few mismatched: ${plan.mismatched.slice(0, 5).join(", ")}`);
    console.log("  the usual fix is to re-run the catalog refresh so both databases agree, NOT to run db:build:judged against the target: that would pay the model twice.");
  }

  if (dryRun) { console.log("\ndry run — nothing written"); return; }
  if (plan.install.length === 0) { console.log("\nnothing to install"); return; }
  let installed = 0;

  // Batched and upserted: idempotent, and one target transaction with the catalog stamp.
  await publishOnTarget(target, async (tx) => {
    const locked = await planFor(tx);
    installed = locked.install.length;
    for (let i = 0; i < locked.install.length; i += 500) {
      await tx.insert(judgedLabels).values(locked.install.slice(i, i + 500).map((r) => ({
        oracleId: r.oracleId, themes: r.themes, verifiedThemes: r.verifiedThemes, verifiedAt: r.verifiedAt,
        model: r.model, promptVersion: r.promptVersion, inputHash: r.inputHash,
      }))).onConflictDoUpdate({
        target: judgedLabels.oracleId,
        set: {
          themes: sql`excluded.themes`, verifiedThemes: sql`excluded.verified_themes`,
          verifiedAt: sql`excluded.verified_at`, model: sql`excluded.model`,
          promptVersion: sql`excluded.prompt_version`, inputHash: sql`excluded.input_hash`,
          labelledAt: sql`now()`,
        },
      });
    }
  });
  console.log(`\ninstalled ${installed} judged row(s)`);
}

runCopyMain(() => withCopyPair(main));
