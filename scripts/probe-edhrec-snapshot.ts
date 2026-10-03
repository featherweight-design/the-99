// probe:edhrec-snapshot — How it works §5.2 against a real Postgres.
//
// The commander index scores a commander from its own EDHREC fetch, and the live half of the app
// reads `edhrec_cache`. An index build retires every cached page fetched before the index fetched
// the same commander (`commander_support.computed_at`), so the next live read refetches and both
// halves read one snapshot. The rule is `cacheRowRetired` and the unit suite pins it; what only a
// database answers is whether `readEdhrecCache`'s join hands each row ITS commander's stamp, and
// whether `resolveEdhrecData` refetches, stores and falls back as the rows say.
//
// It calls the real readEdhrecCache and resolveEdhrecData, with `fetch` stubbed so no request
// reaches EDHREC: a counter that answers a fixture page, or fails.
//
//   a  a page newer than the index's fetch is served from the cache
//   b  a page older than the index's fetch, inside the TTL, is refetched and stored past the stamp
//   c  a commander the index holds no row for keeps the TTL rule, both ways
//   d  a retired page is still served when EDHREC cannot be reached
//   e  a copy landing: the index stamp moves past a page that was current, and the page retires
//
// It WRITES `edhrec_cache` rows and `commander_support.computed_at` on two real commanders, and one
// cache row for a card the index does not hold. All are captured first and put back in a `finally`.
// The target is NAMED with PROBE_SNAPSHOT_BRANCH, checked against what the database reports, and
// staging, production and local-dev are refused by id: scratch branches only.
import { requireEnv } from "./lib/env.mjs";
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { readEdhrecCache, resolveEdhrecData } from "../src/lib/edhrec/client";

const NEVER = new Set(["br-noisy-violet-a6vw4ess", "br-polished-pond-a6e63y0b", "br-patient-hall-a6nbonvo"]);
const { PROBE_SNAPSHOT_BRANCH: NAMED } = requireEnv(["DATABASE_URL", "PROBE_SNAPSHOT_BRANCH"]);

let failures = 0;
const check = (label: string, ok: boolean, detail = "") => {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
};

const PAGE = { container: { json_dict: { cardlists: [] } } };
let calls = 0;
let reachable = true;
globalThis.fetch = (async () => {
  calls += 1;
  if (!reachable) throw new Error("unreachable");
  return { status: 200, ok: true, json: async () => PAGE } as unknown as Response;
}) as typeof fetch;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(Date.now() - ms);

type Row = Record<string, unknown>;
const rows = async (q: ReturnType<typeof sql>) => (await db.execute(q)).rows as Row[];

// Both columns are `timestamp` WITHOUT a zone, and the app writes them through Drizzle, which
// stores UTC. A raw `Date` parameter is serialized in this machine's zone and lands hours off, so
// every write here goes as a UTC string, and every read back comes through `to_char` as UTC too.
const utc = (d: Date) => d.toISOString().replace("Z", "");
async function setPage(id: string, fetchedAt: Date) {
  await db.execute(sql`update edhrec_cache set fetched_at = ${utc(fetchedAt)}::timestamp where commander_oracle_id = ${id}`);
}
async function setIndex(id: string, computedAt: Date) {
  await db.execute(sql`update commander_support set computed_at = ${utc(computedAt)}::timestamp where commander_oracle_id = ${id}`);
}
async function storedFetchedAt(id: string): Promise<Date> {
  const [r] = await rows(sql`select to_char(fetched_at, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as at from edhrec_cache where commander_oracle_id = ${id}`);
  return new Date(String(r.at));
}
/** One live read, exactly as the app makes it: the bulk read, then the resolve. */
async function liveRead(id: string, name: string) {
  const before = calls;
  const cached = (await readEdhrecCache([id])).get(id);
  const result = await resolveEdhrecData(id, name, cached);
  return { fetches: calls - before, result, cached };
}

async function main() {
  const [{ branch }] = await rows(sql`select current_setting('neon.branch_id', true) as branch`);
  if (NEVER.has(String(branch))) throw new Error(`refusing ${branch}: staging, production and local-dev are never a probe target`);
  if (branch !== NAMED) throw new Error(`the database reports ${branch}, not the named ${NAMED}`);

  // Two commanders the index and the cache both hold, chosen in a stable order.
  const pair = await rows(sql`
    select e.commander_oracle_id as id, c.name, e.payload,
      e.fetched_at::text as fetched_at, s.computed_at::text as computed_at
    from edhrec_cache e
    join commander_support s using (commander_oracle_id)
    join cards c on c.oracle_id = e.commander_oracle_id
    order by e.commander_oracle_id limit 2`);
  // A card the index holds no row for and the cache has never seen.
  const [lone] = await rows(sql`
    select c.oracle_id as id, c.name from cards c
    where not exists (select 1 from commander_support s where s.commander_oracle_id = c.oracle_id)
      and not exists (select 1 from edhrec_cache e where e.commander_oracle_id = c.oracle_id)
    order by c.oracle_id limit 1`);
  if (pair.length < 2 || !lone) throw new Error("no fixture: the branch holds fewer than two cached, indexed commanders");
  const [A, B] = pair.map((r) => ({ id: String(r.id), name: String(r.name) }));
  const C = { id: String(lone.id), name: String(lone.name) };

  try {
    // ---- a · current page, served from the cache ------------------------------------------
    await setIndex(A.id, ago(3 * DAY));
    await setPage(A.id, ago(1 * DAY));
    const a = await liveRead(A.id, A.name);
    check("the read carries the index's stamp for this commander, from the same statement",
      a.cached?.indexComputedAt != null && Math.abs(a.cached.indexComputedAt.getTime() - ago(3 * DAY).getTime()) < HOUR);
    check("a page newer than the index's fetch is served from the cache", a.fetches === 0 && a.result.data !== null,
      `${a.fetches} fetches`);

    // ---- b · retired page, refetched and stored ---------------------------------------------
    const stampB = ago(1 * DAY);
    await setIndex(B.id, stampB);
    await setPage(B.id, ago(3 * DAY));
    const b = await liveRead(B.id, B.name);
    check("a page older than the index's fetch is refetched, though it is inside the TTL", b.fetches === 1,
      `${b.fetches} fetches`);
    check("the refetched page is stored past the index's stamp", (await storedFetchedAt(B.id)) > stampB);
    const b2 = await liveRead(B.id, B.name);
    check("and the next read serves it from the cache", b2.fetches === 0, `${b2.fetches} fetches`);

    // ---- c · no index row: the TTL alone -----------------------------------------------------
    await db.execute(sql`insert into edhrec_cache (commander_oracle_id, payload, fetched_at)
      values (${C.id}, ${JSON.stringify(PAGE)}::jsonb, ${utc(ago(3 * DAY))}::timestamp)`);
    const c1 = await liveRead(C.id, C.name);
    check("a commander with no index row keeps a page inside the TTL", c1.fetches === 0 && c1.cached?.indexComputedAt === null,
      `${c1.fetches} fetches`);
    await setPage(C.id, ago(31 * DAY));
    const c2 = await liveRead(C.id, C.name);
    check("and refetches one past it", c2.fetches === 1, `${c2.fetches} fetches`);

    // ---- d · retired page, EDHREC unreachable -------------------------------------------------
    await setPage(B.id, ago(3 * DAY));
    reachable = false;
    const d = await liveRead(B.id, B.name);
    reachable = true;
    check("a retired page is still served when EDHREC cannot be reached",
      d.fetches === 1 && d.result.data !== null && d.result.unreachable === false,
      `data ${d.result.data === null ? "null" : "present"}, unreachable ${d.result.unreachable}`);
    check("and stays in the cache, not deleted", (await rows(sql`select 1 from edhrec_cache where commander_oracle_id = ${B.id}`)).length === 1);

    // ---- e · a copy lands: the index's stamp moves past a current page -------------------------
    await setIndex(A.id, ago(3 * DAY));
    await setPage(A.id, ago(2 * DAY));
    check("before the copy, the page is current", (await liveRead(A.id, A.name)).fetches === 0);
    await setIndex(A.id, ago(1 * HOUR)); // what db:copy:index writes: the build's own, later stamp
    const e = await liveRead(A.id, A.name);
    check("after it, the next read retires the page and refetches", e.fetches === 1, `${e.fetches} fetches`);
  } finally {
    // Every step on its own, so one failing cannot strand the rest. The stamps go back as the
    // exact text they were read as, never through a `Date`, which would shift them by the zone.
    for (const r of pair) {
      await db.execute(sql`update edhrec_cache set payload = ${JSON.stringify(r.payload)}::jsonb, fetched_at = ${String(r.fetched_at)}::timestamp
        where commander_oracle_id = ${r.id}`).catch((err) => console.error(`restore cache ${r.id}:`, err));
      await db.execute(sql`update commander_support set computed_at = ${String(r.computed_at)}::timestamp where commander_oracle_id = ${r.id}`)
        .catch((err) => console.error(`restore index ${r.id}:`, err));
    }
    await db.execute(sql`delete from edhrec_cache where commander_oracle_id = ${C.id}`)
      .catch((err) => console.error(`remove ${C.id}:`, err));
  }
}

// The exit is decided AFTER main settles, never in a finally: `process.exit` there swallows a throw
// and prints "All checks passed" over a run that never reached a check.
main().then(
  () => {
    if (failures > 0) {
      console.log(`${failures} check(s) failed.`);
      process.exit(1);
    }
    console.log("All checks passed.");
    process.exit(0);
  },
  (err) => {
    console.error(err);
    console.log("The probe did not finish.");
    process.exit(1);
  },
);
