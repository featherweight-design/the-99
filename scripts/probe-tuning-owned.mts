/**
 * Suggested changes on a real staging deck, READ-ONLY and PAID: the run `runTuning` makes, minus
 * the credit and the writes. It builds the pack the app builds (owned shortlist included), sends it
 * through `callModel` with production's model, effort and ceiling, and validates the reply with
 * `resolveAnswer`, the same code the action calls. Prints what the model was shown, what it
 * returned, and why each line was dropped, with the failing citation for a `citation` drop.
 *
 *   pnpm tsx scripts/probe-tuning-owned.mts <deck id> [--cap 0.5] [--notes "text"] [--save reply.json] [--replay reply.json]
 *
 * `--limits '{"capCents":null,"sets":[],"ownedOnly":true}'` replaces the deck's stored limits for this read only (nothing is
 * written), to try a deck under a limit it does not carry.
 *
 * `--replay` validates a reply saved earlier with `--save` against the pack built NOW and calls no
 * model, so a drop can be read back for free.
 *
 * Staging is read-only (`connectStaging`). Spend is checked before the call against its worst case
 * and recorded on `ledger-tuning-lists.jsonl`; this probe's own hard cap is $0.50.
 */
import "./lib/env.mjs";

import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { connectStaging } from "./eval/lib/staging.mjs";
import { acquireRunLock, readLedger, record, refusal, spent } from "./eval/lib/ledger.mjs";
import { costUsd, worstCaseUsd } from "./eval/lib/pricing.mjs";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { cap: { type: "string", default: "0.5" }, notes: { type: "string" }, save: { type: "string" }, replay: { type: "string" }, limits: { type: "string" } },
});
const deckId = positionals[0];
if (!deckId) throw new Error("usage: probe-tuning-owned.mts <deck id> [--cap 0.5] [--notes text] [--save file] [--replay file] [--limits json]");
const CAP = Number(values.cap);
if (!Number.isFinite(CAP) || CAP <= 0) throw new Error("--cap must be a positive number");

const LEDGER = new URL("../docs/superpowers/eval/ledger-tuning-lists.jsonl", import.meta.url).pathname;
acquireRunLock(LEDGER);

const db = await connectStaging();
const { sql } = await import("drizzle-orm");
const { tuningInputs, readOwnedOracleIds, readTuningContext } = await import("../src/lib/decks/tuning-read");
const { loadDeckProfileFromHead } = await import("../src/lib/profile/load");
const { buildPlayGroup } = await import("../src/lib/profile/play");
const { buildEvidencePack } = await import("../src/lib/tuning/evidence");
const { buildPrompt } = await import("../src/lib/tuning/prompt");
const { loadOwnedCandidates } = await import("../src/lib/tuning/owned-candidates");
const { resolveAnswer } = await import("../src/lib/tuning/answer");
const { sizeLists } = await import("../src/lib/tuning/validate");
const { tuningResponseSchema } = await import("../src/lib/tuning/response-schema");
const { callModel } = await import("../src/lib/model/client");
const L = await import("../src/lib/tuning/limits");

const [deck] = (await db.execute(sql`select user_id, name from decks where id = ${deckId}`)).rows as { user_id: string; name: string }[];
if (!deck) throw new Error(`no staging deck ${deckId}`);
const userId = deck.user_id;
const inputs = await tuningInputs(deckId, userId);
if (!inputs) throw new Error("deck not readable");
const { head, games, intent, locked } = inputs;
const limits = values.limits ? (JSON.parse(values.limits) as typeof inputs.limits) : inputs.limits;
// The profile loader itself: `profileOfHead` wraps it in Next's data cache, which needs a request.
const profile = await loadDeckProfileFromHead(head);
const [owned, { overview, universal }] = await Promise.all([
  readOwnedOracleIds(userId, [...profile.cards.map((c) => c.oracleId), ...profile.skeleton.staples.map((s) => s.oracleId)]),
  readTuningContext(head),
]);
// The action's own steps, in its order. (`runTuning` is a server action with credit and writes, so it
// cannot be called here; the pieces it composes are shared and imported, not restated.)
const ownedCandidates = limits.ownedOnly
  ? await loadOwnedCandidates({
    userId, deckId, commanderOracleIds: profile.commanderOracleIds, colorIdentity: [...profile.colours.identity],
    inDeck: new Set(profile.cards.map((c) => c.oracleId)), limits,
  })
  : undefined;
const ownedNone = ownedCandidates !== undefined && ownedCandidates.length === 0;
const pack = buildEvidencePack({
  profile, play: buildPlayGroup(games), intent, owned, overview, universal, locked: new Set(locked),
  notes: values.notes ?? null,
  limits: ownedNone ? { ...limits, ownedOnly: false } : limits,
  ownedCandidates: ownedNone ? undefined : ownedCandidates,
  ownedNone,
});
const { system, user } = buildPrompt(pack);

console.log(`deck: ${deck.name}  limits: ${JSON.stringify(limits)}`);
console.log(`owned shortlist: ${ownedCandidates ? `${ownedCandidates.length} cards${ownedNone ? " (none fit: falls back to cards to buy)" : ""}` : "not used (owned-only off)"}`);
if (ownedCandidates && ownedCandidates.length > 0) console.log(`  first ten: ${ownedCandidates.slice(0, 10).map((c) => c.name).join("; ")}`);
console.log(`prompt: ${system.length + user.length} characters`);

console.log(`intent: ${JSON.stringify(pack.intent)}`);
type Reply = import("../src/lib/tuning/response-schema").TuningResponse;
const outcome: { ok: true; value: Reply } | { ok: false; errorClass: string } = values.replay
  ? { ok: true, value: JSON.parse(readFileSync(values.replay, "utf8")) as Reply }
  : await ask();

async function ask() {
  const worst = worstCaseUsd(L.TUNING_MODEL, system.length + user.length, L.TUNING_MAX_TOKENS, { batch: false });
  // Two guards. The ledger's own $3 cap (Hugh, 2026-10-10) holds for the file; THIS fix's $0.50 holds for
  // the probe's own settled lines plus this call's worst case, so a different eval's pending lines on
  // the shared file cannot starve it, and this probe cannot spend past its own budget.
  // The shared `spent`, over this probe's own lines only: a pending worst case no settle has closed (a
  // crash after the call) still counts, which is what keeps the cap hard across a killed run.
  const probeSpent = spent({ entries: readLedger(LEDGER).entries.filter((e) => e.note?.startsWith("probe-tuning-owned")) });
  const stop = probeSpent + worst > CAP
    ? `probe spend $${probeSpent.toFixed(3)} plus this call's worst case $${worst.toFixed(3)} would cross its $${CAP} cap`
    : refusal(readLedger(LEDGER), worst, 1, { hardCapUsd: 3, askAtUsd: 3 });
  if (stop) { console.log(`STOP: ${stop}`); process.exit(0); }
  const runId = `${new Date().toISOString()}-probe-tuning-owned-${deckId.slice(0, 8)}`;
  record(LEDGER, { at: new Date().toISOString(), runId, source: "pending", usd: worst, requests: 1, pending: runId, note: "probe-tuning-owned (pending worst case)" });

  const outcome = await callModel({
    model: L.TUNING_MODEL, system, user, maxTokens: L.TUNING_MAX_TOKENS, schema: tuningResponseSchema,
    deadlineMs: L.MODEL_TIMEOUT_MS, effort: L.TUNING_EFFORT, retryFloorMs: L.TUNING_RETRY_FLOOR_MS,
  });
  const usd = outcome.usage
    ? costUsd(L.TUNING_MODEL, { input_tokens: outcome.usage.inputTokens, output_tokens: outcome.usage.outputTokens, cache_read_input_tokens: outcome.usage.cacheReadTokens, cache_creation_input_tokens: outcome.usage.cacheWriteTokens } as never, { batch: false })
    : 0;
  record(LEDGER, { at: new Date().toISOString(), runId, source: "realtime:1", usd, requests: 1, settles: runId, note: `probe-tuning-owned ${deck.name}` });
  console.log(`call: ok=${outcome.ok} $${usd.toFixed(4)} (ledger now $${spent(readLedger(LEDGER)).toFixed(4)})`);
  return outcome.ok ? ({ ok: true, value: outcome.value } as const) : ({ ok: false, errorClass: outcome.errorClass } as const);
}
if (!outcome.ok) { console.log(outcome.errorClass); process.exit(0); }
if (values.save) writeFileSync(values.save, JSON.stringify(outcome.value, null, 1));

const { kept, drops, askedCount } = await resolveAnswer({ userId, deckId, pack, response: outcome.value });
const sized = sizeLists(kept, L.MAX_SUGGESTIONS);
console.log(`asked ${askedCount}, survived ${kept.length}, kept ${sized.length}`);
for (const [side, lines] of [["add", outcome.value.additions], ["cut", outcome.value.cuts]] as const) {
  lines.forEach((line, position) => {
    const d = drops.find((x) => x.side === side && x.position === position);
    // The report keeps only the failing citation's kind (it is saved); the probe has the reply, so it
    // prints the citations of a dropped `citation` line itself.
    const cited = d?.rule === "citation" ? ` [${line.evidence.map((c) => `${c.kind}: ${c.value}`).join(" | ")}]` : "";
    console.log(`  ${side} ${position}: ${line.card}  ${d ? `DROPPED ${d.rule}${d.cite ? ` (${d.cite.kind})` : ""}${cited}` : "kept"}`);
  });
}
process.exit(0);
