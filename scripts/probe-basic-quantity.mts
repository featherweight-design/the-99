// Proves the basics stepper's one write (`setBasicQuantityFor`, plan `2026-10-14-basic-lands-stepper.md`, PR 1)
// against a real database. The unit tests prove the refusals and the write log on a stub; this proves the
// statements: the figure, `auto`, the stamp, and the slot's lock left dormant
// at 0.
//
// It WRITES, so it fails closed on its target: `PROBE_DB_BRANCH` must name the Neon branch `DATABASE_URL`
// reports, and it never runs on staging or production. Run it on a scratch branch of staging, then delete it.
//
//   PROBE_DB_BRANCH=br-… pnpm probe:basic-quantity
//
// It picks a deck holding a basic land, and a non-basic in the same deck, from the branch itself, and puts back
// in a finally everything the write moves: the row, its proxy and lock, the deck's stamp and its analysis's
// `dirty` flag. It runs one writer at a time, so it does not prove the row locks; the lock order is read in review.
import "./lib/env.mjs";

const PROTECTED = new Set(["br-polished-pond-a6e63y0b", "br-noisy-violet-a6vw4ess", "br-patient-hall-a6nbonvo"]);

let failed = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};

async function main() {
  const named = process.env.PROBE_DB_BRANCH;
  if (!named) throw new Error("probe:basic-quantity: set PROBE_DB_BRANCH");
  if (PROTECTED.has(named)) throw new Error(`probe:basic-quantity: ${named} is a shared branch; it writes`);
  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const { rows: who } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  if (who[0]?.b !== named) throw new Error(`probe:basic-quantity: database reports ${who[0]?.b}, not ${named}`);

  const { setBasicQuantityFor } = await import("../src/lib/decks/set-basic-quantity");

  const { rows: picks } = await db.execute<{ deck_id: string; user_id: string; basic: string; other: string }>(sql`
    select d.id as deck_id, d.user_id, b.oracle_id as basic, o.oracle_id as other
    from decks d
    join deck_cards b on b.deck_id = d.id
    join cards bc on bc.oracle_id = b.oracle_id and bc.type_line like 'Basic%Land%'
    join deck_cards o on o.deck_id = d.id
    join cards oc on oc.oracle_id = o.oracle_id and oc.type_line not like 'Basic%'
    limit 1`);
  const pick = picks[0];
  if (!pick) throw new Error("probe:basic-quantity: no deck on this branch holds a basic beside another card");
  const { deck_id: deck, user_id: user, basic, other } = pick;

  const read = async () => {
    const { rows } = await db.execute<{ quantity: number; auto: boolean }>(
      sql`select quantity, auto from deck_cards where deck_id = ${deck} and oracle_id = ${basic}`);
    return rows[0] ?? null;
  };
  const stamp = async () => {
    const { rows } = await db.execute<{ t: string | null }>(sql`select last_edited_at::text as t from decks where id = ${deck}`);
    return rows[0]?.t ?? null;
  };
  const lockRow = async () => {
    const { rows } = await db.execute<{ n: number }>(
      sql`select count(*)::int as n from deck_locks where deck_id = ${deck} and oracle_id = ${basic} and removed_at is not null`);
    return rows[0]?.n ?? 0;
  };

  const before = await read();
  const stampBefore = await stamp();
  const { rows: proxyBefore } = await db.execute<{ j: unknown }>(
    sql`select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) as j from deck_proxies p where deck_id = ${deck} and oracle_id = ${basic}`);
  const { rows: dirtyBefore } = await db.execute<{ dirty: boolean }>(sql`select dirty from deck_profiles where deck_id = ${deck}`);
  const { rows: lockBefore } = await db.execute<{ j: unknown }>(
    sql`select coalesce(jsonb_agg(to_jsonb(l)), '[]'::jsonb) as j from deck_locks l where deck_id = ${deck} and oracle_id = ${basic}`);
  try {
    if (!before) throw new Error("the picked row vanished");
    const target = before.quantity + 3;

    await db.execute(sql`update deck_cards set auto = true where deck_id = ${deck} and oracle_id = ${basic}`);
    const up = await setBasicQuantityFor(user, deck, basic, target);
    const afterUp = await read();
    check("a set writes the figure", up.ok && afterUp?.quantity === target, `${before.quantity} -> ${afterUp?.quantity}`);
    check("a set clears auto", afterUp?.auto === false);
    const stampUp = await stamp();
    check("a set stamps the deck", stampUp !== null && stampUp !== stampBefore, `${stampBefore} -> ${stampUp}`);

    const same = await setBasicQuantityFor(user, deck, basic, target);
    check("the same figure again writes nothing", same.ok && !same.changed && (await stamp()) === stampUp);

    const down = await setBasicQuantityFor(user, deck, basic, 2);
    check("a lower figure lands", down.ok && (await read())?.quantity === 2);

    const notBasic = await setBasicQuantityFor(user, deck, other, 5);
    const { rows: otherRow } = await db.execute<{ quantity: number }>(
      sql`select quantity from deck_cards where deck_id = ${deck} and oracle_id = ${other}`);
    check("a non-basic is refused and left as it was", !notBasic.ok && notBasic.reason === "not-basic" && otherRow[0]?.quantity !== 5);

    const range = await setBasicQuantityFor(user, deck, basic, 1000);
    check("a figure past the bound is refused", !range.ok && range.reason === "out-of-range" && (await read())?.quantity === 2);

    let foreign = "wrote";
    try { await setBasicQuantityFor("user_not_the_owner", deck, basic, 9); } catch (e) { foreign = (e as Error).message; }
    check("another player's deck throws and writes nothing", foreign === "deck not found" && (await read())?.quantity === 2, foreign);

    await db.execute(sql`insert into deck_locks (deck_id, oracle_id) values (${deck}, ${basic}) on conflict do nothing`);
    const zero = await setBasicQuantityFor(user, deck, basic, 0);
    check("0 deletes the row", zero.ok && (await read()) === null);
    // Dormant, not deleted (L1): Undo and Put back revive it, and a commit clears it.
    check("0 leaves the slot's lock dormant", (await lockRow()) === 1);

    const gone = await setBasicQuantityFor(user, deck, basic, 4);
    check("a row already gone is refused, nothing written", !gone.ok && gone.reason === "not-in-deck" && (await read()) === null);
  } finally {
    // Put back the row, its lock and the stamp exactly as they were.
    if (before) {
      await db.execute(sql`
        insert into deck_cards (deck_id, oracle_id, quantity, auto) values (${deck}, ${basic}, ${before.quantity}, ${before.auto})
        on conflict (deck_id, oracle_id) do update set quantity = excluded.quantity, auto = excluded.auto`);
    }
    await db.execute(sql`delete from deck_locks where deck_id = ${deck} and oracle_id = ${basic}`);
    await db.execute(sql`
      insert into deck_locks select * from jsonb_populate_recordset(null::deck_locks, ${JSON.stringify(lockBefore[0]?.j ?? [])}::jsonb)`);
    await db.execute(sql`update decks set last_edited_at = ${stampBefore}::timestamp where id = ${deck}`);
    await db.execute(sql`delete from deck_proxies where deck_id = ${deck} and oracle_id = ${basic}`);
    await db.execute(sql`
      insert into deck_proxies select * from jsonb_populate_recordset(null::deck_proxies, ${JSON.stringify(proxyBefore[0]?.j ?? [])}::jsonb)`);
    if (dirtyBefore[0]) await db.execute(sql`update deck_profiles set dirty = ${dirtyBefore[0].dirty} where deck_id = ${deck}`);
    const restored = await read();
    check("the row is put back", restored?.quantity === before?.quantity && restored?.auto === before?.auto);
  }

  console.log(failed === 0 ? "\nprobe:basic-quantity: all checks passed" : `\nprobe:basic-quantity: ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
