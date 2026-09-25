// Polls the two batches, writes each model's parsed labels to out/, and prints
// MEASURED tokens and cost. Separate from the runner so collecting never
// re-submits, and separate from scoring so a scoring bug costs nothing.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

import "./lib/env.mjs";

import Anthropic from "@anthropic-ai/sdk";

import { validateJob } from "./lib/card-labels-schema.mjs";

const PRICING = {
  haiku: { in: 0.50, out: 2.50, cacheWrite: 0.625, cacheRead: 0.05 },
  sonnet: { in: 1.50, out: 7.50, cacheWrite: 1.875, cacheRead: 0.15 },
};

const client = new Anthropic({ baseURL: "https://api.anthropic.com" });
const { submitted, batches } = JSON.parse(readFileSync("out/batches.json", "utf8"));
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
for (const [key, id] of Object.entries(submitted)) {
  const batch = await client.messages.batches.retrieve(id);
  if (batch.processing_status !== "ended") {
    console.log(`${key}: ${batch.processing_status} — ${JSON.stringify(batch.request_counts)}`);
    continue;
  }

  const labels = {};
  const malformed = [];
  let inTok = 0, outTok = 0, cacheW = 0, cacheR = 0, errored = 0;

  for await (const entry of await client.messages.batches.results(id)) {
    if (entry.result.type !== "succeeded") { errored++; continue; }
    const u = entry.result.message.usage;
    inTok += u.input_tokens; outTok += u.output_tokens;
    cacheW += u.cache_creation_input_tokens ?? 0; cacheR += u.cache_read_input_tokens ?? 0;

    const idx = Number(entry.custom_id.split("-")[1]);
    const asked = batches[idx];
    const parsed = parseReply(entry.result.message.content.map((c) => c.text ?? "").join(""));
    if (!Array.isArray(parsed)) { malformed.push(`${entry.custom_id}: unparseable`); continue; }

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
    const resolveName = (n) => (asked.includes(n) ? n : faceOf.get(n) ?? n);

    for (const card of parsed) {
      if (!card?.name) continue;
      // Two faces of one card merge into one label set, which is what the
      // schema labels -- the card, not the face.
      card.name = resolveName(card.name);
      const jobs = Array.isArray(card.jobs) ? card.jobs : [];
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

  const p = PRICING[key];
  const cost = (inTok * p.in + outTok * p.out + cacheW * p.cacheWrite + cacheR * p.cacheRead) / 1e6;
  grandTotal += cost;

  const missing = Object.entries(labels).filter(([, v]) => v === null).length;
  writeFileSync(`out/labels-${key}.json`, JSON.stringify(labels, null, 1));
  writeFileSync(`out/malformed-${key}.txt`, malformed.join("\n"));
  console.log(`${key}: ${Object.keys(labels).length} cards (${missing} not returned), ${malformed.length} rejected jobs, ${errored} failed requests`);
  console.log(`  tokens in=${inTok} out=${outTok} cacheWrite=${cacheW} cacheRead=${cacheR}`);
  console.log(`  COST $${cost.toFixed(4)}  (batch rates)`);
}
if (grandTotal) console.log(`\nMEASURED TOTAL: $${grandTotal.toFixed(4)}`);
