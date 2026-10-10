/**
 * `pnpm eval:cuts-blind` — builds Hugh's BLIND rating sheet for Proposed cuts.
 *
 * Why a blind read: the recall eval (`metrics-cuts-model.md`) scores the model against Hugh's v1 to
 * v2 changes, which are mostly swaps and theme changes, so it under-measures a feature whose
 * question is "this list is over 100, which cards come out". Here Hugh rates candidate cuts
 * himself, with their source hidden, and `eval:cuts-blind-score` scores each source against him.
 *
 * THE DECKS. None of Hugh's staging decks is over 100 (every one is 99 plus its commander, read
 * 2026-10-10), so the fallback the orchestrator named applies: his three decks with the most recent
 * additions, each rebuilt as the list he held just before trimming — the previous version plus the
 * cards the newest version added — so it runs over by the number he last added. HD - Wizards is
 * skipped although it is the second most recent: it added one card, so its sheet would be one slot.
 *
 * THE THREE SOURCES, pooled per deck, de-duplicated and shuffled with a seeded coin:
 *  - `model`: the shipped path, built exactly as `runProposedCuts` builds it (`cutFacts` with the
 *    deck's live locks and declared bracket, the deck's stored intent, Key cards, front-face oracle
 *    text, `buildCutsPack`, `buildCutsPrompt`, `cutsResponseSchema`, the same model, effort and
 *    output ceiling, one retry on a malformed reply, and `validateCuts` with the action's name
 *    resolver). Only the transport differs: the Batches API, which is half price and returns the
 *    same message. Nothing is written to any run table: the database is staging, read-only.
 *  - `free`: the counted-facts ranker the free tier was measured with (`lib/cuts-ranking.mts`),
 *    its top `over` cards.
 *  - `random`: `over` cards drawn uniformly from the same cuttable cards, the chance baseline.
 *
 * OUTPUTS, under `docs/superpowers/eval/blind/` (both gitignored, since they hold the decks and the
 * key): `cuts-<round>-sheet.html`, the template `cuts.html` with the sheet's data inlined so it opens
 * from disk; and `cuts-<round>-key.json`, which source proposed each card, never shown on the page.
 * The model's reasons ARE inlined, because the sheet's second section shows them after Hugh submits
 * his ratings; the page does not render them before that.
 *
 * READ-ONLY on staging (`connectStaging`). PAYS for model calls, so it is DRY by default: without
 * `--send` it builds every request, counts its tokens (free) and prints the worst case. Every send
 * is written to `ledger-cuts.jsonl` (pending, then settled). `--reuse <runId>` rebuilds the sheet
 * from a run's saved replies and spends nothing.
 *
 *   --send            actually send (needed to spend anything)
 *   --reuse <runId>   rebuild from runs/<runId>/raw-*.jsonl, no calls
 *   --round N         sheet round (default 1)
 *   --budget USD      refuse a send whose worst case exceeds this (default 0.50, Hugh's approval)
 */
import "../lib/env.mjs";

import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { countTokens, sendBatch, type Got, type Sent } from "./lib/batch.mjs";
import { proposeCuts } from "./lib/cuts-ranking.mjs";
import { acquireRunLock, readLedger, record, spent } from "./lib/ledger.mjs";
import { costUsd, worstCaseUsd, type Usage } from "./lib/pricing.mjs";
import { buildParams, parseReply } from "./lib/request.mjs";
import { ROOT } from "./lib/run.mjs";
import { seededShuffle, SPLIT_SEED } from "./lib/split.mjs";
import { connectStaging } from "./lib/staging.mjs";

const { values: args } = parseArgs({
  options: {
    send: { type: "boolean", default: false },
    reuse: { type: "string" },
    round: { type: "string", default: "1" },
    budget: { type: "string", default: "0.50" },
  },
});

const CAP_USD = 15;
const ASK_AT_USD = 10;
const BUDGET = Number(args.budget);
if (!(BUDGET > 0)) throw new Error("--budget must be a positive number of dollars");
const ROUND = `cuts-${args.round}`;
const SEED = SPLIT_SEED + 7000 + Number(args.round);
const LEDGER_CUTS = new URL("ledger-cuts.jsonl", ROOT).pathname;

/** Hugh's three decks with the most recent additions (staging, 2026-10-10), newest first. */
const BLIND_DECKS: { name: string; id: string }[] = [
  { name: "HD Tune - Prismari Artistry", id: "1a352a97-00fc-4309-a60e-5d518d56d34f" },
  { name: "HD Tune - Counter Intelligence", id: "2829cf41-1e07-4ec7-8353-8b0d9dfd678b" },
  { name: "HD - Gods", id: "13a6dc28-958c-4591-a2bb-c0297bbe5d92" },
];

// The action reads the switch; this harness calls the pieces under it, so it needs none.
const db = await connectStaging();
const { and, desc, eq, inArray } = await import("drizzle-orm");
const schema = await import("../../src/db/schema");
const { readCutSupport, readKeyCardNames } = await import("../../src/lib/decks/cuts-read");
const { liveLockedIds } = await import("../../src/lib/decks/locks");
const { neverCutEnabled } = await import("../../src/lib/decks/never-cut-flag");
// `profileOfHead` is this behind the per-user data cache, which needs a Next server; the profile is the same.
const { loadDeckProfileFromHead } = await import("../../src/lib/profile/load");
const { castFaceText } = await import("../../src/lib/cards/facet");
const { FEATURE_CALLS } = await import("../../src/lib/model/prices");
const { deckNameIndex, normalizeName } = await import("../../src/lib/synopsis/facts");
const { cutFacts } = await import("../../src/lib/tuning/cuts");
const { buildCutsPack } = await import("../../src/lib/tuning/cuts-evidence");
const { buildCutsPrompt } = await import("../../src/lib/tuning/cuts-prompt");
const { cutsResponseSchema } = await import("../../src/lib/tuning/cuts-schema");
const { validateCuts } = await import("../../src/lib/tuning/cuts-validate");
const { TUNING_EFFORT, TUNING_MAX_TOKENS, TUNING_MODEL } = await import("../../src/lib/tuning/limits");

type Pack = ReturnType<typeof buildCutsPack>;
type Prepared = {
  customId: string; deckId: string; deckName: string; commander: string; over: number; size: number;
  lastAdded: number; pack: Pack; facts: ReturnType<typeof cutFacts>; hughCut: Set<string>;
  free: string[]; random: string[]; sent: Sent;
};

async function versionRows(deckId: string, number: number) {
  const [v] = await db.select().from(schema.deckVersions)
    .where(and(eq(schema.deckVersions.deckId, deckId), eq(schema.deckVersions.number, number)));
  if (!v) throw new Error(`deck ${deckId} has no version ${number}`);
  const rows = await db.select({ oracleId: schema.deckVersionCards.oracleId, quantity: schema.deckVersionCards.quantity })
    .from(schema.deckVersionCards).where(eq(schema.deckVersionCards.versionId, v.id));
  return { v, rows };
}

const prepared: Prepared[] = [];
for (const [i, d] of BLIND_DECKS.entries()) {
  const [deck] = await db.select({ userId: schema.decks.userId, intent: schema.decks.intent, name: schema.decks.name })
    .from(schema.decks).where(eq(schema.decks.id, d.id));
  if (!deck) throw new Error(`deck ${d.name} is not on staging`);
  const [newest] = await db.select({ n: schema.deckVersions.number }).from(schema.deckVersions)
    .where(eq(schema.deckVersions.deckId, d.id)).orderBy(desc(schema.deckVersions.number)).limit(1);
  if (!newest || newest.n < 2) throw new Error(`deck ${d.name} has no second version to rebuild a trim from`);
  const [prev, last] = [await versionRows(d.id, newest.n - 1), await versionRows(d.id, newest.n)];
  const inPrev = new Set(prev.rows.map((r) => r.oracleId));
  const inLast = new Set(last.rows.map((r) => r.oracleId));
  const added = last.rows.filter((r) => !inPrev.has(r.oracleId));
  const head = {
    deckId: d.id, userId: deck.userId,
    commanderOracleId: last.v.commanderOracleId, partnerOracleId: last.v.partnerOracleId,
    declaredBracket: last.v.declaredBracket,
    cards: [...prev.rows, ...added],
  };
  // `readProposedCuts`'s inputs, from this rebuilt list: live locks under the same switch, the
  // deck's stored intent, the profile and the commander's support.
  const locked = neverCutEnabled() ? [...(await liveLockedIds(db, d.id))] : [];
  const intent = deck.intent?.trim() ? deck.intent : null;
  const [profile, support] = await Promise.all([loadDeckProfileFromHead(head), readCutSupport(head.commanderOracleId, head.partnerOracleId)]);
  const facts = cutFacts({
    profile, locked: new Set(locked), support,
    declaredBracket: (head.declaredBracket ?? null) as 1 | 2 | 3 | 4 | 5 | null,
  });
  if (facts.over === 0) throw new Error(`deck ${d.name}: the rebuilt list is not over 100`);
  // `runProposedCuts` from here on.
  const [cmdrRows, keyCards, textRows] = await Promise.all([
    db.select({ id: schema.cards.oracleId, name: schema.cards.name }).from(schema.cards)
      .where(inArray(schema.cards.oracleId, [head.commanderOracleId, ...(head.partnerOracleId ? [head.partnerOracleId] : [])])),
    readKeyCardNames(head),
    db.select({ id: schema.cards.oracleId, text: schema.cards.oracleText, layout: schema.cards.layout })
      .from(schema.cards).where(inArray(schema.cards.oracleId, facts.cards.map((c) => c.oracleId))),
  ]);
  // `commanderName(head)`: the commander, then the partner.
  const nameOf = new Map(cmdrRows.map((r) => [r.id, r.name]));
  const commander = [head.commanderOracleId, head.partnerOracleId].flatMap((id) => (id && nameOf.get(id)) ? [nameOf.get(id)!] : []).join(" and ");
  const texts = new Map(textRows.flatMap((r) => { const t = castFaceText(r.text, r.layout); return t ? [[r.id, t] as const] : []; }));
  const pack = buildCutsPack({ facts, commanderName: commander, keyCards, intent, texts });
  const { system, user } = buildCutsPrompt(pack);
  if (Math.ceil((system.length + user.length) / 3) > FEATURE_CALLS.proposed_cuts.inputCeilingTokens) {
    throw new Error(`deck ${d.name}: the prompt is past the feature's input ceiling; the app would refuse it`);
  }
  const free = proposeCuts({ profile, locked: new Set(locked), support }).candidates.slice(0, facts.over).map((c) => c.oracleId);
  const random = seededShuffle(facts.cards.map((c) => c.oracleId).sort(), SEED + 100 * i).slice(0, facts.over);
  const customId = `${d.id.slice(0, 8)}-0`;
  prepared.push({
    customId, deckId: d.id, deckName: deck.name, commander, over: facts.over,
    size: facts.total, lastAdded: added.length, pack, facts,
    hughCut: new Set(prev.rows.filter((r) => !inLast.has(r.oracleId)).map((r) => r.oracleId)),
    free, random,
    sent: {
      customId,
      params: buildParams({ model: TUNING_MODEL, system, user, maxTokens: TUNING_MAX_TOKENS, schema: cutsResponseSchema(facts.over) }, { effort: TUNING_EFFORT }),
    },
  });
}

const schemaOf = new Map(prepared.map((p) => [p.customId, cutsResponseSchema(p.over)]));
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
  if (attempts.size === 0) throw new Error(`runs/${runId}/ holds no replies`);
} else {
  const tokens = await Promise.all(prepared.map((p) => countTokens(p.sent.params)));
  // `worstCaseUsd` counts the app's one retry (two attempts) at the full output ceiling.
  const worstOf = new Map(prepared.map((p, i) => [p.customId, worstCaseUsd(TUNING_MODEL, tokens[i], TUNING_MAX_TOKENS, { batch: true })]));
  const worst = [...worstOf.values()].reduce((a, b) => a + b, 0);
  if (args.send) acquireRunLock(LEDGER_CUTS);
  const before = spent(readLedger(LEDGER_CUTS));
  for (const p of prepared) console.error(`${p.deckName}: ${p.size} cards, over by ${p.over}, ${p.facts.cards.length} cuttable; free ${p.free.length}, random ${p.random.length}`);
  console.error(`${prepared.length} requests, largest ${Math.max(...tokens)} input tokens; worst case $${worst.toFixed(3)} (two attempts each, batch prices); ledger $${before.toFixed(2)} of $${CAP_USD}`);
  if (!args.send) {
    console.error("DRY: nothing sent. Add --send to spend, or --reuse <runId> to rebuild from saved replies.");
    process.exit(0);
  }
  if (worst > BUDGET) { console.error(`NOT SENT: worst case $${worst.toFixed(3)} is over the approved $${BUDGET.toFixed(2)}`); process.exit(2); }
  if (before + worst > CAP_USD) { console.error(`NOT SENT: $${before.toFixed(2)} + $${worst.toFixed(2)} would cross the $${CAP_USD} cap`); process.exit(2); }
  if (before >= ASK_AT_USD) { console.error(`NOT SENT: $${before.toFixed(2)} spent (ask line $${ASK_AT_USD})`); process.exit(2); }

  runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${ROUND}-blind`;
  const dir = new URL(`runs/${runId}/`, ROOT);
  mkdirSync(dir, { recursive: true });
  const send = async (batch: Sent[], pass: string, worstUsd: number): Promise<Got[]> => {
    if (batch.length === 0) return [];
    const id = `${runId}/${pass}`;
    record(LEDGER_CUTS, { at: new Date().toISOString(), runId: id, source: "pending", usd: worstUsd, requests: batch.length, pending: id });
    const { results } = await sendBatch(batch, (l) => console.error(l));
    appendFileSync(new URL(`raw-${pass}.jsonl`, dir), results.map((g) => JSON.stringify(g)).join("\n") + "\n");
    const usd = results.reduce((n, g) => n + (g.ok ? costUsd(TUNING_MODEL, g.message.usage as Usage, { batch: true }) : 0), 0);
    const after = record(LEDGER_CUTS, { at: new Date().toISOString(), runId: id, source: "batch", usd, requests: batch.length, settles: id });
    console.error(`${pass}: ${results.length} replies, $${usd.toFixed(4)}; ledger $${spent(after).toFixed(2)} of $${CAP_USD}`);
    return results;
  };
  for (const g of await send(prepared.map((p) => p.sent), "a1", worst / 2)) attempts.set(g.customId, [g]);
  // `callModel`'s one retry: a reply that failed the schema, or a retryable error.
  const retry = prepared.filter((p) => {
    const g = attempts.get(p.customId)?.[0];
    return !g || (g.ok ? !parseReply(schemaOf.get(p.customId)!, g.message).ok : g.retry);
  });
  const retryWorst = retry.reduce((n, p) => n + worstOf.get(p.customId)! / 2, 0);
  for (const g of await send(retry.map((p) => ({ ...p.sent, customId: `${p.customId}-r` })), "a2", retryWorst)) {
    const base = g.customId.replace(/-r$/, "");
    attempts.set(base, [...(attempts.get(base) ?? []), g]);
  }
}

// Pool, de-duplicate, shuffle, and split into the sheet (no sources) and the key (sources).
type SheetCard = { id: string; name: string; typeLine: string; mv: number; text: string };
type SheetDeck = {
  deckName: string; commander: string; size: number; over: number; lastAdded: number;
  cards: SheetCard[];
  /** The model's kept cuts, shown only after submit. `cardId` points into `cards`. */
  reasons: { cardId: string; name: string; reason: string; cites: string[] }[];
  modelStatus: "ok" | "failed" | "none";
};
const SNIPPET = 220;
const snippet = (t: string | undefined) => {
  const s = (t ?? "").replace(/\s+/g, " ").trim();
  if (s.length <= SNIPPET) return s;
  const cut = s.slice(0, SNIPPET);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), SNIPPET - 40))}…`;
};
const citeText = (c: { kind: string } & Record<string, unknown>) =>
  c.kind === "inclusion" ? `inclusion ${c.pct}%` : c.kind === "offList" ? "off the commander's list"
    : c.kind === "role" ? `${c.role} ${c.have} of ${c.target}` : c.kind === "curve" ? `curve: ${c.have} at ${c.cmc}`
      : c.kind === "flag" ? `bracket flag: ${c.flag}` : "the deck's intent";

const decks: SheetDeck[] = [];
const key: Record<string, { deck: string; oracleId: string; name: string; sources: string[]; hughCut: boolean }> = {};
let usdTotal = 0;
for (const [i, p] of prepared.entries()) {
  const tries = attempts.get(p.customId) ?? [];
  usdTotal += tries.reduce((n, t) => n + (t.ok ? costUsd(TUNING_MODEL, t.message.usage as Usage, { batch: true }) : 0), 0);
  let value = null;
  for (const t of tries) {
    if (!t.ok) continue;
    const parsed = parseReply(schemaOf.get(p.customId)!, t.message);
    if (parsed.ok) { value = parsed.value; break; }
  }
  const index = deckNameIndex(p.pack.cards);
  const kept = value
    ? validateCuts({ reply: value, pack: p.pack, resolveName: (n) => { const h = index.get(normalizeName(n)); return h ? { oracleId: h.oracleId } : null; } }).kept
    : [];
  const modelStatus = !value ? "failed" : kept.length === 0 ? "none" : "ok";
  const sources = new Map<string, Set<string>>();
  const add = (src: string, ids: string[]) => { for (const id of ids) sources.set(id, (sources.get(id) ?? new Set()).add(src)); };
  add("model", kept.map((k) => k.oracleId));
  add("free", p.free);
  add("random", p.random);
  const byId = new Map(p.pack.cards.map((c) => [c.oracleId, c]));
  const order = seededShuffle([...sources.keys()].sort(), SEED + 100 * i + 1);
  const idOf = new Map(order.map((oid, n) => [oid, `d${i + 1}-${String(n + 1).padStart(2, "0")}`]));
  decks.push({
    deckName: p.deckName, commander: p.commander, size: p.size, over: p.over, lastAdded: p.lastAdded,
    cards: order.map((oid) => {
      const c = byId.get(oid)!;
      return { id: idOf.get(oid)!, name: c.name, typeLine: c.typeLine, mv: c.mv, text: snippet(c.text) };
    }),
    reasons: kept.map((k) => ({ cardId: idOf.get(k.oracleId)!, name: k.name, reason: k.reason, cites: k.cites.map((c) => citeText(c as never)) })),
    modelStatus,
  });
  for (const oid of order) {
    key[idOf.get(oid)!] = { deck: p.deckName, oracleId: oid, name: byId.get(oid)!.name, sources: [...sources.get(oid)!].sort(), hughCut: p.hughCut.has(oid) };
  }
  console.error(`${p.deckName}: ${order.length} cards on the sheet (model ${kept.length}${modelStatus === "failed" ? ", FAILED" : ""}, free ${p.free.length}, random ${p.random.length})`);
}

// The answers file carries this hash back, so the scorer refuses answers given to another sheet.
const sheetHash = createHash("sha256").update(JSON.stringify(decks)).digest("hex");
// Shown in the non-blind section, after submit: where the model's answers came from.
const modelNote = args.reuse
  ? `The model's answers are reused from run ${runId} (already paid for, nothing spent here) and checked again with today's validator.`
  : `The model's answers were generated for this sheet in run ${runId}.`;
const sheet = { round: ROUND, runId, sheetHash, modelNote, builtAt: new Date().toISOString(), decks };
const out = new URL("blind/", ROOT);
const template = readFileSync(new URL("cuts.html", out), "utf8");
const MARK = "/*__SHEET_DATA__*/null";
if (!template.includes(MARK)) throw new Error("blind/cuts.html lost its data marker");
// `<` is escaped so no card text can close the script element it sits in.
const html = template.replace(MARK, () => JSON.stringify(sheet).replace(/</g, "\\u003c"));
writeFileSync(new URL(`${ROUND}-sheet.html`, out), html);
writeFileSync(new URL(`${ROUND}-key.json`, out), `${JSON.stringify({ round: ROUND, runId, sheetHash, cards: key }, null, 2)}\n`);
console.log(`eval:cuts-blind: ${ROUND} written from run ${runId}; ${Object.keys(key).length} cards across ${decks.length} decks; model answers cost $${usdTotal.toFixed(4)}${args.reuse ? " when that run was made (nothing spent now)" : ""}`);
console.log(`open ${new URL(`${ROUND}-sheet.html`, out).pathname}`);
process.exit(0);
