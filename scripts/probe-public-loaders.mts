// The public loaders (`src/lib/public/**`, launch epic F3 groundwork) against a real catalog. READ-ONLY: it only selects.
//
//   PROBE_READ_URL=<a database URL> pnpm probe:public-loaders
//
// Point it at STAGING for the measurement the repo asks for (`AGENTS.md`: measure against staging; a read needs no
// permission). Without `PROBE_READ_URL` it reads whatever `.env`'s DATABASE_URL names (local-dev). It proves:
//   1  no two cards share the 12-hex address prefix (the collision count the plan asserts is 0), and what 8 hex would have been;
//   2  twenty known cards and twenty commanders load by their own address, with their shape;
//   3  a wrong name part still resolves to the right card, and a one-character-off prefix is not-found;
//   4  the per-page read time, so "about one read per page per day" has a measurement behind it once the cache lands.
import "./lib/env.mjs";
if (process.env.PROBE_READ_URL) process.env.DATABASE_URL = process.env.PROBE_READ_URL;
const { sql } = await import("drizzle-orm");
const { db } = await import("../src/db");
const { loadPublicCard } = await import("../src/lib/public/card");
const { loadPublicCommander } = await import("../src/lib/public/commander");
const { publicSlug } = await import("../src/lib/public/slug");

let failures = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${JSON.stringify(got)}${ok ? "" : `, expected ${JSON.stringify(want)}`}`);
};
const rows = async <T,>(q: ReturnType<typeof sql>) => (await db.execute(q)).rows as T[];

async function run() {
  const [{ branch }] = await rows<{ branch: string | null }>(sql`select current_setting('neon.branch_id', true) as branch`);
  console.log(`branch ${branch}`);

  const [c] = await rows<{ n: string; d12: string; d8: string }>(sql`
    select count(*)::text as n, count(distinct left(replace(oracle_id::text, '-', ''), 12))::text as d12,
           count(distinct left(replace(oracle_id::text, '-', ''), 8))::text as d8 from cards`);
  console.log(`cards ${c.n}; distinct 12-hex prefixes ${c.d12}; distinct 8-hex prefixes ${c.d8} (${Number(c.n) - Number(c.d8)} would have collided)`);
  check("1 · no two cards share a 12-hex prefix", Number(c.n) - Number(c.d12), 0);

  const cardIds = await rows<{ oracle_id: string; name: string }>(sql`select oracle_id::text, name from cards order by oracle_id limit 20 offset ${Math.max(0, Math.min(5000, Number(c.n) - 20))}`);
  check("2 · there are cards to load", cardIds.length > 0, true);
  if (cardIds.length === 0) return;
  const times: number[] = [];
  let cardsOk = 0;
  for (const r of cardIds) {
    const t0 = performance.now();
    const res = await loadPublicCard(publicSlug(r.name, r.oracle_id));
    times.push(performance.now() - t0);
    if (res.kind === "ok" && res.card.oracleId === r.oracle_id && res.canonicalSlug === publicSlug(r.name, r.oracle_id)) cardsOk += 1;
  }
  check("2 · twenty cards load by their own address", cardsOk, cardIds.length);

  const commanders = await rows<{ oracle_id: string; name: string }>(sql`
    select c.oracle_id::text, c.name from commander_support s join cards c on c.oracle_id = s.commander_oracle_id order by s.rank nulls last limit 20`);
  let cmdOk = 0;
  const shapes = { ok: 0, absent: 0, degraded: 0 };
  for (const r of commanders) {
    const t0 = performance.now();
    const res = await loadPublicCommander(publicSlug(r.name, r.oracle_id));
    times.push(performance.now() - t0);
    if (res.kind === "ok" && res.commander.oracleId === r.oracle_id) { cmdOk += 1; shapes[res.commander.state] += 1; }
  }
  check("2 · twenty commanders load by their own address", cmdOk, commanders.length);
  console.log(`   states ${JSON.stringify(shapes)}`);

  const first = cardIds[0];
  const wrong = await loadPublicCard(`not-the-name-${first.oracle_id.replace(/-/g, "").slice(0, 12)}`);
  check("3 · a wrong name part still resolves, to the canonical address", wrong.kind === "ok" ? wrong.canonicalSlug : wrong.kind, publicSlug(first.name, first.oracle_id));
  const real12 = first.oracle_id.replace(/-/g, "").slice(0, 12);
  const off = await loadPublicCard(`x-${real12.slice(0, 11)}${real12[11] === "0" ? "1" : "0"}`);
  check("3 · a prefix no card has is not-found", off.kind, "not-found");
  const notCommander = await loadPublicCommander(publicSlug(first.name, first.oracle_id));
  console.log(`   a card that is not in commander_support: ${notCommander.kind}`);

  times.sort((a, b) => a - b);
  console.log(`4 · per-page read: median ${times[Math.floor(times.length / 2)].toFixed(0)} ms, max ${times[times.length - 1].toFixed(0)} ms over ${times.length} loads`);
}

run().catch((e) => { failures += 1; console.error(e); }).finally(() => {
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} failure(s).`);
  process.exit(failures === 0 ? 0 : 1);
});
