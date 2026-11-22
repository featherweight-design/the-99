// The judged-themes build (src/lib/labels/judged.ts): asks a model which of four judgement themes a
// pre-filtered set of cards serves, and stores the answers in `judged_labels`.
//
// TWO PASSES, both batches through the one ledger. Pass 1 is loose and writes `themes`. Pass 2, the verifier, is asked
// one claim per card and theme pass 1 gave ("does this card serve THIS theme?") and writes `verified_themes`, the only
// column the app reads. One `--spend` invocation does whatever is next: collect what ended, else submit pass 1 for the
// cards with no current answer, else submit pass 2 for the claims with no verdict. A card's claims always travel in
// one batch, so they come back together and the card is verified or left for a later run, never half-verified.
//
// Three properties carry the money, borrowed from the card-label build (card-labels-build.ts) and
// bound to the same ledger table (`card_label_batches`, prompt_version "j3"), so the Costs page sees
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
  buildJudgedRequest, buildVerifyRequest, JUDGED_MAX_TOKENS, JUDGED_PREFILTER, JUDGED_PROMPT_VERSION, JUDGED_SYSTEM,
  JUDGED_THEMES, judgedInputHash, judgedKey, endsAfterCollect, parseJudgedReply, parseVerifyCustomId, parseVerifyReply,
  VERIFY_MAX_TOKENS, VERIFY_SYSTEM, verifyCustomId, withoutFailed, type JudgedTheme,
} from "../../src/lib/labels/judged";
import {
  familySpend, planChunks, withinCap, worstCaseUsd, type Rates,
} from "../../src/lib/labels/plan";
import { BODY_OVERHEAD_TOKENS, OPEN_STATUSES, PER_CARD_TOKENS } from "../../src/lib/labels/reserve";
import { readCardsById, type CardRow } from "../../src/lib/labels/publish";
import { batchRates } from "../../src/lib/model/prices";

export type JudgedClient = Pick<Anthropic["messages"]["batches"], "create" | "retrieve" | "results">;

/** Hugh ruled claude-sonnet-5-5 for the judged themes (2026-11-21): both passes run on it. */
export const DEFAULT_JUDGED_MODEL = "claude-sonnet-5-5";

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
  /** With `sample`: a deeper draw for a rare theme, so a theme the pre-filter rarely confirms still reaches enough true cards to score. */
  deep?: Partial<Record<JudgedTheme, number>>;
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

/** The `--fresh` clause: leaves out any card that already has a stored answer, and any card the definitions name as an example (a grader must not score the cards it was taught from). */
const notJudged = (fresh: boolean) =>
  fresh
    ? sql`and not exists (select 1 from judged_labels jl where jl.oracle_id = cards.oracle_id)
          and not exists (select 1 from unnest(string_to_array(cards.name, ' // ')) face
                           where position(lower(replace(face, ',', '')) in lower(replace(${JUDGED_SYSTEM}, ',', ''))) > 0)`
    : sql``;

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
async function pool(sample: boolean, fresh: boolean, deep: JudgedOptions["deep"]): Promise<{ cards: Candidate[]; perTheme: Record<string, number> }> {
  const seen = new Map<string, Candidate>();
  const perTheme: Record<string, number> = {};
  for (const t of JUDGED_THEMES) {
    const rows = await candidatesFor(t, sample ? (deep?.[t] ?? SAMPLE_PER_THEME) : null, sample && fresh);
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
  for (const [batchId, all] of byBatch) {
    const batch = await opts.client.retrieve(batchId);
    const intents = all.filter((i) => parseVerifyCustomId(i.customId) === null);
    const verifies = all.filter((i) => parseVerifyCustomId(i.customId) !== null);
    if (verifies.length > 0) {
      const done = await collectVerify(opts, batchId, batch.processing_status === "ended", verifies);
      out.stored += done.stored; out.refused += done.refused; out.pending += done.pending;
    }
    if (intents.length === 0) continue;
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
            // A new pass-1 answer voids any verdicts on the old one. A card with no claim has nothing to verify.
            rows.push({
              oracleId, themes, model: intent.model, promptVersion: JUDGED_PROMPT_VERSION, inputHash: asked,
              verifiedThemes: themes.length === 0 ? [] : null, verifiedAt: themes.length === 0 ? new Date() : null,
            });
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
              verifiedThemes: sql`excluded.verified_themes`, verifiedAt: sql`excluded.verified_at`,
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

/**
 * Collects one ended (or still running) pass-2 batch. A card is written only when EVERY one of its claims came back with a
 * readable verdict: an unreadable or missing one leaves the card unverified and its request `failed` (unbilled or billed,
 * either way not planned again until --retry-failed), because scoring it "no" would silently drop a true label.
 */
async function collectVerify(
  opts: JudgedOptions, batchId: string, ended: boolean, intents: Intent[],
): Promise<{ stored: number; refused: number; pending: number }> {
  const out = { stored: 0, refused: 0, pending: 0 };
  if (!ended) { out.pending = intents.length; return out; }
  const byCustom = new Map(intents.map((i) => [i.customId, i]));
  const got = new Map<string, { verdict: "yes" | "no" | null; inTok: number; outTok: number }>();
  try {
    for await (const entry of await opts.client.results(batchId)) {
      if (!byCustom.has(entry.custom_id) || entry.result.type !== "succeeded") continue;
      const u = entry.result.message.usage;
      got.set(entry.custom_id, { verdict: parseVerifyReply(replyText(entry.result.message)), inTok: u.input_tokens, outTok: u.output_tokens });
    }
  } catch (err) {
    if ((err as { status?: number }).status === 404) {
      await db.update(cardLabelBatches).set({ status: "expired" }).where(inArray(cardLabelBatches.intentKey, intents.map((i) => i.intentKey)));
      return out;
    }
    throw err;
  }
  const byCard = new Map<string, Intent[]>();
  for (const i of intents) byCard.set(i.asked[0], [...(byCard.get(i.asked[0]) ?? []), i]);
  await db.transaction(async (tx) => {
    for (const [oracleId, group] of byCard) {
      const answers = group.map((i) => ({ intent: i, theme: parseVerifyCustomId(i.customId)!.theme, here: got.get(i.customId) }));
      const complete = answers.every((a) => a.here !== undefined && a.here.verdict !== null);
      if (complete) {
        const yes = JUDGED_THEMES.filter((t) => answers.some((a) => a.theme === t && a.here!.verdict === "yes"));
        // Only the pass-1 answer these claims were about: a card re-labelled since keeps its newer, unverified row.
        const written = await tx.update(judgedLabels).set({ verifiedThemes: yes, verifiedAt: new Date() }).where(and(
          eq(judgedLabels.oracleId, oracleId), eq(judgedLabels.inputHash, group[0].askedHashes?.[oracleId] ?? ""),
        )).returning({ id: judgedLabels.oracleId });
        if (written.length > 0) out.stored++; else out.refused++;
      } else out.refused++;
      for (const a of answers) {
        await tx.update(cardLabelBatches).set(
          // Usage is SET, never added, so a re-collection cannot count it twice.
          a.here === undefined
            ? { status: "failed" }
            : { batchId, status: complete ? "collected" : "failed", collectedAt: new Date(), inTokens: a.here.inTok, outTokens: a.here.outTok, cacheWriteTokens: 0, cacheReadTokens: 0 },
        ).where(eq(cardLabelBatches.intentKey, a.intent.intentKey));
      }
    }
  });
  return out;
}

/** One verifier request's worst case: the whole instruction block, one maximum-length card plus its theme line, a full reply. */
export const verifyRequestWorst = (rates: Rates): number =>
  (VERIFY_SYSTEM.length * rates.in + (PER_CARD_TOKENS + 50) * rates.in + VERIFY_MAX_TOKENS * rates.out) / 1e6;

type Claim = { card: CardRow; theme: JudgedTheme; hash: string };

/**
 * The pass-2 claims still to ask, for EVERY stored pass-1 row (a sample's rows included: `--fresh` leaves them out of the pool, so a pool filter would strand them): for each row of the current prompt whose answer is still the card's current text
 * and that has no verdict, one per theme. Rows whose claims already have an open or failed request are left out (failed
 * ones until --retry-failed), and a re-asked pair gets the next attempt number so its custom id stays unique.
 */
async function verifyClaims(retryFailed: boolean): Promise<{ claims: Claim[]; attempts: Map<string, number>; dropped: number }> {
  const rows = (await db.select().from(judgedLabels).where(and(
    eq(judgedLabels.promptVersion, JUDGED_PROMPT_VERSION), sql`${judgedLabels.verifiedThemes} is null`,
  ))).filter((r) => r.themes.length > 0);
  const cards = new Map((await readCardsById(db, rows.map((r) => r.oracleId))).map((c) => [c.oracleId, c]));
  const prior = await db.select({ customId: cardLabelBatches.customId, status: cardLabelBatches.status }).from(cardLabelBatches)
    .where(and(like(cardLabelBatches.runId, `${RUN_PREFIX}%`), like(cardLabelBatches.customId, "vf%")));
  const attempts = new Map<string, number>();
  const busy = new Set<string>(); // open, or failed with no --retry-failed
  for (const p of prior) {
    const k = parseVerifyCustomId(p.customId);
    if (k === null) continue;
    const key = `${k.oracleId}:${k.theme}`;
    attempts.set(key, (attempts.get(key) ?? 0) + 1);
    const failed = p.status === "failed" || p.status === "expired";
    if (OPEN_STATUSES.includes(p.status) || (failed && !retryFailed)) busy.add(key);
  }
  const claims: Claim[] = [];
  let dropped = 0;
  for (const r of rows) {
    const card = cards.get(r.oracleId);
    // A pass-1 answer written for older card text is pass 1's to redo, not the verifier's to confirm.
    if (card === undefined || judgedInputHash(card, r.model) !== r.inputHash) continue;
    // All of a card's claims or none: a card with one busy claim waits, so it is never half-asked.
    if (r.themes.some((t) => busy.has(`${r.oracleId}:${t}`))) { dropped++; continue; }
    for (const t of r.themes) claims.push({ card, theme: t as JudgedTheme, hash: r.inputHash });
  }
  return { claims, attempts, dropped };
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
      FAMILY, JUDGED_PROMPT_VERSION, rates, Math.max(requestWorst(rates), verifyRequestWorst(rates)),
    ).totalUsd;
  }
  return total;
}

/** One request's worst case: the whole instruction block, twelve maximum-length cards, a full reply. */
export const requestWorst = (rates: Rates): number =>
  worstCaseUsd(1, JUDGED_SYSTEM.length, PER_CARD_TOKENS, JUDGED_MAX_TOKENS, rates, BODY_OVERHEAD_TOKENS);

export async function runJudgedBuild(opts: JudgedOptions): Promise<number> {
  const model = opts.model ?? DEFAULT_JUDGED_MODEL;
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
    if (endsAfterCollect(opts.sample, collected)) { console.log("sample collected; not planning another. Run again to draw a new one."); return 0; }
  }

  const { cards, perTheme } = await pool(opts.sample, opts.fresh ?? false, opts.deep);
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

  // Pass 2 is submitted only once pass 1 has nothing left to ask, so its claims are the final ones.
  const pass2 = await verifyClaims(opts.retryFailed ?? false);
  const worst2 = pass2.claims.length * verifyRequestWorst(rates);
  const hits = Object.entries(perTheme).filter(([k]) => k !== "control").reduce((n, [, v]) => n + v, 0);
  const upperLater = Math.max(0, hits - pass2.claims.length) * verifyRequestWorst(rates);

  console.log(`${opts.sample ? "SAMPLE" : "FULL"} ${opts.spend ? "SPEND" : "DRY RUN"}, model ${model}, run ${opts.runId}`);
  console.log(`  pre-filter hits: ${JSON.stringify(perTheme)}`);
  console.log(`  pool ${cards.length}, already judged or in flight ${cards.length - todo.length}, to ask ${todo.length}`);
  if (dropped.length > 0) {
    console.log(`  ${dropped.length} card(s) left out: their request failed earlier. Fix the cause, then pass --retry-failed to ask them again.`);
  }
  console.log(`  pass 1: ${chunks.length} request(s); worst case $${worst.toFixed(2)} + $${spent.toFixed(2)} already spent vs cap $${opts.capUsd.toFixed(2)}`);
  console.log(`  pass 2 (verifier): ${pass2.claims.length} claim(s) ready now, worst case $${worst2.toFixed(2)}`
    + `${pass2.dropped > 0 ? `; ${pass2.dropped} card(s) wait on an open or failed claim` : ""}`);
  if (!opts.spend) {
    console.log(`  whole run, worst case: $${(worst + worst2 + upperLater).toFixed(2)} (pass 2 for pass 1's claims counted as at most one per pre-filter hit)`);
    if (opts.sample) for (const c of todo) console.log(`    ${c.from.padEnd(10)} ${c.name}`);
    if (!verdict.ok) { console.error(`REFUSED: ${verdict.why}`); return EXIT_STOP; }
    console.log("  dry run: nothing written, no model called. Add --spend to submit.");
    return EXIT_DONE;
  }

  const phase = chunks.length > 0 ? "pass 1" : "pass 2";
  const phaseVerdict = chunks.length > 0 ? verdict : withinCap(worst2, spent, opts.capUsd);
  if (!phaseVerdict.ok) { console.error(`REFUSED (${phase}): ${phaseVerdict.why}`); return EXIT_STOP; }
  if (chunks.length === 0 && pass2.claims.length === 0) return EXIT_DONE;

  if (opts.modelCalls) {
    const calls = await opts.modelCalls();
    if (calls.state !== "on") { console.error(calls.line); return EXIT_STOP; }
  }

  const byId = new Map(todo.map((c) => [c.oracleId, c]));
  const intents = chunks.length > 0
    ? chunks.map((c) => ({
      intentKey: c.intentKey, runId: opts.runId, model, customId: c.customId, asked: c.oracleIds,
      status: "intended", promptVersion: JUDGED_PROMPT_VERSION,
      askedHashes: Object.fromEntries(c.oracleIds.map((id) => [id, hashOf.get(id)!])),
    }))
    : pass2.claims.map((c) => {
      const customId = verifyCustomId(c.card.oracleId, c.theme, (pass2.attempts.get(`${c.card.oracleId}:${c.theme}`) ?? 0) + 1);
      return {
        intentKey: customId, runId: opts.runId, model, customId, asked: [c.card.oracleId],
        status: "intended", promptVersion: JUDGED_PROMPT_VERSION, askedHashes: { [c.card.oracleId]: c.hash },
      };
    });
  const requests = chunks.length > 0
    ? chunks.map((c) => buildJudgedRequest(c.customId, model, c.oracleIds.map((id) => byId.get(id)!)))
    : pass2.claims.map((c, i) => buildVerifyRequest(intents[i].customId, model, c.theme, c.card));
  const keys = intents.map((i) => i.intentKey);
  await db.insert(cardLabelBatches).values(intents);
  let batch: Awaited<ReturnType<JudgedClient["create"]>>;
  try {
    batch = await opts.client.create({ requests });
  } catch (err) {
    // A 4xx is a clean refusal that billed nothing: close the intents so the next run is not blocked.
    // Any other failure is ambiguous (the batch may exist), so its intents stay for a human.
    const status = (err as { status?: number }).status;
    if (status !== undefined && status >= 400 && status < 500) {
      await db.update(cardLabelBatches).set({ status: "failed" }).where(inArray(cardLabelBatches.intentKey, keys));
    }
    throw err;
  }
  await db.update(cardLabelBatches).set({ batchId: batch.id, status: "submitted", submittedAt: new Date() })
    .where(inArray(cardLabelBatches.intentKey, keys));
  console.log(`submitted ${requests.length} ${phase} request(s) as ${batch.id}. Run again with --spend to collect.`);
  return EXIT_MORE_WORK;
}
