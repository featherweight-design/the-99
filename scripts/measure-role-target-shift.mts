// What moving the fit score from the flat `ROLE_TARGETS` to each commander's MEASURED role
// targets does to one reader's lists (brief 2026-09-28 §5.4). Read-only: no fixture, no writes,
// no locks. Point it at STAGING, which carries the real collection; a shift read off local-dev's
// fixture accounts describes the fixtures.
//
// It measures by CALLING the shipped arithmetic twice rather than restating it: `computeFit`
// over each owned row's stored inputs, flat then measured, and `assembleDiscovery` over the same
// reads with no targets (every row falls back to flat) and then with `loadRoleTargetsForCommanders`'
// answer. A script that re-derives a rule instead of calling it drifts from the app one round at
// a time; `measure-gap-line.mts` records that failure twice.
//
// Prints, for /commanders and /discover: the top 20 before and after, and how many of the ranked
// commanders moved more than 5 places. Then, for the owned rows, a sample of role headers whose
// target changed ("2 short" against 3 flat becoming against the measured figure).
//
//   MEASURE_USER_ID=<user> pnpm exec tsx scripts/measure-role-target-shift.mts
//
// `requireEnv` FIRST: `src/db` reads `DATABASE_URL` at import time.
import { requireEnv } from "./lib/env.mjs";
requireEnv(["DATABASE_URL"]);

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../src/db";
import { cards, commanderScores, SCORE_WRITER_CURRENT } from "../src/db/schema";
import { loadAvailability } from "../src/lib/decks/availability-query";
import { assembleDiscovery } from "../src/lib/discovery/list";
import { loadCandidates } from "../src/lib/discovery/candidates";
import { loadPlayedTags } from "../src/lib/discovery/novelty";
import { readPrices } from "../src/lib/discovery/price";
import { loadRoleTargetsForCommanders } from "../src/lib/profile/role-targets";
import { buildPoolRollup } from "../src/lib/recs/pool-rollup";
import { loadCollectionPool } from "../src/lib/recs/recommend";
import { ROLE_TARGETS } from "../src/lib/recs/roles";
import { computeFit, wholeTarget, type RoleName } from "../src/lib/recs/score";
// No signed-in reader here: every switch read takes the environment itself (`process.env`).

const TOP = 20;
const MOVED = 5;
const ROLES: RoleName[] = ["ramp", "draw", "removal", "wipes"];

type Ranked = { id: string; name: string; score: number };

/** Places moved, over the commanders ranked in both orders. */
function shift(before: Ranked[], after: Ranked[]) {
  const at = new Map(after.map((r, i) => [r.id, i]));
  const moves = before.map((r, i) => ({ ...r, from: i, to: at.get(r.id) ?? -1 })).filter((m) => m.to >= 0);
  return { moves, movedMore: moves.filter((m) => Math.abs(m.to - m.from) > MOVED).length };
}

function printTop(label: string, before: Ranked[], after: Ranked[]) {
  const { moves, movedMore } = shift(before, after);
  const fromOf = new Map(moves.map((m) => [m.id, m.from]));
  console.log(`\n== ${label} · ${before.length} ranked · ${movedMore} moved more than ${MOVED} places ==`);
  console.log("  #   before                              after");
  for (let i = 0; i < Math.min(TOP, before.length); i++) {
    const b = before[i]!;
    const a = after[i];
    const was = a ? fromOf.get(a.id) : undefined;
    const tag = a && was !== undefined && was !== i ? ` (was ${was + 1})` : "";
    console.log(
      `  ${String(i + 1).padStart(2)}  ${`${b.name} ${b.score}`.padEnd(36)}${a ? `${a.name} ${a.score}${tag}` : ""}`,
    );
  }
}

const byScore = (a: Ranked, b: Ranked) => b.score - a.score || a.id.localeCompare(b.id);

/** How many printed scores moved, and the spread of the move. A ranking can hold still while its
 *  figures move (/discover's fit order sorts on owned support, not the score), so the order alone
 *  says nothing about what a reader sees. */
function scoreShift(label: string, before: Ranked[], after: Ranked[]) {
  const was = new Map(before.map((r) => [r.id, r.score]));
  const deltas = after.map((r) => r.score - (was.get(r.id) ?? r.score)).filter((d) => d !== 0);
  const up = deltas.filter((d) => d > 0).length;
  console.log(
    `  ${label}: ${deltas.length} of ${after.length} printed scores move` +
      (deltas.length ? ` (${up} up, ${deltas.length - up} down, ${Math.min(...deltas)} to +${Math.max(...deltas)})` : ""),
  );
}

const { rows: tops } = await db.execute<{ user_id: string; decks: number }>(sql`
  select user_id, count(*)::int as decks from decks group by user_id order by decks desc
`);
if (tops.length === 0) throw new Error("no decks in this database — nothing to measure");
console.log("accounts with decks:");
for (const t of tops) console.log(`  ${t.user_id} · ${t.decks} decks`);
const userId = process.env.MEASURE_USER_ID ?? tops[0]!.user_id;
console.log(`\nmeasuring ${userId}`);

// ---- /commanders: the stored rows, re-graded ------------------------------------------------
const owned = await db
  .select({
    id: commanderScores.oracleId, name: cards.name, colorIdentity: cards.colorIdentity,
    poolSize: commanderScores.colorPoolSize, roleCounts: commanderScores.roleCounts,
    owned: commanderScores.edhrecOwnedCount, total: commanderScores.edhrecTotal,
  })
  .from(commanderScores)
  .innerJoin(cards, eq(cards.oracleId, commanderScores.oracleId))
  .where(and(eq(commanderScores.userId, userId), sql`${commanderScores.writerVersion} >= ${SCORE_WRITER_CURRENT - 1}`))
  .orderBy(desc(commanderScores.rankScore));
if (owned.length === 0) {
  console.log("\n(no stored scores for this reader: open /commanders once as them, then re-run)");
} else {
  const measured = await loadRoleTargetsForCommanders(owned.map((r) => ({ oracleId: r.id, colorIdentity: r.colorIdentity })));
  const grade = (targets: (id: string) => Record<RoleName, number>) =>
    owned
      .map((r) => ({
        id: r.id, name: r.name,
        score: computeFit({
          poolSize: r.poolSize, roleCounts: r.roleCounts,
          ownedSupport: r.owned ?? 0, edhrecTotal: r.total, roleTargets: targets(r.id),
        }).score,
      }))
      .sort(byScore);
  const flatOwned = grade(() => ROLE_TARGETS);
  const measOwned = grade((id) => measured.get(id)!.targets);
  printTop("/commanders (owned lane, stored rows)", flatOwned, measOwned);
  scoreShift("/commanders", flatOwned, measOwned);

  const sources = new Map<string, number>();
  for (const t of measured.values()) sources.set(t.of, (sources.get(t.of) ?? 0) + 1);
  console.log(`\n  targets came from: ${[...sources].map(([k, n]) => `${k} ${n}`).join(", ")}`);

  // The header's STATE is what a reader sees change: short, at, or past. A figure moving inside
  // "well past" (121 against 10, then against 7) reads the same, so those are counted apart.
  const line = (have: number, target: number) =>
    have > target ? `well past ${target}` : have === target ? `at ${target}` : `${target - have} short of ${target}`;
  const state = (have: number, target: number) => (have > target ? "past" : have === target ? "at" : "short");
  const flips: string[] = [];
  let figureOnly = 0;
  let headers = 0;
  for (const r of owned) {
    const t = measured.get(r.id)!;
    for (const role of ROLES) {
      headers++;
      const flat = ROLE_TARGETS[role];
      const meas = wholeTarget(t.targets[role]);
      if (flat === meas) continue;
      const have = r.roleCounts[role];
      if (state(have, flat) === state(have, meas)) { figureOnly++; continue; }
      flips.push(`  ${r.name.padEnd(34)} ${role.padEnd(8)} have ${String(have).padStart(3)} · ${line(have, flat).padEnd(16)} → ${line(have, meas)}  (${t.of} ${t.targets[role].toFixed(1)})`);
    }
  }
  console.log(`\n== Role Coverage headers (${headers} across ${owned.length} commanders) ==`);
  console.log(`  ${flips.length} change state (short / at / past); ${figureOnly} change only the figure inside the same state`);
  for (const f of flips.slice(0, 12)) console.log(f);
}

// ---- /discover: the shipped assembly, twice -------------------------------------------------
const { collection } = await loadCollectionPool(userId);
const availability = await loadAvailability(userId, { oracleIds: collection.map((c) => c.oracleId), env: process.env });
const candidates = await loadCandidates(userId, collection.map((c) => c.oracleId));
const [priceRead, playedTags, targets] = await Promise.all([
  readPrices(candidates.map((c) => c.oracleId)),
  loadPlayedTags(userId),
  loadRoleTargetsForCommanders(candidates),
]);
const assemble = (roleTargets: Map<string, Record<RoleName, number>>) =>
  assembleDiscovery({
    availOk: true, candidates, playedTags, prices: priceRead.prices, priceOk: priceRead.ok,
    rollup: buildPoolRollup(collection, availability), cardsRead: collection.length,
    freePoolSize: collection.length, sort: "fit", roleTargets,
  }).items.map((i) => ({ id: i.slug, name: i.name, score: i.score }));
const flatDiscover = assemble(new Map());
const measDiscover = assemble(new Map([...targets].map(([id, t]) => [id, t.targets])));
printTop("/discover (fit order, which sorts on owned support, not the score)", flatDiscover, measDiscover);
scoreShift("/discover", flatDiscover, measDiscover);
const discoverSources = new Map<string, number>();
for (const t of targets.values()) discoverSources.set(t.of, (discoverSources.get(t.of) ?? 0) + 1);
console.log(`  targets came from: ${[...discoverSources].map(([k, n]) => `${k} ${n}`).join(", ")}`);

process.exit(0);
