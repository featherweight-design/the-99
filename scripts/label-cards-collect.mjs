// Polls the two batches, writes each model's parsed labels to out/, and prints
// MEASURED tokens and cost. Separate from the runner so collecting never
// re-submits, and separate from scoring so a scoring bug costs nothing.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

import "./lib/env.mjs";

import Anthropic from "@anthropic-ai/sdk";

import { writeMeasured } from "./lib/card-labels-ledger.mjs";
import { costOf } from "./lib/card-labels-pricing.mjs";
import { publishArtifacts } from "./lib/card-labels-publish.mjs";
import { validateJob } from "./lib/card-labels-schema.mjs";

const client = new Anthropic({ baseURL: "https://api.anthropic.com" });
const { runId, submitted, batches } = JSON.parse(readFileSync("out/batches.json", "utf8"));
if (!runId) throw new Error("out/batches.json has no runId — it predates the run-id ledger; re-run the submission");
let collected = 0;
/** Publication is gated on THIS run having ended every batch it submitted. */
let allEnded = false;
mkdirSync("out", { recursive: true });

/** A model may fence its JSON however it likes; the reply is data, not code. */
const parseReply = (text) => {
  const t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(t); } catch { /* fall through to the bracket scan */ }
  const a = t.indexOf("["), b = t.lastIndexOf("]");
  if (a < 0 || b < a) return null;
  try { return JSON.parse(t.slice(a, b + 1)); } catch { return null; }
};

let grandTotal = 0;
/** Written out so the report's dollar figures come from an artifact, not prose. */
const measured = {};
for (const [key, id] of Object.entries(submitted)) {
  const batch = await client.messages.batches.retrieve(id);
  if (batch.processing_status === "ended") collected++;
  if (batch.processing_status !== "ended") {
    console.log(`${key}: ${batch.processing_status} — ${JSON.stringify(batch.request_counts)}`);
    continue;
  }

  const labels = {};
  const malformed = [];
  /** Names the model returned that this batch never asked about. */
  const unexpected = [];
  let inTok = 0, outTok = 0, cacheW = 0, cacheR = 0, errored = 0;

  /** Every card in a request we cannot read is a MISS, recorded rather than absent. */
  const markMissing = (customId) => {
    const idx = Number(customId.split("-")[1]);
    for (const name of batches[idx] ?? []) if (!(name in labels)) labels[name] = null;
  };

  for await (const entry of await client.messages.batches.results(id)) {
    // A failed request used to `continue` before the backfill below, so its cards
    // were absent from `labels` entirely. `score` counts an absent card as missing,
    // but `label-cards-agree` iterates one model's keys and silently drops them --
    // so a partial failure in ONE model quietly shrinks the agreement denominator
    // and makes agreement look better than it was.
    if (entry.result.type !== "succeeded") { errored++; markMissing(entry.custom_id); continue; }
    const u = entry.result.message.usage;
    inTok += u.input_tokens; outTok += u.output_tokens;
    cacheW += u.cache_creation_input_tokens ?? 0; cacheR += u.cache_read_input_tokens ?? 0;

    const idx = Number(entry.custom_id.split("-")[1]);
    const asked = batches[idx];
    const parsed = parseReply(entry.result.message.content.map((c) => c.text ?? "").join(""));
    if (!Array.isArray(parsed)) { malformed.push(`${entry.custom_id}: unparseable`); markMissing(entry.custom_id); continue; }

    // A TWO-FACED CARD'S NAME. Sonnet returned `Soulcipher Board` and
    // `Cipherbound Spirit` as separate entries where the catalog name is
    // `Soulcipher Board // Cipherbound Spirit`; Haiku kept the joined name. Left
    // alone that loses the card from the score entirely -- it reads as "not
    // returned" while the model answered it. Reconciled by FACE rather than by
    // fuzzy match, and only against the names this batch asked for.
    const faceOf = new Map();
    for (const asked1 of asked) {
      if (!asked1.includes(" // ")) continue;
      for (const face of asked1.split(" // ")) faceOf.set(face, asked1);
    }
    // A name that is neither asked for nor a FACE of one is not a card this batch
    // covers. Returned `null`, it is rejected rather than inserted: an invented name
    // accepted here enters `labels`, and `label-cards-agree` iterates one model's
    // keys, so a hallucination returned by both models would count as an agreeing
    // random card and move the denominator.
    const resolveName = (n) => (asked.includes(n) ? n : faceOf.get(n) ?? null);

    for (const card of parsed) {
      if (!card?.name) continue;
      // Two faces of one card merge into one label set, which is what the
      // schema labels -- the card, not the face.
      const resolved = resolveName(card.name);
      if (resolved === null) { unexpected.push(`${entry.custom_id}: ${card.name}`); continue; }
      card.name = resolved;
      // A MISSING or non-array `jobs` is NOT an empty answer. The prompt requires the
      // key, and the gold set has four HARD NEGATIVES where `[]` is the correct
      // label -- a Saga's lore counter, an artifact's charge counter -- so coercing
      // malformed output to `[]` credits it as right on exactly the cards designed to
      // catch over-labelling, and moves published precision and recall with nothing
      // in the log to say so. Recorded as a miss instead, which `score` counts as
      // such and this log names.
      if (!Array.isArray(card.jobs)) {
        malformed.push(`${card.name}: \`jobs\` is ${card.jobs === undefined ? "missing" : JSON.stringify(card.jobs)}, not an array`);
        labels[card.name] = null;
        continue;
      }
      const jobs = card.jobs;
      // A job the schema rejects is DROPPED and RECORDED, never repaired. A
      // repaired label would score the repair rather than the model.
      const kept = [];
      for (const job of jobs) {
        const problems = validateJob(job);
        if (problems.length) malformed.push(`${card.name} [${job?.kind}]: ${problems.join(", ")}`);
        else kept.push(job);
      }
      labels[card.name] = [...(labels[card.name] ?? []), ...kept];
    }
    // A card asked for and not returned is a MISS, recorded rather than silently absent.
    for (const name of asked) if (!(name in labels)) labels[name] = labels[name] ?? null;
  }

  const cost = costOf(key, { i: inTok, o: outTok, cw: cacheW, cr: cacheR });
  grandTotal += cost;

  const missing = Object.entries(labels).filter(([, v]) => v === null).length;
  writeFileSync(`out/labels-${key}.json`, JSON.stringify(labels, null, 1));
  writeFileSync(`out/malformed-${key}.txt`, malformed.join("\n"));
  console.log(`${key}: ${Object.keys(labels).length} cards (${missing} not returned), ${malformed.length} rejected jobs, ${unexpected.length} unexpected names, ${errored} failed requests`);
  if (unexpected.length) console.log(`  unexpected: ${unexpected.slice(0, 5).join(", ")}${unexpected.length > 5 ? " …" : ""}`);
  console.log(`  tokens in=${inTok} out=${outTok} cacheWrite=${cacheW} cacheRead=${cacheR}`);
  console.log(`  COST $${cost.toFixed(4)}  (batch rates)`);
  measured[key] = {
    cards: Object.keys(labels).length, notReturned: missing, rejectedJobs: malformed.length,
    tokens: { in: inTok, out: outTok, cacheWrite: cacheW, cacheRead: cacheR },
    usd: +cost.toFixed(4), usdPerCard: +(cost / Object.keys(labels).length).toFixed(6),
  };
}
if (grandTotal) {
  console.log(`\nMEASURED TOTAL: $${grandTotal.toFixed(4)}`);
  // COMMITTED alongside the scores, because the recommendation's dollar figure was
  // quoted in the report while living only in this script's stdout -- so a reader
  // told to check the tables against the artifacts could not reproduce it.
  const COMMANDER_LEGAL = 31830, AVG_SET = 390;
  writeFileSync("out/cost.json", JSON.stringify({
    measuredAt: new Date().toISOString(),
    perModel: measured,
    totalUsd: +grandTotal.toFixed(4),
    projections: Object.fromEntries(Object.entries(measured).map(([m, v]) => [m, {
      fullRunUsd: +(v.usdPerCard * COMMANDER_LEGAL).toFixed(2),
      perSetUsd: +(v.usdPerCard * AVG_SET).toFixed(2),
      basis: { commanderLegalCards: COMMANDER_LEGAL, avgRecentSetCards: AVG_SET },
    }])),
  }, null, 1));
  console.log("cost and projections -> out/cost.json");
  allEnded = Object.keys(submitted).length === collected;
  // RECONCILE the ledger the runner wrote. It charges the WORST CASE at submission,
  // because an interrupted run must not read as having spent nothing -- but leaving
  // that figure standing refuses the next legitimate run on a number ~4x the truth.
  // Written only when every batch has ended, or a partial collection would credit
  // back money still in flight.
  const ended = Object.keys(submitted).length === collected;
  if (ended) {
    // Keyed on this run's batch ids, so a repeat collect REPLACES its entry rather
    // than charging the cap again. Measured: the flat-total version turned $1.7048
    // into $2.5637 on a second collect over the same batches.
    const total = writeMeasured(runId, grandTotal);
    console.log(`ledger: this run measured $${grandTotal.toFixed(4)}; total committed $${total.toFixed(4)}`);
  } else {
    console.log(`ledger left at the worst case: ${collected} of ${Object.keys(submitted).length} batches ended`);
  }
}

// Publishing a partial run would copy a stale or half-measured cost file over the
// committed artifact the report's dollar figures rest on.
if (process.argv.includes("--publish") && !allEnded) {
  console.error("REFUSING to publish: not every submitted batch has ended, so the cost figure is partial.");
  process.exit(1);
}
publishArtifacts(["out/cost.json"], process.argv.includes("--publish"));
