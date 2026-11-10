/**
 * Upgrade this precon, measured (research 2026-11-10, PR 3): what the engine does on real precons, with the real model.
 *
 * READ-ONLY on the database and pointed at STAGING, as `measure:facts-cost` is: local-dev's prices are weeks stale, so the
 * price-cap check would mean nothing there. It reads `THE_99_NEON_STAGING_DIRECT` and refuses to run without it; the
 * database it reached must report staging's branch id. `MEASURE_ALLOW_LOCAL=1` measures `DATABASE_URL` instead and says
 * the figures are NOT a staging bar; production's branch is refused on every path. It writes nothing: no run row, no credit, no `model_calls`. It calls `runUpgrade`
 * itself, so the validator, the one repair and the charge rule are the shipped ones.
 *
 * DRY RUN BY DEFAULT: loads every planned precon, prints what would be asked and the cost bounds, calls nothing.
 * `--live` calls the model. The spend is capped in code (`--max-usd`, default 2): before each run, if the spend so far plus
 * that run's worst case would pass the cap, the script stops and reports what it has.
 *
 *   pnpm exec tsx scripts/measure-precon-upgrade.mts                      # dry run
 *   pnpm exec tsx scripts/measure-precon-upgrade.mts --live --max-usd 2   # the measurement
 *   --precons 12  --second 4  (how many precons, and how many of them also run a second strategy)
 */
import "./lib/env.mjs";

const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";
const args = process.argv.slice(2);
const flag = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const LIVE = args.includes("--live");
const MAX_USD = Number(flag("max-usd", "2"));
const PRECONS = Number(flag("precons", "12"));
const SECOND = Number(flag("second", "4"));

const staging = process.env.THE_99_NEON_STAGING_DIRECT;
const allowLocal = process.env.MEASURE_ALLOW_LOCAL === "1";
const url = staging ?? (allowLocal ? process.env.DATABASE_URL : undefined);
if (!url) {
  console.error("Set THE_99_NEON_STAGING_DIRECT (a read-only staging connection). Not falling back to local-dev: its prices are stale, so the price-cap check would mean nothing. MEASURE_ALLOW_LOCAL=1 measures DATABASE_URL anyway, and the figures are then NOT a staging bar.");
  process.exit(1);
}
process.env.DATABASE_URL = url;
if (!Number.isFinite(MAX_USD) || MAX_USD <= 0) { console.error("--max-usd must be a positive number"); process.exit(1); }

const { sql } = await import("drizzle-orm");
const { db } = await import("../src/db");
const branch = (await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`)).rows[0]?.b ?? null;
if (branch === PRODUCTION_BRANCH) { console.error("Refusing: the database reached is production."); process.exit(1); }
if (!allowLocal && branch !== STAGING_BRANCH) { console.error(`Refusing: the database reached is not staging (branch ${branch}).`); process.exit(1); }
console.log(`database: ${allowLocal && branch !== STAGING_BRANCH ? "NOT STAGING (MEASURE_ALLOW_LOCAL), figures are not a staging bar" : "staging"}`);

const { precons } = await import("../src/db/schema");
const { callModel } = await import("../src/lib/model/client");
const { costMicroUsd, featureWorstCaseMicroUsd } = await import("../src/lib/model/prices");
const { loadUpgradeBase, loadUpgradeFor } = await import("../src/lib/precons/upgrade/load");
const { runUpgrade } = await import("../src/lib/precons/upgrade/engine");
const { buildUpgradePrompt, upgradeReplySchema } = await import("../src/lib/precons/upgrade/prompt");
const { LIVE_DEPS, offered } = await import("../src/lib/precons/upgrade/run");
const { CARD_CAP_CENTS, MIN_SWAPS, UPGRADE_INPUT_CEILING_TOKENS, UPGRADE_MODEL } = await import("../src/lib/precons/upgrade/constants");

const WORST = featureWorstCaseMicroUsd("precon_upgrade", UPGRADE_MODEL) / 1e6;
// The Overview's row is read at the contract the reader's switch picks (`preconOverviewKey`), so the measurement names it: v2 on by default, MEASURE_OVERVIEW_V2=false for the older contract.
const ENV = { NODE_ENV: "production", OVERVIEW_V2_ENABLED: process.env.MEASURE_OVERVIEW_V2 === "false" ? "false" : "true" } as unknown as NodeJS.ProcessEnv;
console.log(`Overview contract read with OVERVIEW_V2_ENABLED=${ENV.OVERVIEW_V2_ENABLED}`);

// Spread across the catalog: every k-th precon by release date, so eras and sets differ.
const all = await db.select({ fileName: precons.fileName, name: precons.name, releaseDate: precons.releaseDate }).from(precons).orderBy(precons.releaseDate, precons.fileName);
const step = Math.max(1, Math.floor(all.length / PRECONS));
const picked = Array.from({ length: Math.min(PRECONS, all.length) }, (_, i) => all[Math.min(i * step, all.length - 1)]);

type Row = {
  precon: string; strategy: string; source: string; backing: number; poolSent: number; promptTokens: number;
  kept: number; drops: Record<string, number>; calls: number; failed: string | null; charge: string; overCap: number;
  buyCents: number; bracketBefore: number | null; bracketAfter: number | null; usd: number;
};
const rows: Row[] = [];
const offeredCounts: number[] = [];
let spent = 0;
let stopped = false;

console.log(`${LIVE ? "LIVE" : "DRY RUN"}: ${picked.length} precons, second strategy on the first ${SECOND}, cap $${MAX_USD.toFixed(2)}, worst case per run $${WORST.toFixed(3)}`);
let planned = 0;
for (const [n, p] of picked.entries()) {
  const base = await loadUpgradeBase(p.fileName, ENV);
  if (!base) { console.log(`- ${p.name}: not loadable (no commander)`); offeredCounts.push(0); continue; }
  const commanders = offered(base);
  const total = commanders.reduce((a, c) => a + c.strategies.length, 0);
  offeredCounts.push(total);
  console.log(`- ${p.name}: ${commanders.length} commander option(s) [${commanders.map((c) => `${c.cards.map((x) => x.name).join(" + ")}${c.isFace ? "" : " (alternate)"}: ${c.strategies.map((s) => `${s.label} (${s.source}, ${s.backing.length})`).join("; ") || "no strategy"}`).join(" | ")}]`);
  // One run per commander option on its first strategy, and a second strategy on the face option for the first few precons.
  const take = commanders.flatMap((c) => c.strategies.slice(0, c.isFace && n < SECOND ? 2 : 1).map((s) => ({ c, s })));
  planned += take.length;
  if (!LIVE) continue;
  for (const { c: lead, s: pick } of take) {
    if (spent + WORST > MAX_USD) { stopped = true; break; }
    const load = await loadUpgradeFor(base, lead.option);
    const bracketBefore = await LIVE_DEPS.bracketOf(load, []);
    const input = {
      deckName: load.deckName, deck: load.deck.prompt, pool: load.pool.prompt,
      strategy: { label: pick.label, blurb: pick.blurb, backingNames: pick.backing.map((b) => b.name) },
      otherThemes: lead.strategies.filter((s) => s.key !== pick.key).map((s) => s.label), bracketBefore,
      commanderSwap: load.formerCommander ? { lead: lead.cards.map((x) => x.name).join(" + "), former: load.formerCommander } : undefined,
    };
    const prompt = buildUpgradePrompt(input);
    let usd = 0;
    const report = await runUpgrade({
      input, deck: load.deck.entries, pool: load.pool.entries,
      callModel: async (req) => {
        // The ceiling `pressUpgrade` applies, here for both prompts: the cap's worst case assumes it.
        if (Math.ceil((req.system.length + req.user.length) / 3) > UPGRADE_INPUT_CEILING_TOKENS) return { ok: false as const, errorClass: "timeout" as const };
        const out = await callModel({ model: UPGRADE_MODEL, system: req.system, user: req.user, maxTokens: req.maxTokens, schema: upgradeReplySchema, deadlineMs: req.deadlineMs });
        if (out.usage) usd += costMicroUsd(UPGRADE_MODEL, out.usage) / 1e6;
        return out;
      },
    });
    spent += usd;
    const drops: Record<string, number> = {};
    for (const d of report.drops) drops[d.rule] = (drops[d.rule] ?? 0) + 1;
    rows.push({
      precon: p.name, strategy: `${lead.isFace ? "" : "ALT "}${pick.label}`, source: pick.source, backing: pick.backingIds.length, poolSent: load.pool.prompt.length,
      promptTokens: Math.ceil((prompt.system.length + prompt.user.length) / 3), kept: report.pairs.length, drops, calls: report.calls, failed: report.failed,
      charge: report.charge.outcome === "spent" ? "spent" : `refunded:${report.charge.why}`, overCap: report.pairs.filter((x) => x.addCents > CARD_CAP_CENTS).length,
      buyCents: report.buyTotalCents, bracketBefore, bracketAfter: await LIVE_DEPS.bracketOf(load, report.pairs), usd,
    });
    console.log(`  ran ${rows.at(-1)!.strategy}: kept ${report.pairs.length}, calls ${report.calls}, ${rows.at(-1)!.charge}, bracket ${bracketBefore} to ${rows.at(-1)!.bracketAfter}, $${usd.toFixed(3)} (total $${spent.toFixed(3)})`);
  }
  if (stopped) break;
}

const hist = (xs: number[]) => Object.entries(xs.reduce<Record<number, number>>((m, x) => ({ ...m, [x]: (m[x] ?? 0) + 1 }), {})).map(([k, v]) => `${k}: ${v}`).join(", ");
console.log(`\nStrategies offered per precon, all commander options (count: precons): ${hist(offeredCounts)}`);
if (!LIVE) {
  console.log(`Planned runs: ${planned}. Estimated cost about $${(planned * 0.053 * 1.3).toFixed(2)} ($0.053 a call measured, with an assumed 30% needing the repair call); worst case (every run at the ceiling, both attempts) $${(planned * WORST).toFixed(2)}; the cap stops the script when spend so far plus one worst-case run would pass $${MAX_USD.toFixed(2)}.`);
  process.exit(0);
}
if (rows.length === 0) { console.log("\nNo runs were made (nothing loadable, or the cap is under one worst-case run)."); process.exit(0); }
const sum = (f: (r: Row) => number) => rows.reduce((a, r) => a + f(r), 0);
const dropTotals: Record<string, number> = {};
for (const r of rows) for (const [k, v] of Object.entries(r.drops)) dropTotals[k] = (dropTotals[k] ?? 0) + v;
console.log(`\nRuns: ${rows.length}${stopped ? " (stopped by the cap)" : ""}. Spend $${spent.toFixed(3)}. Mean cost/run $${(spent / Math.max(1, rows.length)).toFixed(3)}.`);
console.log(`Kept swaps: ${hist(rows.map((r) => r.kept))}. Reached ${MIN_SWAPS}+: ${rows.filter((r) => r.kept >= MIN_SWAPS).length}/${rows.length}. Repair fired: ${rows.filter((r) => r.calls === 2).length}. Failed: ${rows.filter((r) => r.failed && r.kept === 0).length}.`);
console.log(`Charge: ${Object.entries(rows.reduce<Record<string, number>>((m, r) => ({ ...m, [r.charge]: (m[r.charge] ?? 0) + 1 }), {})).map(([k, v]) => `${k} ${v}`).join(", ")}.`);
console.log(`Over the $${(CARD_CAP_CENTS / 100).toFixed(0)} cap (must be 0): ${sum((r) => r.overCap)}. Drops by rule: ${JSON.stringify(dropTotals)}.`);
console.log(`Pool sent: min ${Math.min(...rows.map((r) => r.poolSent))}, mean ${(sum((r) => r.poolSent) / rows.length).toFixed(0)}. Prompt tokens: max ${Math.max(...rows.map((r) => r.promptTokens))}.`);
console.log(`Buy total: mean $${(sum((r) => r.buyCents) / rows.length / 100).toFixed(2)}, max $${(Math.max(...rows.map((r) => r.buyCents)) / 100).toFixed(2)}.`);
console.log(`Bracket after at 3 or higher: ${rows.filter((r) => (r.bracketAfter ?? 0) >= 3).length}/${rows.length}. Bracket before: ${hist(rows.map((r) => r.bracketBefore ?? 0))}. After: ${hist(rows.map((r) => r.bracketAfter ?? 0))}.`);
if (process.env.MEASURE_OUT) (await import("node:fs")).writeFileSync(process.env.MEASURE_OUT, JSON.stringify({ offeredCounts, rows, spent }, null, 1));
process.exit(0);
