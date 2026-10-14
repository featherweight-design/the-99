// Proves the upcoming-precons backend against a real database: which sets count as upcoming Commander
// sets, that the first-seen stamp writes a baseline once and arrivals after it, and that the per-reader
// seen marker accumulates without duplicates and belongs to one reader.
//
// It writes, but EVERYTHING inside one transaction that is rolled back at the end, so no row survives:
// the probe fails closed on its target all the same. `PROBE_DB_BRANCH` must name the branch
// `DATABASE_URL` reports, and staging and production are refused by id.
//
//   PROBE_DB_BRANCH=br-… pnpm probe:upcoming-precons
import "./lib/env.mjs";

const REFUSED = new Set(["br-polished-pond-a6e63y0b", "br-noisy-violet-a6vw4ess"]);
const ROLLBACK = new Error("rollback");
const NOW = new Date("2026-10-14T12:00:00Z");

let failed = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};

async function main() {
  const named = process.env.PROBE_DB_BRANCH;
  if (!named) throw new Error("probe:upcoming-precons: set PROBE_DB_BRANCH");
  if (REFUSED.has(named)) throw new Error(`probe:upcoming-precons: ${named} is staging or production`);
  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const { rows } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  if (rows[0]?.b !== named) throw new Error(`probe:upcoming-precons: database reports ${rows[0]?.b}, not ${named}`);

  const { stampFirstSeenIn } = await import("../src/lib/catalog/first-seen");
  const { loadUpcomingSets, markUpcomingSeen } = await import("../src/lib/precons/upcoming");
  const A = "probe_up_a";
  const B = "probe_up_b";

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`delete from catalog_first_seen where kind = 'set'`);
      await tx.execute(sql`delete from user_prefs where user_id in (${A}, ${B})`);
      await tx.execute(sql`
        insert into sets (code, name, set_type, released_at, card_count, digital, parent_set_code) values
          ('zpp', 'Probe Parent',          'expansion', '2026-11-13', 100, false, null),
          ('zpa', 'Probe Commander A',     'commander', '2026-11-13',  41, false, 'zpp'),
          ('zpe', 'Probe Commander E',     'commander', '2027-04-09',   1, false, null),
          ('zpb', 'Probe Commander Past',  'commander', '2026-10-02', 103, false, null),
          ('zpc', 'Probe Commander Digi',  'commander', '2026-12-01',  10, true,  null),
          ('zpd', 'Probe Expansion',       'expansion', '2026-12-01', 200, false, null),
          ('zpf', 'Probe Commander Today', 'commander', '2026-10-14',  50, false, null)`);

      // The first run for the kind is the baseline: everything was already there.
      const first = await stampFirstSeenIn(tx, "set", ["zpp", "zpb", "zpe"], new Date("2026-10-13T09:00:00Z"));
      check("the first stamp for a kind is a baseline", first.baseline && first.added === 3, JSON.stringify(first));
      const second = await stampFirstSeenIn(tx, "set", ["zpp", "zpb", "zpe", "zpa"], new Date("2026-10-14T09:00:00Z"));
      check("the next run stamps only the new key, as an arrival", !second.baseline && second.added === 1, JSON.stringify(second));
      const again = await stampFirstSeenIn(tx, "set", ["zpa"], new Date("2026-10-15T09:00:00Z"));
      check("a stamp already written is never moved", again.added === 0);
      const { rows: kept } = await tx.execute<{ t: string }>(sql`select first_seen_at::text t from catalog_first_seen where kind = 'set' and key = 'zpa'`);
      check("zpa keeps its first date", kept[0]?.t.startsWith("2026-10-14"), kept[0]?.t);

      const list = await loadUpcomingSets(A, NOW, tx);
      const mine = list.filter((s) => s.code.startsWith("zp"));
      check("only non-digital Commander sets after today, soonest first", mine.map((s) => s.code).join() === "zpa,zpe", mine.map((s) => s.code).join());
      check("a set released today is not upcoming", !mine.some((s) => s.code === "zpf"));
      check("a past, a digital and a non-Commander set are not upcoming", !mine.some((s) => ["zpb", "zpc", "zpd"].includes(s.code)));
      const a = mine.find((s) => s.code === "zpa");
      check("zpa names its parent and its release", a?.parentName === "Probe Parent" && a.releasesOn === "2026-11-13" && a.cardCount === 41, JSON.stringify(a));
      check("zpa arrived on the second run", a?.arrivedAt?.toISOString().startsWith("2026-10-14") === true, String(a?.arrivedAt));
      check("zpe was in the baseline: its arrival is unknown, never claimed", mine.find((s) => s.code === "zpe")?.arrivedAt === null);
      check("nothing is seen before it is marked", mine.every((s) => !s.seen));
      check("the sort is stable by date then code", list.every((s, i) => i === 0 || list[i - 1].releasesOn <= s.releasesOn));

      await markUpcomingSeen(A, ["zpa", "NOT A CODE"], tx);
      let seen = (await loadUpcomingSets(A, NOW, tx)).filter((s) => s.code.startsWith("zp"));
      check("A has seen zpa and not zpe", seen.find((s) => s.code === "zpa")?.seen === true && seen.find((s) => s.code === "zpe")?.seen === false);
      await markUpcomingSeen(A, ["zpe", "zpa"], tx);
      seen = (await loadUpcomingSets(A, NOW, tx)).filter((s) => s.code.startsWith("zp"));
      check("a second mark adds zpe", seen.every((s) => s.seen));
      const { rows: codes } = await tx.execute<{ c: string[] }>(sql`select upcoming_seen_codes c from user_prefs where user_id = ${A}`);
      check("each code is held once", codes[0]?.c.slice().sort().join() === "zpa,zpe", JSON.stringify(codes[0]?.c));
      const others = (await loadUpcomingSets(B, NOW, tx)).filter((s) => s.code.startsWith("zp"));
      check("B, who marked nothing, has seen none", others.length === 2 && others.every((s) => !s.seen));

      throw ROLLBACK;
    });
  } catch (error) {
    if (error !== ROLLBACK) throw error;
  }

  const { rows: left } = await db.execute<{ n: number }>(sql`select count(*)::int n from sets where code like 'zp%'`);
  check("the rollback left no probe set behind", left[0]?.n === 0);
}

main()
  .then(() => {
    console.log(failed === 0 ? "\nall checks passed" : `\n${failed} check(s) FAILED`);
    process.exit(failed === 0 ? 0 : 1);
  })
  .catch((err) => { console.error(err); process.exit(1); });
