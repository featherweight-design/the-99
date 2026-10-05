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
import "./lib/env.mjs";
import { sql } from "drizzle-orm";

import { cardLabels } from "../src/db/schema";
import { planCopy, type SourceLabel, type TargetCard, type TargetLabel } from "../src/lib/labels/copy";
import { LABEL_PROMPT_VERSION } from "../src/lib/labels/prompt";
import {
  publishOnTarget, readSourceSnapshot, runCopyMain, withCopyPair, type CopyDb, type CopyPair, type CopyTx,
} from "./lib/catalog-copy";

/**
 * The model the target's builds label with: reported against, never a filter (a row is judged
 * under its own model). Same default as `build-card-labels.ts`.
 */
const LABEL_MODEL = process.env.LABEL_MODEL ?? "claude-sonnet-4-5";

type CardRow = {
  oracleId: string; name: string; mana_cost: string | null; type_line: string;
  oracle_text: string | null; layout: string;
};

async function main({ source, sourceUrl, target, sourceBranch, targetBranch, dryRun }: CopyPair): Promise<void> {
  // The pair is the harness's: CATALOG_COPY_SOURCE_URL, CATALOG_COPY_TARGET_URL and a target that
  // reports the NAMED branch CATALOG_COPY_TARGET_BRANCH, compared by `neon.branch_id`.
  console.log(`source branch ${sourceBranch} → target branch ${targetBranch}`);

  const srcRows = await readSourceSnapshot({ source, sourceUrl }, (tx) => tx.select().from(cardLabels));
  const src: SourceLabel[] = srcRows.map((r) => ({
    oracleId: r.oracleId, labels: r.labels, model: r.model,
    promptVersion: r.promptVersion, inputHash: r.inputHash,
  }));
  console.log(`source holds ${src.length} label(s)`);

  // Every source row is judged under ITS OWN prompt version and model (`labelIsFresh`, Hugh
  // 2026-10-04), against the target's own card text. The target's builds judge freshness the same
  // way, so a row written under an older version, or by another model than `LABEL_MODEL`, that
  // describes the target's text is fresh there too and its next build leaves it alone: copying it is
  // free. That replaced two refusals, one per prompt version and one per model, each of which
  // existed because the hash was once checked against the checkout's current version and model.
  // What differs from the current pair is still REPORTED, as information rather than a refusal.
  const current = (r: SourceLabel) => r.promptVersion === LABEL_PROMPT_VERSION && r.model === LABEL_MODEL;
  const older = src.filter((r) => !current(r));
  if (older.length > 0) {
    const pairs = new Map<string, number>();
    for (const r of older) pairs.set(`v${r.promptVersion} / ${r.model}`, (pairs.get(`v${r.promptVersion} / ${r.model}`) ?? 0) + 1);
    console.log(`  ${older.length} source row(s) were written under another prompt version or model than `
      + `this checkout's v${LABEL_PROMPT_VERSION} / ${LABEL_MODEL}: `
      + `${[...pairs].map(([k, n]) => `${k} ${n}`).join(", ")}. Copied when fresh; they stay fresh `
      + `on the target until a list: build redoes them.`);
  }

  // Every read of the TARGET happens in `planFor`, against whatever handle it is given: once
  // unlocked, to decide whether there is anything to do, and again INSIDE the locked target
  // transaction before writing, so a catalog refresh landing between the two can never make
  // this install labels judged against a catalog the target no longer holds.
  const planFor = async (db: CopyDb | CopyTx) => {
    // The TARGET's own cards, from the target's catalog — which is the whole point. A label is
    // installed only when it describes the card as THIS database holds it.
    const rows = await db.execute<CardRow>(sql`
      select oracle_id as "oracleId", name, mana_cost, type_line, oracle_text, layout
        from cards where commander_legal = true`);
    const catalog = (rows as { rows?: CardRow[] }).rows ?? (rows as unknown as CardRow[]);
    const labelledBySource = new Set(src.map((r) => r.oracleId));
    const targetCards: TargetCard[] = catalog.filter((c) => labelledBySource.has(c.oracleId));

    // Stamped, so a fresh target row is never replaced by an older-version source row (`targetNewer`).
    const held: TargetLabel[] = await db.select({
      oracleId: cardLabels.oracleId, model: cardLabels.model, promptVersion: cardLabels.promptVersion, inputHash: cardLabels.inputHash,
    }).from(cardLabels);
    return planCopy(src, targetCards, held);
  };

  const plan = await planFor(target);

  console.log(`  install ${plan.install.length}`);
  console.log(`  mismatched ${plan.mismatched.length} — the source's label describes a different `
    + `catalog state, so it is NOT installed and NOT rebuilt`);
  if (plan.unknownVersion.length > 0) {
    console.log(`  ${plan.unknownVersion.length} source row(s) name a prompt version this checkout's `
      + `registry does not hold — not copied, and NOT a catalog difference. Check out the code that `
      + `knows that version.`);
  }
  if (plan.targetNewer.length > 0) {
    console.log(`  ${plan.targetNewer.length} skipped: the target holds a fresh label of a NEWER prompt `
      + `version than the source's — never replaced by an older one`);
  }
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
  let installed = 0;

  // Batched, and upserted: the copy is idempotent, so running it twice installs the same rows and
  // changes nothing the second time. All of it one target transaction, with the catalog stamp.
  await publishOnTarget(target, async (tx) => {
    // Re-planned under the lock: the plan above only decided that there was work to do.
    const locked = await planFor(tx);
    installed = locked.install.length;
    for (let i = 0; i < locked.install.length; i += 500) {
      await tx.insert(cardLabels).values(locked.install.slice(i, i + 500).map((r) => ({
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
  });
  console.log(`\ninstalled ${installed} label(s)`);
}

runCopyMain(() => withCopyPair(main));
