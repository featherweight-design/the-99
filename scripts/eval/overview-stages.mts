import "../lib/env.mjs";

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { LEDGER_LIMITS } from "../../src/lib/eval/ledger-limits";

/**
 * The Overview stage-shape test (lane a6; research board "Combined plan" and "Hugh, 2026-10-29").
 * Old against new, to files, for Hugh to read side by side at phone width. NOTHING is written to any
 * database, and nothing in the app changes: the stages prompt is an option only this script passes.
 *
 *   pnpm eval:overview-stages --dry-run [--iteration N] [--only id,id]
 *       Builds every prompt and counts its input tokens (the free counting endpoint, or an estimate
 *       when it cannot be reached), prints each deck's projected and worst-case cost and the totals.
 *       Sends nothing to a model and writes no file.
 *   pnpm eval:overview-stages --iteration N --cap <usd> [--only id,id] [--no-repair] [--ask-approved]
 *       The paid run, REAL-TIME through the app's `callModel` at contract 12's model, effort and
 *       ceiling. N is 1, 2 or 3 (a fourth is refused). Writes under
 *       docs/superpowers/eval/runs/overview-stages-<N>/: per deck old.json, new.json, checks.json;
 *       summary.json; compare.html. A deck whose new.json exists is kept (a run resumes).
 *
 * THE DECKS: 20 precons from staging and Hugh's two production decks (`PRECONS`, `PROD_DECKS`).
 *  - OLD is what ships today, READ, never generated: a precon's stored contract-12 Overview
 *    (`precon_synopses`, labels basis, current); a production deck's stored synopsis at contract 12
 *    for its current list. Only when a production deck has none is old generated with today's prompt
 *    (the shipped contract-8 prompt plus the app's one repair), and that call is counted like any other.
 *  - NEW is the stages variant (`buildSynopsisPrompt(..., { stages })`), first write plus the app's
 *    one repair (`--no-repair` measures the first write alone).
 *
 * DATABASES, READ-ONLY BOTH: staging through `connectStaging` (branch and read-only asserted).
 * Production only through `PROD_READONLY_DATABASE_URL` (the shell's, never a file), in a CHILD
 * process of this script (`--prod-prepare`), because `src/db` holds one pool per process: it asserts
 * `neon.branch_id` is production's and sets and asserts `default_transaction_read_only` before its
 * first query, reads with SELECT only, and hands back facts and the stored synopsis as JSON.
 *
 * THE CAP ($2, `ledger-overview-stages.jsonl`, ask at $1.50; `LEDGER_LIMITS`). Every call is checked
 * BEFORE it is sent against its worst case (a repair is checked on its own before it is sent), recorded pending at
 * that worst case and settled at its metered cost, as `corpus.mts` does: a crash after the API billed
 * still leaves the charge counted. `--cap` is this run's own ceiling, required for a paid run.
 * The ask line holds whatever the plan's progress: at $1.50 spent a call is refused until the run is
 * started with `--ask-approved` (`stagesSendRefusal`). A failed call, or one retried after a failed
 * attempt, settles at its worst case, not its meter (`settleUsd`). Each paid first write reaches disk
 * before its repair is asked for (`old-generated.json`, `new-first.json`), and a resume reads it back.
 */

/** 20 precons, spread across colors, archetypes and years (staging holds a contract-12 Overview for each). */
export const PRECONS: readonly { file: string; why: string }[] = [
  { file: "Counterpunch_CMD", why: "2011, Abzan (BGW), Ghave: tokens and +1/+1 counters, the oldest product line" },
  { file: "PeerThroughTime_C14", why: "2014, mono-blue, Teferi: planeswalker commander, control and extra-turn value" },
  { file: "SwornToDarkness_C14", why: "2014, mono-black, Ob Nixilis: aristocrats and drain, a planeswalker commander" },
  { file: "ForgedInStone_C14", why: "2014, mono-white, Nahiri: equipment voltron" },
  { file: "BuiltFromScratch_C14", why: "2014, mono-red, Daretti: artifact recursion" },
  { file: "PlunderTheGraves_C15", why: "2015, Golgari, Meren: graveyard recursion and sacrifice" },
  { file: "BreedLethality_C16", why: "2016, four-color (BGUW), Atraxa: counters and proliferate; three foil alternates" },
  { file: "DraconicDomination_C17", why: "2017, five-color, The Ur-Dragon: dragon tribal, big mana; two foil alternates" },
  { file: "VampiricBloodlust_C17", why: "2017, Mardu (BRW), Edgar Markov: vampire tribal go-wide" },
  { file: "MercilessRage_C19", why: "2019, Rakdos, Anje Falkenrath: madness and discard" },
  { file: "ElvenEmpire_KHC", why: "2021, Golgari, Lathril: elf tribal tokens and drain" },
  { file: "QuantumQuandrix_C21", why: "2021, Simic, Adrix and Nev: token doubling, fractal +1/+1 counters" },
  { file: "BuckleUp_NEC", why: "2022, Azorius, Kotori: vehicles and crew" },
  { file: "NecronDynasties_40K", why: "2022, mono-black, Szarekh: artifact creatures and reanimation, a Universes Beyond box" },
  { file: "FoodAndFellowship_LTC", why: "2023, two partner-style commanders (Frodo and Sam), food and life gain" },
  { file: "EldraziUnbound_CMM", why: "2023, colorless, Zhulodok: Eldrazi cascade and big mana" },
  { file: "VelociRampTor_LCC", why: "2023, Naya, Pantlaza: dinosaurs, discover, ramp; one foil alternate" },
  { file: "Science_PIP", why: "2024, Jeskai, Dr. Madison Li: energy and artifacts" },
  { file: "GraveyardOverdrive_M3C", why: "2024, Jund, Disa the Restless: self-mill, Lhurgoyfs" },
  { file: "TramplesaurusRex_FDC", why: "2026, mono-green, Ghalta: stompy big creatures, the newest box" },
];

/** Hugh's two production decks (Hugh, 2026-10-29). */
export const PROD_DECKS: readonly { id: string; label: string }[] = [
  { id: "13a6dc28-958c-4591-a2bb-c0297bbe5d92", label: "HD - Gods" },
  { id: "f7380a97-3f58-41a1-8d4e-7342ec01b054", label: "HD - Brago" },
];
const PROD_OWNER = "user_3Gk6tVMnkoDadNXbKXju8LVXeaO";
/** Production's Neon branch (`docs/agents/ops.md`): the read-only URL must reach this branch and no other. */
export const PROD_BRANCH_ID = "br-noisy-violet-a6vw4ess";

/** Contract 12: what precons and production write today, and the contract old is read at. */
const CONTRACT = 12;
/** The role basis the stored precon Overviews were built at (`precon_synopses.role_basis`, all 182 rows on 2026-10-29). */
const BASIS = "labels" as const;

const LEDGER_FILE = "ledger-overview-stages.jsonl";
const LIMITS = LEDGER_LIMITS[LEDGER_FILE];
const EVAL = new URL("../../docs/superpowers/eval/", import.meta.url);
const LEDGER = fileURLToPath(new URL(LEDGER_FILE, EVAL));

const { values: args } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    iteration: { type: "string" },
    only: { type: "string" },
    cap: { type: "string" },
    "no-repair": { type: "boolean", default: false },
    "ask-approved": { type: "boolean", default: false },
    "prod-prepare": { type: "string" },
    "prod-ids": { type: "string" },
  },
});

type Facts = import("../../src/lib/synopsis/facts").SynopsisFacts;
type Checked = import("../../src/lib/synopsis/types").CheckedSynopsis;
type ProdPrepared = {
  id: string; label: string; name: string | null; missing?: string;
  facts?: Facts; shared?: boolean; list?: string;
  stored: { content: Checked; contractVersion: number; createdAt: string; model: string } | null;
  storedNote: string;
};

// ---------------------------------------------------------------------------------------------
// The production child: read-only, SELECT only, one JSON file out.

async function connectProductionReadOnly() {
  const url = process.env.PROD_READONLY_DATABASE_URL;
  if (!url) throw new Error("overview-stages: PROD_READONLY_DATABASE_URL is not set");
  // After `env.mjs` loaded `.env` (which names local-dev), and before `src/db` is imported.
  process.env.DATABASE_URL = url;
  const { db } = await import("../../src/db/index");
  const pool = db.$client as unknown as { on(event: "connect", fn: (client: { query(sql: string): Promise<unknown> }) => void): void };
  pool.on("connect", (client) => {
    client.query("set default_transaction_read_only = on").catch((err: unknown) => {
      console.error(`overview-stages: could not make a production connection read-only (${err instanceof Error ? err.message : String(err)}); stopping`);
      process.exit(1);
    });
  });
  const { sql } = await import("drizzle-orm");
  const [row] = (await db.execute(sql`select current_setting('neon.branch_id', true) as branch, current_setting('default_transaction_read_only') as ro`)).rows as { branch: string | null; ro: string }[];
  if (row?.branch !== PROD_BRANCH_ID) throw new Error(`overview-stages: the read-only URL reached branch ${row?.branch ?? "unknown"}, not production (${PROD_BRANCH_ID}); refusing`);
  if (row.ro !== "on") throw new Error("overview-stages: the production connection is not read-only; refusing");
  return db;
}

if (args["prod-prepare"]) {
  const out = args["prod-prepare"];
  const ids = new Set((args["prod-ids"] ?? "").split(",").filter(Boolean));
  const db = await connectProductionReadOnly();
  const { sql } = await import("drizzle-orm");
  const { loadProfileHead, loadDeckProfileFromHead } = await import("../../src/lib/profile/load");
  const { listFingerprint } = await import("../../src/lib/profile/fingerprint");
  const { factsWithSource } = await import("../../src/lib/synopsis/generate");
  const { envAtBasis } = await import("../lib/precon-overview-request");
  const prepared: ProdPrepared[] = [];
  for (const d of PROD_DECKS.filter((x) => ids.has(x.id))) {
    const name = ((await db.execute(sql`select name from decks where id = ${d.id} and user_id = ${PROD_OWNER}`)).rows[0] as { name: string } | undefined)?.name ?? null;
    const head = await loadProfileHead(d.id, PROD_OWNER);
    if (!head) { prepared.push({ id: d.id, label: d.label, name, missing: "no such deck for this owner", stored: null, storedNote: "" }); continue; }
    const list = listFingerprint(head);
    const profile = await loadDeckProfileFromHead(head, envAtBasis(process.env, BASIS));
    const built = await factsWithSource(profile, true, true);
    const rows = (await db.execute(sql`
      select content, contract_version, created_at, model, fingerprint = ${list} as same_list
      from deck_synopses
      where deck_id = ${d.id} and user_id = ${PROD_OWNER} and status = 'done' and content is not null
      order by created_at desc limit 20`)).rows as { content: Checked; contract_version: number; created_at: string; model: string; same_list: boolean }[];
    const hit = rows.find((r) => r.contract_version === CONTRACT && r.same_list);
    const newest = rows[0];
    const storedNote = hit
      ? `stored contract-${CONTRACT} synopsis for the current list, written ${String(hit.created_at)}`
      : newest
        ? `no contract-${CONTRACT} synopsis for the current list (newest is contract ${newest.contract_version}, ${newest.same_list ? "same" : "another"} list): old is generated with today's prompt`
        : "no stored synopsis: old is generated with today's prompt";
    prepared.push({
      id: d.id, label: d.label, name, facts: built.facts, shared: built.shared, list,
      stored: hit ? { content: hit.content, contractVersion: hit.contract_version, createdAt: String(hit.created_at), model: hit.model } : null,
      storedNote,
    });
  }
  writeFileSync(out, JSON.stringify(prepared));
  process.exit(0);
}

// ---------------------------------------------------------------------------------------------
// The run.

const dryRun = args["dry-run"];
const iteration = args.iteration === undefined ? 1 : Number(args.iteration);
if (!Number.isInteger(iteration) || iteration < 1) throw new Error(`overview-stages: --iteration must be 1, 2 or 3 (got ${args.iteration})`);
if (iteration > 3) throw new Error(`overview-stages: iteration ${iteration} refused; the test plan allows at most 3`);
const cap = args.cap === undefined ? null : Number(args.cap);
if (!dryRun && (cap === null || !Number.isFinite(cap) || cap <= 0)) throw new Error("overview-stages: a paid run needs --cap <usd> (this run's own ceiling, under the ledger's $2)");
const repairOn = !args["no-repair"];
// The orchestrator answered the ask line for this run: only the hard cap still stops a call.
const askApproved = args["ask-approved"];
const only = args.only ? new Set(args.only.split(",").map((s) => s.trim()).filter(Boolean)) : null;
const precons = PRECONS.filter((p) => !only || only.has(p.file));
let prodDecks = PROD_DECKS.filter((d) => !only || only.has(d.id));
const notes: string[] = [];
if (prodDecks.length > 0 && !process.env.PROD_READONLY_DATABASE_URL) {
  if (!dryRun) throw new Error("overview-stages: PROD_READONLY_DATABASE_URL is not set; pass it in the shell, or --only the precons");
  notes.push(`PROD_READONLY_DATABASE_URL is not set: the dry run covers the ${precons.length} precons only (${prodDecks.map((d) => d.label).join(", ")} left out)`);
  prodDecks = [];
}

const { acquireRunLock, readLedger, record, spent } = await import("./lib/ledger.mjs");
const { isFailedAttemptLine, settleUsd, stagesSendRefusal } = await import("./lib/overview-stages-guard.mjs");
if (!dryRun) acquireRunLock(LEDGER);

// The production child runs FIRST and alone: it is the only process that ever holds the production URL as DATABASE_URL.
let prodPrepared: ProdPrepared[] = [];
if (prodDecks.length > 0) {
  const dir = mkdtempSync(join(tmpdir(), "overview-stages-"));
  const file = join(dir, "prod.json");
  try {
    const tsx = fileURLToPath(new URL("../../node_modules/.bin/tsx", import.meta.url));
    const r = spawnSync(tsx, [fileURLToPath(import.meta.url), "--prod-prepare", file, "--prod-ids", prodDecks.map((d) => d.id).join(",")], { stdio: ["ignore", "inherit", "inherit"], env: process.env });
    if (r.status !== 0) throw new Error(`overview-stages: the production read failed (exit ${r.status})`);
    prodPrepared = JSON.parse(readFileSync(file, "utf8")) as ProdPrepared[];
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const { connectStaging } = await import("./lib/staging.mjs");
const db = await connectStaging();
const { sql } = await import("drizzle-orm");
const { buildPreconRequest } = await import("../lib/precon-overview-request");
const { buildSynopsisPrompt } = await import("../../src/lib/synopsis/prompt");
const { checkReply, refusedSections, repairPrompt, applyRepair, synopsisCallSettings } = await import("../../src/lib/synopsis/generate");
const { synopsisResponseSchemaV8Wire } = await import("../../src/lib/synopsis/response-schema");
const { SYNOPSIS_DEADLINE_MS, SYNOPSIS_REPAIR_MIN_MS } = await import("../../src/lib/synopsis/limits");
const stages = await import("../../src/lib/synopsis/stages");
const { mtgjsonDeckUrl, MTGJSON_HEADERS } = await import("../../src/lib/precons/feed");
const { costUsd, rates, worstCaseUsd } = await import("./lib/pricing.mjs");
const { buildParams } = await import("./lib/request.mjs");
const { countTokens } = await import("./lib/batch.mjs");
const { compareHtml } = await import("./lib/overview-stages-html.mjs");

const call = synopsisCallSettings(true);

type Item = {
  id: string; name: string; kind: "precon" | "player deck"; facts: Facts; alternates: string[];
  old: { content: Checked; source: string } | null;
  note: string;
};

const items: Item[] = [];
for (const p of precons) {
  const req = await buildPreconRequest(p.file, BASIS);
  if (!req.ok) { console.log(`${p.file}: SKIPPED, no request (${req.why})`); continue; }
  const row = (await db.execute(sql`
    select content, input_hash, list_fingerprint, created_at from precon_synopses
    where precon_file = ${p.file} and contract_version = ${CONTRACT} and role_basis = ${BASIS} and current`)).rows[0] as { content: Checked; input_hash: string; list_fingerprint: string; created_at: string } | undefined;
  const name = ((await db.execute(sql`select name from precons where file_name = ${p.file}`)).rows[0] as { name: string } | undefined)?.name ?? p.file;
  let alternates: string[] = [];
  let altNote = "";
  try {
    const res = await fetch(mtgjsonDeckUrl(p.file), { headers: MTGJSON_HEADERS, signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`${res.status}`);
    alternates = stages.alternateCommanders(await res.json() as never);
  } catch (e) {
    altNote = `; the MTGJSON file could not be read (${e instanceof Error ? e.message : String(e)}), so no alternate`;
  }
  const same = row ? (row.input_hash === req.hash ? "the stored row's request hash matches today's" : "the stored row was written from a different request than today's rebuild") : "";
  items.push({
    id: p.file, name, kind: "precon", facts: req.facts, alternates,
    old: row ? { content: row.content, source: `stored contract-${CONTRACT} precon Overview (staging, ${String(row.created_at).slice(0, 10)}); ${same}` } : null,
    note: `${p.why}${alternates.length ? `; alternates: ${alternates.join(", ")}` : ""}${altNote}${row ? "" : "; NO stored Overview"}`,
  });
}
for (const d of prodPrepared) {
  if (!d.facts) { console.log(`${d.label}: SKIPPED (${d.missing})`); continue; }
  if (!d.shared) notes.push(`${d.label}: the label read failed, so its facts carry the classifier's interaction figures, not contract 12's`);
  items.push({
    id: d.id, name: d.name ?? d.label, kind: "player deck", facts: d.facts, alternates: [],
    old: d.stored ? { content: d.stored.content, source: `stored contract-${d.stored.contractVersion} synopsis (production, ${d.stored.createdAt.slice(0, 10)})` } : null,
    note: d.storedNote,
  });
}

// ---------------------------------------------------------------------------------------------
// Prompts and the projection.

/** The stages option for a deck: its alternates, and today's rendered length as the whole budget when old is known. */
const stagesOpt = (it: Item, oldContent: Checked | null = it.old?.content ?? null) =>
  ({ alternates: it.alternates, ...(oldContent ? { maxChars: stages.renderedTotal(stages.docFromChecked(oldContent)) } : {}) });
const newPrompt = (it: Item, oldContent?: Checked | null) => buildSynopsisPrompt(it.facts, undefined, { v2: true, contract8: true, stages: stagesOpt(it, oldContent) });
const oldPrompt = (it: Item) => buildSynopsisPrompt(it.facts, undefined, { v2: true, contract8: true });
const paramsOf = (p: { system: string; user: string }, schema: unknown) =>
  buildParams({ model: call.model, system: p.system, user: p.user, maxTokens: call.maxTokens, schema: schema as never }, { effort: call.effort });

let counting: "counted" | "estimated" = "counted";
async function inputTokens(p: { system: string; user: string }, schema: unknown): Promise<number> {
  if (counting === "counted") {
    try {
      return await countTokens(paramsOf(p, schema));
    } catch (e) {
      counting = "estimated";
      notes.push(`input tokens ESTIMATED at characters / 3: the free counting endpoint failed (${e instanceof Error ? e.message.split("\n")[0] : String(e)})`);
    }
  }
  return Math.ceil((p.system.length + p.user.length) / 3);
}

// The answer's expected size: the median output of the stored contract-12 precon Overviews on staging
// (thinking included), the nearest measured figure for a reply of this length at this model and effort.
const med = (await db.execute(sql`select percentile_cont(0.5) within group (order by output_tokens)::int as out from precon_synopses where contract_version = ${CONTRACT} and output_tokens is not null`)).rows[0] as { out: number | null } | undefined;
const expectedOut = med?.out ?? 2_000;
const r = rates(call.model);
const projected = (inTok: number) => (inTok * r.input + expectedOut * r.output) / 1_000_000;
/** A repair resends the prompt with the kept sections and reasons: about 3,000 tokens more. */
const REPAIR_EXTRA_INPUT = 3_000;
const worstOf = (inTok: number) => worstCaseUsd(call.model, inTok, call.maxTokens, { batch: false })
  + (repairOn ? worstCaseUsd(call.model, inTok + REPAIR_EXTRA_INPUT, call.maxTokens, { batch: false }) : 0);

type Plan = { it: Item; newIn: number; oldIn: number | null; projected: number; worst: number };
const plans: Plan[] = [];
for (const it of items) {
  const newIn = await inputTokens(newPrompt(it), stages.stagesResponseSchemaWire);
  const oldIn = it.old ? null : await inputTokens(oldPrompt(it), synopsisResponseSchemaV8Wire);
  plans.push({
    it, newIn, oldIn,
    projected: projected(newIn) + (oldIn === null ? 0 : projected(oldIn)),
    worst: worstOf(newIn) + (oldIn === null ? 0 : worstOf(oldIn)),
  });
}

const ledgerNow = spent(readLedger(LEDGER));
console.log(`arm: ${JSON.stringify({ ...call, deadlineMs: SYNOPSIS_DEADLINE_MS, repair: repairOn })}; iteration ${iteration}; input tokens ${counting}; expected output ${expectedOut} tokens a call (median stored contract-${CONTRACT} precon Overview)`);
for (const p of plans) {
  console.log(`${p.it.kind === "precon" ? p.it.id : `${p.it.name} (${p.it.id})`}: new ${p.newIn} in${p.oldIn !== null ? `, old generated ${p.oldIn} in` : ""}; projected $${p.projected.toFixed(4)}, worst $${p.worst.toFixed(4)}${p.it.alternates.length ? `; alternates ${p.it.alternates.join(", ")}` : ""}${p.it.old ? "" : `; old: ${p.it.note}`}`);
}
const totalProjected = plans.reduce((n, p) => n + p.projected, 0);
const totalWorst = plans.reduce((n, p) => n + p.worst, 0);
const calls = plans.reduce((n, p) => n + 1 + (p.oldIn === null ? 0 : 1), 0);
console.log(`TOTAL ${plans.length} decks, ${calls} first writes${repairOn ? " (each may add one repair)" : ""}: projected $${totalProjected.toFixed(4)} (no repairs), worst case $${totalWorst.toFixed(4)} (every call at its ceiling, retried once, and repaired). Ledger ${LEDGER_FILE}: $${ledgerNow.toFixed(4)} spent of the $${LIMITS.hardCapUsd} cap (ask at $${LIMITS.askAtUsd}).`);
console.log(`The cap is held per call: a call is refused before it is sent when its worst case plus the ledger's spend would cross $${LIMITS.hardCapUsd}, or plus this run's spend would cross --cap.`);
const storedPrecons = items.filter((it) => it.kind === "precon" && it.old);
console.log(`Old precon Overviews: ${storedPrecons.length} stored of ${items.filter((it) => it.kind === "precon").length}; the stored row's request hash matches today's rebuild for ${storedPrecons.filter((it) => it.old!.source.includes("matches")).length}.`);
for (const n of notes) console.log(`NOTE: ${n}`);
if (dryRun) process.exit(0);

// ---------------------------------------------------------------------------------------------
// The paid run.

const { callModel } = await import("../../src/lib/model/client");
const outDir = new URL(`runs/overview-stages-${iteration}/`, EVAL);
mkdirSync(outDir, { recursive: true });
let runSpend = 0;
let stopped: string | null = null;

const landLine = (f: Facts) => `Keep ${f.keep.low} to ${f.keep.high} lands; send back ${f.sendBack.none} to ${f.sendBack.under}, or ${f.sendBack.over} or more. (The app's fixed line, the same on both sides.)`;
const refusedOf = (c: Checked | null) => (c?.verdicts ?? []).flatMap((v) => (v.status === "refused" ? [{ section: v.section, reason: v.reason }] : []));
const deckDir = (id: string) => new URL(`${id}/`, outDir);
const readJson = <T,>(u: URL): T | null => (existsSync(u) ? JSON.parse(readFileSync(u, "utf8")) as T : null);

async function ask<T>(it: Item, what: string, p: { system: string; user: string }, schema: unknown, deadlineMs: number, reserve: number, done: number) {
  const inTok = Math.ceil((p.system.length + p.user.length) / 3);
  const worst = worstCaseUsd(call.model, inTok, call.maxTokens, { batch: false });
  // The ask line holds whatever the plan's progress (`stagesSendRefusal`); `done` is kept for the log.
  void done;
  const stop = stagesSendRefusal({ ledger: readLedger(LEDGER), worstUsd: worst * reserve, limits: LIMITS, askApproved, runSpendUsd: runSpend, capUsd: cap! });
  if (stop) { stopped = `before ${it.id} ${what}: ${stop}`; console.log(`STOP ${stopped}`); return null; }
  const pendingId = `${Date.now()}-${it.id}-${what}`;
  record(LEDGER, { at: new Date().toISOString(), runId: pendingId, source: "pending", usd: worst, requests: 1, pending: pendingId, note: `overview-stages i${iteration} ${it.id} ${what}` });
  const stops: { stopReason: string | null; outputTokens: number }[] = [];
  let failedAttempts = 0;
  const out = await callModel<T>({
    model: call.model, system: p.system, user: p.user, maxTokens: call.maxTokens, effort: call.effort, deadlineMs, stream: call.stream,
    schema: schema as never, onResponse: (m: { stopReason: string | null; outputTokens: number }) => { stops.push(m); },
  }, { log: (line) => { if (isFailedAttemptLine(line)) failedAttempts++; console.error(line); } });
  const u = out.usage;
  const metered = u ? costUsd(call.model, { input_tokens: u.inputTokens, output_tokens: u.outputTokens, cache_read_input_tokens: u.cacheReadTokens, cache_creation_input_tokens: u.cacheWriteTokens }, { batch: false }) : null;
  // A failed call, or one retried after a failed attempt, may be billed past its meter: settle at the reservation.
  const usd = settleUsd({ ok: out.ok, failedAttempts, meteredUsd: metered, worstUsd: worst });
  runSpend += usd;
  record(LEDGER, { at: new Date().toISOString(), runId: `overview-stages-i${iteration}-${it.id}-${what}`, source: "realtime:1", usd, requests: 1, settles: pendingId, note: `overview-stages i${iteration} ${it.id} ${what}` });
  console.log(`${it.id} ${what}: ok=${out.ok} $${usd.toFixed(4)} (run $${runSpend.toFixed(4)}, ledger $${spent(readLedger(LEDGER)).toFixed(4)})`);
  return { out, usd, usage: u, stops };
}

type StagesReply = import("../../src/lib/synopsis/stages").StagesReply;
type V8Wire = import("../../src/lib/synopsis/response-schema").SynopsisReplyV8Wire;

for (const [i, p] of plans.entries()) {
  if (stopped) break;
  const it = p.it;
  const dir = deckDir(it.id);
  mkdirSync(dir, { recursive: true });
  if (existsSync(new URL("new.json", dir))) { console.log(`${it.id}: new.json exists, kept`); continue; }

  // OLD: read, or (a production deck with none stored) generated with today's prompt and repair.
  let old = readJson<{ content: Checked | null; source: string }>(new URL("old.json", dir));
  if (!old) {
    if (it.old) {
      old = { content: it.old.content, source: it.old.source };
    } else {
      // The paid first write reaches disk BEFORE any repair is asked for, so a refused or failed repair
      // (or a crash) never loses it: a resume reads it back instead of paying for it again.
      const genFile = new URL("old-generated.json", dir);
      type OldGen = { reply: V8Wire | null; failed: string | null; content: Checked | null; usd: number; stops: unknown; latencyMs: number; repairUsd?: number };
      let gen = readJson<OldGen>(genFile);
      if (!gen) {
        const started = Date.now();
        const first = await ask<V8Wire>(it, "old-write", oldPrompt(it), synopsisResponseSchemaV8Wire, SYNOPSIS_DEADLINE_MS, 1, i);
        if (!first) break;
        gen = {
          reply: first.out.ok ? first.out.value : null, failed: first.out.ok ? null : first.out.errorClass,
          content: first.out.ok ? await checkReply(first.out.value, it.facts, true) : null,
          usd: first.usd, stops: first.stops, latencyMs: Date.now() - started,
        };
        writeFileSync(genFile, `${JSON.stringify(gen, null, 2)}\n`);
      } else console.log(`${it.id}: old first write read back from old-generated.json`);
      let content = gen.content;
      if (gen.reply && content) {
        const failing = refusedSections(content);
        const left = SYNOPSIS_DEADLINE_MS - gen.latencyMs;
        if (repairOn && failing.length > 0 && left >= SYNOPSIS_REPAIR_MIN_MS) {
          const rep = await ask<V8Wire>(it, "old-repair", repairPrompt(it.facts, content, failing, true, gen.reply), synopsisResponseSchemaV8Wire, left, 1, i);
          if (!rep) break;
          content = await applyRepair(content, rep.out, failing, it.facts, true);
          writeFileSync(genFile, `${JSON.stringify({ ...gen, repairUsd: rep.usd, repairReply: rep.out.ok ? rep.out.value : null, repaired: content }, null, 2)}\n`);
        }
      }
      old = { content, source: `generated with today's prompt (contract ${CONTRACT}, first write${repairOn ? " plus the app's repair" : ""}) because ${it.note}` };
    }
    writeFileSync(new URL("old.json", dir), `${JSON.stringify({ id: it.id, name: it.name, kind: it.kind, commanders: it.facts.commanders, landLine: landLine(it.facts), note: it.note, ...old, shown: old.content ? stages.docFromChecked(old.content) : null }, null, 2)}\n`);
  }

  // NEW: the stages variant, first write plus the app's one repair.
  // The paid first write and its checked content reach disk (new-first.json) BEFORE the repair is
  // asked for; a resume reads them back rather than paying for the write again.
  const firstFile = new URL("new-first.json", dir);
  type NewFirst = { reply: StagesReply; firstChecked: Checked; usd: number; usage: unknown; stops: unknown; latencyMs: number };
  let saved = readJson<NewFirst>(firstFile);
  if (!saved) {
    const started = Date.now();
    const first = await ask<StagesReply>(it, "new-write", newPrompt(it, old.content), stages.stagesResponseSchemaWire, SYNOPSIS_DEADLINE_MS, 1, i);
    if (!first) break;
    if (!first.out.ok) {
      writeFileSync(new URL("new.json", dir), `${JSON.stringify({ id: it.id, failed: first.out.errorClass, usd: first.usd, usage: first.usage, stops: first.stops, alternates: it.alternates }, null, 2)}\n`);
      writeFileSync(new URL("checks.json", dir), `${JSON.stringify({ id: it.id, checks: null, validatorPass: false, failed: first.out.errorClass }, null, 2)}\n`);
      continue;
    }
    saved = { reply: first.out.value, firstChecked: await checkReply(first.out.value, it.facts, true), usd: first.usd, usage: first.usage, stops: first.stops, latencyMs: Date.now() - started };
    writeFileSync(firstFile, `${JSON.stringify(saved, null, 2)}\n`);
  } else console.log(`${it.id}: new first write read back from new-first.json`);
  const reply = saved.reply;
  const firstChecked = saved.firstChecked;
  let content = firstChecked;
  let repairReply: StagesReply | null = null;
  let repairUsd: number | undefined;
  const failing = refusedSections(firstChecked);
  const left = SYNOPSIS_DEADLINE_MS - saved.latencyMs;
  if (repairOn && failing.length > 0 && left >= SYNOPSIS_REPAIR_MIN_MS) {
    const repPrompt = buildSynopsisPrompt(it.facts, { keep: firstChecked, refused: failing, first: reply }, { v2: true, contract8: true, stages: stagesOpt(it, old.content) });
    const rep = await ask<StagesReply>(it, "new-repair", repPrompt, stages.stagesResponseSchemaWire, left, 1, i);
    if (!rep) break;
    repairUsd = rep.usd;
    if (rep.out.ok) repairReply = rep.out.value;
    content = await applyRepair(firstChecked, rep.out, failing, it.facts, true);
  }
  const effective = stages.mergeStagesReply(reply, repairReply, failing);
  const shownNew = stages.docShownNew(content, effective);
  const oldDoc = old.content ? stages.docFromChecked(old.content) : stages.docFromChecked({ verdicts: [], overview: null, primer: null, keyCards: null, weaknesses: null, cards: {} });
  const checks = stages.stagesChecks({ reply: effective, shownNew, oldDoc, facts: it.facts, alternates: it.alternates });
  const validatorPass = content.verdicts.every((v) => v.status === "ok");
  writeFileSync(new URL("new.json", dir), `${JSON.stringify({
    id: it.id, arm: call, repair: repairOn, alternates: it.alternates, castTurn: it.facts.stats?.commanderCastTurn ?? null,
    usd: saved.usd, repairUsd, usage: saved.usage, stops: saved.stops, latencyMs: saved.latencyMs,
    firstVerdicts: firstChecked.verdicts, content, reply, repairReply, shown: shownNew,
  }, null, 2)}\n`);
  writeFileSync(new URL("checks.json", dir), `${JSON.stringify({ id: it.id, validatorPass, verdicts: content.verdicts, checks }, null, 2)}\n`);
}

// ---------------------------------------------------------------------------------------------
// Summary and the side-by-side page, from every deck's files on disk (a resumed run included).

type CheckFile = { id: string; validatorPass: boolean; checks: import("../../src/lib/synopsis/stages").StagesChecks | null; failed?: string };
const decks = plans.map((p) => {
  const dir = deckDir(p.it.id);
  return {
    p,
    old: readJson<{ content: Checked | null; source: string; shown: import("../../src/lib/synopsis/stages").OverviewDoc | null }>(new URL("old.json", dir)),
    neu: readJson<{ content?: Checked; shown?: import("../../src/lib/synopsis/stages").OverviewDoc; failed?: string; usd?: number; repairUsd?: number }>(new URL("new.json", dir)),
    chk: readJson<CheckFile>(new URL("checks.json", dir)),
  };
}).filter((d) => d.neu);
const tally = (f: (c: NonNullable<CheckFile["checks"]>) => boolean) => decks.filter((d) => d.chk?.checks && f(d.chk.checks)).length;
const summary = {
  headline: { basis: "commander exempt from the repetition rule", allPass: 0, explainedOnce: 0 },
  iteration, decks: decks.length, of: plans.length, stopped, runSpendUsd: runSpend, ledgerUsd: spent(readLedger(LEDGER)),
  answered: decks.filter((d) => d.chk?.checks).length,
  validatorPass: decks.filter((d) => d.chk?.validatorPass).length,
  cardsInList: tally((c) => c.cardsInList.pass),
  turnNumbers: tally((c) => c.turnNumbers.pass),
  explainedOnce: tally((c) => c.explainedOnce.pass),
  explainedOnceExceptCommanders: tally((c) => c.explainedOnce.passExceptCommanders),
  stageFit: tally((c) => c.stageFit.pass),
  stagesNameCards: tally((c) => c.stagesNameCards.pass),
  lengthNotLonger: tally((c) => c.length.pass),
  shape: tally((c) => c.shape.pass),
  allPass: tally((c) => c.cardsInList.pass && c.turnNumbers.pass && c.explainedOnce.pass && c.stageFit.pass && c.stagesNameCards.pass && c.length.pass && c.shape.pass),
  allPassExceptCommanderRepeats: tally((c) => c.cardsInList.pass && c.turnNumbers.pass && c.explainedOnce.passExceptCommanders && c.stageFit.pass && c.stagesNameCards.pass && c.length.pass && c.shape.pass),
  perDeck: decks.map((d) => ({ id: d.p.it.id, name: d.p.it.name, validatorPass: d.chk?.validatorPass ?? false, failed: d.neu?.failed ?? null, usd: (d.neu?.usd ?? 0) + (d.neu?.repairUsd ?? 0), length: d.chk?.checks?.length ?? null })),
  notes,
};
summary.headline = { basis: "commander exempt from the repetition rule", allPass: summary.allPassExceptCommanderRepeats, explainedOnce: summary.explainedOnceExceptCommanders };
writeFileSync(new URL("summary.json", outDir), `${JSON.stringify(summary, null, 2)}\n`);
const n = summary.answered;
const lines = [
  `HEADLINE (commander exempt from the repetition rule): every auto-pass check on ${summary.allPassExceptCommanderRepeats} of ${n}; no non-commander card explained twice on ${summary.explainedOnceExceptCommanders} of ${n}.`,
  `Iteration ${iteration}: ${decks.length} of ${plans.length} decks${stopped ? ` (stopped ${stopped})` : ""}; this run $${runSpend.toFixed(4)}, ledger $${summary.ledgerUsd.toFixed(4)} of $${LIMITS.hardCapUsd}.`,
  `Contract-8 validator, every section shown: ${summary.validatorPass} of ${n}.`,
  `Cards all in the list: ${summary.cardsInList} of ${n}. No stray turn numbers: ${summary.turnNumbers} of ${n}. Every stage names a deck card: ${summary.stagesNameCards} of ${n}. Early cards fit: ${summary.stageFit} of ${n}.`,
  `No card explained twice, commander included (strict): ${summary.explainedOnce} of ${n}. Not longer than today: ${summary.lengthNotLonger} of ${n}. Shape: ${summary.shape} of ${n}.`,
  `Every auto-pass check, commander included (strict): ${summary.allPass} of ${n}.`,
  ...notes,
];
const page = compareHtml(`Overview: today against stages, iteration ${iteration}`, decks.map((d) => ({
  id: d.p.it.id, name: d.p.it.name, commanders: d.p.it.facts.commanders, kind: d.p.it.kind, landLine: landLine(d.p.it.facts), note: d.p.it.note,
  old: { doc: d.old?.shown ?? null, refused: refusedOf(d.old?.content ?? null), source: d.old?.source ?? "no old" },
  new: { doc: d.neu?.shown ?? null, refused: refusedOf(d.neu?.content ?? null), source: d.neu?.failed ? `the call failed: ${d.neu.failed}` : `stages variant, contract-8 reply plus alternate${repairOn ? ", with the app's repair" : ""}` },
  checks: d.chk?.checks ?? null,
})), lines);
writeFileSync(new URL("compare.html", outDir), page);
for (const l of lines) console.log(l);
console.log(`wrote ${fileURLToPath(outDir)}`);
process.exit(0);
