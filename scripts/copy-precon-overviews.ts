// `pnpm db:copy:precon-overviews [--dry-run]`: install the precon Overviews staging has written onto
// production, through the catalog copy harness (`scripts/lib/catalog-copy.ts`): the named target,
// one source snapshot under the source's `catalog-ingest` lock, and one target transaction under the
// target's, with the catalog stamp written in it. Reads CATALOG_COPY_SOURCE_URL,
// CATALOG_COPY_TARGET_URL and CATALOG_COPY_TARGET_BRANCH, the same three variables every copy reads.
//
// PER ROW, never whole: a source row is installed only when the request the TARGET's own catalog
// builds for that precon (`buildPreconRequest`) hashes to the row's `input_hash`, on the same list
// (`planPreconOverviewCopy`), the `db:copy:prose` rule. The copy is also the target's re-check: an
// installed row its inputs no longer fit is marked not current, so no deck there carries it over.
// Nothing is deleted, and no model is called.
//
// The target's requests are built before the publish transaction, through `src/db`, which this
// points at the target, at the run's role basis (`PRECON_OVERVIEW_ROLE_BASIS`). The target's catalog
// generation is read before they are built and again under the target's lock, and a moved one refuses
// the publish, so nothing is installed against a catalog the requests were not built from.
import { requireEnv } from "./lib/env.mjs";

const env = requireEnv(["CATALOG_COPY_SOURCE_URL", "CATALOG_COPY_TARGET_URL", "CATALOG_COPY_TARGET_BRANCH", "PRECON_OVERVIEW_ROLE_BASIS"]);
// After the env import, which overrides DATABASE_URL from `.env`: the requests are built through
// `src/db`, and they must be built from the TARGET's catalog. Everything below is imported
// dynamically so it reads this value.
process.env.DATABASE_URL = env.CATALOG_COPY_TARGET_URL;

async function main() {
  const { and, eq, inArray, isNull, ne } = await import("drizzle-orm");
  const { precons, preconSynopses } = await import("../src/db/schema");
  const { publishOnTarget, readSourceSnapshot, runCopyMain, withCopyPair } = await import("./lib/catalog-copy");
  const { PRECON_OVERVIEW_CONTRACT, buildPreconRequest, preconRoleBasis } = await import("./lib/precon-overview-request");
  const { CopyRefused } = await import("./lib/catalog-copy");
  const { catalogRefreshes } = await import("../src/db/schema");
  const { sql } = await import("drizzle-orm");
  const { planPreconOverviewCopy } = await import("./lib/precon-overview-copy");
  type TargetRequest = import("./lib/precon-overview-copy").TargetRequest;
  type Content = typeof preconSynopses.$inferSelect["content"];

  const contract = PRECON_OVERVIEW_CONTRACT;
  // One basis per run, the build's (`preconRoleBasis`): rows of the other basis are neither read nor touched.
  const basis = preconRoleBasis(process.env.PRECON_OVERVIEW_ROLE_BASIS);
  runCopyMain(() => withCopyPair(async ({ source, sourceUrl, target, sourceBranch, targetBranch, dryRun }) => {
    console.log(`copy precon overviews: ${sourceBranch} -> ${targetBranch}${dryRun ? " (dry run)" : ""}`);
    // Only the source's CURRENT rows written by a real model: a stub's fixture never travels.
    const sourceRows = await readSourceSnapshot({ source, sourceUrl }, (tx) => tx.select({
      file: preconSynopses.preconFile, listFingerprint: preconSynopses.listFingerprint, inputHash: preconSynopses.inputHash,
      model: preconSynopses.model, content: preconSynopses.content, inputTokens: preconSynopses.inputTokens,
      outputTokens: preconSynopses.outputTokens, costMicroUsd: preconSynopses.costMicroUsd,
    }).from(preconSynopses).where(and(eq(preconSynopses.contractVersion, contract), eq(preconSynopses.roleBasis, basis), eq(preconSynopses.current, true), ne(preconSynopses.model, "stub"))));
    console.log(`source holds ${sourceRows.length} current Overviews at contract ${contract}, role basis ${basis}`);

    // THE TARGET'S CATALOG GENERATION, read before its requests are built and again under its lock:
    // every catalog write there (an ingest or a copy) stamps it, so an equal stamp means the requests
    // were built from the catalog the publish sees, and a moved one refuses (run the copy again).
    const generationOf = async (q: Pick<typeof target, "select">) => (await q.select({ at: sql<string>`(extract(epoch from ${catalogRefreshes.refreshedAt}) * 1000)::bigint` })
      .from(catalogRefreshes))[0]?.at ?? "none";
    const generation = await generationOf(target);

    const plain = (await target.select({ file: precons.fileName }).from(precons).where(isNull(precons.twinOf)).orderBy(precons.fileName)).map((r) => r.file);
    const targetRows = await target.select({ file: preconSynopses.preconFile, inputHash: preconSynopses.inputHash, current: preconSynopses.current })
      .from(preconSynopses).where(and(eq(preconSynopses.contractVersion, contract), eq(preconSynopses.roleBasis, basis)));
    const requests: TargetRequest[] = [];
    for (const file of plain) {
      const r = await buildPreconRequest(file, basis);
      requests.push(r.ok ? { file, ok: true, list: r.list, hash: r.hash } : { file, ok: false, why: r.why });
    }
    const plan = planPreconOverviewCopy<Content>({ source: sourceRows, target: targetRows, requests });

    if (!dryRun) {
      await publishOnTarget(target, async (tx) => {
        if ((await generationOf(tx)) !== generation) {
          throw new CopyRefused("the target's catalog moved while the copy built its requests: nothing was written; run the copy again");
        }
        const now = new Date();
        for (const r of plan.install) {
          const row = {
            preconFile: r.file, contractVersion: contract, roleBasis: basis, listFingerprint: r.listFingerprint, inputHash: r.inputHash, model: r.model,
            content: r.content, inputTokens: r.inputTokens, outputTokens: r.outputTokens, costMicroUsd: r.costMicroUsd,
            current: true, createdAt: now, checkedAt: now,
          };
          await tx.insert(preconSynopses).values(row).onConflictDoUpdate({ target: [preconSynopses.preconFile, preconSynopses.contractVersion, preconSynopses.roleBasis], set: row });
        }
        const at = (files: string[]) => and(eq(preconSynopses.contractVersion, contract), eq(preconSynopses.roleBasis, basis), inArray(preconSynopses.preconFile, files));
        if (plan.stale.length > 0) await tx.update(preconSynopses).set({ current: false, checkedAt: now }).where(at(plan.stale));
        if (plan.restamp.length > 0) await tx.update(preconSynopses).set({ current: true, checkedAt: now }).where(at(plan.restamp));
      });
    }

    const verb = dryRun ? "Would install" : "Installed";
    console.log(
      `${verb} ${plan.install.length}; ${plan.fresh} already current; ${plan.restamp.length} current again; ` +
      `${plan.stale.length} marked not current; ${plan.missing.length} with no source row; ${plan.drifted.length} built from inputs the target no longer has; ` +
      `${plan.unbuildable.length} the target cannot build.`,
    );
    for (const u of plan.unbuildable) console.log(`  cannot build ${u.file}: ${u.why}`);
    if (plan.missing.length + plan.drifted.length > 0) {
      console.log(`Run db:build:precon-overviews on staging, then copy again, for the remaining ${plan.missing.length + plan.drifted.length}.`);
    }
  }));
}

void main();
