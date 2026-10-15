// measure:sync — what a Collection Sync would do for one account, READ-ONLY (plan
// `2026-10-15-collection-sync.md`, PR 1). It runs the shipped `readSyncBase` and `planSync` against the
// account's own base and collection, for a stored upload (`MEASURE_UPLOAD_ID`) or, without one, for the
// anchor's own file, and prints the buckets. The acceptance check for Hugh's case before the flip: on his
// production account, 0 taken, 40 kept, 0 conflicts, `noNewer`, plus the file's tokens.
//
// It may read production (d9's SELECT-only rule), so it is built so that it CANNOT write:
//   - the session is set `default_transaction_read_only = on` before anything else;
//   - every read runs inside ONE transaction begun `isolation level repeatable read read only`, so every
//     figure is one instant, and the database itself refuses a write;
//   - it checks `transaction_read_only` reads `on` inside that transaction and stops if not;
//   - the transaction is rolled back, never committed.
// Its URL comes from `MEASURE_SYNC_URL` through the env convention (`scripts/lib/env.mjs`). It is never
// printed and never written anywhere. Card names are printed only with `--names`; by default, counts alone.
//
//   MEASURE_SYNC_URL=… MEASURE_USER_ID=user_… [MEASURE_UPLOAD_ID=…] [MEASURE_PICK=everything|additions|tokens] \
//     pnpm measure:sync [--names]
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

import { readSyncBase } from "../src/lib/collection/sync-base";
import { planSync, staleness, STALE_REVERSAL_SHARE, SYNC_PICKS, type SyncHolding, type SyncPick } from "../src/lib/collection/sync";
import { normalizeItems } from "../src/lib/collection/write";
import { collectionItemKey } from "../src/lib/collection/key";
import type { PendingItem } from "../src/lib/collection/pending";
import { readTokenState, tokenWritePlan, type TokenHolding } from "../src/lib/tokens/ownership";

neonConfig.webSocketConstructor = ws;

const { MEASURE_SYNC_URL, MEASURE_USER_ID } = requireEnv(["MEASURE_SYNC_URL", "MEASURE_USER_ID"]);
const UPLOAD_ID = process.env.MEASURE_UPLOAD_ID || null;
const PICK = (process.env.MEASURE_PICK || "everything") as SyncPick;
if (!SYNC_PICKS.includes(PICK)) throw new Error(`MEASURE_PICK must be one of ${SYNC_PICKS.join(", ")}`);
const NAMES = process.argv.includes("--names");

const pool = new Pool({ connectionString: MEASURE_SYNC_URL, max: 1 });

async function main() {
  const client = await pool.connect();
  try {
    await client.query("set default_transaction_read_only = on");
    await client.query("begin transaction isolation level repeatable read read only");
    const { rows: [ro] } = await client.query<{ ro: string }>("select current_setting('transaction_read_only') as ro");
    if (ro?.ro !== "on") throw new Error("the transaction is not read-only; stopping before any read");
    const tx = drizzle(client);

    const base = await readSyncBase(MEASURE_USER_ID, tx);
    if ("unavailable" in base) {
      console.log(`Sync unavailable: ${base.unavailable}`);
      return;
    }

    let file: PendingItem[] = base.anchor.pendingItems;
    let tokens: TokenHolding[] | undefined;
    let fileLabel = "the anchor's own file";
    if (UPLOAD_ID) {
      const { rows: [upload] } = await client.query<{ items: PendingItem[] | null; tokens: TokenHolding[] | null; confirmed: boolean }>(
        `select u.preview_payload -> 'pendingItems' as items, u.preview_payload -> 'tokens' as tokens,
                u.confirmed_at is not null as confirmed
           from csv_uploads u where u.id = $1 and u.user_id = $2`,
        [UPLOAD_ID, MEASURE_USER_ID],
      );
      if (!upload || !Array.isArray(upload.items)) throw new Error("no such upload for this account");
      file = upload.items;
      tokens = upload.tokens ?? undefined;
      fileLabel = `upload ${UPLOAD_ID}${upload.confirmed ? " (already confirmed)" : ""}`;
    } else {
      const { rows: [anchor] } = await client.query<{ tokens: TokenHolding[] | null }>(
        "select u.preview_payload -> 'tokens' as tokens from csv_uploads u where u.id = $1 and u.user_id = $2",
        [base.anchor.uploadId, MEASURE_USER_ID],
      );
      tokens = anchor?.tokens ?? undefined;
    }

    const { rows: held } = await client.query<SyncHolding>(
      `select ci.oracle_id as "oracleId", ci.set_code as "setCode", ci.collector_number as "collectorNumber",
              ci.finish, ci.quantity, ci.scryfall_id as "scryfallId", ci.condition
         from collection_items ci where ci.user_id = $1`,
      [MEASURE_USER_ID],
    );
    const app = new Map(held.map((h) => [collectionItemKey(h), h]));
    const items = normalizeItems(file);
    const plan = planSync({ base: base.anchor.items, app, file: items, pick: PICK });
    const stale = staleness(new Map(items.map((i) => [collectionItemKey(i), i.quantity])), base.anchor.items, base.earlier.map((e) => e.items));
    const tokenState = tokens ? await readTokenState(tx, MEASURE_USER_ID) : null;
    const tokenChanges = tokens && tokenState ? tokenWritePlan(PICK === "additions" ? "additive" : "replace", tokenState, tokens) : [];

    console.log(`anchor ${base.anchor.uploadId}, confirmed ${base.anchor.confirmedAt.toISOString()}, ${base.anchor.items.size} holdings`);
    console.log(`earlier uploads compared: ${base.earlier.length}`);
    console.log(`file: ${fileLabel}, ${items.length} holdings · pick ${PICK}`);
    console.log("");
    const c = plan.counts;
    console.log(`taken ${c.taken} · kept ${c.kept} · agreed ${c.agreed} · unchanged ${c.unchanged}`);
    console.log(`conflicts ${c.conflicts} (undecided with no answer: ${c.undecided}) · ignored by the pick ${c.ignored}`);
    console.log(`rows a confirm would write (no conflict answered): ${plan.rows.length}, of which removals ${plan.rows.filter((r) => r.after === null).length}`);
    console.log(`stale: ${stale ?? "null"} (reversal share over ${STALE_REVERSAL_SHARE}, or nearer an earlier upload)`);
    console.log(`file tokens: ${tokens ? `${tokens.length} tokens, ${tokens.reduce((n, t) => n + t.quantity, 0)} copies` : "none read"} · token rows a confirm would change: ${tokenChanges.length}`);
    console.log(`nothing to sync: ${plan.rows.length === 0 && tokenChanges.length === 0 && c.undecided === 0}`);

    if (NAMES) {
      const ids = [...new Set([...plan.kept, ...plan.conflicts].map((r) => r.oracleId).concat(plan.rows.map((r) => r.oracleId)))];
      const { rows: named } = await client.query<{ oracle_id: string; name: string }>(
        "select c.oracle_id, c.name from cards c where c.oracle_id = any($1::uuid[])", [ids],
      );
      const nameOf = new Map(named.map((n) => [n.oracle_id, n.name]));
      const line = (r: { oracleId: string; setCode: string; collectorNumber: string; finish: string }) =>
        `${nameOf.get(r.oracleId) ?? r.oracleId} (${r.setCode} ${r.collectorNumber} ${r.finish})`;
      console.log("\nkept:");
      for (const r of plan.kept) console.log(`  ${line(r)}: base ${r.base}, app ${r.app}, file ${r.file}`);
      console.log("conflicts:");
      for (const r of plan.conflicts) console.log(`  ${line(r)}: base ${r.base}, app ${r.app}, file ${r.file}`);
      console.log("taken:");
      for (const r of plan.rows) console.log(`  ${line(r)}: ${r.before?.quantity ?? 0} -> ${r.after?.quantity ?? 0}`);
    }
  } finally {
    await client.query("rollback").catch(() => {});
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  // The message alone: an error object from the driver can carry connection details.
  console.error(err instanceof Error ? err.message : "measure:sync failed");
  process.exit(1);
});
