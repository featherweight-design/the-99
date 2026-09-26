// diff:claim-model — the claim model's OLD and NEW SQL, row for row, on a real account.
//
// Every availability figure in the app reads this query, so a rewrite is checked by
// DIFFERENTIAL rather than only by the cases `probe:claims` thought of: for the account with the
// most decks, `loadDeckBuyRows` and `loadAvailability` (user-wide, and once per deck from that
// deck's vantage) run through both versions, and every (deck, card) row is compared. The two are
// COUNTED APART: a comparison over SQL the change did not touch cannot differ, and folding it into
// one total would make a figure look stronger than the check behind it. Today's rewrite is in
// `loadDeckBuyRows` alone, so its line is the one that tests it; the other is a control.
//
// The old version is main's module, copied beside the new one as an untracked file so its relative
// imports resolve:
//   git show origin/main:src/lib/decks/availability-query.ts > src/lib/decks/.availability-query.old.ts
// It also prints each version's median time over 5 runs and, with DIFF_EXPLAIN=1, the
// EXPLAIN ANALYZE of loadDeckBuyRows for each. Read-only. Point it at a scratch branch holding
// a `pull:staging` copy; it refuses production and staging.
import { requireEnv } from "./lib/env.mjs";
import { sql } from "drizzle-orm";

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const { db } = await import("../src/db");
const NEW = await import("../src/lib/decks/availability-query");
const OLD = await import("../src/lib/decks/.availability-query.old");

const [{ branch }] = (await db.execute<{ branch: string }>(sql`select current_setting('neon.branch_id', true) as branch`)).rows;
if (!branch || branch === "br-noisy-violet-a6vw4ess" || branch === "br-polished-pond-a6e63y0b") {
  throw new Error(`refusing branch ${branch ?? "(unknown)"}; point DATABASE_URL at a scratch branch`);
}
void DATABASE_URL;

const [{ user_id: userId }] = (await db.execute<{ user_id: string }>(sql`
  select user_id from decks group by user_id order by count(*) desc limit 1`)).rows;
const decks = (await db.execute<{ id: string }>(sql`select id from decks where user_id = ${userId} order by id`)).rows;
const counts = (await db.execute<{ assignments: number; releases: number }>(sql`
  select (select count(*) from card_assignments where user_id = ${userId})::int as assignments,
         (select count(*) from pull_releases where user_id = ${userId})::int as releases`)).rows[0];
console.log(`branch ${branch} · ${decks.length} decks · ${counts.assignments} assignments · ${counts.releases} releases`);

const stable = (v: unknown): string => JSON.stringify(v, (_k, x) =>
  x instanceof Map ? Object.fromEntries([...x.entries()].sort(([a], [b]) => String(a).localeCompare(String(b)))) : x);

const tally = { buyRows: { compared: 0, differ: 0 }, availability: { compared: 0, differ: 0 } };
const differ: string[] = [];
const compareMaps = (group: keyof typeof tally, label: string, a: Map<string, unknown>, b: Map<string, unknown>) => {
  const keys = new Set([...a.keys(), ...b.keys()]);
  for (const k of keys) {
    tally[group].compared += 1;
    if (stable(a.get(k)) !== stable(b.get(k))) {
      tally[group].differ += 1;
      differ.push(`${label} ${k}: old ${stable(a.get(k))} new ${stable(b.get(k))}`);
    }
  }
};

compareMaps("availability", "availability(user)", await OLD.loadAvailability(userId), await NEW.loadAvailability(userId));
for (const d of decks) {
  compareMaps("availability", `availability(${d.id})`, await OLD.loadAvailability(userId, { excludeDeckId: d.id }), await NEW.loadAvailability(userId, { excludeDeckId: d.id }));
}
const rowsOf = (rows: { deckId: string; oracleId: string; quantity: number }[]) =>
  new Map(rows.map((r) => [`${r.deckId}|${r.oracleId}`, r.quantity]));
compareMaps("buyRows", "buyRows", rowsOf(await OLD.loadDeckBuyRows(userId)), rowsOf(await NEW.loadDeckBuyRows(userId)));

console.log(`loadDeckBuyRows: ${tally.buyRows.compared} rows compared, ${tally.buyRows.differ} differ`);
console.log(`loadAvailability: ${tally.availability.compared} rows compared, ${tally.availability.differ} differ`);
for (const line of differ.slice(0, 20)) console.log("  " + line);

const time = async (fn: () => Promise<unknown>) => {
  const ms: number[] = [];
  for (let i = 0; i < 5; i += 1) { const t = performance.now(); await fn(); ms.push(performance.now() - t); }
  return Math.round(ms.sort((x, y) => x - y)[2]);
};
for (const [name, mod] of [["old", OLD], ["new", NEW]] as const) {
  console.log(`${name}: loadDeckBuyRows ${await time(() => mod.loadDeckBuyRows(userId))}ms · loadAvailability(user) ${await time(() => mod.loadAvailability(userId))}ms`);
}

if (process.env.DIFF_EXPLAIN === "1") {
  const execute = db.execute.bind(db);
  for (const [name, mod] of [["old", OLD], ["new", NEW]] as const) {
    let plan = "";
    (db as { execute: unknown }).execute = async (q: Parameters<typeof execute>[0]) => {
      const res = await execute(sql`explain (analyze, costs off, timing on) ${q}`);
      plan = (res.rows as { "QUERY PLAN": string }[]).map((r) => r["QUERY PLAN"]).join("\n");
      return { rows: [] };
    };
    await mod.loadDeckBuyRows(userId);
    (db as { execute: unknown }).execute = execute;
    console.log(`\n── EXPLAIN ANALYZE loadDeckBuyRows (${name})\n${plan.split("\n").filter((l) => /Execution Time|Planning Time|loops=\d{3,}/.test(l)).join("\n")}`);
  }
}
process.exit(differ.length ? 1 : 0);
