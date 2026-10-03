// The label build's WAVES, proved against a real Postgres with a FAKE provider.
//
// What this exists to prove is money that used to be lost between waves, and none of it is
// visible in a value a pure function returns:
//
//   (a) A RUN STOPPED AT ITS CAP HAS PUBLISHED WHAT IT COLLECTED. Before, a run published only
//       once nothing was left to submit, so a cap stop — the cap working — published nothing.
//       Checked as an equality: the labels in `card_labels` are exactly the cards the collected
//       batches asked about.
//   (b) A NEW RUN ID ASKS ONLY FOR THE REMAINDER. Before, a new id re-planned every card the
//       stopped run had paid for. Checked by counting how often each card was asked across every
//       intent the probe's runs wrote: once, except the chunk deliberately failed in (e).
//   (c) A CRASH INSIDE THE COLLECT TRANSACTION LEAVES NOTHING HALF-DONE, AND IS RECOVERED FREE.
//       A probe-only hook throws after the batch is staged, published and marked collected but
//       before the commit; nothing of it may survive, and a run under a NEW id must collect that
//       same batch id and submit nothing for its cards.
//   (d) A LEGACY LEDGER ROW WITH NO PROMPT VERSION COSTS THE FAMILY NOTHING — including, on a
//       branch of staging, the real `backfill-2026-09-28` rows.
//   (e) A TERMINAL FAILURE IS RETRIED ONCE AND COUNTED ONCE. An expired batch reserves its worst
//       case; the retry takes attempt 2, errors outright (unbilled), and attempt 3 succeeds. The
//       family's spend is checked to equal each of those exactly once.
//   (f) AN OLDER PROMPT'S ANSWER IS NEVER PUBLISHED AS CURRENT. A run's own open intent asked under
//       an older prompt is left uncollected and its cards are asked again; a row an older build
//       staged under the same run id is overwritten by the new answer, not published in its place.
//   (g) AN ANSWER DESCRIBES THE TEXT IT WAS ASKED ABOUT. A card whose oracle text moves, or whose
//       NAME changes, while its batch is pending is not published under the new inputs' hash and
//       does not count against the batch's floor; it is asked again.
//   (h) EVERY MODEL COUNTS AGAINST THE FAMILY, each at its own rates, and a model with no
//       canonical rate refuses rather than counting as free.
//
// NO API CALL IS MADE AND NOTHING IS SPENT: the build's client is a parameter, and this passes a
// fake that answers from the ledger's own `asked` lists. It runs the REAL `runLabelBuild`, with a
// probe-only scope (`onlyOracleIds`) of 72 cards and a probe-only commit hook.
//
// THE TARGET IS NAMED. `PROBE_TARGET_URL` and `PROBE_TARGET_BRANCH`, and the database must report
// exactly that branch by `neon.branch_id`; production, staging and local-dev are refused by id.
// Scratch branches only: the cross-run reconcile is the feature under test, so a run here collects
// ANY open intent of this model and prompt on the branch, and a shared database's real intents
// would be handed to the fake. It writes `card_label_batches` rows under its own run ids (a
// `backfill-2099-*` family, so it shares no budget with a real run), their staging rows, and
// `card_labels` for 72 cards that had none, and deletes all of it in a `finally`.
import { randomUUID } from "node:crypto";

import { requireEnv } from "./lib/env.mjs";

const { PROBE_TARGET_URL, PROBE_TARGET_BRANCH } = requireEnv(["PROBE_TARGET_URL", "PROBE_TARGET_BRANCH"]);
/** Production, staging and local-dev, by id. A URL can be mistyped into any of them. */
const NEVER = new Set(["br-noisy-violet-a6vw4ess", "br-polished-pond-a6e63y0b", "br-patient-hall-a6nbonvo"]);
if (NEVER.has(PROBE_TARGET_BRANCH)) throw new Error(`refusing ${PROBE_TARGET_BRANCH}: scratch branches only`);
// BEFORE `src/db` is imported, because it reads the variable at module scope; `env.mjs` has already
// loaded `.env`, so this assignment is the last word.
process.env.DATABASE_URL = PROBE_TARGET_URL;

const { and, eq, inArray, like, sql } = await import("drizzle-orm");
const { db } = await import("../src/db");
const { cardLabelBatches, cardLabels, cardLabelsStaging } = await import("../src/db/schema");
const {
  EXIT_DONE, EXIT_MORE_WORK, EXIT_STOP, MODEL, RATES, REQUEST_WORST_USD, readFamilySpend, runLabelBuild,
} = await import("./lib/card-labels-build");
type BatchClient = import("./lib/card-labels-build").BatchClient;
const { validateJob } = await import("../src/lib/labels/schema");
const { LABEL_PROMPT_VERSION } = await import("../src/lib/labels/prompt");
const { ALL_MODELS, PRICING } = await import("./lib/card-labels-pricing.mjs");

let failures = 0;
const report = (what: string, ok: boolean, detail = "") => {
  if (!ok) failures++;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${what}${detail ? ` — ${detail}` : ""}`);
};
const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

const JOB = {
  space: "role", kind: "ramp", rampKind: "tapsForMana", restrictedTo: null, affects: null, to: null, method: null,
  trigger: "none", recurrence: "repeatable", threshold: null, modal: false,
};

const r = REQUEST_WORST_USD;
/** Output tokens that cost 0.8 of one request's worst case, so two requests use most of 2.5r. */
const OUT_TOKENS = Math.round((0.8 * r * 1e6) / RATES.out);
const PER_REQUEST_USD = (OUT_TOKENS * RATES.out) / 1e6;

const RUN = {
  a: "backfill-2099-01-01", b: "backfill-2099-01-02", c: "backfill-2099-01-03", d: "backfill-2099-01-04",
  e: "backfill-2099-01-05", g: "backfill-2099-01-06", h: "backfill-2099-01-07", legacy: "backfill-2099-12-31",
};
const probeRuns = Object.values(RUN);

// ---- the fake provider --------------------------------------------------------------------------

type Outcome = "ok" | "errored" | "expired";
const sent = new Map<string, { customIds: string[]; outcome: Outcome }>();
let nextOutcome: Outcome = "ok";
let armCrash = false;
let crashBatch: string | null = null;
let creates = 0;

const notFound = (what: string) => Object.assign(new Error(`${what}: not found`), { status: 404 });

const fake = {
  async create({ requests }: { requests: { custom_id: string }[] }) {
    const id = `msgbatch_probe_${randomUUID().replace(/-/g, "")}`;
    sent.set(id, { customIds: requests.map((q) => q.custom_id), outcome: nextOutcome });
    if (armCrash) { crashBatch = id; armCrash = false; }
    nextOutcome = "ok";
    creates++;
    return { id };
  },
  async retrieve(id: string) { return { id, processing_status: "ended" }; },
  // The ambiguous-id search is not under test here; an empty listing is a complete one.
  async list() { return { data: [], has_more: false }; },
  async results(id: string) {
    const batch = sent.get(id);
    // An expired batch's results are gone, which the provider reports as a 404 on retrieve.
    if (batch === undefined || batch.outcome === "expired") throw notFound(id);
    // Answered FROM THE LEDGER: the cards each request asked are what its intent recorded.
    const rows = await db.select({ customId: cardLabelBatches.customId, asked: cardLabelBatches.asked })
      .from(cardLabelBatches).where(inArray(cardLabelBatches.customId, batch.customIds));
    return (async function* () {
      for (const row of rows) {
        if (batch.outcome === "errored") {
          yield { custom_id: row.customId, result: { type: "errored", error: { type: "error", error: {} } } };
          continue;
        }
        yield {
          custom_id: row.customId,
          result: {
            type: "succeeded",
            message: {
              content: [{ type: "text", text: JSON.stringify(row.asked.map((name) => ({ name, jobs: [JOB] }))) }],
              usage: { input_tokens: 0, output_tokens: OUT_TOKENS, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
            },
          },
        };
      }
    })();
  },
} as unknown as BatchClient;

// ---- helpers ------------------------------------------------------------------------------------

let scope: { oracleId: string; name: string }[] = [];
/** Twelve more unlabelled cards, outside `scope`, for (f). */
let extra: { oracleId: string; name: string }[] = [];
/** Twelve more again, for (g). */
let moving: { oracleId: string; name: string }[] = [];
/** The oracle text (g) changes, put back in the `finally`. */
let movedText: { oracleId: string; text: string | null } | null = null;
/** The name (g) changes, put back in the `finally`. */
let movedName: { oracleId: string; name: string } | null = null;

const run = (runId: string, capUsd: number, cards = scope) => runLabelBuild({
  client: fake, runId, capUsd, reportAtUsd: 100, floor: 0.95, dispatchCeilingUsd: 50, dryRun: false, scope: "all",
  onlyOracleIds: cards.map((c) => c.oracleId),
  hooks: {
    beforeCommit: (batchId) => {
      if (batchId === crashBatch) { crashBatch = null; throw new Error("probe: crash inside the collect transaction"); }
    },
  },
});

const intentsOf = (runId: string) => db.select().from(cardLabelBatches).where(eq(cardLabelBatches.runId, runId));
const labelledInScope = async () => (await db.select({ id: cardLabels.oracleId }).from(cardLabels)
  .where(inArray(cardLabels.oracleId, scope.map((c) => c.oracleId)))).length;
const spentInUnits = async (runId: string) => (await readFamilySpend(runId)).totalUsd;

async function cleanup(): Promise<void> {
  // Each step on its own, so one failing cannot skip the rest — and a failed step is a failure.
  const steps: [string, () => Promise<unknown>][] = [
    ["card name", () => movedName === null ? Promise.resolve()
      : db.execute(sql`update cards set name = ${movedName.name} where oracle_id = ${movedName.oracleId}`)],
    ["card text", () => movedText === null ? Promise.resolve()
      : db.execute(sql`update cards set oracle_text = ${movedText.text} where oracle_id = ${movedText.oracleId}`)],
    ["ledger", () => db.delete(cardLabelBatches).where(inArray(cardLabelBatches.runId, probeRuns))],
    ["staging", () => db.delete(cardLabelsStaging).where(inArray(cardLabelsStaging.runId, probeRuns))],
    ["labels", () => scope.length + extra.length + moving.length === 0 ? Promise.resolve()
      : db.delete(cardLabels).where(inArray(cardLabels.oracleId, [...scope, ...extra, ...moving].map((c) => c.oracleId)))],
  ];
  for (const [what, step] of steps) {
    try { await step(); } catch (err) { failures++; console.error(`FAIL cleanup: ${what}`, err); }
  }
}

// ---- the walk -----------------------------------------------------------------------------------

async function main(): Promise<void> {
  const [{ branch }] = (await db.execute<{ branch: string | null }>(
    sql`select current_setting('neon.branch_id', true) as branch`)).rows;
  if (branch !== PROBE_TARGET_BRANCH) {
    throw new Error(`the target reports branch ${String(branch)}, not ${PROBE_TARGET_BRANCH}; refusing`);
  }
  if (validateJob(JOB).length > 0) throw new Error(`the canned job no longer validates: ${validateJob(JOB).join(", ")}`);

  // Debris from a run killed before its `finally`, swept by the probe's own run-id family.
  await db.delete(cardLabelBatches).where(like(cardLabelBatches.runId, "backfill-2099-%"));
  await db.delete(cardLabelsStaging).where(like(cardLabelsStaging.runId, "backfill-2099-%"));

  // 72 cards — six requests — with no label, and a name no other catalog row carries: the build
  // resolves replies BY NAME, so a shared name could stage a label onto a different oracle id.
  const picked = await db.execute<{ oracleId: string; name: string }>(sql`
    select c.oracle_id as "oracleId", c.name from cards c
     where c.commander_legal = true
       and not exists (select 1 from card_labels l where l.oracle_id = c.oracle_id)
       and (select count(*) from cards c2 where c2.name = c.name) = 1
     order by c.oracle_id limit 96`);
  if (picked.rows.length < 96) throw new Error(`need 96 unlabelled cards, found ${picked.rows.length}`);
  scope = picked.rows.slice(0, 72);
  extra = picked.rows.slice(72, 84);
  moving = picked.rows.slice(84);
  const chunkNames = (i: number) => scope.slice(i * 12, (i + 1) * 12).map((c) => c.name);
  console.log(`one request's worst case r = $${r.toFixed(4)}; each fake request reports $${PER_REQUEST_USD.toFixed(4)}`);

  console.log("\n(d) a ledger row with no prompt version costs the family nothing");
  await db.insert(cardLabelBatches).values({
    intentKey: `${RUN.legacy}:legacy`, runId: RUN.legacy, model: MODEL, customId: `probe-legacy-${randomUUID()}`,
    asked: ["probe legacy card"], batchId: "msgbatch_probe_legacy", status: "collected",
    inTokens: 0, outTokens: 50_000_000, promptVersion: null,
  });
  report("a 50M-output-token legacy row in the family sums to $0", (await spentInUnits(RUN.a)) === 0,
    `$${(await spentInUnits(RUN.a)).toFixed(4)}`);

  console.log("\n(a) a run stopped at its cap has published what it collected");
  report("A1 submits a wave and asks to be called again", (await run(RUN.a, 2.5 * r)) === EXIT_MORE_WORK);
  const a1 = await intentsOf(RUN.a);
  report("A1's wave is the two requests 2.5r affords", a1.length === 2, `${a1.length} intent(s)`);
  report("A1 wrote each intent's prompt version", a1.every((i) => i.promptVersion !== null));
  report("A2 collects, then stops at the cap", (await run(RUN.a, 2.5 * r)) === EXIT_STOP);
  const a2 = await intentsOf(RUN.a);
  const collectedCards = a2.filter((i) => i.status === "collected").reduce((n, i) => n + i.asked.length, 0);
  const publishedA = await labelledInScope();
  report("the labels published equal the cards in collected batches", publishedA === collectedCards && publishedA === 24,
    `${publishedA} published, ${collectedCards} collected`);
  report("and no staging is left behind", (await db.select().from(cardLabelsStaging)
    .where(eq(cardLabelsStaging.runId, RUN.a))).length === 0);
  report("the family has spent the two requests' measured usage", near(await spentInUnits(RUN.a), 2 * PER_REQUEST_USD));

  console.log("\n(b)+(e) a new run id asks only for the rest; a terminal failure is retried and counted once");
  nextOutcome = "expired";
  report("B1 (cap 3.1r, $1.6r already spent in the family) submits one request", (await run(RUN.b, 3.1 * r)) === EXIT_MORE_WORK);
  const b1 = await intentsOf(RUN.b);
  const aAsked = new Set(a2.flatMap((i) => i.asked));
  report("B1 asks for none of the cards A published", b1.length === 1 && b1[0].asked.every((n) => !aAsked.has(n)),
    b1.map((i) => i.intentKey).join(", "));
  report("and B1 asks the third request's cards", b1[0]?.asked.join("|") === chunkNames(2).join("|"));
  report("B2 finds the results expired and stops: the reserve fills the budget", (await run(RUN.b, 3.1 * r)) === EXIT_STOP);
  const b2 = await intentsOf(RUN.b);
  report("the expired intent is marked so", b2[0]?.status === "expired", String(b2[0]?.status));
  report("the family now holds A's usage plus ONE worst-case reserve",
    near(await spentInUnits(RUN.b), 2 * PER_REQUEST_USD + r));

  nextOutcome = "errored";
  report("B3 (cap raised to 4.1r) re-asks the expired cards", (await run(RUN.b, 4.1 * r)) === EXIT_MORE_WORK);
  const b3 = (await intentsOf(RUN.b)).sort((x, y) => x.intendedAt.getTime() - y.intendedAt.getTime());
  report("as attempt 2 of the same content key", b3.length === 2 && b3[1].intentKey === b3[0].intentKey.replace(/:1$/, ":2")
    && b3[1].customId !== b3[0].customId, b3.map((i) => i.intentKey.split(":").slice(-2).join(":")).join(", "));
  report("B4 finds every request errored and re-asks again", (await run(RUN.b, 4.1 * r)) === EXIT_MORE_WORK);
  const b4 = await intentsOf(RUN.b);
  report("attempt 2 is `failed` and attempt 3 is out", b4.some((i) => i.status === "failed" && i.intentKey.endsWith(":2"))
    && b4.some((i) => i.intentKey.endsWith(":3")), b4.map((i) => `${i.intentKey.slice(-2)} ${i.status}`).join(", "));
  report("an errored batch costs the family nothing",
    near(await spentInUnits(RUN.b), 2 * PER_REQUEST_USD + r));
  report("B5 collects attempt 3 and stops at the cap", (await run(RUN.b, 4.1 * r)) === EXIT_STOP);
  report("the third request's cards are published", (await labelledInScope()) === 36, `${await labelledInScope()}`);
  report("and every batch is counted once: A's two, the reserve, attempt 3",
    near(await spentInUnits(RUN.b), 3 * PER_REQUEST_USD + r), `$${(await spentInUnits(RUN.b)).toFixed(4)}`);

  console.log("\n(c) a crash inside the collect transaction, recovered free under a new run id");
  const capC = 3 * PER_REQUEST_USD + r + 3.6 * r;
  armCrash = true;
  report("C1 submits the three remaining requests", (await run(RUN.c, capC)) === EXIT_MORE_WORK);
  const c1 = await intentsOf(RUN.c);
  const crashedBatch = c1[0]?.batchId ?? null;
  report("as one batch", c1.length === 3 && c1.every((i) => i.batchId === crashedBatch && crashedBatch !== null));
  let threw = false;
  try { await run(RUN.c, capC); } catch (err) { threw = (err as Error).message.includes("probe: crash"); }
  report("C2's collect throws inside its transaction", threw);
  const c2 = await intentsOf(RUN.c);
  report("nothing of that batch is published", (await labelledInScope()) === 36, `${await labelledInScope()}`);
  report("nothing of it is staged", (await db.select().from(cardLabelsStaging)
    .where(eq(cardLabelsStaging.runId, RUN.c))).length === 0);
  report("its intents are still open, with no usage recorded",
    c2.every((i) => i.status === "submitted" && i.outTokens === null), c2.map((i) => i.status).join(", "));

  const createsBefore = creates;
  report("D1, a NEW run id, finishes the job", (await run(RUN.d, capC)) === EXIT_DONE);
  const c3 = await intentsOf(RUN.c);
  report("by collecting C's batch under its own batch id", c3.every((i) => i.status === "collected" && i.batchId === crashedBatch));
  report("and submitting nothing", creates === createsBefore && (await intentsOf(RUN.d)).length === 0,
    `${creates - createsBefore} create(s), ${(await intentsOf(RUN.d)).length} intent(s)`);
  report("every card in scope is now labelled", (await labelledInScope()) === 72, `${await labelledInScope()}`);
  report("C's staging is drained", (await db.select().from(cardLabelsStaging)
    .where(eq(cardLabelsStaging.runId, RUN.c))).length === 0);
  report("and the family has paid for C's batch once", near(await spentInUnits(RUN.d), 6 * PER_REQUEST_USD + r));

  console.log("\n(b) no card was asked twice, except the chunk failed on purpose");
  const every = await db.select({ asked: cardLabelBatches.asked }).from(cardLabelBatches)
    .where(and(inArray(cardLabelBatches.runId, [RUN.a, RUN.b, RUN.c, RUN.d])));
  const times = new Map<string, number>();
  for (const i of every) for (const n of i.asked) times.set(n, (times.get(n) ?? 0) + 1);
  const retried = new Set(chunkNames(2));
  const wrong = scope.filter((c) => (times.get(c.name) ?? 0) !== (retried.has(c.name) ? 3 : 1));
  report("each card was asked once, and the failed chunk's three times (expired, errored, ok)", wrong.length === 0,
    wrong.slice(0, 3).map((c) => `${c.name} ×${times.get(c.name) ?? 0}`).join(", "));

  console.log("\n(f) an older prompt's answer is never published as current");
  const oldBatch = `msgbatch_probe_oldprompt_${randomUUID().replace(/-/g, "")}`;
  const oldCustom = `probe-oldprompt-${randomUUID()}`;
  // Answerable: the fake would hand back a full reply if anything asked it to.
  sent.set(oldBatch, { customIds: [oldCustom], outcome: "ok" });
  await db.insert(cardLabelBatches).values({
    intentKey: `${RUN.e}:old-prompt`, runId: RUN.e, model: MODEL, customId: oldCustom,
    asked: extra.map((c) => c.name), batchId: oldBatch, status: "submitted", promptVersion: "0",
  });
  // What the run-at-a-time build left in staging: an answer under an older prompt, never published.
  await db.insert(cardLabelsStaging).values({
    runId: RUN.e, oracleId: extra[0].oracleId, labels: [], model: MODEL, promptVersion: "0", inputHash: "probe-stale",
  });
  const createsBeforeE = creates;
  report("E1 asks the cards again rather than waiting on the old prompt's intent",
    (await run(RUN.e, 10 * r, extra)) === EXIT_MORE_WORK && creates === createsBeforeE + 1,
    `${creates - createsBeforeE} create(s)`);
  report("E2 collects the new batch and finishes", (await run(RUN.e, 10 * r, extra)) === EXIT_DONE);
  const old = (await intentsOf(RUN.e)).find((i) => i.customId === oldCustom);
  report("the old prompt's intent was never collected", old?.status === "submitted", String(old?.status));
  const published = await db.select().from(cardLabels).where(inArray(cardLabels.oracleId, extra.map((c) => c.oracleId)));
  report("all twelve are published under the current prompt",
    published.length === 12 && published.every((l) => l.promptVersion === LABEL_PROMPT_VERSION),
    `${published.length} published, versions ${[...new Set(published.map((l) => l.promptVersion))].join(",")}`);
  const first = published.find((l) => l.oracleId === extra[0].oracleId);
  report("the card an older build staged carries the new answer, not the stale one",
    first !== undefined && first.inputHash !== "probe-stale" && first.labels.length > 0,
    `hash ${first?.inputHash.slice(0, 12)}, ${first?.labels.length} job(s)`);

  console.log("\n(g) a card whose text moves while its batch is pending is asked again");
  report("G1 submits the twelve", (await run(RUN.g, 10 * r, moving)) === EXIT_MORE_WORK);
  const target = moving[0];
  const [{ text }] = (await db.execute<{ text: string | null }>(
    sql`select oracle_text as text from cards where oracle_id = ${target.oracleId}`)).rows;
  movedText = { oracleId: target.oracleId, text };
  await db.execute(sql`update cards set oracle_text = coalesce(oracle_text, '') || ' (probe: errata)' where oracle_id = ${target.oracleId}`);
  // A RENAME as well: the reply answers under the old name, which no longer resolves. Two of twelve
  // is under the 95% floor, so the floor must judge the ten that still stand, not the twelve asked.
  const renamed = moving[1];
  movedName = { oracleId: renamed.oracleId, name: renamed.name };
  const newName = `${renamed.name} (probe rename)`;
  await db.execute(sql`update cards set name = ${newName} where oracle_id = ${renamed.oracleId}`);
  report("G2 collects and re-asks the two that moved", (await run(RUN.g, 10 * r, moving)) === EXIT_MORE_WORK);
  const afterG2 = await db.select().from(cardLabels).where(inArray(cardLabels.oracleId, moving.map((c) => c.oracleId)));
  report("the ten unmoved cards are published and the two that moved are not",
    afterG2.length === 10 && !afterG2.some((l) => l.oracleId === target.oracleId || l.oracleId === renamed.oracleId),
    `${afterG2.length} published`);
  const gIntents = await intentsOf(RUN.g);
  const second = gIntents.find((i) => i.asked.length === 2);
  report("the second request asks those two alone, the renamed one by its new name",
    gIntents.length === 2 && second !== undefined && second.asked.includes(target.name) && second.asked.includes(newName),
    gIntents.map((i) => i.asked.join("|").slice(0, 80)).join(" ; "));
  report("G3 collects it and finishes", (await run(RUN.g, 10 * r, moving)) === EXIT_DONE);
  report("all twelve are now labelled", (await db.select().from(cardLabels)
    .where(inArray(cardLabels.oracleId, moving.map((c) => c.oracleId)))).length === 12);

  console.log("\n(h) every model counts against the family, each at its own rates");
  const before = await spentInUnits(RUN.h);
  const haiku = ALL_MODELS.haiku;
  await db.insert(cardLabelBatches).values({
    intentKey: `${RUN.h}:haiku`, runId: RUN.h, model: haiku, customId: `probe-haiku-${randomUUID()}`,
    asked: ["probe haiku card"], batchId: "msgbatch_probe_haiku", status: "collected", promptVersion: LABEL_PROMPT_VERSION,
    inTokens: 1_000_000, outTokens: 1_000_000,
  });
  const expected = PRICING.haiku.in + PRICING.haiku.out;
  report("another model's collected batch adds its own priced cost", near((await spentInUnits(RUN.h)) - before, expected),
    `+$${((await spentInUnits(RUN.h)) - before).toFixed(4)}, expected $${expected.toFixed(4)}`);
  await db.insert(cardLabelBatches).values({
    intentKey: `${RUN.h}:unknown`, runId: RUN.h, model: "probe-unknown-model", customId: `probe-unknown-${randomUUID()}`,
    asked: ["probe unknown card"], batchId: "msgbatch_probe_unknown", status: "collected", promptVersion: LABEL_PROMPT_VERSION,
    inTokens: 1, outTokens: 1,
  });
  let refused = false;
  try { await spentInUnits(RUN.h); } catch (err) { refused = (err as Error).message.includes("no canonical"); }
  report("a model with no canonical rate refuses", refused);
}

try {
  await main();
} catch (err) {
  failures++;
  console.error("\nFAIL the walk threw:", err);
} finally {
  await cleanup();
}
// Outside the `finally`: `process.exit` there swallows a throw and prints a pass over it.
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
