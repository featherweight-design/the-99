/**
 * `pnpm eval:cuts-plan` — Proposed cuts, the shipped call path, scored against the cuts Hugh made.
 *
 * Why this exists next to `cuts-blind.mts` and `cuts-model.mts`: the 2026-10-10 blind read found the
 * model at 1.06x a random draw, while Deckcheck, reasoning from the deck's PLAN first and card
 * efficiency second, found 15 of Hugh's 39 real removals on the same three lists to the model's 7 of
 * 36. This runs the model on those lists (plus Avatar Aang and HD Tune - Mutant Menace) with ONE
 * sample per deck, and writes each pick, its reason and its hit against Hugh's own removals, so two
 * prompt versions can be put in one table with Deckcheck's picks beside them.
 *
 * THE LISTS (all staging, read-only), as `cuts-blind.mts` rebuilds them:
 *  - a deck with two committed versions: the PREVIOUS version plus the cards the newest added; Hugh's
 *    removals are what the newest dropped.
 *  - Mutant Menace (`draft`): the one committed version plus the DRAFT's additions; Hugh's removals
 *    are the committed cards the draft no longer holds (his intended cuts, not yet committed).
 *
 *  - `LIVE` decks: the deck as the app reads it now (`readProfileHead`), to replay a real press. Their
 *    picks.json also carries `dropDetail` (what the model cited next to what the pack says of the card)
 *    and `comboCards`, which is how the 2026-10-13 `citeMismatch` runs were diagnosed.
 *
 * THE CALL is built exactly as `runProposedCuts` builds it: `cutFacts`, the deck's stored intent, Key
 * cards, front-face oracle text, `buildCutsPack`, `buildCutsPrompt`, `cutsResponseSchema`, the app's
 * model, effort and output ceiling, one retry, and `validateCuts` with the action's name resolver.
 * Only the transport differs (the Batches API: same message, half price). With `--plan` the pack also
 * carries the deck's plan (`readCutsPlan`, the same read the action makes); without it the pack is
 * what the pack carried under v1 but is rendered by the CURRENT prompt builder: the "old prompt" column
 * of the metrics doc was produced BEFORE the v2 builder replaced v1, so a later run without `--plan` is
 * "current prompt, no plan", not a reproduction of v1.
 *
 * DRY by default. `--send` spends, into `ledger-cuts.jsonl`, and refuses once this task's spend
 * (ledger total minus `--baseline`) plus the next pass could cross `--cap` (default 0.75).
 *
 *   --send            spend
 *   --reuse <runId>   score a run's saved replies, spending nothing
 *   --decks a,b       only decks whose name contains one of these
 *   --plan            give the pack the deck's plan (prompt v2)
 *   --label L         run id suffix
 *   --baseline USD    the ledger total when this task began
 *   --cap USD         this task's ceiling (default 0.75)
 *   --max-tokens N    EVAL ONLY: a higher output ceiling than the app's (a 47-over deck truncates at 8,000)
 */
import "../lib/env.mjs";

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { countTokens, sendBatch, type Got, type Sent } from "./lib/batch.mjs";
import { acquireRunLock, readLedger, record, spent } from "./lib/ledger.mjs";
import { costUsd, worstCaseUsd, type Usage } from "./lib/pricing.mjs";
import { buildParams, parseReply } from "./lib/request.mjs";
import { ROOT } from "./lib/run.mjs";
import { connectStaging } from "./lib/staging.mjs";
import { LEDGER_LIMITS } from "../../src/lib/eval/ledger-limits";

const LEDGER_CUTS_CAP = LEDGER_LIMITS["ledger-cuts.jsonl"].hardCapUsd;
const LEDGER_CUTS_ASK = LEDGER_LIMITS["ledger-cuts.jsonl"].askAtUsd;

const { values: args } = parseArgs({
  options: {
    send: { type: "boolean", default: false },
    reuse: { type: "string" },
    decks: { type: "string" },
    plan: { type: "boolean", default: false },
    label: { type: "string", default: "cuts-plan" },
    baseline: { type: "string", default: "0" },
    cap: { type: "string", default: "0.75" },
    "max-tokens": { type: "string" },
  },
});

const LEDGER_CUTS = new URL("ledger-cuts.jsonl", ROOT).pathname;
const BASELINE = Number(args.baseline);
const CAP = Number(args.cap);

/** Hugh's staging decks. `draft` decks take their additions from the working list, not a version. */
const DECKS: { name: string; id: string; mode: "versions" | "draft" | "live" }[] = [
  { name: "HD - Gods", id: "13a6dc28-958c-4591-a2bb-c0297bbe5d92", mode: "versions" },
  { name: "HD Tune - Counter Intelligence", id: "2829cf41-1e07-4ec7-8353-8b0d9dfd678b", mode: "versions" },
  { name: "HD Tune - Prismari Artistry", id: "1a352a97-00fc-4309-a60e-5d518d56d34f", mode: "versions" },
  { name: "HD - Avatar Aang", id: "0f585441-203e-475b-be7c-f11e67e20d79", mode: "versions" },
  { name: "HD Tune - Mutant Menace", id: "8da5f286-9c80-4330-a6f9-06f5fd6756f8", mode: "draft" },
  // The decks as the app reads them NOW (`readProposedCuts`): a replay of a real press, with no removals of Hugh's to score against.
  { name: "LIVE HD Tune - Mutant Menace", id: "8da5f286-9c80-4330-a6f9-06f5fd6756f8", mode: "live" },
  { name: "LIVE HD - Kratos", id: "2bd462de-5f94-47e5-bd29-eabea5921c75", mode: "live" },
];

const db = await connectStaging();
const { and, desc, eq, inArray } = await import("drizzle-orm");
const schema = await import("../../src/db/schema");
const { readCutSupport, readKeyCardNames } = await import("../../src/lib/decks/cuts-read");
const { liveLockedIds } = await import("../../src/lib/decks/locks");
const { neverCutEnabled } = await import("../../src/lib/decks/never-cut-flag");
const { loadDeckProfileFromHead, readProfileHead } = await import("../../src/lib/profile/load");
const { castFaceText } = await import("../../src/lib/cards/facet");
const { FEATURE_CALLS } = await import("../../src/lib/model/prices");
const { deckNameIndex, normalizeName } = await import("../../src/lib/synopsis/facts");
const { cutFacts } = await import("../../src/lib/tuning/cuts");
const { buildCutsPack } = await import("../../src/lib/tuning/cuts-evidence");
const { buildCutsPrompt, CUTS_PROMPT_VERSION } = await import("../../src/lib/tuning/cuts-prompt");
const { cutsResponseSchema } = await import("../../src/lib/tuning/cuts-schema");
const { validateCuts } = await import("../../src/lib/tuning/cuts-validate");
const { TUNING_EFFORT, TUNING_MAX_TOKENS, TUNING_MODEL } = await import("../../src/lib/tuning/limits");
const readCutsPlan = args.plan ? (await import("../../src/lib/decks/cuts-plan-read")).readCutsPlan : null;

async function versionRows(deckId: string, number: number) {
  const [v] = await db.select().from(schema.deckVersions)
    .where(and(eq(schema.deckVersions.deckId, deckId), eq(schema.deckVersions.number, number)));
  if (!v) throw new Error(`deck ${deckId} has no version ${number}`);
  const rows = await db.select({ oracleId: schema.deckVersionCards.oracleId, quantity: schema.deckVersionCards.quantity })
    .from(schema.deckVersionCards).where(eq(schema.deckVersionCards.versionId, v.id));
  return { v, rows };
}

let want = DECKS;
if (args.decks) {
  const w = args.decks.split(",").map((s) => s.trim().toLowerCase());
  want = DECKS.filter((d) => w.some((x) => d.name.toLowerCase().includes(x)));
}

type Prepared = {
  customId: string; deckName: string; over: number; size: number; added: number;
  pack: ReturnType<typeof buildCutsPack>; hughCut: Map<string, string>; sent: Sent;
};
const prepared: Prepared[] = [];
for (const d of want) {
  const [deck] = await db.select({ userId: schema.decks.userId, intent: schema.decks.intent })
    .from(schema.decks).where(eq(schema.decks.id, d.id));
  if (!deck) throw new Error(`deck ${d.name} is not on staging`);
  let head: Parameters<typeof loadDeckProfileFromHead>[0];
  let hughCutIds: string[];
  let addedN: number;
  if (d.mode === "live") {
    // The app's own head read, minus `readProposedCuts`'s `unstable_cache` (a script has no incremental cache).
    const live = await db.transaction((tx) => readProfileHead(tx, d.id, deck.userId));
    if (!live) throw new Error(`deck ${d.name}: the app's own head read found nothing`);
    head = live;
    hughCutIds = [];
    addedN = 0;
  } else if (d.mode === "versions") {
    const [newest] = await db.select({ n: schema.deckVersions.number }).from(schema.deckVersions)
      .where(eq(schema.deckVersions.deckId, d.id)).orderBy(desc(schema.deckVersions.number)).limit(1);
    if (!newest || newest.n < 2) throw new Error(`deck ${d.name} has no second version`);
    const [prev, last] = [await versionRows(d.id, newest.n - 1), await versionRows(d.id, newest.n)];
    const inPrev = new Set(prev.rows.map((r) => r.oracleId));
    const inLast = new Set(last.rows.map((r) => r.oracleId));
    const added = last.rows.filter((r) => !inPrev.has(r.oracleId));
    addedN = added.length;
    head = {
      deckId: d.id, userId: deck.userId, commanderOracleId: last.v.commanderOracleId, partnerOracleId: last.v.partnerOracleId,
      declaredBracket: last.v.declaredBracket, cards: [...prev.rows, ...added],
    };
    hughCutIds = prev.rows.filter((r) => !inLast.has(r.oracleId)).map((r) => r.oracleId);
  } else {
    const [newest] = await db.select({ n: schema.deckVersions.number }).from(schema.deckVersions)
      .where(eq(schema.deckVersions.deckId, d.id)).orderBy(desc(schema.deckVersions.number)).limit(1);
    if (!newest) throw new Error(`deck ${d.name} has no committed version`);
    const committed = await versionRows(d.id, newest.n);
    const draft = await db.select({ oracleId: schema.deckCards.oracleId, quantity: schema.deckCards.quantity })
      .from(schema.deckCards).where(eq(schema.deckCards.deckId, d.id));
    const inCommitted = new Set(committed.rows.map((r) => r.oracleId));
    const inDraft = new Set(draft.map((r) => r.oracleId));
    const added = draft.filter((r) => !inCommitted.has(r.oracleId));
    addedN = added.length;
    head = {
      deckId: d.id, userId: deck.userId, commanderOracleId: committed.v.commanderOracleId, partnerOracleId: committed.v.partnerOracleId,
      declaredBracket: committed.v.declaredBracket, cards: [...committed.rows, ...added],
    };
    hughCutIds = committed.rows.filter((r) => !inDraft.has(r.oracleId)).map((r) => r.oracleId);
  }
  const locked = neverCutEnabled() ? [...(await liveLockedIds(db, d.id))] : [];
  const intent = deck.intent?.trim() ? deck.intent : null;
  const [profile, support] = await Promise.all([loadDeckProfileFromHead(head), readCutSupport(head.commanderOracleId, head.partnerOracleId)]);
  const facts = cutFacts({ profile, locked: new Set(locked), support, declaredBracket: (head.declaredBracket ?? null) as 1 | 2 | 3 | 4 | 5 | null });
  if (facts.over === 0) throw new Error(`deck ${d.name}: the rebuilt list is not over 100`);
  const [cmdrRows, keyCards, textRows] = await Promise.all([
    db.select({ id: schema.cards.oracleId, name: schema.cards.name }).from(schema.cards)
      .where(inArray(schema.cards.oracleId, [head.commanderOracleId, ...(head.partnerOracleId ? [head.partnerOracleId] : [])])),
    readKeyCardNames(head),
    db.select({ id: schema.cards.oracleId, text: schema.cards.oracleText, layout: schema.cards.layout })
      .from(schema.cards).where(inArray(schema.cards.oracleId, facts.cards.map((c) => c.oracleId))),
  ]);
  const nameOf = new Map(cmdrRows.map((r) => [r.id, r.name]));
  const commander = [head.commanderOracleId, head.partnerOracleId].flatMap((id) => (id && nameOf.get(id)) ? [nameOf.get(id)!] : []).join(" and ");
  const texts = new Map(textRows.flatMap((r) => { const t = castFaceText(r.text, r.layout); return t ? [[r.id, t] as const] : []; }));
  const plan = readCutsPlan ? await readCutsPlan(profile) : undefined;
  const pack = buildCutsPack({ facts, commanderName: commander, keyCards, intent, texts, ...(plan ? { plan } : {}) });
  const { system, user } = buildCutsPrompt(pack);
  if (process.env.CUTS_PLAN_DUMP) writeFileSync(`${process.env.CUTS_PLAN_DUMP}/${d.name.replace(/\W+/g, "-")}.txt`, `${system}\n\n=====\n\n${user}\n`);
  if (Math.ceil((system.length + user.length) / 3) > FEATURE_CALLS.proposed_cuts.inputCeilingTokens) {
    throw new Error(`deck ${d.name}: the prompt is past the feature's input ceiling`);
  }
  const names = await db.select({ id: schema.cards.oracleId, name: schema.cards.name }).from(schema.cards).where(inArray(schema.cards.oracleId, hughCutIds));
  const customId = `${d.id.slice(0, 8)}-0`;
  prepared.push({
    customId, deckName: d.name, over: facts.over, size: facts.total, added: addedN, pack,
    hughCut: new Map(names.map((n) => [n.id, n.name])),
    sent: { customId, params: buildParams({ model: TUNING_MODEL, system, user, maxTokens: args["max-tokens"] ? Number(args["max-tokens"]) : TUNING_MAX_TOKENS, schema: cutsResponseSchema(pack.ask) }, { effort: TUNING_EFFORT }) },
  });
  console.error(`${d.name}: ${facts.total} cards, over by ${facts.over}, Hugh removed ${hughCutIds.length}; prompt v${CUTS_PROMPT_VERSION}${args.plan ? " + plan" : ""}`);
}

const schemaOf = new Map(prepared.map((p) => [p.customId, cutsResponseSchema(p.pack.ask)]));
const attempts = new Map<string, Got[]>();
let runId: string;

if (args.reuse) {
  runId = args.reuse;
  const dir = new URL(`runs/${runId}/`, ROOT);
  for (const pass of ["a1", "a2"]) {
    const file = new URL(`raw-${pass}.jsonl`, dir);
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n").filter(Boolean)) {
      const g = JSON.parse(line) as Got;
      const base = g.customId.replace(/-r$/, "");
      attempts.set(base, [...(attempts.get(base) ?? []), g]);
    }
  }
} else {
  const tokens = await Promise.all(prepared.map((p) => countTokens(p.sent.params)));
  const taskSpent = () => spent(readLedger(LEDGER_CUTS)) - BASELINE;
  // Each request's bound is `worstCaseUsd` (two attempts at the output ceiling), so the cap holds even if every reply truncates.
  const worstOf = new Map(prepared.map((p, i) => [p.customId, worstCaseUsd(TUNING_MODEL, tokens[i], Number((p.sent.params as { max_tokens: number }).max_tokens), { batch: true })]));
  const expected = [...worstOf.values()].reduce((a, b) => a + b, 0);
  if (args.send) acquireRunLock(LEDGER_CUTS);
  console.error(`${prepared.length} requests, largest ${Math.max(...tokens)} input tokens; worst case $${expected.toFixed(2)}; this task has spent $${taskSpent().toFixed(3)} of $${CAP}`);
  if (!args.send) { console.error("DRY: nothing sent."); process.exit(0); }
  if (taskSpent() + expected > CAP) { console.error("NOT SENT: would cross the task cap"); process.exit(2); }
  // The ledger's own cap holds too: tasks share the file, so per-task caps alone could carry it past.
  const ledgerSpent = spent(readLedger(LEDGER_CUTS));
  if (ledgerSpent + expected > LEDGER_CUTS_CAP) { console.error(`NOT SENT: would cross the cuts ledger's $${LEDGER_CUTS_CAP} cap`); process.exit(2); }
  // The ask line, as cuts-model and cuts-blind hold it: past it, a writer stops and asks.
  if (LEDGER_CUTS_ASK !== null && ledgerSpent >= LEDGER_CUTS_ASK) { console.error(`NOT SENT: $${ledgerSpent.toFixed(2)} already spent (ask line $${LEDGER_CUTS_ASK}); stop and ask the orchestrator`); process.exit(2); }

  runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${args.label}`;
  const dir = new URL(`runs/${runId}/`, ROOT);
  mkdirSync(dir, { recursive: true });
  const send = async (batch: Sent[], pass: string): Promise<Got[]> => {
    if (batch.length === 0) return [];
    const id = `${runId}/${pass}`;
    record(LEDGER_CUTS, { at: new Date().toISOString(), runId: id, source: "pending", usd: batch.reduce((n, b) => n + worstOf.get(b.customId.replace(/-r$/, ""))! / 2, 0), requests: batch.length, pending: id });
    const { results } = await sendBatch(batch, (l) => console.error(l));
    appendFileSync(new URL(`raw-${pass}.jsonl`, dir), results.map((g) => JSON.stringify(g)).join("\n") + "\n");
    const usd = results.reduce((n, g) => n + (g.ok ? costUsd(TUNING_MODEL, g.message.usage as Usage, { batch: true }) : 0), 0);
    const after = record(LEDGER_CUTS, { at: new Date().toISOString(), runId: id, source: "batch", usd, requests: batch.length, settles: id, note: `cuts-plan eval, prompt v${CUTS_PROMPT_VERSION}${args.plan ? " with plan" : ""}` });
    console.error(`${pass}: ${results.length} replies, $${usd.toFixed(4)}; task spend $${(spent(after) - BASELINE).toFixed(3)} of $${CAP}`);
    return results;
  };
  for (const g of await send(prepared.map((p) => p.sent), "a1")) attempts.set(g.customId, [g]);
  const retry = prepared.filter((p) => {
    const g = attempts.get(p.customId)?.[0];
    return !g || (g.ok ? !parseReply(schemaOf.get(p.customId)!, g.message).ok : g.retry);
  });
  const retryWorst = retry.reduce((n, p) => n + worstOf.get(p.customId)! / 2, 0);
  const midway = spent(readLedger(LEDGER_CUTS));
  const askStops = LEDGER_CUTS_ASK !== null && midway >= LEDGER_CUTS_ASK;
  if (retry.length > 0 && askStops) console.error(`STOPPED before the retry pass: $${midway.toFixed(2)} spent (ask line $${LEDGER_CUTS_ASK}); ask the orchestrator`);
  if (retry.length > 0 && !askStops && taskSpent() + retryWorst <= CAP && midway + retryWorst <= LEDGER_CUTS_CAP) {
    for (const g of await send(retry.map((p) => ({ ...p.sent, customId: `${p.customId}-r` })), "a2")) {
      const base = g.customId.replace(/-r$/, "");
      attempts.set(base, [...(attempts.get(base) ?? []), g]);
    }
  }
}

type Pick = { name: string; reason: string; cites: unknown[]; hit: boolean };
const results: { deck: string; over: number; size: number; hughCut: string[]; picks: Pick[]; asked: number; drops: string[]; dropDetail: unknown[]; comboCards: Record<string, string>; usd: number; answered: boolean }[] = [];
for (const p of prepared) {
  const tries = attempts.get(p.customId) ?? [];
  let value = null;
  for (const t of tries) {
    if (!t.ok) continue;
    const parsed = parseReply(schemaOf.get(p.customId)!, t.message);
    if (parsed.ok) { value = parsed.value; break; }
  }
  const usd = tries.reduce((n, t) => n + (t.ok ? costUsd(TUNING_MODEL, t.message.usage as Usage, { batch: true }) : 0), 0);
  const index = deckNameIndex(p.pack.cards);
  const checked = value
    ? validateCuts({ reply: value, pack: p.pack, resolveName: (n) => { const h = index.get(normalizeName(n)); return h ? { oracleId: h.oracleId } : null; } })
    : null;
  results.push({
    deck: p.deckName, over: p.over, size: p.size, hughCut: [...p.hughCut.values()].sort(), asked: value?.cuts.length ?? 0,
    picks: (checked?.kept ?? []).map((k) => ({ name: k.name, reason: k.reason, cites: k.cites, hit: p.hughCut.has(k.oracleId) })),
    drops: (checked?.dropped ?? []).map((d) => `${d.rule}:${d.name ?? ""}`), usd, answered: value !== null,
    // What the model cited next to what the pack says of the same card: the point of a citeMismatch.
    dropDetail: (checked?.dropped ?? []).filter((d) => d.rule === "citeMismatch").map((d) => ({
      name: d.name, failed: d.cite, cited: value?.cuts[d.position]?.cites,
      pack: (() => { const c = p.pack.cards.find((x) => normalizeName(x.name) === normalizeName(d.name ?? "")); return c ? { comboState: c.comboState ?? null, roles: c.roles, inclusion: c.inclusion, mv: c.mv } : "NOT IN PACK"; })(),
    })),
    comboCards: Object.fromEntries(p.pack.cards.filter((c) => c.comboState).map((c) => [c.name, c.comboState!])),
  });
}
const outDir = new URL(`runs/${runId}/`, ROOT);
mkdirSync(outDir, { recursive: true });
writeFileSync(new URL("picks.json", outDir), `${JSON.stringify({ runId, promptVersion: CUTS_PROMPT_VERSION, plan: !!args.plan, results }, null, 2)}\n`);
console.log(`run ${runId} (prompt v${CUTS_PROMPT_VERSION}${args.plan ? " + plan" : ""})`);
for (const r of results) {
  const hits = r.picks.filter((x) => x.hit).length;
  console.log(`${r.deck}: kept ${r.picks.length} of ${r.over} (asked ${r.asked}), ${hits} of Hugh's ${r.hughCut.length} removals; $${r.usd.toFixed(4)}${r.drops.length ? `; dropped ${r.drops.join(", ")}` : ""}`);
}
process.exit(0);
