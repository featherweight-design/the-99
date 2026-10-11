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
//   that builds it reads the collection either side of a write — there is no collection to
//   read either side of anything in jsdom. It calls `writeArrivalsReceipt`, the helper
//   `confirmUpload` uses, and reads the stored row back: asserting the lock alone would
//   leave a regression in the before/after reads, the wiring or the persistence green.
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
import { pendingItemsToOwnedCounts, writeArrivalsReceipt } from "../src/lib/collection/arrivals-write";
import type { ArrivalsSummary } from "../src/lib/collection/arrivals";

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

    // 5. THE RECEIPT, stored and read back. The fixture replaced a collection holding one
    //    copy of `first` with two copies of `second`, so one card left and two arrived —
    //    and the helper has to reach that through a real collection read, a real buy-row
    //    query and a real claim read.
    // A committed deck that lists the arriving card, so the receipt has a ROW to emit.
    // Without one the diff is correct and empty, and the frozen-name check below measures
    // nothing — which is how the first version of this case passed while proving it.
    const { rows: [legend] } = await fixture.execute<{ oracle_id: string }>(sql`
      select oracle_id from cards where type_line ~ 'Legendary Creature' order by oracle_id limit 1
    `);
    const { rows: [deck] } = await fixture.execute<{ id: string }>(sql`
      insert into decks (user_id, name, commander_oracle_id)
      values (${USER}, 'Probe receipt deck', ${legend.oracle_id}) returning id
    `);
    const { rows: [version] } = await fixture.execute<{ id: string }>(sql`
      insert into deck_versions (deck_id, number, commander_oracle_id)
      values (${deck.id}, 1, ${legend.oracle_id}) returning id
    `);
    await fixture.execute(sql`
      insert into deck_version_cards (version_id, oracle_id, quantity)
      values (${version.id}, ${second}, 1)
    `);
    await fixture.execute(sql`
      insert into deck_cards (deck_id, oracle_id, quantity) values (${deck.id}, ${second}, 1)
    `);

    const receiptUpload = await newUpload();
    await fixture.execute(sql`
      update csv_uploads set confirmed_at = now() where id = ${receiptUpload}
    `);
    const written = await writeArrivalsReceipt({
      userId: USER,
      uploadId: receiptUpload,
      ownedAfter: pendingItemsToOwnedCounts(items),
      // The state before this fixture's own replace: one copy of `first`, none of `second`.
      ownedBefore: { [first]: 1 },
      // What the deck owed before the replace: it lists one copy and owned none.
      buyBefore: [{ deckId: deck.id, oracleId: second, quantity: 1 }],
      unmatched: [],
      parseErrorCount: 0,
    });
    check("the receipt counts what arrived", written.arrived, 2);
    check("and what left", written.left, 1);
    const { rows: [stored] } = await fixture.execute<{ payload: ArrivalsSummary | null }>(sql`
      select summary_payload as payload from csv_uploads where id = ${receiptUpload}
    `);
    // Read back through the column, not from the return value: the persistence is half of
    // what this case exists to prove, and a helper that computed perfectly and wrote
    // nowhere would pass on the figures alone.
    check("the receipt is stored on the upload row", stored.payload?.arrived, 2);
    check("with its own version stamp", stored.payload?.version, 3);
    // The frozen name of a card the receipt mentions, proving the name lookup ran rather
    // than an empty map being stored beside real rows.
    check("the cleared row names the deck that stopped owing it",
      stored.payload?.cleared[0]?.deckId, deck.id);
    check("and a frozen name for the arrived card",
      typeof stored.payload?.names.cards[second], "string");
    check("and for the deck",
      stored.payload?.names.decks[deck.id], "Probe receipt deck");

    // 6. CONTENTION reaches the receipt. A second committed deck asking for two copies
    //    takes committed demand to three against the two that arrived, so the card is
    //    contested and the row is the chooser's subject in PR 3. Without a case like this
    //    the claim read could be replaced by an empty map and every other check would
    //    still pass — confirmed: it did.
    const { rows: [rival] } = await fixture.execute<{ id: string }>(sql`
      insert into decks (user_id, name, commander_oracle_id)
      values (${USER}, 'Probe rival deck', ${legend.oracle_id}) returning id
    `);
    const { rows: [rivalVersion] } = await fixture.execute<{ id: string }>(sql`
      insert into deck_versions (deck_id, number, commander_oracle_id)
      values (${rival.id}, 1, ${legend.oracle_id}) returning id
    `);
    await fixture.execute(sql`
      insert into deck_version_cards (version_id, oracle_id, quantity)
      values (${rivalVersion.id}, ${second}, 2)
    `);
    await fixture.execute(sql`
      insert into deck_cards (deck_id, oracle_id, quantity) values (${rival.id}, ${second}, 2)
    `);
    const contestedUpload = await newUpload();
    await fixture.execute(sql`
      update csv_uploads set confirmed_at = now() where id = ${contestedUpload}
    `);
    const withContention = await writeArrivalsReceipt({
      userId: USER,
      uploadId: contestedUpload,
      ownedAfter: pendingItemsToOwnedCounts(items),
      ownedBefore: { [first]: 1 },
      buyBefore: [{ deckId: deck.id, oracleId: second, quantity: 1 }],
      unmatched: [],
      parseErrorCount: 0,
    });
    check("an arrival more decks want than there are copies is contested",
      withContention.contested[0]?.oracleId, second);
    check("and the row carries the copies this import brought",
      withContention.contested[0]?.arrived, 2);
    await fixture.execute(sql`delete from decks where id = ${rival.id}`);

    // 7. TWO DIFFERENT UPLOADS, CONFIRMED TOGETHER. The conditional stamp locks one upload
    //    row, so it does nothing here — both uploads are unconfirmed and both pass it. What
    //    serializes them is the per-user advisory lock, and what it protects is the
    //    collection: a delete-and-reinsert interleaved with another leaves a MIXTURE of the
    //    two lists, or raises 23505 on the duplicate key. Asserted as "the collection is
    //    exactly one of the two lists", which is the only outcome either order can produce
    //    when the two replaces cannot overlap.
    const oneCopy = [{ oracleId: first, setCode: "probe", condition: null, quantity: 1 }];
    const [uA, uB] = [await newUpload(), await newUpload()];
    await Promise.all([
      replaceCollection(USER, items, { confirmUploadId: uA }),
      replaceCollection(USER, oneCopy, { confirmUploadId: uB }),
    ]);
    const { rows: [final] } = await fixture.execute<{ shape: string }>(sql`
      select string_agg(oracle_id::text || 'x' || quantity, ',' order by oracle_id) as shape
      from collection_items where user_id = ${USER}
    `);
    const shapes = [`${second}x2`, `${first}x1`];
    check("two concurrent replaces leave exactly one of the two lists",
      shapes.includes(final.shape ?? ""), true);

    // 8. A FIRST IMPORT'S GUARD, AT THE WRITE (prod walk 2026-09-28, item 5a; Copilot on #1097).
    //    A first import skips the confirm because there is nothing to lose, and `onlyIfEmpty`
    //    is the replace refusing when there is. The race it exists for: another tab's import
    //    holds the lock and is about to commit a collection, while this confirm waits. A check
    //    read before the lock saw an empty collection and would delete that import with no
    //    confirm. Read under the lock, it sees the committed rows and writes nothing.
    await fixture.execute(sql`delete from collection_items where user_id = ${USER}`);
    const firstTry = await newUpload();
    const holder = await pool.connect();
    try {
      await holder.query("begin");
      await holder.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [USER]);
      await holder.query(
        "insert into collection_items (user_id, oracle_id, quantity, set_code) values ($1, $2, 1, 'probe')",
        [USER, first],
      );
      const waiting = replaceCollection(USER, items, { confirmUploadId: firstTry, onlyIfEmpty: true });
      // Long enough for the confirm to reach the lock and block on it.
      await new Promise((resolve) => setTimeout(resolve, 750));
      await holder.query("commit");
      const refused = await waiting;
      check("a first-import confirm behind another import refuses, naming what it found", refused.notEmpty, 1);
      const { rows: [kept] } = await fixture.execute<{ shape: string; stamped: number }>(sql`
        select
          (select string_agg(oracle_id::text || 'x' || quantity, ',') from collection_items
            where user_id = ${USER}) as shape,
          (select count(*)::int from csv_uploads where id = ${firstTry} and confirmed_at is not null) as stamped
      `);
      check("and the other import's collection is untouched", kept.shape, `${first}x1`);
      check("and its upload stays unconfirmed, so the modal can still confirm it", kept.stamped, 0);
    } finally {
      holder.release();
    }
    // A second submit of the SAME first-import upload, queued behind the first, is a duplicate
    // rather than a rival: it meets the stamp and reports `alreadyConfirmed`, never the
    // collection its twin just wrote as a reason to ask (Copilot on #1097, round 3).
    await fixture.execute(sql`delete from collection_items where user_id = ${USER}`);
    const twin = await newUpload();
    const [twinA, twinB] = await Promise.all([
      replaceCollection(USER, items, { confirmUploadId: twin, onlyIfEmpty: true }),
      replaceCollection(USER, items, { confirmUploadId: twin, onlyIfEmpty: true }),
    ]);
    check("two submits of one first import: one writes, the other is already confirmed",
      [twinA, twinB].map((r) => `${r.alreadyConfirmed}/${r.notEmpty}`).sort().join(" "), "false/null true/null");
    // The guard passes an empty collection, or it would refuse every first import.
    await fixture.execute(sql`delete from collection_items where user_id = ${USER}`);
    const clean = await replaceCollection(USER, items, { confirmUploadId: await newUpload(), onlyIfEmpty: true });
    check("a first-import confirm over an empty collection goes through", clean.notEmpty, null);
  } finally {
    await fixture.execute(sql`delete from decks where user_id = ${USER}`);
    await fixture.execute(sql`delete from csv_uploads where user_id = ${USER}`);
    await fixture.execute(sql`delete from collection_items where user_id = ${USER}`);
    await pool.end();
  }

  console.log(failures === 0 ? "\nThe confirm holds its lock." : `\n${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
