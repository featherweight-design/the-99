// Proves the upcoming-precons backend against a real database: which sets count as upcoming Commander
// sets (a released one kept while no precon lists it, E1), that the first-seen stamp writes a baseline once
// and arrivals after it, that the per-reader seen marker accumulates without duplicates, takes `lists:` keys
// and belongs to one reader, and the shapes PR 2 and PR 3 receive: the revealed commanders (E2), the precon
// arrivals (E3) and the banner's lines (`arrivalsFor`) in four states (plan PR 1): release day with no precon,
// a set with no commanders, lists landed for some decks, and an announced set later listed, unseen.
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
  const { loadUpcomingSets, markUpcomingSeen, upcomingSeenWrite } = await import("../src/lib/precons/upcoming");
  const { loadRevealedCommanders } = await import("../src/lib/precons/revealed");
  const { loadPreconArrivals } = await import("../src/lib/precons/arrivals-read");
  const { arrivalsFor, seenKeysFor, visitSeenKeys } = await import("../src/lib/precons/arrivals");
  const show = (label: string, value: unknown) => console.log(`     ${label}: ${JSON.stringify(value)}`);
  const A = "probe_up_a";
  const B = "probe_up_b";

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`delete from catalog_first_seen where kind in ('set', 'precon')`);
      await tx.execute(sql`delete from user_prefs where user_id in (${A}, ${B})`);
      await tx.execute(sql`
        insert into sets (code, name, set_type, released_at, card_count, digital, parent_set_code) values
          ('zpp', 'Probe Parent',          'expansion', '2026-11-13', 100, false, null),
          ('zpg', 'Probe Commander G',     'commander', '2026-11-13',  12, false, null),
          ('zpa', 'Probe Commander A',     'commander', '2026-11-13',  41, false, 'zpp'),
          ('zpe', 'Probe Commander E',     'commander', '2027-04-09',   1, false, null),
          ('zpb', 'Probe Commander Past',  'commander', '2026-10-02', 103, false, null),
          ('zpc', 'Probe Commander Digi',  'commander', '2026-12-01',  10, true,  null),
          ('zpd', 'Probe Expansion',       'expansion', '2026-12-01', 200, false, null),
          ('zpf', 'Probe Commander Today', 'commander', '2026-10-14',  50, false, null),
          ('zpi', 'Probe Commander Listed','commander', '2026-10-14',  50, false, null),
          ('zph', 'Probe Commander Gone',  'commander', '2026-09-01',  50, false, null)`);
      // MTGJSON's set codes are UPPERCASE: a precon row for zpb and zpi takes each out of the read, and two (plus a
      // twin) for zpa are its decklists listed before release (L2).
      await tx.execute(sql`
        insert into precons (file_name, name, set_code, release_date, twin_of) values
          ('ZPB_Deck',   'Probe Past Deck',   'ZPB', '2026-10-02', null),
          ('ZPI_Deck',   'Probe Listed Deck', 'ZPI', '2026-10-14', null),
          ('ZPA_One',    'Probe Deck One',    'ZPA', '2026-11-13', null),
          ('ZPA_Two',    'Probe Deck Two',    'ZPA', '2026-11-13', null),
          ('ZPA_Two_CE', 'Probe Deck Two CE', 'ZPA', '2026-11-13', 'ZPA_Two')`);
      // zpa reveals two legendary creatures, one printed twice (the Christine Chapel case), and a creature that is not
      // legendary; zpg reveals nothing.
      const { rows: picks } = await tx.execute<{ oracle_id: string; type_line: string }>(sql`
        (select oracle_id, type_line from cards where type_line like 'Legendary Creature%' order by oracle_id limit 2)
        union all
        (select oracle_id, type_line from cards where type_line like 'Creature%' order by oracle_id limit 1)`);
      const [lc1, lc2, plain] = picks.map((r) => r.oracle_id);
      await tx.execute(sql`
        insert into printings (scryfall_id, oracle_id, set_code, collector_number, image_uri_small, finishes) values
          (gen_random_uuid(), ${lc1}, 'zpa', '300', 'small-300', '{nonfoil}'),
          (gen_random_uuid(), ${lc1}, 'zpa', '78',  'small-78',  '{nonfoil}'),
          (gen_random_uuid(), ${lc2}, 'zpa', '9',   null,        '{nonfoil}'),
          (gen_random_uuid(), ${plain}, 'zpa', '1', 'small-1',   '{nonfoil}')`);

      // The first run for the kind is the baseline: everything was already there.
      const first = await stampFirstSeenIn(tx, "set", ["zpp", "zpb", "zpe"], new Date("2026-10-13T09:00:00Z"));
      check("the first stamp for a kind is a baseline", first.baseline && first.added === 3, JSON.stringify(first));
      const second = await stampFirstSeenIn(tx, "set", ["zpp", "zpb", "zpe", "zpa"], new Date("2026-10-14T09:00:00Z"));
      check("the next run stamps only the new key, as an arrival", !second.baseline && second.added === 1, JSON.stringify(second));
      const again = await stampFirstSeenIn(tx, "set", ["zpa"], new Date("2026-10-15T09:00:00Z"));
      check("a stamp already written is never moved", again.added === 0);
      const { rows: kept } = await tx.execute<{ t: string }>(sql`select first_seen_at::text t from catalog_first_seen where kind = 'set' and key = 'zpa'`);
      check("zpa keeps its first date", kept[0]?.t.startsWith("2026-10-14"), kept[0]?.t);
      // zpg arrives too, so the banner has a set line beside zpa's lists.
      await stampFirstSeenIn(tx, "set", ["zpg"], new Date("2026-10-14T10:00:00Z"));
      // The precons: ZPB was there before stamping (baseline), zpa's two decks (and the twin) arrive later.
      const preconBase = await stampFirstSeenIn(tx, "precon", ["ZPB_Deck", "ZPI_Deck"], new Date("2026-10-13T09:00:00Z"));
      const preconNew = await stampFirstSeenIn(tx, "precon", ["ZPB_Deck", "ZPI_Deck", "ZPA_One", "ZPA_Two", "ZPA_Two_CE"], new Date("2026-10-14T09:00:00Z"));
      check("precons stamp a baseline, then their arrivals", preconBase.baseline && !preconNew.baseline && preconNew.added === 3, `${JSON.stringify(preconBase)} ${JSON.stringify(preconNew)}`);

      const list = await loadUpcomingSets(A, NOW, tx);
      const mine = list.filter((s) => s.code.startsWith("zp"));
      check("non-digital Commander sets after today, and today's with no precon, soonest first", mine.map((s) => s.code).join() === "zpf,zpa,zpg,zpe", mine.map((s) => s.code).join());
      const today = mine.find((s) => s.code === "zpf");
      check("release day, no precon row: kept, and released (L1)", today?.released === true && today.releasesOn === "2026-10-14", JSON.stringify(today));
      show("release day", today);
      check("released with a precon row (matched case-blind): gone", !mine.some((s) => ["zpi", "zpb"].includes(s.code)));
      check("released 43 days ago with no precon row: past the 30-day bound, gone", !mine.some((s) => s.code === "zph"));
      check("a digital and a non-Commander set are not upcoming", !mine.some((s) => ["zpc", "zpd"].includes(s.code)));
      check("a set to come is not released", mine.filter((s) => s.code !== "zpf").every((s) => !s.released));
      const a = mine.find((s) => s.code === "zpa");
      check("zpa names its parent and its release", a?.parentName === "Probe Parent" && a.releasesOn === "2026-11-13" && a.cardCount === 41, JSON.stringify(a));
      check("zpa arrived on the second run", a?.arrivedAt?.toISOString().startsWith("2026-10-14") === true, String(a?.arrivedAt));
      check("zpe was in the baseline: its arrival is unknown, never claimed", mine.find((s) => s.code === "zpe")?.arrivedAt === null);
      check("nothing is seen before it is marked", mine.every((s) => !s.seen));
      check("two sets on one date come back by code", mine.map((s) => s.code).slice(1, 3).join() === "zpa,zpg");
      check("the list is in date order", list.every((s, i) => i === 0 || list[i - 1].releasesOn <= s.releasesOn));

      // E2: revealed commanders.
      const revealed = await loadRevealedCommanders(["zpa", "zpg"], tx);
      show("revealed", revealed);
      check("zpa reveals its two legendary creatures, one entry each, by collector number",
        revealed.zpa?.map((c) => c.collectorNumber).join() === "9,78", JSON.stringify(revealed.zpa?.map((c) => c.collectorNumber)));
      check("a commander printed at 78 and 300 is one entry at 78, with that printing's art",
        revealed.zpa?.find((c) => c.oracleId === lc1)?.imageUriSmall === "small-78");
      check("a set with no commanders has no key", !("zpg" in revealed));
      check("no codes, no read", Object.keys(await loadRevealedCommanders([], tx)).length === 0);

      // E3: precon arrivals, and the banner's lines.
      const arrivals = (await loadPreconArrivals(A, NOW, tx)).filter((p) => p.setCode.startsWith("zp"));
      show("precon arrivals", arrivals);
      check("the arrivals are zpa's two decks: no baseline, no twin, set code lowercase",
        arrivals.map((p) => p.fileName).join() === "ZPA_One,ZPA_Two" && arrivals.every((p) => p.setCode === "zpa" && p.setName === "Probe Commander A" && !p.listsSeen),
        arrivals.map((p) => p.fileName).join());
      const lines = arrivalsFor({ sets: mine, preconArrivals: arrivals, now: NOW });
      show("banner lines", lines);
      check("an announced set later listed, unseen, is ONE lists line; zpg is a set line; baselines say nothing",
        lines.map((l) => `${l.kind}:${l.code}`).join() === "lists:zpa,set:zpg", lines.map((l) => `${l.kind}:${l.code}`).join());
      check("the lists line counts the decks listed so far", lines[0]?.kind === "lists" && lines[0].count === 2);
      show("✕ writes", seenKeysFor(lines));
      show("a Precons visit writes", visitSeenKeys({ sets: mine, preconArrivals: arrivals, now: NOW }));

      await markUpcomingSeen(A, ["zpa", "NOT A CODE"], tx);
      let seen = (await loadUpcomingSets(A, NOW, tx)).filter((s) => s.code.startsWith("zp"));
      check("A has seen zpa and not zpe", seen.find((s) => s.code === "zpa")?.seen === true && seen.find((s) => s.code === "zpe")?.seen === false);
      await markUpcomingSeen(A, ["zpe", "zpa"], tx);
      seen = (await loadUpcomingSets(A, NOW, tx)).filter((s) => s.code.startsWith("zp"));
      check("a second mark adds zpe", seen.find((s) => s.code === "zpe")?.seen === true && seen.find((s) => s.code === "zpa")?.seen === true && seen.find((s) => s.code === "zpg")?.seen === false);
      const { rows: codes } = await tx.execute<{ c: string[] }>(sql`select upcoming_seen_codes c from user_prefs where user_id = ${A}`);
      check("each code is held once", codes[0]?.c.slice().sort().join() === "zpa,zpe", JSON.stringify(codes[0]?.c));
      const others = (await loadUpcomingSets(B, NOW, tx)).filter((s) => s.code.startsWith("zp"));
      check("B, who marked nothing, has seen none", others.length === 4 && others.every((s) => !s.seen));

      // Dismissing the banner writes its keys, lists: included; after it A has no line and B still has both.
      await markUpcomingSeen(A, seenKeysFor(lines), tx);
      const { rows: afterX } = await tx.execute<{ c: string[] }>(sql`select upcoming_seen_codes c from user_prefs where user_id = ${A}`);
      check("✕ adds lists:zpa and zpg beside what A held", afterX[0]?.c.slice().sort().join() === "lists:zpa,zpa,zpe,zpg", JSON.stringify(afterX[0]?.c));
      const aAfter = arrivalsFor({
        sets: (await loadUpcomingSets(A, NOW, tx)).filter((s) => s.code.startsWith("zp")),
        preconArrivals: (await loadPreconArrivals(A, NOW, tx)).filter((p) => p.setCode.startsWith("zp")),
        now: NOW,
      });
      check("after ✕, A's banner is empty", aAfter.length === 0, JSON.stringify(aAfter));
      const bLines = arrivalsFor({
        sets: others,
        preconArrivals: (await loadPreconArrivals(B, NOW, tx)).filter((p) => p.setCode.startsWith("zp")),
        now: NOW,
      });
      check("B's banner is untouched", bLines.map((l) => `${l.kind}:${l.code}`).join() === "lists:zpa,set:zpg");
      const { userPrefs } = await import("../src/db/schema");
      const repeat = await upcomingSeenWrite(A, ["zpa", "lists:zpa"], tx).returning({ u: userPrefs.userId });
      const grows = await upcomingSeenWrite(A, ["zpa", "zpf"], tx).returning({ u: userPrefs.userId });
      check("a write that adds a key updates the row", grows.length === 1);
      check("a repeat of held keys updates no row (the guard that keeps the stamp still)", repeat.length === 0, String(repeat.length));

      throw ROLLBACK;
    });
  } catch (error) {
    if (error !== ROLLBACK) throw error;
  }

  const { rows: left } = await db.execute<{ n: number }>(sql`select count(*)::int n from sets where code like 'zp%'`);
  check("the rollback left no probe set behind", left[0]?.n === 0);
  const { rows: leftP } = await db.execute<{ n: number }>(sql`select (select count(*) from precons where set_code like 'ZP%') + (select count(*) from printings where set_code like 'zp%') n`);
  check("nor a probe precon or printing", Number(leftP[0]?.n) === 0);
}

main()
  .then(() => {
    console.log(failed === 0 ? "\nall checks passed" : `\n${failed} check(s) FAILED`);
    process.exit(failed === 0 ? 0 : 1);
  })
  .catch((err) => { console.error(err); process.exit(1); });
