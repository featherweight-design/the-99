/**
 * The Find a deck read's eval (brief `docs/superpowers/design-briefs/2026-10-11-find-a-deck-read.md`,
 * lock 9; plan PR A). Runs the read's one call, live, over Hugh's eleven eval cards against STAGING,
 * READ-ONLY, and records what each press cost, how long it took, what it said and what the validator
 * dropped. The write-up is `docs/superpowers/eval/metrics-find-a-deck-read.md`.
 *
 *   pnpm eval:fits-read [--set hugh|niche] [--only "Ajani Unrelenting,Tangle Wire"] [--arms haiku,sonnet,sonnet-warm] [--budget 0.50] [--send]
 *
 * NO SERVER ACTION EXISTS YET, and the one that comes will reserve a credit and write a row; staging
 * is measured, never written (AGENTS.md). So this calls the pieces it will call, in order:
 * `loadFitsReadInputs`, `buildFitsReadPrompt`, `callModel`, `validFitsRead`.
 *
 * ARMS. `haiku` (claude-haiku-5-5) and `sonnet` (claude-sonnet-5-5), both at effort medium on the
 * per-press layout (the rules as the system prompt, the card and the candidates' blocks in the user
 * message), one sample per card. `sonnet-warm` is the cached-decks layout (the rules and EVERY deck
 * as a cacheable system prompt) on three cards back to back: the first writes the cache and the
 * second and third read it, which is what a reader pressing on several cards pays.
 *
 * SPEND. Every call reserves its worst case on the ledger BEFORE it is sent and settles to its
 * measured cost after; the run stops before a call that could cross the $2 cap
 * (`ledger-find-a-deck.jsonl`) or `--budget`. A call's input ceiling is its own request counted on
 * the free token-count endpoint, plus a tenth.
 *
 * Without `--send` it calls no model (dry by default; `--dry-run` says the same): it prints the
 * coverage, each card's candidate count, each arm's counted input tokens per press and the worst case
 * each call would reserve. `--send` makes the paid calls.
 */
import "../lib/env.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { countTokens } from "./lib/batch.mjs";
import { acquireRunLock, readLedger, record, spent } from "./lib/ledger.mjs";
import { buildParams } from "./lib/request.mjs";

const LEDGER = "docs/superpowers/eval/ledger-find-a-deck.jsonl";
const CAP_USD = 2;
const HUGH = "user_3GkZrrTwOJBdqUpq6GambP0BC8w";
/** Hugh's eval cards (brief, "Hugh's eval cards"), by oracle name: "Future Insight" is Future Sight and
 *  "Feral Felix" is Barrowgoyf. */
const CARDS = [
  "Ajani Unrelenting", "Maddening Cacophony", "Maddening Hex", "Mind's Eye", "Molten Collapse", "Throes of Chaos",
  "Time Stretch", "Tangle Wire", "Kwia Vigorbloom", "Future Sight", "Barrowgoyf",
];
/** The brief's eight niche cards (Finding 2: owned, in no deck, few index rows), the rest of lock 9's
 *  corpus. Run with `--set niche`; the default set is Hugh's eleven. */
const NICHE = [
  "Kavaron Skywarden", "Goldfury Strider", "Lavamancer's Skill", "Cephalid Sage", "Daru Stinger", "Cryotheory Adept",
  "Airtight Alibi", "Mind Swords",
];
/** The warm arm's three cards, back to back: the longest lists, where a cached prefix saves most. */
const WARM_CARDS = ["Ajani Unrelenting", "Mind's Eye", "Tangle Wire"];
const DEADLINE_MS = 180_000;

type Layout = import("../../src/lib/swaps/fits-read").FitsReadLayout;
type Arm = { id: string; model: string; effort: "medium"; layout: Layout };
const ARMS: Arm[] = [
  { id: "haiku", model: "claude-haiku-5-5", effort: "medium", layout: "per-press" },
  { id: "sonnet", model: "claude-sonnet-5-5", effort: "medium", layout: "per-press" },
  { id: "sonnet-warm", model: "claude-sonnet-5-5", effort: "medium", layout: "cached-decks" },
];

const { values: args } = parseArgs({ options: {
  only: { type: "string" }, arms: { type: "string" }, set: { type: "string" }, "dry-run": { type: "boolean", default: false }, send: { type: "boolean", default: false },
  // A cap on this run alone, under the ledger's: the run stops before a call that could cross it.
  budget: { type: "string" },
} });
// DRY BY DEFAULT (brief lock 9, as `cuts-model.mts`): only `--send` spends. `--dry-run` is kept as a
// no-op spelling of the default, so an older command still reads as it did.
const dry = !args.send || args["dry-run"];
const budget = args.budget === undefined ? null : Number(args.budget);
// A budget that is not a plain positive number would make every cap check compare against NaN.
if (budget !== null && !(Number.isFinite(budget) && budget > 0)) throw new Error(`--budget must be a positive number of dollars, got ${args.budget}`);
const only = args.only?.split(",").map((s) => s.trim());
const arms = ARMS.filter((a) => !args.arms || args.arms.split(",").includes(a.id));
if (args.arms && arms.length === 0) throw new Error(`--arms names no arm (${ARMS.map((a) => a.id).join(", ")})`);
if (!dry) acquireRunLock(LEDGER);
const runCap = budget === null ? CAP_USD : Math.min(CAP_USD, spent(readLedger(LEDGER)) + budget);

const { connectStaging } = await import("./lib/staging.mjs");
const db = await connectStaging();
const { sql } = await import("drizzle-orm");
const { callModel } = await import("../../src/lib/model/client");
const { costMicroUsd, worstCaseMicroUsd } = await import("../../src/lib/model/prices");
const fr = await import("../../src/lib/swaps/fits-read");
const { loadFitsReadInputs, V2_CONTRACTS } = await import("../../src/lib/swaps/fits-read-load");

// ---- coverage ----------------------------------------------------------------------------------
// Re-measured at the start of every run (Finding 1 moves as Hugh writes Overviews). `V2_CONTRACTS` is
// the code's own pair, so the SQL is checked against it rather than trusted.
const v2 = [...V2_CONTRACTS].sort();
if (v2.join(",") !== "11,12") throw new Error(`the v2 Overview contracts are now ${v2.join(",")}; update the coverage SQL`);
const coverageRows = (await db.execute(sql`
  with newest as (
    select distinct on (deck_id) deck_id, contract_version from deck_synopses
    where user_id = ${HUGH} and status = 'done' and content->'verdicts' @> '[{"status":"ok"}]'
    order by deck_id, created_at desc)
  select case when contract_version in (11, 12) then 'v2' when contract_version is not null then 'older' else 'none' end as plan,
         count(*)::int as decks
  from decks d left join newest n on n.deck_id = d.id where d.user_id = ${HUGH} group by 1 order by 1`)).rows as { plan: string; decks: number }[];
const coverage = Object.fromEntries(coverageRows.map((r) => [r.plan, r.decks]));
console.log(`coverage (newest passing Overview per deck): ${JSON.stringify(coverage)}`);

// ---- cards -------------------------------------------------------------------------------------
if (args.set !== undefined && args.set !== "hugh" && args.set !== "niche") throw new Error(`--set is hugh or niche, got ${args.set}`);
const SET = args.set === "niche" ? NICHE : CARDS;
const wanted = SET.filter((n) => !only || only.includes(n));
if (only) for (const n of only) if (!SET.includes(n)) throw new Error(`--only names a card outside the eval set: ${n}`);
const resolved = (await db.execute(sql`
  select oracle_id, name from cards where name = any(${sql.param(wanted)}::text[])`)).rows as { oracle_id: string; name: string }[];
const idOf = new Map(resolved.map((r) => [r.name, r.oracle_id]));
for (const n of wanted) if (!idOf.has(n)) throw new Error(`card not found on staging by oracle name: ${n}`);

type Loaded = NonNullable<Awaited<ReturnType<typeof loadFitsReadInputs>>>;
const loads = new Map<string, Loaded>();
for (const name of wanted) {
  const l = await loadFitsReadInputs(HUGH, idOf.get(name)!, { allDecks: true });
  if (!l) throw new Error(`loadFits found no card for ${name}`);
  loads.set(name, l);
}

// ---- spend -------------------------------------------------------------------------------------
type Usage = import("../../src/lib/model/client").ModelUsage;
type CallRecord = {
  card: string; arm: string; model: string; layout: Layout; position?: number;
  inputCeiling: number; reservedUsd: number;
  ok: boolean; errorClass?: string; stop: string | null; ms: number; usd: number; usage: Usage | null;
  raw: unknown; picks: unknown[]; drops: Record<string, number>; returned: number; staleOverviewPicks: number;
};

async function countFor(arm: Arm, prompt: ReturnType<typeof fr.buildFitsReadPrompt>): Promise<{ tokens: number; counted: boolean }> {
  const params = buildParams({ model: arm.model, system: prompt.system, user: prompt.user, maxTokens: fr.FITS_READ_MAX_TOKENS, schema: fr.fitsReadSchema }, { effort: arm.effort, cache: false });
  try {
    return { tokens: await countTokens(params), counted: true };
  } catch (err) {
    // The count is free but needs the key; without it, a characters estimate (about 3.5 per token)
    // stands in, and the dry run says so.
    console.warn(`token count failed (${err instanceof Error ? err.message.split("\n")[0] : String(err)}); estimating from characters`);
    return { tokens: Math.ceil((prompt.system.length + prompt.user.length) / 3.5) + 1_000, counted: false };
  }
}

const ceilingOf = (tokens: number) => Math.ceil(tokens * 1.1);
const worstUsd = (arm: Arm, ceiling: number) => worstCaseMicroUsd(arm.model, ceiling, fr.FITS_READ_MAX_TOKENS, { cacheWrite: arm.layout === "cached-decks" }) / 1e6;

/** One call, reserved on the ledger at its worst case first, settled to its measured cost after. */
async function call(label: string, arm: Arm, prompt: ReturnType<typeof fr.buildFitsReadPrompt>, ceiling: number) {
  const worst = worstUsd(arm, ceiling);
  const now = spent(readLedger(LEDGER));
  if (now + worst > runCap) throw new Error(`STOP before ${label}: worst case $${worst.toFixed(3)} would cross the $${runCap.toFixed(2)} cap (spent $${now.toFixed(3)})`);
  const id = `${Date.now()}-${label}`;
  record(LEDGER, { at: new Date().toISOString(), runId: id, source: "pending", usd: worst, requests: 1, pending: id, note: label });
  let stop: string | null = null;
  const t = Date.now();
  const o = await callModel({
    model: arm.model, system: prompt.system, user: prompt.user, cacheSystem: prompt.cacheSystem, maxTokens: fr.FITS_READ_MAX_TOKENS,
    effort: arm.effort, schema: fr.fitsReadSchema, deadlineMs: DEADLINE_MS, stream: true,
    onResponse: (m) => { stop = m.stopReason; },
  });
  const ms = Date.now() - t;
  const usd = o.usage ? costMicroUsd(arm.model, o.usage) / 1e6 : 0;
  record(LEDGER, { at: new Date().toISOString(), runId: `fits-read-${label}`, source: "realtime:1", usd, requests: 1, settles: id, note: label });
  return { o, ms, usd, stop: stop as string | null, worst };
}

// ---- the run -----------------------------------------------------------------------------------
const deckName = (l: Loaded) => new Map<string, string>([
  ...l.fits.fits.map((d) => [d.id, d.name] as const),
  ...l.fits.holds.map((d) => [d.id, d.name] as const),
  ...l.fits.excluded.map((d) => [d.id, d.name] as const),
]);

const calls: CallRecord[] = [];
const cardsOut: Record<string, unknown>[] = [];
const dryRows: Record<string, unknown>[] = [];

for (const name of wanted) {
  const l = loads.get(name)!;
  const names = deckName(l);
  const candidates = l.inputs.candidates.length;
  const free = l.fits.fits.map((d) => ({ deck: d.name, reason: d.reason, need: d.need }));
  const planSources = Object.fromEntries(["v2", "older", "none"].map((s) => [s, l.inputs.candidates.filter((c) => l.planOf.get(c.deckId)?.source === s).length]));
  cardsOut.push({ card: name, oracleId: idOf.get(name), commanderLegal: l.fits.card.commanderLegal, candidates, planSources, free });

  for (const arm of arms) {
    const warmAt = WARM_CARDS.filter((n) => wanted.includes(n)).indexOf(name);
    if (arm.layout === "cached-decks" && warmAt < 0) continue;
    const label = `${arm.id}-${name.replace(/[^A-Za-z]+/g, "-")}`;
    // As the read will: no candidate draws no press, so no call.
    if (candidates === 0) {
      if (dry) dryRows.push({ card: name, arm: arm.id, candidates, note: "no candidates, no call" });
      else console.log(`${label}: no candidates, no call`);
      continue;
    }
    const prompt = fr.buildFitsReadPrompt(l.inputs, arm.layout);
    const { tokens, counted } = await countFor(arm, prompt);
    const ceiling = ceilingOf(tokens);
    const reserve = worstUsd(arm, ceiling);
    if (dry) {
      dryRows.push({
        card: name, arm: arm.id, layout: arm.layout, candidates, planSources,
        inputTokens: tokens, counted, systemChars: prompt.system.length, userChars: prompt.user.length,
        worstCaseUsd: Number(reserve.toFixed(4)),
      });
      continue;
    }
    const r = await call(label, arm, prompt, ceiling);
    let picks: unknown[] = [];
    let drops: Record<string, number> = {};
    let returned = 0;
    let stale = 0;
    if (r.o.ok) {
      const v = fr.validFitsRead({ reply: r.o.value, prompt, inputs: l.inputs });
      returned = r.o.value.picks.length;
      drops = v.drops as Record<string, number>;
      const cardName = new Map<string, string>();
      for (const d of l.inputs.decks) for (const c of [...d.commanders, ...d.list]) cardName.set(c.oracleId, c.name);
      cardName.set(l.inputs.card.oracleId, l.inputs.card.name);
      picks = v.picks.map((p) => {
        const plan = l.planOf.get(p.deckId);
        if ((plan?.staleNames.length ?? 0) > 0) stale += 1;
        return {
          deck: names.get(p.deckId) ?? p.deckId,
          plan: plan?.source ?? "none",
          staleOverview: plan?.staleNames ?? [],
          sentence: p.parts.map((x) => ("card" in x ? `[[${cardName.get(x.card) ?? x.card}]]` : "quote" in x ? `"${x.quote}"` : x.text)).join(""),
          cut: p.cut ? cardName.get(p.cut) ?? p.cut : null,
          cites: p.cites.map((c) => ({ card: cardName.get(c.oracleId) ?? c.oracleId, job: c.job })),
        };
      });
    }
    const rec: CallRecord = {
      card: name, arm: arm.id, model: arm.model, layout: arm.layout, ...(arm.layout === "cached-decks" ? { position: warmAt + 1 } : {}),
      inputCeiling: ceiling, reservedUsd: r.worst,
      ok: r.o.ok, ...(r.o.ok ? {} : { errorClass: r.o.errorClass }), stop: r.stop, ms: r.ms, usd: r.usd, usage: r.o.usage ?? null,
      raw: r.o.ok ? r.o.value : null, picks, drops, returned, staleOverviewPicks: stale,
    };
    calls.push(rec);
    console.log(`${label}: ${r.o.ok ? `${returned} returned, ${picks.length} kept, drops ${JSON.stringify(drops)}` : `failed (${r.o.errorClass})`}, ${r.ms}ms, $${r.usd.toFixed(4)}${r.o.usage ? `, cache read ${r.o.usage.cacheReadTokens} write ${r.o.usage.cacheWriteTokens}` : ""}`);
  }
}

if (dry) {
  console.log("\ncard | arm | layout | candidates | plan sources (v2/older/none) | input tokens per press | worst-case reservation");
  for (const r of dryRows) {
    if (r.note) { console.log(`${r.card} | ${r.arm} | - | ${r.candidates} | - | - | ${r.note}`); continue; }
    const p = r.planSources as Record<string, number>;
    console.log(`${r.card} | ${r.arm} | ${r.layout} | ${r.candidates} | ${p.v2}/${p.older}/${p.none} | ${r.inputTokens}${r.counted ? "" : " (estimated)"} | $${(r.worstCaseUsd as number).toFixed(4)}`);
  }
  const ledgerNow = spent(readLedger(LEDGER));
  console.log(`\nledger spent $${ledgerNow.toFixed(3)} of $${CAP_USD}; the run's cap is $${runCap.toFixed(2)}. Dry run: no model was called.`);
  process.exit(0);
}

const stamp = `${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}-${[...new Set(calls.map((c) => c.arm))].join("+")}`;
mkdirSync("docs/superpowers/eval/answers", { recursive: true });
const file = `docs/superpowers/eval/answers/fits-read-${stamp}.json`;
const staleTotal = calls.reduce((n, c) => n + c.staleOverviewPicks, 0);
const kept = calls.reduce((n, c) => n + c.picks.length, 0);
writeFileSync(file, JSON.stringify({ at: new Date().toISOString(), promptVersion: fr.FITS_READ_PROMPT_VERSION, coverage, cards: cardsOut, calls, staleOverview: { picks: staleTotal, of: kept } }, null, 2));
console.log(`wrote ${file}; stale-Overview picks ${staleTotal} of ${kept}; ledger spent $${spent(readLedger(LEDGER)).toFixed(3)} of $${CAP_USD}`);
process.exit(0);
