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
import { loadRoleTargetsForCommanders } from "../src/lib/profile/load";
import { buildPoolRollup } from "../src/lib/recs/pool-rollup";
import { loadCollectionPool } from "../src/lib/recs/recommend";
import { ROLE_TARGETS } from "../src/lib/recs/roles";
import { computeFit, wholeTarget, type RoleName } from "../src/lib/recs/score";

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
  const measured = await loadRoleTargetsForCommanders(owned);
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
  printTop("/commanders (owned lane, stored rows)", grade(() => ROLE_TARGETS), grade((id) => measured.get(id)!.targets));

  const sources = new Map<string, number>();
  for (const t of measured.values()) sources.set(t.of, (sources.get(t.of) ?? 0) + 1);
  console.log(`\n  targets came from: ${[...sources].map(([k, n]) => `${k} ${n}`).join(", ")}`);

  console.log(`\n== Role Coverage headers whose figure changes (first 12) ==`);
  const line = (have: number, target: number) =>
    have > target ? `well past ${target}` : have === target ? `at ${target}` : `${target - have} short of ${target}`;
  let shown = 0;
  for (const r of owned) {
    const t = measured.get(r.id)!;
    if (t.of === "flat") continue;
    for (const role of ROLES) {
      const flat = ROLE_TARGETS[role];
      const meas = wholeTarget(t.targets[role]);
      if (flat === meas || shown >= 12) continue;
      const have = r.roleCounts[role];
      console.log(`  ${r.name.padEnd(34)} ${role.padEnd(8)} have ${String(have).padStart(2)} · ${line(have, flat).padEnd(16)} → ${line(have, meas)}  (${t.of} ${t.targets[role].toFixed(1)})`);
      shown++;
    }
  }
}

// ---- /discover: the shipped assembly, twice -------------------------------------------------
const { collection } = await loadCollectionPool(userId);
const availability = await loadAvailability(userId, { oracleIds: collection.map((c) => c.oracleId) });
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
printTop(
  "/discover (fit order)",
  assemble(new Map()),
  assemble(new Map([...targets].map(([id, t]) => [id, t.targets]))),
);

process.exit(0);
