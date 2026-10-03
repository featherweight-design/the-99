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
import { ALL_MODELS, PRICING } from "./lib/card-labels-pricing.mjs";
import Anthropic from "@anthropic-ai/sdk";
import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "../src/db";
import { cardLabelBatches, cardLabels, cardLabelsStaging } from "../src/db/schema";
import { faceResolver, withoutRepeats } from "../src/lib/labels/parse";
import {
  boundedNumber, CARDS_PER_REQUEST, meetsFloor, pauseRemediation, planChunks, waveSize,
  withinCap, worstCaseUsd,
  type Chunk,
} from "../src/lib/labels/plan";
import {
  buildRequest, labelInputHash, LABEL_PROMPT_VERSION, MAX_TOKENS_PER_BATCH, renderBody, SENDS_CACHE_BREAKPOINT, SYSTEM_TOKENS_BOUND,
} from "../src/lib/labels/prompt";
// `CardRow` comes from the same module as the read that returns it — two structurally identical
// row types drift, and the day one gains a field the other lacks the shared helper silently stops
// satisfying this script.
import type { CardRow } from "../src/lib/labels/publish";
import { publishRun, readCardsByName, stampWave } from "../src/lib/labels/publish";
import { validateJob } from "../src/lib/labels/schema";
import type { Job } from "../src/lib/labels/types";

/** Sonnet 4.5, Hugh's pick (2026-09-26), chosen on the restriction family rather than price. */
const MODEL = process.env.LABEL_MODEL ?? "claude-sonnet-4-5";

/**
 * The cap, and the pause. Hugh's ruling: hard stop $55, and PAUSE AND REPORT if the
 * projection passes $50 rather than spending up to the stop silently.
 *
 * Both are bounded ABOVE as well as below: a fat-fingered `LABEL_CAP_USD=5500` is a plausible
 * typo and would authorise a hundred times the approved spend.
 */
const CAP_USD = boundedNumber("LABEL_CAP_USD", process.env.LABEL_CAP_USD, 55, 0, 100);
const REPORT_AT_USD = boundedNumber("LABEL_REPORT_AT_USD", process.env.LABEL_REPORT_AT_USD, 50, 0, 100);

/** 95% of the cards asked about, per the plan. Below it the run refuses and publishes nothing. */
const FLOOR = boundedNumber("LABEL_FLOOR", process.env.LABEL_FLOOR, 0.95, 0, 1);

/**
 * The highest report line `card-labels.yml` will accept from a dispatch — Hugh's $50.
 *
 * Here so the PAUSE can tell the operator whether a dispatch can actually resume the run, which
 * is the one thing its previous two wordings both got wrong. It is a SECOND COPY of a figure the
 * workflow enforces, so `card-labels-workflow.test.mts` asserts the two agree; a remediation that
 * names a ceiling the form does not have is exactly the defect this replaced.
 */
const DISPATCH_REPORT_CEILING_USD = 50;

/**
 * Batch rates for the model actually selected, and a REFUSAL for one this repository has no
 * canonical rate for.
 *
 * `LABEL_MODEL` is configurable and the rates were hardcoded to Sonnet 4.5's, so selecting Haiku
 * produced projections and wave sizes computed from a model three times its price — and an
 * unknown model would have been priced as Sonnet 4.5 and invalidated the cap outright. The rates
 * come from `card-labels-pricing.mjs`, which `card-labels-pricing.test.mts` ties to
 * `scripts/eval/lib/pricing.mts` at batch rates, so there is no third copy of a price here.
 */
const MODEL_KEY = (Object.entries(ALL_MODELS) as [keyof typeof PRICING, string][])
  .find(([, id]) => id === MODEL)?.[0];
if (MODEL_KEY === undefined) {
  throw new Error(
    `LABEL_MODEL="${MODEL}" has no canonical rate. Known: ${Object.values(ALL_MODELS).join(", ")}. `
    + `Refusing rather than pricing an unknown model at another model's rates, which would make `
    + `the $${CAP_USD} cap meaningless.`,
  );
}
// The instruction block is booked at the cache WRITE rate when a breakpoint is sent, because no
// request is guaranteed a warm cache (`SENDS_CACHE_BREAKPOINT`).
const RATES = {
  in: PRICING[MODEL_KEY].in, out: PRICING[MODEL_KEY].out,
  ...(SENDS_CACHE_BREAKPOINT && PRICING[MODEL_KEY].caches ? { system: PRICING[MODEL_KEY].cacheWrite } : {}),
};

/**
 * The sample's measured cost per card, used ONLY to project before this run has measured
 * anything of its own. After the first wave collects, the run's own rate replaces it — a
 * projection that kept using the sample's figure could never notice a run costing more than
 * the sample did, which is the one thing the projection is for.
 */
const SAMPLE_PER_CARD_USD = 0.001291;

const dryRun = process.argv.includes("--dry-run");
/**
 * The REAL Anthropic endpoint, overridden explicitly.
 *
 * `.env` points `ANTHROPIC_BASE_URL` at this repository's local messages proxy, which does not
 * expose `/v1/messages/batches` — so a default client sends `batches.create` to the proxy and the
 * run fails before submitting anything. The sample runner overrides it for exactly this reason and
 * I did not carry that across; a dry run never reaches the call, so nothing I had run would have
 * shown it.
 */
const client = new Anthropic({ baseURL: "https://api.anthropic.com" });

/** A run id that sorts and is readable; the run TOKEN in each custom id derives from it. */
const runId = process.env.LABEL_RUN_ID ?? `run-${new Date().toISOString().replace(/[:.]/g, "-")}`;

const die = (why: string): never => { console.error(`\nbuild-card-labels REFUSED: ${why}`); process.exit(1); };

/**
 * EXIT CODES, because a caller must not have to read prose to know what happened.
 *
 * The weekly workflow polls this script, and it decided success by pattern-matching stdout — which
 * produced three separate findings in three rounds: `*"published"*` also matched "nothing
 * published" on the waiting line, and "nothing to do" also meant "every stale card is unlabelable".
 * Each fix was a better pattern, which is treating the symptom: the coupling itself is the defect,
 * because every message this script prints is then load-bearing for a caller's control flow.
 *
 *   0   done — published, or nothing was stale
 *   75  MORE WORK: a wave went out, or batches are still processing. Call again with the same
 *       LABEL_RUN_ID. (75 is EX_TEMPFAIL — "try again", not a failure.)
 *   1   stop and look: refused, paused, or nothing labelable
 */
const EXIT_DONE = 0;
const EXIT_MORE_WORK = 75;
const EXIT_STOP = 1;

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
    select oracle_id as "oracleId", name, mana_cost, type_line, oracle_text, layout
      from cards
     where commander_legal = true
     order by oracle_id
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
 * Reads ONE PROVIDER BATCH's results into staging, distributing them to the intents that
 * asked for them, and returns what happened.
 *
 * One stream per batch rather than one per chunk: a wave's 400 requests live in a single
 * provider batch, so streaming per chunk would re-read the whole result set 400 times.
 *
 * Four rules, all the sample's, measured there and not re-litigated here:
 *
 * - Results are attributed by `custom_id` to the intent that sent it. A result whose id
 *   belongs to no intent of this run is IGNORED rather than attributed to the nearest one.
 * - A job the schema REJECTS is dropped and recorded, never repaired: a repaired label
 *   stores the repair and the next re-score measures the repair.
 * - A missing or non-array `jobs` is NOT an empty answer. The gold set has hard negatives
 *   where `[]` is correct, so coercing malformed output to `[]` credits it as right on
 *   exactly the cards designed to catch over-labelling.
 * - A returned name is resolved by FACE against what that request asked for, and a name that
 *   is neither is refused rather than inserted.
 */
async function collectBatch(
  batchId: string, intents: { intentKey: string; customId: string; asked: string[] }[],
): Promise<"staged" | "expired"> {
  const byCustom = new Map(intents.map((i) => [i.customId, i]));
  /** Per intent: the cards it got back, and the usage its request reported. */
  const got = new Map<string, {
    byName: Map<string, Job[]>; inTok: number; outTok: number; cacheW: number; cacheR: number;
  }>();
  const slot = (customId: string) => {
    const existing = got.get(customId);
    if (existing) return existing;
    const fresh = { byName: new Map<string, Job[]>(), inTok: 0, outTok: 0, cacheW: 0, cacheR: 0 };
    got.set(customId, fresh);
    return fresh;
  };
  const rejected: string[] = [];

  try {
    for await (const entry of await client.messages.batches.results(batchId)) {
      const intent = byCustom.get(entry.custom_id);
      if (intent === undefined) continue; // not this run's request
      if (entry.result.type !== "succeeded") continue;
      const here = slot(entry.custom_id);
      const u = entry.result.message.usage;
      here.inTok += u.input_tokens; here.outTok += u.output_tokens;
      here.cacheW += u.cache_creation_input_tokens ?? 0;
      here.cacheR += u.cache_read_input_tokens ?? 0;

      const parsed = parseReply(
        entry.result.message.content.map((c) => (c.type === "text" ? c.text : "")).join(""),
      );
      if (!Array.isArray(parsed)) { rejected.push(`${entry.custom_id}: unparseable`); continue; }
      const resolve = faceResolver(intent.asked);
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
        here.byName.set(name, withoutRepeats([...(here.byName.get(name) ?? []), ...kept]));
      }
    }
  } catch (err) {
    // The provider keeps results 29 days; past that a retrieve fails rather than returning
    // nothing, and the cards have to be re-submitted.
    if ((err as { status?: number }).status === 404) return "expired";
    throw err;
  }

  // One catalog read for the whole batch, then one staging insert per intent so a row carries
  // the hash of the card as it is NOW rather than as the request rendered it.
  // THE SHARED HELPER, and this is the more dangerous of the two copies: it runs only after a
  // batch has come BACK, so its 42809 would have fired with the money already spent, on the very
  // invocation meant to bank the results. Found by sweeping the class rather than by the incident.
  const allNames = [...got.values()].flatMap((g) => [...g.byName.keys()]);
  const byName = new Map((await readCardsByName(db, allNames)).map((c) => [c.name, c]));

  for (const intent of intents) {
    const here = got.get(intent.customId);
    const rows = [...(here?.byName.keys() ?? [])]
      .map((n) => byName.get(n))
      .filter((c): c is CardRow => c !== undefined)
      .map((c) => ({
        runId, oracleId: c.oracleId, labels: here?.byName.get(c.name) ?? [],
        model: MODEL, promptVersion: LABEL_PROMPT_VERSION, inputHash: labelInputHash(c, MODEL),
      }));
    if (rows.length > 0) {
      // Staged, never published: the floor is evaluated over the whole run, so nothing reaches
      // `card_labels` until every batch is in and the share is known.
      await db.insert(cardLabelsStaging).values(rows).onConflictDoNothing();
    }
    await db.update(cardLabelBatches)
      .set({
        status: "collected", batchId, collectedAt: new Date(),
        inTokens: here?.inTok ?? 0, outTokens: here?.outTok ?? 0,
        cacheWriteTokens: here?.cacheW ?? 0, cacheReadTokens: here?.cacheR ?? 0,
      })
      .where(eq(cardLabelBatches.intentKey, intent.intentKey));
  }
  if (rejected.length > 0) console.warn(`  ${batchId}: dropped ${rejected.length} item(s)`);
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
async function reconcile(): Promise<{
  done: Set<string>; waiting: number; abandoned: string[]; askedByKey: Map<string, string[]>;
}> {
  // EVERY intent already collected for this run, from any earlier invocation. Seeding `done`
  // from this process's work alone was a double charge: run 1 submits wave 1, run 2 collects it
  // and submits wave 2, run 3 sees only wave 2 as open — so `done` held wave 2, `chunks` was
  // everything-but-wave-2, and its first 400 entries were wave 1, ALREADY PAID FOR, handed
  // straight back to `batches.create`. `submit` then reset those rows to `submitted`, dropping
  // their measured tokens out of the `alreadySpent` sum and inflating the remaining budget, and
  // the publish path became unreachable for any run of three or more invocations.
  const already = await db.select({ key: cardLabelBatches.intentKey, asked: cardLabelBatches.asked })
    .from(cardLabelBatches)
    .where(and(eq(cardLabelBatches.runId, runId), eq(cardLabelBatches.status, "collected")));
  const done = new Set(already.map((r) => r.key));
  /** What each finished chunk ACTUALLY asked about, so a shifted plan can be detected. */
  const askedByKey = new Map(already.map((r) => [r.key, r.asked]));

  const open = await db.select().from(cardLabelBatches)
    .where(and(eq(cardLabelBatches.runId, runId), sql`${cardLabelBatches.status} <> 'collected'`));
  if (open.length === 0) return { done, waiting: 0, abandoned: [], askedByKey };

  console.log(`reconciling ${open.length} open intent(s) from ${runId}`);
  // Listed ONCE, not per intent: the ambiguous branch needs the same page of batches for every
  // one of them, and a list call per intent is a round trip per chunk.
  //
  // **Only ENDED batches are streamed, and a failure to stream one is survived.** `results()`
  // calls `retrieve` and THROWS when `results_url` is null — so a batch still processing
  // anywhere in the workspace, including this run's own, aborted the whole reconciliation
  // before a single intent was resolved. The error carries no `.status`, so nothing classified
  // it either. That left the one recovery path that prevents a double charge unable to run in
  // exactly the situation it exists for: another batch in flight.
  //
  // The page is also bounded. `for await` over `list()` auto-paginates the entire account
  // history, which grows without limit; a lost id is by definition recent, so one page is the
  // right scope and a wider sweep is cost without evidence.
  const byCustomId = new Map<string, string>();
  /** True when the search was exhaustive, so "not found" actually means "never submitted". */
  let searchWasComplete = false;
  /** Set when any listed batch is still running, which makes "not found" inconclusive. */
  let anyStillProcessing = false;
  const unresolved = new Set(open.filter((o) => o.batchId === null).map((o) => o.customId));
  if (unresolved.size > 0) {
    // PAGINATED UNTIL EXHAUSTED, or until every lost id is accounted for. One page of 100 does
    // NOT prove the provider has no matching batch — other activity can push a lost batch past
    // it — and treating a truncated search as "no match" re-submits a request a successful
    // `create` already accepted. So the search either completes or says it did not.
    let cursor: string | undefined;
    let pages = 0;
    do {
      const page = await client.messages.batches.list({ limit: 100, ...(cursor ? { after_id: cursor } : {}) });
      pages++;
      for (const batch of page.data) {
        if (batch.processing_status !== "ended") continue;
        try {
          for await (const r of await client.messages.batches.results(batch.id)) {
            byCustomId.set(r.custom_id, batch.id);
            unresolved.delete(r.custom_id);
          }
        } catch (err) {
          // One unreadable batch must not blind the lookup to the others.
          console.warn(`  could not read ${batch.id}: ${(err as Error).message}`);
        }
      }
      // A batch still PROCESSING has no readable results, so it is skipped above — which means
      // its `custom_id`s cannot be matched. If any such batch exists, the absence of a match
      // proves nothing: the lost request may be running inside it right now. Treating an
      // exhausted page as proof would re-plan work that is in flight.
      if (page.data.some((b) => b.processing_status !== "ended")) anyStillProcessing = true;
      cursor = page.data.at(-1)?.id;
      if (unresolved.size === 0) { searchWasComplete = true; break; }
      if (!page.has_more) { searchWasComplete = !anyStillProcessing; break; }
    } while (pages < 50);
    console.log(`  searched ${pages} page(s) of provider batches; `
      + `${unresolved.size} id(s) still unaccounted for`
      + (anyStillProcessing ? "; a batch is still processing, so absence proves nothing" : ""));
  } else {
    searchWasComplete = true;
  }

  const abandoned: string[] = [];
  let waiting = 0;

  // Intents whose id is still unknown after the lookup above. Resolved by AGE, not by
  // guessing: a batch the provider would still list is recent, so a young unresolved intent
  // is simply re-planned (omitted from `done`), while an old one is `abandoned` and reported
  // rather than silently re-submitted.
  for (const intent of open.filter((o) => (o.batchId ?? byCustomId.get(o.customId) ?? null) === null)) {
    // A young intent is re-planned only when the search was EXHAUSTIVE, so "not found" means
    // "never submitted" rather than "not on the page I looked at". Otherwise it is abandoned and
    // reported: re-submitting a request the provider already accepted is the double charge.
    if (searchWasComplete && Date.now() - intent.intendedAt.getTime() < 60 * 60 * 1000) continue;
    await db.update(cardLabelBatches).set({ status: "abandoned" })
      .where(eq(cardLabelBatches.intentKey, intent.intentKey));
    abandoned.push(intent.intentKey);
  }

  // GROUPED BY BATCH, and that is not tidiness. One provider batch holds every chunk of a
  // model's wave, so collecting per intent would `retrieve` the same batch once per chunk and
  // stream its whole result set once per chunk — 400 API calls and 160,000 result reads for a
  // 400-request wave, where 1 and 400 will do. Each batch is retrieved once and streamed once,
  // and its results are distributed to the intents that asked for them.
  const byBatch = new Map<string, typeof open>();
  for (const intent of open) {
    const id = intent.batchId ?? byCustomId.get(intent.customId) ?? null;
    if (id === null) continue;
    byBatch.set(id, [...(byBatch.get(id) ?? []), intent]);
  }

  for (const [batchId, intents] of byBatch) {
    const batch = await client.messages.batches.retrieve(batchId);
    if (batch.processing_status !== "ended") {
      waiting += intents.length; // chunks, not batches — named as such where it is printed
      await db.update(cardLabelBatches).set({ status: "in_progress", batchId })
        .where(inArray(cardLabelBatches.intentKey, intents.map((i) => i.intentKey)));
      continue;
    }
    const collected = await collectBatch(batchId, intents);
    if (collected === "expired") {
      await db.update(cardLabelBatches).set({ status: "expired", batchId })
        .where(inArray(cardLabelBatches.intentKey, intents.map((i) => i.intentKey)));
      console.warn(`  ${batchId}: results expired — its ${intents.length} chunk(s) will be re-submitted`);
      continue;
    }
    for (const i of intents) done.add(i.intentKey);
  }

  return { done, waiting, abandoned, askedByKey };
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
  // THE INSERT IS THE CLAIM, and only what this process actually inserted is submitted.
  //
  // Two invocations sharing a `LABEL_RUN_ID` — copied by hand from a previous run's output, so an
  // ordinary mistake — could otherwise both reconcile, both find the intents already present
  // because `onConflictDoNothing` leaves them, and both call `batches.create` for the same
  // chunks. The last stamp wins, so one provider batch becomes invisible to the ledger while BOTH
  // are billable: the double charge, arriving through concurrency rather than a crash.
  //
  // `returning()` on a conflict-do-nothing insert reports the rows THIS statement created, which
  // is an atomic claim decided by the database rather than by a read the other process cannot
  // see. A session advisory lock was the first attempt and it is INERT here: `drizzle(url)` pools
  // connections, session locks are per connection, and a second connection took the same lock —
  // measured, both returned true.
  const claimed = await db.insert(cardLabelBatches).values(chunks.map((c) => ({
    intentKey: c.intentKey, runId, model: MODEL, customId: c.customId, asked: c.names,
  }))).onConflictDoNothing().returning({ intentKey: cardLabelBatches.intentKey });

  const mine = new Set(claimed.map((r) => r.intentKey));
  const unclaimed = chunks.filter((c) => !mine.has(c.intentKey));
  if (unclaimed.length > 0) {
    console.error(`\n${unclaimed.length} of ${chunks.length} chunk(s) were already claimed by `
      + `another process for ${runId}. Nothing has been submitted by this one.`);
    return die(`two invocations of one run can both submit the same chunks, and both are `
      + `billable. Wait for the other process, or start a new run.`);
  }

  // THE SHARED HELPER. This is the read that took run 36361018105 down with Postgres 42809, four
  // lines above `batches.create` — so nothing was submitted and nothing spent. Keeping a copy here
  // is the failure `stampWave` already taught: the probe went green on its own copy while the
  // script ran code nothing exercised.
  const rows = await readCardsByName(db, chunks.flatMap((c) => c.names));
  const byName = new Map(rows.map((c) => [c.name, c]));
  const requests = chunks.map((c) => buildRequest(
    c.customId, MODEL, c.names.map((n) => byName.get(n)).filter((c2): c2 is CardRow => c2 !== undefined),
  ));

  const batch = await client.messages.batches.create({ requests });
  // Scoped to THIS WAVE's intent keys, not to "every null batch id in this run". An earlier
  // wave can legitimately have left a null id behind — that is the ambiguous state `reconcile`
  // resolves against the provider — and stamping this batch's id onto it would assert that a
  // request belongs to a batch that never contained it, corrupting the one lookup the resume
  // path depends on.
  // The SHARED helper, which the probe also calls. This had its own copy of the same update: the
  // probe was green on `stampWave` while the script ran code nothing exercised, which is the
  // failure extracting it was supposed to end.
  await stampWave(db, chunks.map((c) => c.intentKey), batch.id);
  console.log(`submitted ${requests.length} request(s) as ${batch.id}`);
}

/**
 * The input figures the WORST CASE is booked on, and both are CEILINGS rather than averages.
 *
 * This matters more than it looks: `waveSize` and `withinCap` bound Hugh's $55 hard stop on
 * these numbers, so a figure that is merely typical makes the bound merely typical too.
 *
 * `SYSTEM_TOKENS` is `SYSTEM_TOKENS_BOUND`, one token per character of the block as it is NOW. It was
 * the BILLED 1,215, measured on the block before the vocabulary plan's Task 2 widened it, and a
 * measurement of an older string is no ceiling on a longer one. Task 6 re-measures it.
 *
 * `PER_CARD_TOKENS` is the MAXIMUM a commander-legal card renders to, measured over all 31,830
 * of them: 892 characters, so 223 tokens at four characters each. The mean is 51 and the 99th
 * percentile 122, and booking either would mean a request of twelve wordy cards costs multiples
 * of what the cap reserved for it. An average is the right basis for a projection and the wrong
 * one for a ceiling, and these two are ceilings.
 */
const SYSTEM_TOKENS = SYSTEM_TOKENS_BOUND;
/**
 * ONE TOKEN PER CHARACTER for the variable text, which is a provable upper bound rather than an
 * estimate: no tokenizer emits more tokens than the string has characters.
 *
 * `892 / 4` was the first version and it is not a maximum — four characters a token is an
 * AVERAGE, and punctuation, short fragments and non-Latin text all beat it. A bound derived from
 * an average is not a bound, and this is the quantity the $55 hard stop is enforced against.
 *
 * It costs almost nothing to be this conservative, which is why there is no argument for
 * precision here: input is a small share of the worst case, so over all 2,653 requests the
 * difference between 4 chars a token and 1 is $174.90 against $206.85. `SYSTEM_TOKENS` is the same
 * kind of bound until Task 6 replaces it with a billed count measured on the current block.
 */
const PER_CARD_TOKENS = 892;

/**
 * The body's own fixed text, DERIVED from `renderBody` rather than estimated: the
 * "Label these N cards." line plus the `---` separators between them. Measured by rendering a
 * full request of empty cards, so what is left is exactly the wrapper.
 */
const BODY_OVERHEAD_TOKENS = renderBody(
  Array.from({ length: CARDS_PER_REQUEST }, () => ({
    name: "", mana_cost: null, type_line: "", oracle_text: null, layout: "normal",
  })),
).length; // characters, for the reason above

async function main(): Promise<void> {
  console.log(`run ${runId}  model ${MODEL}  cap $${CAP_USD.toFixed(2)}${dryRun ? "  (dry run)" : ""}`);

  // RECONCILE FIRST, always, before anything is planned or priced. An in-flight batch this
  // run cannot see is work it would submit again.
  const { done, waiting, abandoned, askedByKey } = dryRun
    ? { done: new Set<string>(), waiting: 0, abandoned: [] as string[], askedByKey: new Map<string, string[]>() }
    : await reconcile();
  if (abandoned.length > 0) {
    console.error(`\n${abandoned.length} intent(s) ABANDONED — submitted, id lost, and no longer`);
    console.error(`listed by the provider. Their cards are NOT re-submitted automatically:`);
    for (const k of abandoned) console.error(`  ${k}`);
    return die(`unresolvable intents. Re-run with LABEL_RUN_ID=<new id> to relabel their cards, `
      + `accepting that the originals may already have been charged.`);
  }
  if (waiting > 0) {
    console.log(`\n${waiting} chunk(s) still processing. Nothing submitted, nothing published.`);
    console.log(`Re-run with LABEL_RUN_ID=${runId} to resume when they finish.`);
    process.exitCode = EXIT_MORE_WORK;
    return;
  }

  const all = await cardsNeedingLabels();

  // **A CARD WHOSE NAME IS SHARED IS EXCLUDED AND NAMED, never labelled by guess.**
  //
  // The prompt asks by name and the model answers by name, so two oracle rows sharing one name are
  // indistinguishable in the reply — and the name-keyed lookups in `submit` and `collectBatch`
  // would collapse them to whichever row the map kept, leaving the other card's hash stale, or
  // stage one oracle id twice. `src/lib/tuning/resolve-names.ts` exists because catalog names are
  // NOT unique, and it takes the same position: resolve when unambiguous, otherwise drop rather
  // than guess.
  //
  // Zero such cards in the legal set today, so this costs nothing now; it is here because the
  // catalog refreshes weekly and a run costs money, so the day one appears is not the day to
  // discover that a label went to the wrong card.
  const byNameCount = new Map<string, number>();
  for (const c of all) byNameCount.set(c.name, (byNameCount.get(c.name) ?? 0) + 1);
  const ambiguous = all.filter((c) => (byNameCount.get(c.name) ?? 0) > 1);
  const cards = all.filter((c) => (byNameCount.get(c.name) ?? 0) === 1);
  if (ambiguous.length > 0) {
    console.warn(`\n${ambiguous.length} card(s) share a name with another oracle row and are `
      + `EXCLUDED — the model's reply could not be attributed to one of them:`);
    for (const c of ambiguous.slice(0, 10)) console.warn(`  ${c.name} (${c.oracleId})`);
    if (ambiguous.length > 10) console.warn(`  ...and ${ambiguous.length - 10} more`);
  }

  console.log(`${cards.length} card(s) need labels (stored hash differs or absent)`);

  const planned = planChunks(runId, MODEL, cards.map((c) => c.name));

  // **THE PLAN MUST NOT HAVE SHIFTED UNDER A RESUMED RUN.** `planChunks` is keyed on index, so
  // a card entering or leaving the set between waves moves every later chunk's contents. A
  // finished chunk would then be skipped as `done` while now naming DIFFERENT cards, and those
  // cards would never be asked about — invisible except as an unexplained floor shortfall at the
  // end. The catalog refreshes weekly and a seven-wave run can span days, so this is a matter of
  // course rather than an edge case.
  //
  // Detected by comparing each finished chunk's planned names against the `asked` this run
  // actually stored for it. A mismatch REFUSES: re-planning silently would relabel cards whose
  // work is already paid for and skip cards nobody has asked about.
  const shifted = planned.filter((c) => {
    const asked = askedByKey.get(c.intentKey);
    return asked !== undefined && asked.join("\u0000") !== c.names.join("\u0000");
  });
  if (shifted.length > 0) {
    return die(`the card set has changed since this run started, so chunk indices no longer line `
      + `up: ${shifted.length} finished chunk(s) now name different cards (first: `
      + `${shifted[0].intentKey}). Re-planning would skip cards nobody asked about. Publish or `
      + `abandon ${runId} and start a new run, which will chunk the current set from scratch.`);
  }

  const chunks = planned.filter((c) => !done.has(c.intentKey));

  // NOTHING LEFT TO SUBMIT is the publish path, not an early exit. It is reached two ways: a
  // resumed run whose last batches just collected, and a run with no stale cards at all. The
  // second has nothing staged and publishes nothing; the first is the end of the run.
  if (chunks.length === 0) {
    const asked = planned.reduce((n, c) => n + c.names.length, 0);
    const [{ n: staged }] = await db.select({ n: sql<number>`count(*)::int` })
      .from(cardLabelsStaging).where(eq(cardLabelsStaging.runId, runId));
    if (staged === 0) {
      // THREE different states reach here and they are not interchangeable. Collapsing the first
      // two printed "every card's label matches its inputs" when stale cards existed and were
      // simply unlabelable — so the weekly workflow matched it as success and would have reported
      // green for ever while those cards were never labelled.
      if (asked === 0 && ambiguous.length > 0) {
        console.error(`\nEVERY stale card is unlabelable: ${ambiguous.length} share a name with `
          + `another oracle row, and the model's reply could not be attributed to one of them. `
          + `Nothing was submitted and nothing is stale-but-doable. These cards stay unlabelled `
          + `until the duplicate names are resolved — this is NOT a no-op.`);
        process.exitCode = EXIT_STOP;
        return;
      }
      console.log(asked === 0
        ? "nothing to do — every Commander-legal card's label matches its inputs"
        : "nothing staged and nothing left to submit — re-run to plan these cards afresh");
      if (asked > 0) process.exitCode = EXIT_STOP;
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
    const published = await publishRun(db, runId);
    console.log(`published ${published} label(s) in one transaction`);
    return;
  }
  const worst = worstCaseUsd(chunks.length, SYSTEM_TOKENS, PER_CARD_TOKENS, MAX_TOKENS_PER_BATCH, RATES, BODY_OVERHEAD_TOKENS);

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

  // Measured cost of what came back.
  const measuredUsd = (usage.inTok * RATES.in + usage.outTok * RATES.out
    + usage.cacheW * RATES.in * 1.25 + usage.cacheR * RATES.in * 0.1) / 1e6;

  // PLUS a reservation for work that was billed and could not be read. An `expired` batch was
  // paid for — the provider ran it — and its results are simply gone past the 29-day window, so
  // there are no tokens to sum. Counting it as $0 and then re-submitting its chunks spends twice
  // and can carry actual spend past the cap while the ledger says there is room. Reserved at the
  // WORST case, because the real figure is unknowable once the results have gone.
  const [{ n: expiredChunks }] = await db.select({ n: sql<number>`count(*)::int` })
    .from(cardLabelBatches)
    .where(and(eq(cardLabelBatches.runId, runId), eq(cardLabelBatches.status, "expired")));
  const expiredReserve = worstCaseUsd(
    expiredChunks, SYSTEM_TOKENS, PER_CARD_TOKENS, MAX_TOKENS_PER_BATCH, RATES, BODY_OVERHEAD_TOKENS,
  );
  const alreadySpent = measuredUsd + expiredReserve;
  if (expiredChunks > 0) {
    console.log(`  ${expiredChunks} expired chunk(s) reserved at worst case $${expiredReserve.toFixed(2)} `
      + `— billed, unreadable, so counted rather than assumed free`);
  }
  /** This run's own measured rate, which is what the projection must use once it has one. */
  const measuredPerCard = usage.cards > 0 ? alreadySpent / usage.cards : SAMPLE_PER_CARD_USD;

  console.log(`  ${chunks.length} request(s) of ${CARDS_PER_REQUEST}  worst case $${worst.toFixed(2)}`
    + (alreadySpent > 0 ? `  (plus $${alreadySpent.toFixed(2)} already committed)` : ""));

  // ONE WAVE AT A TIME, because `batches.create` is atomic: submitting every request commits
  // the run to their whole cost with no way to stop at the cap. A wave sized to the REMAINING
  // budget means the worst case is bounded at every point, and the next wave is authorised
  // against what the previous one actually cost.
  const remaining = CAP_USD - alreadySpent;
  const size = waveSize(remaining, SYSTEM_TOKENS, PER_CARD_TOKENS, MAX_TOKENS_PER_BATCH, RATES, 400, BODY_OVERHEAD_TOKENS);
  if (size === 0) {
    return die(`no budget left for even one request: $${alreadySpent.toFixed(2)} of the `
      + `$${CAP_USD.toFixed(2)} cap is committed, and one request's worst case is `
      + `$${worstCaseUsd(1, SYSTEM_TOKENS, PER_CARD_TOKENS, MAX_TOKENS_PER_BATCH, RATES, BODY_OVERHEAD_TOKENS).toFixed(4)}.`);
  }

  const wave = chunks.slice(0, size);
  const waveWorst = worstCaseUsd(wave.length, SYSTEM_TOKENS, PER_CARD_TOKENS, MAX_TOKENS_PER_BATCH, RATES, BODY_OVERHEAD_TOKENS);
  const verdict = withinCap(waveWorst, alreadySpent, CAP_USD);
  if (!verdict.ok) return die(verdict.why);

  console.log(`  this wave: ${wave.length} request(s), worst case $${waveWorst.toFixed(2)}`);
  console.log(`  ${chunks.length - wave.length} request(s) wait for a later wave`);
  console.log(`  whole run expected ~$${(measuredPerCard * cards.length).toFixed(2)} at `
    + `${usage.cards === 0 ? "the sample's" : "this run's"} measured rate; worst case if every `
    + `request returns its full ceiling $${worst.toFixed(2)}`);

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
    // THE REMEDIATION HAS TO BE FOLLOWABLE, and has now been wrong twice in opposite directions.
    //
    // It first said `LABEL_REPORT_AT_USD=${CAP_USD}` — on the run most likely to pause, a backfill
    // dispatched at the cap, that reads "set it to 55", which `card-labels.yml` refuses. Then it
    // said "a higher report line, up to $50", which is unfollowable in the case that matters: a
    // run ALREADY at $50 has no higher input, so retrying at the maximum pauses again.
    //
    // So the line states the figure the report line would have to reach, and says plainly whether
    // a dispatch can reach it. Past the form's ceiling the answer is not a bigger number — the
    // projection is past what Hugh approved, and that is a decision plus a deliberate change.
    console.error(`Nothing further has been submitted. Report the figure and hold for Hugh.`);
    console.error(pauseRemediation(projected, DISPATCH_REPORT_CEILING_USD).text);
    // NON-ZERO. A plain `return` here exited 0, so the one week the report line actually fired
    // would have shown a GREEN step — and the workflow's own comment claims the two guards are
    // visible "in the only place anyone looks". A pause is a hold awaiting a decision, which is
    // not success.
    process.exitCode = EXIT_STOP;
    return;
  }

  if (dryRun) {
    console.log("\ndry run — nothing submitted, nothing published");
    return;
  }

  await submit(wave);
  console.log(`\nSubmitted wave of ${wave.length}. Batches are asynchronous: re-run with `
    + `LABEL_RUN_ID=${runId} to collect it and submit the next wave.`);
  process.exitCode = EXIT_MORE_WORK;
}

main().catch((err) => { console.error(err); process.exit(1); });
