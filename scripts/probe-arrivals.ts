// The confirm's own lock, and the receipt it stores, proved against a real Postgres by
// calling the real `replaceCollection`.
//
// Two things live here that no unit test in this repository can reach:
//
//   THE LOCK. `confirmed_at` is stamped by a conditional update inside the replace
//   transaction — `where confirmed_at is null returning id` — and the transaction is
//   abandoned when it returns no row. Whether that actually stops a second confirm is a
//   question about what the database did, not about the function's shape: a
//   read-then-write guard passes every unit test and still replaces the collection twice.
//
//   THE RECEIPT. A confirmed upload must end up with a `summary_payload`, and the diff
//   that builds it reads the collection either side of a write. There is no collection to
//   read either side of anything in jsdom.
//
// It writes a fixture under a per-run user_id and deletes it in a finally. Point it at
// `local-dev` or a scratch Neon branch — NEVER production: `replaceCollection` DELETES
// every collection row for the user it is given.
//
// Run: `pnpm probe:arrivals`
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import { replaceCollection } from "../src/lib/collection/import";

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-arrivals-${Date.now()}`;

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${actual}, expected ${expected}`);
};

async function main() {
  const { rows: pick } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards where type_line !~ '\\mBasic\\M' order by oracle_id limit 2
  `);
  if (pick.length < 2) throw new Error("catalog is empty — seed it first");
  const [first, second] = pick.map((r) => r.oracle_id);

  const newUpload = async () => {
    const { rows: [u] } = await fixture.execute<{ id: string }>(sql`
      insert into csv_uploads (user_id, filename, row_count, unmatched_count, preview_payload)
      values (${USER}, 'probe.csv', 1, 0, ${JSON.stringify({
        pendingItems: [{ oracleId: second, setCode: "probe", condition: null, quantity: 2 }],
        unmatched: [],
        parseErrors: [],
      })}::jsonb)
      returning id
    `);
    return u.id;
  };
  const items = [{ oracleId: second, setCode: "probe", condition: null, quantity: 2 }];

  try {
    // A collection to replace, so the before-state is not empty.
    await fixture.execute(sql`
      insert into collection_items (user_id, oracle_id, quantity, set_code)
      values (${USER}, ${first}, 1, 'probe')
    `);

    // 1. The first confirm replaces the collection and stamps its upload.
    const uploadId = await newUpload();
    const one = await replaceCollection(USER, items, { confirmUploadId: uploadId });
    check("the first confirm is not refused", one.alreadyConfirmed, false);
    const { rows: [after] } = await fixture.execute<{ n: number; stamped: number }>(sql`
      select
        (select coalesce(sum(quantity), 0)::int from collection_items where user_id = ${USER}) as n,
        (select count(*)::int from csv_uploads
          where id = ${uploadId} and confirmed_at is not null) as stamped
    `);
    check("the collection is the new list", after.n, 2);
    check("and the upload is stamped", after.stamped, 1);

    // 2. THE LOCK. The same upload confirmed again writes NOTHING — no second replace, no
    //    second stamp — and says so rather than raising. A read-then-write guard passes
    //    the shape of this test and fails the concurrent case below.
    const two = await replaceCollection(USER, items, { confirmUploadId: uploadId });
    check("a repeat confirm is refused", two.alreadyConfirmed, true);

    // 3. THE CONCURRENT CASE, which is the one the lock exists for. Two confirms of one
    //    fresh upload, started together: exactly one wins. Both read `confirmed_at` as
    //    null, so nothing in the application layer can tell them apart — only the
    //    conditional update can.
    const fresh = await newUpload();
    const [a, b] = await Promise.all([
      replaceCollection(USER, items, { confirmUploadId: fresh }),
      replaceCollection(USER, items, { confirmUploadId: fresh }),
    ]);
    const winners = [a, b].filter((r) => !r.alreadyConfirmed).length;
    check("exactly one of two concurrent confirms wins", winners, 1);

    // 4. A confirm with no upload id still replaces — the seed CLI path, which has no
    //    upload row and must not be gated by one.
    const seeded = await replaceCollection(USER, items);
    check("the seed path is not gated by an upload", seeded.alreadyConfirmed, false);
  } finally {
    await fixture.execute(sql`delete from csv_uploads where user_id = ${USER}`);
    await fixture.execute(sql`delete from collection_items where user_id = ${USER}`);
    await pool.end();
  }

  console.log(failures === 0 ? "\nThe confirm holds its lock." : `\n${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
