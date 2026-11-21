// The judged-themes build (src/lib/labels/judged.ts): asks a model which of four judgement themes a
// pre-filtered set of cards serves, and stores the answers in `judged_labels`.
//
// Three properties carry the money, borrowed from the card-label build (card-labels-build.ts) and
// bound to the same ledger table (`card_label_batches`, prompt_version "j2"), so the Costs page sees
// the spend without a second reader:
//
//   NOTHING SPENDS WITHOUT `--spend`. The default is a dry run: it reads, plans and prices, writes
//   nothing and calls no model. `--spend` is the only way a batch is submitted, and it also needs the
//   app-wide model-call switch on. Collecting a batch already paid for never needs it.
//
//   THE CAP binds on the worst case plus everything already spent by ANY judged run. One family for
//   every run id (not `budgetFamily`, which would give each fresh run id a fresh cap) and every
//   version: rows are re-labelled to one run and one prompt for the sum, so a new run id cannot
//   reset the budget.
//
//   RESUME is against INTENTS: an intent is written before `batches.create`, filled with the batch id
//   after, and an open intent's cards are never asked again. A crash between create and the id write
//   leaves an intent with no id; the next run refuses until someone resolves it by hand, which
//   costs a look rather than a double charge.
import type Anthropic from "@anthropic-ai/sdk";
import { and, eq, inArray, isNotNull, like, sql } from "drizzle-orm";

import { db } from "../../src/db";
import { cardLabelBatches, judgedLabels } from "../../src/db/schema";
import {
  buildJudgedRequest, JUDGED_MAX_TOKENS, JUDGED_PREFILTER, JUDGED_PROMPT_VERSION, JUDGED_SYSTEM, JUDGED_THEMES,
  judgedInputHash, judgedKey, parseJudgedReply, withoutFailed, type JudgedTheme,
} from "../../src/lib/labels/judged";
import {
  familySpend, planChunks, withinCap, worstCaseUsd, type Rates,
} from "../../src/lib/labels/plan";
import { BODY_OVERHEAD_TOKENS, OPEN_STATUSES, PER_CARD_TOKENS } from "../../src/lib/labels/reserve";
import { readCardsById, type CardRow } from "../../src/lib/labels/publish";
import { DEFAULT_LABEL_MODEL } from "./card-labels-pricing.mjs";
import { batchRates } from "../../src/lib/model/prices";

export type JudgedClient = Pick<Anthropic["messages"]["batches"], "create" | "retrieve" | "results">;

export const EXIT_DONE = 0;
export const EXIT_MORE_WORK = 75;
export const EXIT_STOP = 1;

export type JudgedOptions = {
  client: JudgedClient;
  runId: string;
  capUsd: number;
  /** Without this the run is a dry run. The ONLY switch that lets a batch be submitted. */
  spend: boolean;
  /** The ~200-card grading sample (40 per theme plus 40 the pre-filter rejected) instead of every candidate. */
  sample: boolean;
  /** Read before submitting. Absent (a probe), nothing is checked. */
  modelCalls?: () => Promise<{ state: "on" } | { state: "off" | "unconfirmed"; line: string }>;
  model?: string;
  /** Ask again the cards whose request failed. Without it a failure is reported once and its cards are left out. */
  retryFailed?: boolean;
  /** With `sample`: draw only cards that have no `judged_labels` row yet, so a second sample cannot overlap the first. */
  fresh?: boolean;
};

export const SAMPLE_PER_THEME = 40;
export const SAMPLE_CONTROL = 40;
/** Every judged run draws from one budget. */
const FAMILY = "judged";
const RUN_PREFIX = "judged-";

/** `from` is where the sample drew the card: a theme's pre-filter, or the control that no pattern matched. */
type Candidate = CardRow & { from: JudgedTheme | "control" };

function ratesFor(model: string): Rates {
  // `batchRates` throws on a model with no rate card, so an unpriced model never runs at another model's price.
  const r = batchRates(model);
  return { in: r.in, out: r.out };
}

const anyPattern = JUDGED_THEMES.map((t) => `(${JUDGED_PREFILTER[t]})`).join("|");

/** The `--fresh` clause: leaves out any card that already has a stored answer. */
const notJudged = (fresh: boolean) =>
  fresh ? sql`and not exists (select 1 from judged_labels jl where jl.oracle_id = cards.oracle_id)` : sql``;

/** Non-land, Commander-legal cards whose text matches the theme's pre-filter, in oracle id order. */
async function candidatesFor(theme: JudgedTheme, limit: number | null, fresh: boolean): Promise<CardRow[]> {
  const rows = await db.execute<CardRow>(sql`
    select oracle_id as "oracleId", name, mana_cost, type_line, oracle_text, layout
      from cards
     where commander_legal = true and type_line not ilike '%land%'
       and lower(oracle_text) ~ ${JUDGED_PREFILTER[theme]}
       ${notJudged(fresh)}
     order by ${limit === null ? sql`oracle_id` : sql`md5(oracle_id::text)`}
     ${limit === null ? sql`` : sql`limit ${limit}`}`);
  return rows.rows ?? (rows as unknown as CardRow[]);
}

/** Cards no pattern matches: the control that measures what the pre-filter misses. */
async function controlCards(limit: number, fresh: boolean): Promise<CardRow[]> {
  const rows = await db.execute<CardRow>(sql`
    select oracle_id as "oracleId", name, mana_cost, type_line, oracle_text, layout
      from cards
     where commander_legal = true and type_line not ilike '%land%'
       and not (lower(coalesce(oracle_text, '')) ~ ${anyPattern})
       ${notJudged(fresh)}
     order by md5(oracle_id::text) limit ${limit}`);
  return rows.rows ?? (rows as unknown as CardRow[]);
}

/** The cards this run would ask about, before the freshness and in-flight filters. */
async function pool(sample: boolean, fresh: boolean): Promise<{ cards: Candidate[]; perTheme: Record<string, number> }> {
  const seen = new Map<string, Candidate>();
  const perTheme: Record<string, number> = {};
  for (const t of JUDGED_THEMES) {
    const rows = await candidatesFor(t, sample ? SAMPLE_PER_THEME : null, sample && fresh);
    perTheme[t] = rows.length;
    for (const r of rows) if (!seen.has(r.oracleId)) seen.set(r.oracleId, { ...r, from: t });
  }
  if (sample) {
    const control = await controlCards(SAMPLE_CONTROL, fresh);
    perTheme.control = control.length;
    for (const r of control) if (!seen.has(r.oracleId)) seen.set(r.oracleId, { ...r, from: "control" });
  }
  return { cards: [...seen.values()].sort((a, b) => (a.oracleId < b.oracleId ? -1 : 1)), perTheme };
}

type Intent = typeof cardLabelBatches.$inferSelect;

const replyText = (m: { content: readonly { type: string; text?: string }[] }): string =>
  m.content.map((c) => (c.type === "text" ? c.text ?? "" : "")).join("");

/** Collects every open intent that has a batch id and has ended. Returns counts and whether any is still out. */
async function collectOpen(opts: JudgedOptions): Promise<{ stored: number; refused: number; pending: number; idless: number }> {
  const open = await db.select().from(cardLabelBatches).where(and(
    like(cardLabelBatches.runId, `${RUN_PREFIX}%`), inArray(cardLabelBatches.status, OPEN_STATUSES),
  ));
  const out = { stored: 0, refused: 0, pending: 0, idless: open.filter((i) => i.batchId === null).length };
  const byBatch = new Map<string, Intent[]>();
  for (const i of open) if (i.batchId !== null) byBatch.set(i.batchId, [...(byBatch.get(i.batchId) ?? []), i]);
  for (const [batchId, intents] of byBatch) {
    const batch = await opts.client.retrieve(batchId);
    if (batch.processing_status !== "ended") { out.pending += intents.length; continue; }
    const byCustom = new Map(intents.map((i) => [i.customId, i]));
    const got = new Map<string, { text: string; inTok: number; outTok: number }>();
    try {
      for await (const entry of await opts.client.results(batchId)) {
        const intent = byCustom.get(entry.custom_id);
        if (intent === undefined || entry.result.type !== "succeeded") continue;
        const u = entry.result.message.usage;
        got.set(entry.custom_id, { text: replyText(entry.result.message), inTok: u.input_tokens, outTok: u.output_tokens });
      }
    } catch (err) {
      if ((err as { status?: number }).status === 404) {
        await db.update(cardLabelBatches).set({ status: "expired" }).where(inArray(cardLabelBatches.intentKey, intents.map((i) => i.intentKey)));
        continue;
      }
      throw err;
    }
    const byId = new Map((await readCardsById(db, [...new Set(intents.flatMap((i) => i.asked))])).map((c) => [c.oracleId, c]));
    await db.transaction(async (tx) => {
      for (const intent of intents) {
        const here = got.get(intent.customId);
        if (here === undefined) {
          // Errored, canceled or expired: unbilled, and its cards are left out of the next plan until --retry-failed.
          await tx.update(cardLabelBatches).set({ status: "failed" }).where(eq(cardLabelBatches.intentKey, intent.intentKey));
          continue;
        }
        const reply = parseJudgedReply(here.text, intent.asked.map((_, i) => judgedKey(i)));
        const rows: (typeof judgedLabels.$inferInsert)[] = [];
        if (reply.ok) {
          intent.asked.forEach((oracleId, i) => {
            const themes = reply.themes.get(judgedKey(i));
            const card = byId.get(oracleId);
            // A card whose text moved since it was asked describes text the catalog no longer holds.
            const asked = intent.askedHashes?.[oracleId];
            if (themes === undefined || card === undefined || asked === undefined
              || judgedInputHash(card, intent.model, JUDGED_PROMPT_VERSION) !== asked) { out.refused++; return; }
            rows.push({ oracleId, themes, model: intent.model, promptVersion: JUDGED_PROMPT_VERSION, inputHash: asked });
          });
        } else {
          out.refused += intent.asked.length;
          console.warn(`  ${intent.customId}: ${reply.why}`);
        }
        if (rows.length > 0) {
          await tx.insert(judgedLabels).values(rows).onConflictDoUpdate({
            target: judgedLabels.oracleId,
            set: {
              themes: sql`excluded.themes`, model: sql`excluded.model`, promptVersion: sql`excluded.prompt_version`,
              inputHash: sql`excluded.input_hash`, labelledAt: sql`excluded.labelled_at`,
            },
          });
          out.stored += rows.length;
        }
        // Usage is SET, never added, so a re-collection cannot count it twice.
        await tx.update(cardLabelBatches).set({
          batchId, status: "collected", collectedAt: new Date(), inTokens: here.inTok, outTokens: here.outTok,
          cacheWriteTokens: 0, cacheReadTokens: 0,
        }).where(eq(cardLabelBatches.intentKey, intent.intentKey));
      }
    });
  }
  return out;
}

async function spentUsd(): Promise<number> {
  const rows = await db.select({
    model: cardLabelBatches.model, status: cardLabelBatches.status,
    askedCards: sql<number>`jsonb_array_length(${cardLabelBatches.asked})::int`,
    inTokens: cardLabelBatches.inTokens, outTokens: cardLabelBatches.outTokens,
    cacheWriteTokens: cardLabelBatches.cacheWriteTokens, cacheReadTokens: cardLabelBatches.cacheReadTokens,
  }).from(cardLabelBatches).where(like(cardLabelBatches.runId, `${RUN_PREFIX}%`));
  let total = 0;
  for (const m of new Set(rows.map((r) => r.model))) {
    const rates = ratesFor(m);
    // An expired request was billed with its results gone: reserved at the worst case.
    total += familySpend(
      rows.filter((r) => r.model === m).map((r) => ({ ...r, runId: FAMILY, promptVersion: JUDGED_PROMPT_VERSION })),
      FAMILY, JUDGED_PROMPT_VERSION, rates, requestWorst(rates),
    ).totalUsd;
  }
  return total;
}

/** One request's worst case: the whole instruction block, twelve maximum-length cards, a full reply. */
export const requestWorst = (rates: Rates): number =>
  worstCaseUsd(1, JUDGED_SYSTEM.length, PER_CARD_TOKENS, JUDGED_MAX_TOKENS, rates, BODY_OVERHEAD_TOKENS);

export async function runJudgedBuild(opts: JudgedOptions): Promise<number> {
  const model = opts.model ?? DEFAULT_LABEL_MODEL;
  const rates = ratesFor(model);
  if (!opts.runId.startsWith(RUN_PREFIX)) { console.error(`run id must start with "${RUN_PREFIX}"`); return EXIT_STOP; }

  if (opts.spend) {
    const collected = await collectOpen(opts);
    console.log(`collected: ${collected.stored} stored, ${collected.refused} refused, ${collected.pending} still processing`);
    if (collected.idless > 0) {
      console.error(`${collected.idless} intent(s) have no batch id (a crash between create and the id write). `
        + `Find the batch at the provider by custom_id, or set the intent's status to abandoned, then run again.`);
      return EXIT_STOP;
    }
    if (collected.pending > 0) return EXIT_MORE_WORK;
  }

  const { cards, perTheme } = await pool(opts.sample, opts.fresh ?? false);
  const stored = new Map((await db.select().from(judgedLabels)).map((r) => [r.oracleId, r]));
  const open = await db.select({ asked: cardLabelBatches.asked }).from(cardLabelBatches).where(and(
    like(cardLabelBatches.runId, `${RUN_PREFIX}%`), inArray(cardLabelBatches.status, OPEN_STATUSES), isNotNull(cardLabelBatches.asked),
  ));
  const inFlight = new Set(open.flatMap((o) => o.asked));
  const hashOf = new Map(cards.map((c) => [c.oracleId, judgedInputHash(c, model)]));
  const failedRows = await db.select({ asked: cardLabelBatches.asked }).from(cardLabelBatches).where(and(
    like(cardLabelBatches.runId, `${RUN_PREFIX}%`), inArray(cardLabelBatches.status, ["failed", "expired"]), eq(cardLabelBatches.model, model),
  ));
  const { todo, dropped } = withoutFailed(
    cards.filter((c) => !inFlight.has(c.oracleId) && stored.get(c.oracleId)?.inputHash !== hashOf.get(c.oracleId)),
    failedRows.flatMap((r) => r.asked), opts.retryFailed ?? false,
  );

  const prior = (await db.select({ asked: cardLabelBatches.asked }).from(cardLabelBatches).where(eq(cardLabelBatches.runId, opts.runId))).map((r) => r.asked);
  const chunks = planChunks(opts.runId, model, todo.map((c) => c.oracleId), prior);
  const worst = chunks.length * requestWorst(rates);
  const spent = await spentUsd();
  const verdict = withinCap(worst, spent, opts.capUsd);

  console.log(`${opts.sample ? "SAMPLE" : "FULL"} ${opts.spend ? "SPEND" : "DRY RUN"}, model ${model}, run ${opts.runId}`);
  console.log(`  pre-filter hits: ${JSON.stringify(perTheme)}`);
  console.log(`  pool ${cards.length}, already judged or in flight ${cards.length - todo.length}, to ask ${todo.length}`);
  if (dropped.length > 0) {
    console.log(`  ${dropped.length} card(s) left out: their request failed earlier. Fix the cause, then pass --retry-failed to ask them again.`);
  }
  console.log(`  ${chunks.length} request(s); worst case $${worst.toFixed(2)} + $${spent.toFixed(2)} already spent vs cap $${opts.capUsd.toFixed(2)}`);
  if (opts.sample && !opts.spend) for (const c of todo) console.log(`    ${c.from.padEnd(10)} ${c.name}`);
  if (!verdict.ok) { console.error(`REFUSED: ${verdict.why}`); return EXIT_STOP; }
  if (!opts.spend) { console.log("  dry run: nothing written, no model called. Add --spend to submit."); return EXIT_DONE; }
  if (chunks.length === 0) return EXIT_DONE;

  if (opts.modelCalls) {
    const calls = await opts.modelCalls();
    if (calls.state !== "on") { console.error(calls.line); return EXIT_STOP; }
  }

  const byId = new Map(todo.map((c) => [c.oracleId, c]));
  const intents = chunks.map((c) => ({
    intentKey: c.intentKey, runId: opts.runId, model, customId: c.customId, asked: c.oracleIds,
    status: "intended", promptVersion: JUDGED_PROMPT_VERSION,
    askedHashes: Object.fromEntries(c.oracleIds.map((id) => [id, hashOf.get(id)!])),
  }));
  await db.insert(cardLabelBatches).values(intents);
  let batch: Awaited<ReturnType<JudgedClient["create"]>>;
  try {
    batch = await opts.client.create({
      requests: chunks.map((c) => buildJudgedRequest(c.customId, model, c.oracleIds.map((id) => byId.get(id)!))),
    });
  } catch (err) {
    // A 4xx is a clean refusal that billed nothing: close the intents so the next run is not blocked.
    // Any other failure is ambiguous (the batch may exist), so its intents stay for a human.
    const status = (err as { status?: number }).status;
    if (status !== undefined && status >= 400 && status < 500) {
      await db.update(cardLabelBatches).set({ status: "failed" }).where(inArray(cardLabelBatches.intentKey, chunks.map((c) => c.intentKey)));
    }
    throw err;
  }
  await db.update(cardLabelBatches).set({ batchId: batch.id, status: "submitted", submittedAt: new Date() })
    .where(inArray(cardLabelBatches.intentKey, chunks.map((c) => c.intentKey)));
  console.log(`submitted ${chunks.length} request(s) as ${batch.id}. Run again with --spend to collect.`);
  return EXIT_MORE_WORK;
}
