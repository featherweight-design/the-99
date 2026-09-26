import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { eq } from "drizzle-orm";
import ws from "ws";
import * as schema from "../src/db/schema";
import { CATALOG_ROW_ID, catalogRefreshes, cards, commanderSupport } from "../src/db/schema";
import { copyCommanderProse, type ProseSource } from "../src/lib/prose/copy";
import { requireEnv } from "./lib/env.mjs";

neonConfig.webSocketConstructor = ws;

// Two connections at once, so `src/db` — a module-scope singleton on DATABASE_URL — is the
// wrong tool here and is deliberately not imported.
const { PROSE_COPY_SOURCE_URL, PROSE_COPY_TARGET_URL } = requireEnv([
  "PROSE_COPY_SOURCE_URL",
  "PROSE_COPY_TARGET_URL",
]);

const dryRun = process.argv.includes("--dry-run");

const connect = (connectionString: string) =>
  drizzle(new Pool({ connectionString }), { schema });

const source = connect(PROSE_COPY_SOURCE_URL);
const target = connect(PROSE_COPY_TARGET_URL);

const loadSource = async (): Promise<ProseSource[]> => {
  const rows = await source.select({
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
      ? [{
        oracleId: r.oracleId,
        prose: r.prose,
        proseInputHash: r.proseInputHash,
        prosePromptVersion: r.prosePromptVersion,
      }]
      : [],
  );
};

const loadTarget = () =>
  target.select({
    oracleId: commanderSupport.commanderOracleId,
    name: cards.name,
    tags: commanderSupport.tags,
    prose: commanderSupport.prose,
    proseInputHash: commanderSupport.proseInputHash,
  })
    .from(commanderSupport)
    .innerJoin(cards, eq(cards.oracleId, commanderSupport.commanderOracleId));

// Counted as each row lands, so a copy that dies part-way still stamps what it installed.
let written = 0;
const write = async (row: ProseSource) => {
  if (dryRun) return;
  await target.update(commanderSupport)
    .set({
      prose: row.prose,
      proseInputHash: row.proseInputHash,
      prosePromptVersion: row.prosePromptVersion,
    })
    .where(eq(commanderSupport.commanderOracleId, row.oracleId));
  written += 1;
};

// The TARGET's catalog generation, stamped once the copy has written anything: `/commanders`
// caches its rankings, sentences included, keyed on it, so without the stamp a payload cached
// before the copy keeps its null sentences for up to the hour ceiling. The same write as
// `stampCatalogRefresh`, which cannot be used here because it writes through `src/db`.
// Like that function, a failed stamp warns rather than failing a copy that succeeded.
const stamp = async () => {
  try {
    await target.insert(catalogRefreshes)
      .values({ id: CATALOG_ROW_ID, refreshedAt: new Date() })
      .onConflictDoUpdate({ target: catalogRefreshes.id, set: { refreshedAt: new Date() } });
  } catch (error) {
    console.warn(
      "catalog generation not stamped — readers keep their cached lists until the hour "
      + `ceiling expires: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

copyCommanderProse({ loadSource, loadTarget, write })
  .then((r) => {
    console.log(
      `${dryRun ? "Would install" : "Installed"} ${r.installed} sentences; ${r.fresh} already ` +
      `current, ${r.suppressed} suppressed, ${r.missing} absent from the source, ${r.drifted} ` +
      `generated from inputs the target no longer has.`,
    );
    // Rows the copy left alone are not a failure — the generator writes them, and saying so
    // here saves the reader working out what to do with the two numbers above.
    if (r.missing + r.drifted > 0) {
      console.log(
        `Run the prose generator against the target to write the remaining ` +
        `${r.missing + r.drifted}.`,
      );
    }
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  // Both pools hold open sockets that would keep the process alive past its work. Settled
  // rather than all: teardown runs after the copy has already been done and reported, so a
  // socket that refuses to close is not a reason to fail a run that succeeded.
  // The stamp first, in the `finally`, so a copy that failed after installing some rows still
  // retires the payloads those rows changed.
  .finally(async () => {
    if (written > 0) await stamp();
    await Promise.allSettled([source.$client.end(), target.$client.end()]);
  });
