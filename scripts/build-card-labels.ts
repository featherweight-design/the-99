// Labels every Commander-legal card's jobs and their LIMITS, once, with a model.
//
// The one-time backfill is ~32,000 cards; afterwards the weekly refresh labels only what the
// input hash says has moved, which is a new set and nothing else. Hugh approved this run at
// about $41 on Sonnet 4.5 with a HARD STOP at $55.
//
// Three properties carry the money, and each one exists because something already went wrong:
//
//   THE CAP binds on the worst case plus what earlier runs spent, never on the estimate. See
//   `withinCap`; the ledger half is a hole the sample closed twice.
//
//   RESUME is against INTENTS, not batch ids. Anthropic assigns `batch_id` only when
//   `batches.create` RETURNS, so an intent goes down first with a null id and the id is filled
//   in after; one provider batch holds every chunk for a model, so that id is shared; and the
//   `custom_id`s embed a run token, or a recovery listing the provider's batches matches an
//   earlier run's request and either adopts a stale result or re-pays for a finished chunk.
//   All three were found in review on #1056, and all three are answerable from the call site.
//
//   THE FLOOR is evaluated against STAGING and a refusal publishes nothing. A run whose
//   returned share falls under the floor leaves the previous labels standing and exits
//   non-zero, because a partly-labelled table is indistinguishable from a complete one to
//   every reader — which is what #704 cost on the printings denominators.
//
// First, and on its own line: src/db reads DATABASE_URL at module scope.
import { requireEnv } from "./lib/env.mjs";
requireEnv(["DATABASE_URL", "ANTHROPIC_API_KEY"]);
import Anthropic from "@anthropic-ai/sdk";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "../src/db";
import { cardLabelBatches, cardLabels, cardLabelsStaging } from "../src/db/schema";
import { faceResolver } from "../src/lib/labels/parse";
import {
  CARDS_PER_REQUEST, meetsFloor, planChunks, waveSize, withinCap, worstCaseUsd, type Chunk,
} from "../src/lib/labels/plan";
import {
  buildRequest, labelInputHash, LABEL_PROMPT_VERSION, MAX_TOKENS_PER_BATCH, SYSTEM,
} from "../src/lib/labels/prompt";
import { validateJob } from "../src/lib/labels/schema";
import type { Job } from "../src/lib/labels/types";

/** Sonnet 4.5, Hugh's pick (2026-09-26), chosen on the restriction family rather than price. */
const MODEL = process.env.LABEL_MODEL ?? "claude-sonnet-4-5";

/**
 * The cap, and the pause. Hugh's ruling: hard stop $55, and PAUSE AND REPORT if the
 * projection passes $50 rather than spending up to the stop silently.
 */
const CAP_USD = Number(process.env.LABEL_CAP_USD ?? 55);
const REPORT_AT_USD = Number(process.env.LABEL_REPORT_AT_USD ?? 50);

/** 95% of the cards asked about, per the plan. Below it the run refuses and publishes nothing. */
const FLOOR = Number(process.env.LABEL_FLOOR ?? 0.95);

/** Batch rates for `MODEL`, per million tokens — the canonical table, halved. */
const RATES = { in: 1.5, out: 7.5 };

/**
 * The sample's measured cost per card, used ONLY to project before this run has measured
 * anything of its own. After the first wave collects, the run's own rate replaces it — a
 * projection that kept using the sample's figure could never notice a run costing more than
 * the sample did, which is the one thing the projection is for.
 */
const SAMPLE_PER_CARD_USD = 0.001291;

const dryRun = process.argv.includes("--dry-run");
const client = new Anthropic();

/** A run id that sorts and is readable; the run TOKEN in each custom id derives from it. */
const runId = process.env.LABEL_RUN_ID ?? `run-${new Date().toISOString().replace(/[:.]/g, "-")}`;

type CardRow = {
  oracleId: string; name: string; mana_cost: string | null; type_line: string;
  oracle_text: string | null; layout: string;
};

const die = (why: string): never => { console.error(`\nbuild-card-labels REFUSED: ${why}`); process.exit(1); };

/**
 * Cards that need labelling: Commander-legal, and whose stored hash does not match what
 * their current inputs produce.
 *
 * ORDERED, and that is load-bearing rather than tidy: `planChunks` is deterministic in the
 * index, so a resumed run must see the same cards in the same order or it chunks differently
 * and its intent keys stop matching the ones already recorded.
 */
async function cardsNeedingLabels(): Promise<CardRow[]> {
  const rows = await db.execute<CardRow>(sql`
    select c.oracle_id as "oracleId", c.name, c.mana_cost, c.type_line, c.oracle_text, c.layout
      from cards c
      left join card_labels l on l.oracle_id = c.oracle_id
     where c.commander_legal = true
     order by c.oracle_id
  `);
  const all = rows.rows ?? (rows as unknown as CardRow[]);
  const stored = new Map(
    (await db.select({ id: cardLabels.oracleId, hash: cardLabels.inputHash }).from(cardLabels))
      .map((r) => [r.id, r.hash]),
  );
  return all.filter((c) => stored.get(c.oracleId) !== labelInputHash(c, MODEL));
}


/** A model reply is data, not code: it may fence its JSON however it likes. */
const parseReply = (text: string): unknown => {
  const t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(t); } catch { /* fall through to the bracket scan */ }
  const a = t.indexOf("["), b = t.lastIndexOf("]");
  if (a < 0 || b < a) return null;
  try { return JSON.parse(t.slice(a, b + 1)); } catch { return null; }
};

/**
 * Reads ONE request's results into staging, and returns what happened.
 *
 * Three rules, all of them the sample's, measured there and not re-litigated here:
 *
 * - A job the schema REJECTS is dropped and recorded, never repaired: a repaired label
 *   stores the repair and the next re-score measures the repair.
 * - A missing or non-array `jobs` is NOT an empty answer. The gold set has hard negatives
 *   where `[]` is correct, so coercing malformed output to `[]` credits it as right on
 *   exactly the cards designed to catch over-labelling.
 * - A returned name is resolved by FACE against what this request asked for, and a name
 *   that is neither is refused rather than inserted.
 */
async function collectInto(
  intentKey: string, batchId: string, customId: string, asked: string[],
): Promise<"staged" | "expired"> {
  const resolve = faceResolver(asked);
  const byName = new Map<string, Job[]>();
  const rejected: string[] = [];
  // MEASURED usage for this request, which is what the next wave is sized against.
  let inTok = 0, outTok = 0, cacheW = 0, cacheR = 0;
  try {
    for await (const entry of await client.messages.batches.results(batchId)) {
      if (entry.custom_id !== customId) continue;
      if (entry.result.type !== "succeeded") continue;
      const u = entry.result.message.usage;
      inTok += u.input_tokens; outTok += u.output_tokens;
      cacheW += u.cache_creation_input_tokens ?? 0; cacheR += u.cache_read_input_tokens ?? 0;
      const parsed = parseReply(
        entry.result.message.content.map((c) => (c.type === "text" ? c.text : "")).join(""),
      );
      if (!Array.isArray(parsed)) continue;
      for (const card of parsed as { name?: string; jobs?: unknown }[]) {
        if (!card?.name) continue;
        const name = resolve(card.name);
        if (name === null) { rejected.push(`unexpected name ${card.name}`); continue; }
        if (!Array.isArray(card.jobs)) { rejected.push(`${name}: jobs is not an array`); continue; }
        const kept = card.jobs.filter((j) => {
          const bad = validateJob(j);
          if (bad.length) rejected.push(`${name}: ${bad.join(", ")}`);
          return bad.length === 0;
        }) as Job[];
        byName.set(name, [...(byName.get(name) ?? []), ...kept]);
      }
    }
  } catch (err) {
    // The provider keeps results 29 days; past that a retrieve fails rather than returning
    // nothing, and the cards have to be re-submitted.
    if ((err as { status?: number }).status === 404) return "expired";
    throw err;
  }

  const cards = await db.execute<CardRow>(sql`
    select oracle_id as "oracleId", name, mana_cost, type_line, oracle_text, layout
      from cards where name = any(${[...byName.keys()]})
  `);
  const rows = (cards.rows ?? (cards as unknown as CardRow[]))
    .map((c) => ({
      runId, oracleId: c.oracleId, labels: byName.get(c.name) ?? [],
      model: MODEL, promptVersion: LABEL_PROMPT_VERSION, inputHash: labelInputHash(c, MODEL),
    }));
  if (rows.length > 0) {
    // Staged, never published: the floor is evaluated against the whole run, so nothing
    // reaches `card_labels` until every batch is in and the share is known.
    await db.insert(cardLabelsStaging).values(rows).onConflictDoNothing();
  }
  await db.update(cardLabelBatches)
    .set({
      status: "collected", batchId, collectedAt: new Date(),
      inTokens: inTok, outTokens: outTok, cacheWriteTokens: cacheW, cacheReadTokens: cacheR,
    })
    .where(eq(cardLabelBatches.intentKey, intentKey));
  if (rejected.length > 0) console.warn(`  ${customId}: dropped ${rejected.length} job(s)`);
  return "staged";
}

/**
 * RECONCILE before submitting anything, which is the whole resume story.
 *
 * Three states an intent can be in, and the ambiguous one is the reason this exists:
 *
 *   `collected`         nothing to do.
 *   id present, not collected
 *                       retrieve it. `ended` is collected into staging; still processing
 *                       means EXIT cleanly rather than duplicate it; expired past the
 *                       provider's 29-day window is marked and its cards re-planned.
 *   id NULL             AMBIGUOUS. The `create` may have succeeded with the id lost, so the
 *                       provider is asked: its recent batches are listed and matched on the
 *                       `custom_id`s this run chose. A match adopts the id; no match means
 *                       the request never landed and is re-planned. Neither resolvable →
 *                       `abandoned`, reported, never silently re-submitted.
 *
 * Returns the intent keys whose work is DONE, so the caller plans only what is left.
 */
async function reconcile(): Promise<{ done: Set<string>; waiting: number; abandoned: string[] }> {
  const open = await db.select().from(cardLabelBatches)
    .where(and(eq(cardLabelBatches.runId, runId), sql`${cardLabelBatches.status} <> 'collected'`));
  if (open.length === 0) return { done: new Set(), waiting: 0, abandoned: [] };

  console.log(`reconciling ${open.length} open intent(s) from ${runId}`);
  // Listed ONCE, not per intent: the ambiguous branch needs the same page of batches for
  // every one of them, and a list call per intent is a round trip per chunk.
  const byCustomId = new Map<string, string>();
  const needsLookup = open.some((o) => o.batchId === null);
  if (needsLookup) {
    for await (const batch of client.messages.batches.list({ limit: 100 })) {
      for await (const r of await client.messages.batches.results(batch.id)) {
        byCustomId.set(r.custom_id, batch.id);
      }
    }
  }

  const done = new Set<string>();
  const abandoned: string[] = [];
  let waiting = 0;

  for (const intent of open) {
    const id = intent.batchId ?? byCustomId.get(intent.customId) ?? null;
    if (id === null) {
      // The create never landed, OR it landed and the provider no longer lists it. The first
      // is safe to re-plan; the second would double charge. Told apart by AGE: a batch the
      // provider would still list is recent, so an old unresolved intent is abandoned rather
      // than guessed at.
      const ageMs = Date.now() - intent.intendedAt.getTime();
      if (ageMs < 60 * 60 * 1000) continue; // re-planned by omission from `done`
      await db.update(cardLabelBatches).set({ status: "abandoned" })
        .where(eq(cardLabelBatches.intentKey, intent.intentKey));
      abandoned.push(intent.intentKey);
      continue;
    }

    const batch = await client.messages.batches.retrieve(id);
    if (batch.processing_status !== "ended") {
      waiting++;
      await db.update(cardLabelBatches).set({ status: "in_progress", batchId: id })
        .where(eq(cardLabelBatches.intentKey, intent.intentKey));
      continue;
    }
    const staged = await collectInto(intent.intentKey, id, intent.customId, intent.asked);
    if (staged === "expired") {
      await db.update(cardLabelBatches).set({ status: "expired", batchId: id })
        .where(eq(cardLabelBatches.intentKey, intent.intentKey));
      console.warn(`  ${intent.customId}: results expired — its cards will be re-submitted`);
      continue;
    }
    done.add(intent.intentKey);
  }
  return { done, waiting, abandoned };
}

/**
 * Submits one model's chunks as ONE provider batch, with every intent written FIRST.
 *
 * The order is the point and it is not negotiable: every intent row goes down, then
 * `batches.create` is called, then the returned id is stamped onto all of them. A process
 * dying in the window between `create` returning and the stamp leaves rows that say
 * `intended` with a null id — which `reconcile` treats as ambiguous and RESOLVES against the
 * provider, rather than as absent and re-submits. Writing the rows after the call is the
 * shape that pays twice.
 */
async function submit(chunks: Chunk[]): Promise<void> {
  await db.insert(cardLabelBatches).values(chunks.map((c) => ({
    intentKey: c.intentKey, runId, model: MODEL, customId: c.customId, asked: c.names,
  }))).onConflictDoNothing();

  const cards = await db.execute<CardRow>(sql`
    select oracle_id as "oracleId", name, mana_cost, type_line, oracle_text, layout
      from cards where name = any(${chunks.flatMap((c) => c.names)})
  `);
  const byName = new Map((cards.rows ?? (cards as unknown as CardRow[])).map((c) => [c.name, c]));
  const requests = chunks.map((c) => buildRequest(
    c.customId, MODEL, c.names.map((n) => byName.get(n)).filter((c2): c2 is CardRow => c2 !== undefined),
  ));

  const batch = await client.messages.batches.create({ requests });
  await db.update(cardLabelBatches)
    .set({ batchId: batch.id, status: "submitted", submittedAt: new Date() })
    .where(and(eq(cardLabelBatches.runId, runId), isNull(cardLabelBatches.batchId)));
  console.log(`submitted ${requests.length} request(s) as ${batch.id}`);
}

/**
 * Publishes staging into `card_labels` in ONE transaction, or refuses.
 *
 * `delete` + `insert ... select` rather than a per-row upsert, so a reader never sees a
 * mixture of two runs. Scoped to the oracle ids this run staged: a card the run did not
 * touch keeps its existing label, because the run labels what has MOVED and a card whose
 * inputs are unchanged was skipped rather than found wanting.
 */
async function publish(): Promise<number> {
  return db.transaction(async (tx) => {
    const staged = await tx.select({ id: cardLabelsStaging.oracleId }).from(cardLabelsStaging)
      .where(eq(cardLabelsStaging.runId, runId));
    const ids = staged.map((r) => r.id);
    if (ids.length === 0) return 0;
    await tx.delete(cardLabels).where(inArray(cardLabels.oracleId, ids));
    await tx.execute(sql`
      insert into ${cardLabels} (oracle_id, labels, model, prompt_version, input_hash, labelled_at)
      select oracle_id, labels, model, prompt_version, input_hash, labelled_at
        from ${cardLabelsStaging} where run_id = ${runId}
    `);
    await tx.delete(cardLabelsStaging).where(eq(cardLabelsStaging.runId, runId));
    return ids.length;
  });
}

/** Tokens the instruction block costs, and a card's rendered line, for the worst case. */
const SYSTEM_TOKENS = Math.ceil(SYSTEM.length / 4);
const PER_CARD_TOKENS = 60;

async function main(): Promise<void> {
  console.log(`run ${runId}  model ${MODEL}  cap $${CAP_USD.toFixed(2)}${dryRun ? "  (dry run)" : ""}`);

  // RECONCILE FIRST, always, before anything is planned or priced. An in-flight batch this
  // run cannot see is work it would submit again.
  const { done, waiting, abandoned } = dryRun
    ? { done: new Set<string>(), waiting: 0, abandoned: [] as string[] }
    : await reconcile();
  if (abandoned.length > 0) {
    console.error(`\n${abandoned.length} intent(s) ABANDONED — submitted, id lost, and no longer`);
    console.error(`listed by the provider. Their cards are NOT re-submitted automatically:`);
    for (const k of abandoned) console.error(`  ${k}`);
    return die(`unresolvable intents. Re-run with LABEL_RUN_ID=<new id> to relabel their cards, `
      + `accepting that the originals may already have been charged.`);
  }
  if (waiting > 0) {
    console.log(`\n${waiting} batch(es) still processing. Nothing submitted, nothing published.`);
    console.log(`Re-run with LABEL_RUN_ID=${runId} to resume when they finish.`);
    return;
  }

  const cards = await cardsNeedingLabels();
  console.log(`${cards.length} card(s) need labels (stored hash differs or absent)`);

  const planned = planChunks(runId, MODEL, cards.map((c) => c.name));
  const chunks = planned.filter((c) => !done.has(c.intentKey));

  // NOTHING LEFT TO SUBMIT is the publish path, not an early exit. It is reached two ways: a
  // resumed run whose last batches just collected, and a run with no stale cards at all. The
  // second has nothing staged and publishes nothing; the first is the end of the run.
  if (chunks.length === 0) {
    const asked = planned.reduce((n, c) => n + c.names.length, 0);
    const [{ n: staged }] = await db.select({ n: sql<number>`count(*)::int` })
      .from(cardLabelsStaging).where(eq(cardLabelsStaging.runId, runId));
    if (staged === 0) {
      console.log(asked === 0
        ? "nothing to do — every Commander-legal card's label matches its inputs"
        : "nothing staged and nothing left to submit — re-run to plan these cards afresh");
      return;
    }

    const floor = meetsFloor(staged, asked, FLOOR);
    console.log(`\n${staged} of ${asked} card(s) came back (${(100 * floor.share).toFixed(1)}%), `
      + `floor ${(100 * FLOOR).toFixed(0)}%`);
    if (!floor.ok) {
      // Staging is LEFT IN PLACE: the refusal is about publishing, and discarding the rows
      // would throw away work already paid for. A named re-run can lower the floor
      // deliberately, or the rows can be read to see what is missing.
      return die(`${floor.why}. Staging for ${runId} is kept — inspect it, or re-run with a `
        + `stated LABEL_FLOOR once you know why the shortfall is acceptable.`);
    }
    if (dryRun) { console.log("dry run — not publishing"); return; }
    const published = await publish();
    console.log(`published ${published} label(s) in one transaction`);
    return;
  }
  const worst = worstCaseUsd(chunks.length, SYSTEM_TOKENS, PER_CARD_TOKENS, MAX_TOKENS_PER_BATCH, RATES);

  // MEASURED spend, summed over the batches that have collected. Not the worst case of
  // committed requests: that books ~$25 for a wave costing ~$6, so the budget would exhaust
  // after one wave and leave 2,253 requests unsent (simulated over the real 2,653).
  const [usage] = await db.select({
    inTok: sql<number>`coalesce(sum(${cardLabelBatches.inTokens}), 0)::int`,
    outTok: sql<number>`coalesce(sum(${cardLabelBatches.outTokens}), 0)::int`,
    cacheW: sql<number>`coalesce(sum(${cardLabelBatches.cacheWriteTokens}), 0)::int`,
    cacheR: sql<number>`coalesce(sum(${cardLabelBatches.cacheReadTokens}), 0)::int`,
    cards: sql<number>`coalesce(sum(jsonb_array_length(${cardLabelBatches.asked})), 0)::int`,
  }).from(cardLabelBatches)
    .where(and(eq(cardLabelBatches.runId, runId), eq(cardLabelBatches.status, "collected")));

  const alreadySpent = (usage.inTok * RATES.in + usage.outTok * RATES.out
    + usage.cacheW * RATES.in * 1.25 + usage.cacheR * RATES.in * 0.1) / 1e6;
  /** This run's own measured rate, which is what the projection must use once it has one. */
  const measuredPerCard = usage.cards > 0 ? alreadySpent / usage.cards : SAMPLE_PER_CARD_USD;

  console.log(`  ${chunks.length} request(s) of ${CARDS_PER_REQUEST}  worst case $${worst.toFixed(2)}`
    + (alreadySpent > 0 ? `  (plus $${alreadySpent.toFixed(2)} already committed)` : ""));

  // ONE WAVE AT A TIME, because `batches.create` is atomic: submitting every request commits
  // the run to their whole cost with no way to stop at the cap. A wave sized to the REMAINING
  // budget means the worst case is bounded at every point, and the next wave is authorised
  // against what the previous one actually cost.
  const remaining = CAP_USD - alreadySpent;
  const size = waveSize(remaining, SYSTEM_TOKENS, PER_CARD_TOKENS, MAX_TOKENS_PER_BATCH, RATES);
  if (size === 0) {
    return die(`no budget left for even one request: $${alreadySpent.toFixed(2)} of the `
      + `$${CAP_USD.toFixed(2)} cap is committed, and one request's worst case is `
      + `$${worstCaseUsd(1, SYSTEM_TOKENS, PER_CARD_TOKENS, MAX_TOKENS_PER_BATCH, RATES).toFixed(4)}.`);
  }

  const wave = chunks.slice(0, size);
  const waveWorst = worstCaseUsd(wave.length, SYSTEM_TOKENS, PER_CARD_TOKENS, MAX_TOKENS_PER_BATCH, RATES);
  const verdict = withinCap(waveWorst, alreadySpent, CAP_USD);
  if (!verdict.ok) return die(verdict.why);

  console.log(`  this wave: ${wave.length} request(s), worst case $${waveWorst.toFixed(2)}`);
  console.log(`  ${chunks.length - wave.length} request(s) wait for a later wave`);
  console.log(`  whole run expected ~$${(0.001291 * cards.length).toFixed(2)} at the sample's `
    + `measured rate; worst case if every wave returns its full ceiling `
    + `$${worst.toFixed(2)}`);

  // TWO BOUNDS, and they are different questions (d9's ruling on Hugh's $55):
  //
  //   the CAP   each wave's worst case must fit `$55 − measured so far`, which is what makes
  //             actual spend unable to pass $55 even if every remaining request maxes out.
  //             Enforced by `waveSize` above and re-checked by `withinCap`.
  //   the PAUSE  the PROJECTED total — measured plus the cards still to do at this run's own
  //             measured rate — must stay under $50. This catches a run trending high long
  //             before the cap does, which is the point: the cap stops a disaster, the pause
  //             reports a surprise.
  const remainingCards = cards.length - usage.cards;
  const projected = alreadySpent + remainingCards * measuredPerCard;
  console.log(`  projected total $${projected.toFixed(2)} `
    + `(measured $${alreadySpent.toFixed(2)} + ${remainingCards} cards at `
    + `$${measuredPerCard.toFixed(6)}${usage.cards === 0 ? ", the sample's rate" : ", this run's rate"})`);
  if (projected > REPORT_AT_USD) {
    console.error(`\nPAUSED: the projected total is $${projected.toFixed(2)}, past the `
      + `$${REPORT_AT_USD.toFixed(2)} report line (cap $${CAP_USD.toFixed(2)}).`);
    console.error(`Nothing further has been submitted. Report the figure and hold for Hugh; `
      + `re-run with LABEL_REPORT_AT_USD=${CAP_USD} only once he has approved it.`);
    return;
  }

  if (dryRun) {
    console.log("\ndry run — nothing submitted, nothing published");
    return;
  }

  await submit(wave);
  console.log(`\nSubmitted wave of ${wave.length}. Batches are asynchronous: re-run with `
    + `LABEL_RUN_ID=${runId} to collect it and submit the next wave.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
