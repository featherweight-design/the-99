// `pnpm db:copy:prose [--dry-run]`: install the commander sentences staging has generated onto
// production, through the catalog copy harness (`scripts/lib/catalog-copy.ts`): the named target,
// one source snapshot, and one target transaction under the `catalog-ingest` lock with the catalog
// stamp written in it. Reads CATALOG_COPY_SOURCE_URL, CATALOG_COPY_TARGET_URL and
// CATALOG_COPY_TARGET_BRANCH, the same three variables every copy reads.
//
// Not an exact replacement, unlike `db:copy:index`: a row is installed only when the hash the
// source stored equals the hash the TARGET's own inputs produce (`copyCommanderProse`), so a
// sentence describing themes the target no longer records is never written. Nothing is deleted.
// No build ledger either: the input hash is the check that the sentence fits the row it lands on.
import "./lib/env.mjs";
import { eq } from "drizzle-orm";
import { cards, commanderSupport } from "../src/db/schema";
import { copyCommanderProse, type CopyResult, type ProseSource } from "../src/lib/prose/copy";
import {
  publishOnTarget, readSourceSnapshot, runCopyMain, withCopyPair, type CopyDb, type CopyTx,
} from "./lib/catalog-copy";

const loadSource = async (tx: CopyTx): Promise<ProseSource[]> => {
  const rows = await tx.select({
    oracleId: commanderSupport.commanderOracleId,
    prose: commanderSupport.prose,
    proseInputHash: commanderSupport.proseInputHash,
    prosePromptVersion: commanderSupport.prosePromptVersion,
  }).from(commanderSupport);
  // The three columns are all-null or all-set together by a check constraint, so this drops
  // exactly the ungenerated rows. Narrowing rather than asserting: a row that somehow broke
  // the constraint is skipped instead of being copied with a null the target cannot store.
  return rows.flatMap((r) =>
    r.prose !== null && r.proseInputHash !== null && r.prosePromptVersion !== null
      ? [{ oracleId: r.oracleId, prose: r.prose, proseInputHash: r.proseInputHash, prosePromptVersion: r.prosePromptVersion }]
      : [],
  );
};

const loadTarget = (tx: CopyDb | CopyTx) =>
  tx.select({
    oracleId: commanderSupport.commanderOracleId,
    name: cards.name,
    tags: commanderSupport.tags,
    prose: commanderSupport.prose,
    proseInputHash: commanderSupport.proseInputHash,
  })
    .from(commanderSupport)
    .innerJoin(cards, eq(cards.oracleId, commanderSupport.commanderOracleId));

runCopyMain(() => withCopyPair(async ({ source, sourceUrl, target, sourceBranch, targetBranch, dryRun }) => {
  console.log(`copy prose: ${sourceBranch} -> ${targetBranch}${dryRun ? " (dry run)" : ""}`);
  const sentences = await readSourceSnapshot({ source, sourceUrl }, loadSource);
  console.log(`source holds ${sentences.length} sentences`);

  const run = (db: CopyDb | CopyTx, write: (row: ProseSource) => Promise<void>) =>
    copyCommanderProse({ loadSource: async () => sentences, loadTarget: () => loadTarget(db), write });

  let r: CopyResult;
  if (dryRun) {
    r = await run(target, async () => {});
  } else {
    let result: CopyResult | null = null;
    await publishOnTarget(target, async (tx) => {
      result = await run(tx, async (row) => {
        await tx.update(commanderSupport)
          .set({ prose: row.prose, proseInputHash: row.proseInputHash, prosePromptVersion: row.prosePromptVersion })
          .where(eq(commanderSupport.commanderOracleId, row.oracleId));
      });
    });
    r = result!;
  }

  console.log(
    `${dryRun ? "Would install" : "Installed"} ${r.installed} sentences; ${r.fresh} already ` +
    `current, ${r.suppressed} suppressed, ${r.missing} absent from the source, ${r.drifted} ` +
    `generated from inputs the target no longer has.`,
  );
  // Rows the copy left alone are not a failure: the generator writes them, and saying so here
  // saves the reader working out what to do with the two numbers above.
  if (r.missing + r.drifted > 0) {
    console.log(`Run the prose generator against the target to write the remaining ${r.missing + r.drifted}.`);
  }
}));
