/**
 * `pnpm eval:cuts-model` — the Proposed cuts MODEL tier against the cuts Hugh actually made.
 *
 * The same ground truth as the free tier's baseline (`scripts/eval/lib/cuts-truth.mts`): five
 * staging decks, each rebuilt at its pre-cut size, the cards v2 dropped as the cuts to find. The
 * model is shown the facts and the card names, and nothing about the answer. By default it sees NO
 * intent and NO notes; `--leak` passes the deck's own v2 note as the intent, as a LEAKAGE
 * DIAGNOSTIC only (the note names cards it cut), never to select a prompt.
 *
 * READ-ONLY on staging. PAYS for model calls, so it is DRY by default: without `--send` it builds
 * every request, counts its tokens (free) and prints the worst-case cost, sending nothing.
 *
 *   --send            actually send (needed to spend anything)
 *   --smoke           one deck (Wizards, the smallest), one trial: measures tokens and cost first
 *   --decks a,b       only decks whose name contains one of these
 *   --trials N        answers per deck (default 1)
 *   --leak            pass the v2 note as the intent (diagnostic)
 *   --realtime        real-time prices and latency (default: batch, half price)
 *   --text            also give the model each card's oracle text (front face); type and mana value always go
 *   --model M         only the app's tuning model is accepted (other rates are unverified)
 *
 * MONEY (Hugh, 2026-10-09, relayed by the orchestrator): this build and its eval are bounded at
 * $15 in total. Every reply's usage is priced through `lib/pricing.mts` as it lands and written to
 * ITS OWN ledger (`ledger-cuts.jsonl`), because the shared one has a lifetime cap the earlier lanes
 * spent. A send is refused when its worst case would cross $15, and the retry pass is skipped
 * (the run stops and asks) once $10 is spent.
 */
import "../lib/env.mjs";

import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { countTokens, sendBatch, sendRealtime, type Got, type Sent } from "./lib/batch.mjs";
import { loadCutTruth, pairedSwaps } from "./lib/cuts-truth.mjs";
import { LEDGER_LIMITS, ledgerLimits } from "../../src/lib/eval/ledger-limits";
import { acquireRunLock, readLedger, record, spent } from "./lib/ledger.mjs";
import { costUsd, worstCaseUsd, type Usage } from "./lib/pricing.mjs";
import { buildParams, parseReply } from "./lib/request.mjs";
import { ROOT } from "./lib/run.mjs";
import { connectStaging } from "./lib/staging.mjs";

const { values: args } = parseArgs({
  options: {
    send: { type: "boolean", default: false },
    smoke: { type: "boolean", default: false },
    decks: { type: "string" },
    trials: { type: "string", default: "1" },
    leak: { type: "boolean", default: false },
    realtime: { type: "boolean", default: false },
    text: { type: "boolean", default: false },
    model: { type: "string" },
    // Model tiering (2026-10-12): a separate ledger and a lower cap, so an arm set is bounded on its own.
    ledger: { type: "string" },
    label: { type: "string", default: "cuts-model" },
  },
});

const CAP_USD = LEDGER_LIMITS["ledger-cuts.jsonl"].hardCapUsd;
const ASK_AT_USD = LEDGER_LIMITS["ledger-cuts.jsonl"].askAtUsd;
// Model tiering (2026-10-12): `--ledger ledger-model-tiering-cuts` bounds an arm set on its own ledger and its own, lower limits.
const ledgerName = `${args.ledger ?? "ledger-cuts"}.jsonl`;
const LIMITS = ledgerName === "ledger-cuts.jsonl" ? { hardCapUsd: CAP_USD, askAtUsd: ASK_AT_USD } : ledgerLimits(ledgerName);
if (!LIMITS || LIMITS.askAtUsd === null) throw new Error(`${ledgerName} has no limits in src/lib/eval/ledger-limits.ts`);
const RUN_CAP_USD = LIMITS.hardCapUsd;
const RUN_ASK_AT_USD = LIMITS.askAtUsd;
const MAX_TOKENS = 6_000;
const LEDGER_CUTS = new URL(ledgerName, ROOT).pathname;
const trials = Number(args.trials);
if (!Number.isInteger(trials) || trials < 1 || trials > 10) throw new Error("--trials must be 1 to 10");

const db = await connectStaging();
const { eq } = await import("drizzle-orm");
const schema = await import("../../src/db/schema");
const { loadDeckProfileFromHead } = await import("../../src/lib/profile/load");
const { readCutSupport } = await import("../../src/lib/decks/cuts-read");
const { cutFacts } = await import("../../src/lib/tuning/cuts");
const { buildCutsPack } = await import("../../src/lib/tuning/cuts-evidence");
const { buildCutsPrompt } = await import("../../src/lib/tuning/cuts-prompt");
const { cutsResponseSchema } = await import("../../src/lib/tuning/cuts-schema");
const { validateCuts } = await import("../../src/lib/tuning/cuts-validate");
const { TUNING_MODEL } = await import("../../src/lib/tuning/limits");
const { ROLE_ORDER } = await import("../../src/lib/decks/mix");
const { castFaceText } = await import("../../src/lib/cards/facet");
const { inArray } = await import("drizzle-orm");

// Only the app's model is offered: any other rate in `lib/pricing.mts` is assumed, and a cap
// enforced on an assumed rate is not a cap. The Opus rows in the metrics doc ran when it was.
// The app's model, and the two model-tiering arms: `lib/pricing.mts` carries their rates (checked
// 2026-10-11 against the claude-api table), which is what a cap enforced on them rests on.
const MODELS = [TUNING_MODEL, "claude-sonnet-5-5", "claude-haiku-5-5"];
const MODEL = args.model ?? TUNING_MODEL;
if (!MODELS.includes(MODEL)) throw new Error(`--model ${MODEL} is not one of ${MODELS.join(", ")}`);
const EFFORT = "medium" as const;
const norm = (s: string) => s.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim();

let truths = await loadCutTruth(db);
if (args.smoke) truths = truths.filter((t) => t.name === "HD - Wizards");
else if (args.decks) {
  const want = args.decks.split(",").map((s) => s.trim().toLowerCase());
  truths = truths.filter((t) => want.some((w) => t.name.toLowerCase().includes(w)));
}
if (truths.length === 0) throw new Error("no deck selected");

type Prepared = {
  customId: string;
  deck: string;
  trial: number;
  over: number;
  k: number;
  cut: Set<string>;
  paired: Set<string>;
  pool: number;
  pack: ReturnType<typeof buildCutsPack>;
  sent: Sent;
};

const prepared: Prepared[] = [];
for (const t of truths) {
  const [profile, support] = await Promise.all([
    loadDeckProfileFromHead(t.head),
    readCutSupport(t.head.commanderOracleId, t.head.partnerOracleId),
  ]);
  const facts = cutFacts({
    profile, locked: new Set(), support,
    declaredBracket: (t.head.declaredBracket ?? null) as 1 | 2 | 3 | 4 | 5 | null,
  });
  const [cmdr] = await db.select({ name: schema.cards.name }).from(schema.cards).where(eq(schema.cards.oracleId, t.head.commanderOracleId));
  let intent: string | null = null;
  if (args.leak) {
    const notes = await db.select({ note: schema.deckVersions.note, number: schema.deckVersions.number }).from(schema.deckVersions)
      .where(eq(schema.deckVersions.deckId, t.deckId));
    intent = notes.find((n) => n.number === 2)?.note?.slice(0, 240) ?? null;
  }
  let texts: Map<string, string> | undefined;
  if (args.text) {
    const rows = await db.select({ id: schema.cards.oracleId, text: schema.cards.oracleText, layout: schema.cards.layout })
      .from(schema.cards).where(inArray(schema.cards.oracleId, facts.cards.map((c) => c.oracleId)));
    texts = new Map(rows.flatMap((r) => { const t = castFaceText(r.text, r.layout); return t ? [[r.id, t] as const] : []; }));
  }
  const pack = buildCutsPack({ facts, commanderName: cmdr.name, keyCards: [], intent, texts });
  const { system, user } = buildCutsPrompt(pack);
  const rolesOf = new Map<string, Set<string>>();
  for (const r of ROLE_ORDER) for (const c of profile.roles.cards[r] ?? []) rolesOf.set(c.oracleId, (rolesOf.get(c.oracleId) ?? new Set()).add(r));
  const paired = pairedSwaps(t.cut, t.added, rolesOf);
  const schemaForCall = cutsResponseSchema(facts.over);
  for (let trial = 0; trial < trials; trial++) {
    const customId = `${t.deckId.slice(0, 8)}-${trial}`;
    prepared.push({
      customId, deck: t.name, trial, over: facts.over, k: t.cut.length, cut: new Set(t.cut), paired,
      pool: profile.cards.filter((c) => !profile.commanderOracleIds.includes(c.oracleId)).length,
      pack,
      sent: { customId, params: buildParams({ model: MODEL, system, user, maxTokens: MAX_TOKENS, schema: schemaForCall }, { effort: EFFORT }) },
    });
  }
}

// Count tokens (free), price the worst case, and refuse before sending anything.
const tokens = new Map<string, number>();
let worst = 0;
for (const p of prepared) {
  const h = createHash("sha256").update(JSON.stringify(p.sent.params)).digest("hex");
  if (!tokens.has(h)) tokens.set(h, await countTokens(p.sent.params));
  // `worstCaseUsd` already counts the app's one retry (two attempts).
  worst += worstCaseUsd(MODEL, tokens.get(h)!, MAX_TOKENS, { batch: !args.realtime });
}
const inputTokens = prepared.reduce((n, p) => n + tokens.get(createHash("sha256").update(JSON.stringify(p.sent.params)).digest("hex"))!, 0);
const perRequest = prepared.map((p) => tokens.get(createHash("sha256").update(JSON.stringify(p.sent.params)).digest("hex"))!);
if (args.send) acquireRunLock(LEDGER_CUTS);
const before = spent(readLedger(LEDGER_CUTS));
console.error(`${prepared.length} requests, ~${inputTokens} input tokens (largest request ${Math.max(...perRequest)}); worst case $${worst.toFixed(2)} (two attempts each, ${args.realtime ? "real-time" : "batch"} prices); spent so far on this ledger $${before.toFixed(2)} of $${RUN_CAP_USD}`);
if (!args.send) {
  console.error("DRY: nothing sent. Add --send to spend.");
  process.exit(0);
}
if (before + worst > RUN_CAP_USD) {
  console.error(`NOT SENT: ${before.toFixed(2)} spent + up to ${worst.toFixed(2)} would cross the $${RUN_CAP_USD} cap`);
  process.exit(2);
}
if (before >= RUN_ASK_AT_USD) {
  console.error(`NOT SENT: $${before.toFixed(2)} already spent (ask line $${RUN_ASK_AT_USD}); stop and ask the orchestrator`);
  process.exit(2);
}

const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${args.label}${args.leak ? "-leak" : ""}${args.text ? "-text" : ""}${args.model ? `-${args.model}` : ""}`;
const dir = new URL(`runs/${runId}/`, ROOT);
mkdirSync(dir, { recursive: true });
const log = (l: string) => console.error(l);

const send = async (batch: Sent[], pass: string, worstUsd: number): Promise<Got[]> => {
  if (batch.length === 0) return [];
  const pendingId = `${runId}/${pass}`;
  record(LEDGER_CUTS, { at: new Date().toISOString(), runId: pendingId, source: "pending", usd: worstUsd, requests: batch.length, pending: pendingId });
  const got = args.realtime ? await sendRealtime(batch, log) : (await sendBatch(batch, log)).results;
  appendFileSync(new URL(`raw-${pass}.jsonl`, dir), got.map((g) => JSON.stringify(g)).join("\n") + "\n");
  const usd = got.reduce((n, g) => n + (g.ok ? costUsd(MODEL, g.message.usage as Usage, { batch: !args.realtime }) : 0), 0);
  const after = record(LEDGER_CUTS, { at: new Date().toISOString(), runId: pendingId, source: args.realtime ? `realtime:${batch.length}` : "batch", usd, requests: batch.length, settles: pendingId });
  log(`${pass}: ${got.length} replies, $${usd.toFixed(4)}; ledger total $${spent(after).toFixed(2)} of $${RUN_CAP_USD}`);
  return got;
};

const schemaOf = new Map(prepared.map((p) => [p.customId, cutsResponseSchema(p.over)]));
const attempts = new Map<string, Got[]>();
for (const g of await send(prepared.map((p) => p.sent), "a1", worst / 2)) attempts.set(g.customId, [g]);
const midway = spent(readLedger(LEDGER_CUTS));
if (midway >= RUN_ASK_AT_USD) {
  console.error(`STOPPED before the retry pass: $${midway.toFixed(2)} spent (ask line $${RUN_ASK_AT_USD}); ask the orchestrator`);
}
const retry = midway >= RUN_ASK_AT_USD ? [] : prepared.filter((p) => {
  const g = attempts.get(p.customId)?.[0];
  return !g || (g.ok ? !parseReply(schemaOf.get(p.customId)!, g.message).ok : g.retry);
});
const worstOf = new Map(prepared.map((p) => [p.customId, worstCaseUsd(MODEL, tokens.get(createHash("sha256").update(JSON.stringify(p.sent.params)).digest("hex"))!, MAX_TOKENS, { batch: !args.realtime }) / 2]));
const retryWorst = retry.reduce((n, p) => n + worstOf.get(p.customId)!, 0);
for (const g of await send(retry.map((p) => ({ ...p.sent, customId: `${p.customId}-r` })), "a2", retryWorst)) {
  const base = g.customId.replace(/-r$/, "");
  attempts.set(base, [...(attempts.get(base) ?? []), g]);
}

// Score each answer: the model's KEPT cuts (after the app's own validator) against Hugh's.
type Row = { deck: string; trial: number; k: number; over: number; pool: number; answered: boolean; asked: number; kept: number; hits: number; swapHits: number; netHits: number; drops: string[]; usd: number; outTokens: number };
const rows: Row[] = [];
for (const p of prepared) {
  const tries = attempts.get(p.customId) ?? [];
  let value = null;
  for (const t of tries) {
    if (!t.ok) continue;
    const parsed = parseReply(schemaOf.get(p.customId)!, t.message);
    if (parsed.ok) { value = parsed.value; break; }
  }
  const usd = tries.reduce((n, t) => n + (t.ok ? costUsd(MODEL, t.message.usage as Usage, { batch: !args.realtime }) : 0), 0);
  const outTokens = tries.reduce((n, t) => n + (t.ok ? t.message.usage.output_tokens : 0), 0);
  if (!value) {
    rows.push({ deck: p.deck, trial: p.trial, k: p.k, over: p.over, pool: p.pool, answered: false, asked: 0, kept: 0, hits: 0, swapHits: 0, netHits: 0, drops: [], usd, outTokens });
    continue;
  }
  // Names resolve against the offered cards only (the app does the same in `cuts-actions.ts`), so a
  // card outside the pack drops as `cardExists` here, never `notInDeck`.
  const byName = new Map(p.pack.cards.map((c) => [norm(c.name), c.oracleId]));
  const { kept, dropped } = validateCuts({
    reply: value, pack: p.pack,
    resolveName: (name) => { const id = byName.get(norm(name)); return id ? { oracleId: id } : null; },
  });
  const hitIds = kept.filter((c) => p.cut.has(c.oracleId)).map((c) => c.oracleId);
  rows.push({
    deck: p.deck, trial: p.trial, k: p.k, over: p.over, pool: p.pool, answered: true, asked: value.cuts.length, kept: kept.length,
    hits: hitIds.length, swapHits: hitIds.filter((id) => p.paired.has(id)).length, netHits: hitIds.filter((id) => !p.paired.has(id)).length,
    drops: dropped.map((d) => d.rule), usd, outTokens,
  });
  appendFileSync(new URL("scored.jsonl", dir), `${JSON.stringify({ customId: p.customId, deck: p.deck, kept, dropped })}\n`);
}
writeFileSync(new URL("rows.json", dir), `${JSON.stringify(rows, null, 2)}\n`);

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const answered = rows.filter((r) => r.answered);
const totalK = sum(rows.map((r) => r.k));
const hits = sum(rows.map((r) => r.hits));
const chance = sum(rows.map((r) => (r.kept * r.k) / r.pool));
const swapN = sum(prepared.map((p) => [...p.cut].filter((id) => p.paired.has(id)).length));
const netN = totalK - swapN;
console.log(`# Proposed cuts model tier: recall against the cuts Hugh made${args.leak ? " (LEAKAGE DIAGNOSTIC: the v2 note was shown)" : ""}\n`);
console.log(`Run ${runId}. Model ${MODEL} at effort ${EFFORT}${args.text ? ", type, mana value and card text shown" : ", type and mana value shown, no card text"}, ${args.realtime ? "real-time" : "batch"}, ${trials} trial(s) per deck, no intent${args.leak ? " except the v2 note" : ""}, no Key cards.\n`);
console.log(`**${hits} of ${totalK} cuts found** across ${rows.length} answers (${answered.length} answered), ${(100 * hits / Math.max(totalK, 1)).toFixed(0)}% against the free tier's 17% (10 of 58) and chance ${chance.toFixed(1)}. Swaps ${sum(rows.map((r) => r.swapHits))} of ${swapN}, net reductions ${sum(rows.map((r) => r.netHits))} of ${netN}. Cost $${sum(rows.map((r) => r.usd)).toFixed(3)}; ledger total $${spent(readLedger(LEDGER_CUTS)).toFixed(2)} of $${RUN_CAP_USD}.\n`);
console.log("| Deck | Trial | Cut (K) | Asked | Kept | Hits | Dropped | Cost | Out tokens |");
console.log("|---|---|---|---|---|---|---|---|---|");
for (const r of rows) console.log(`| ${r.deck} | ${r.trial} | ${r.k} | ${r.asked} | ${r.kept} | ${r.answered ? r.hits : "no answer"} | ${r.drops.join(", ") || "none"} | $${r.usd.toFixed(4)} | ${r.outTokens} |`);
// The Neon pool and the ledger lock outlive the report otherwise.
process.exit(0);
