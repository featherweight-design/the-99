import { sql } from "drizzle-orm";

import { db } from "../../db";
import { readAllowance, type Billed } from "../model/allowance";
import { callModel, type ModelOutcome } from "../model/client";
import { collectionDigest, loadReadCards, loadReadDecks } from "./the-read-load";
import {
  READ_JUDGE_EFFORT, READ_JUDGE_MAX_TOKENS, READ_JUDGE_MODEL, READ_SHORTLIST_DEADLINE_MS, READ_SHORTLIST_EFFORT,
  READ_SHORTLIST_MAX_TOKENS, READ_SHORTLIST_MODEL, READ_TOTAL_DEADLINE_MS, INTAKE_RETRY_FLOOR_MS,
} from "./limits";
import { colorsKey, leadingThemes, loadPoolList, type PoolList } from "./pool-list";
import { rankCandidates } from "./rank";
import { hasRunningRead, reapAbandonedReads, setReadPhase, settleTheRead, startRead, withReadAdmission, type ReadErrorClass } from "./run-store";
import { loadIntakeCatalog, loadSearchFacts } from "./search";
import { intakeLive, STUB_MODEL, stubDelayMs, stubMode } from "./stub";
import {
  judgeRequest, judgeSchema, JUDGE_SYSTEM, readFingerprint, shortlistRequest, shortlistSchema, shortlistSystem,
  validJudgement, validShortlist, type JudgeCandidate, type JudgeReply, type ReadCard, type ReadDeck, type ReadFilters,
  type ShortlistReply, type TheReadResult,
} from "./the-read";
import type { EdhrecTag } from "../edhrec/parse";

/**
 * One press of the read, end to end (rework plan PR 1): the inputs, the reservation, the shortlist,
 * the judgement, the settle. SERVER-ONLY. The submit (PR 3) calls it inside `after()`; the eval and
 * the probes call it with the model injected.
 *
 * Every input is read BEFORE the unit is reserved, so a failed read of one costs the player nothing,
 * and the fingerprint is built from exactly what the calls will be shown.
 */

export type TheReadOutcome =
  | { kind: "read"; readId: string; result: TheReadResult; repeat: boolean }
  /** Nothing fits: refunded (lock 7). `repeat` when the store already held this ask's empty answer. */
  | { kind: "nothing"; readId: string; result: TheReadResult; repeat: boolean }
  | { kind: "failed"; errorClass: ReadErrorClass }
  | { kind: "stopped" }
  | { kind: "allowance" | "paused" | "ownerShare" | "in_flight" | "reused" };

/** `cache`: send the system prompt as a cached prefix. Only the whole list, which every unfiltered
 *  press shares, is worth the write premium; a filtered press's own lines are never read back. */
type Request = { system: string; user: string; deadlineMs: number; cache?: boolean };

export type TheReadDeps = {
  /** Recorded on the reservation and priced by the feature's steps; the stub records the stub. */
  modelName: string;
  shortlistModel: string;
  judgeModel: string;
  shortlist: (req: Request) => Promise<ModelOutcome<ShortlistReply>>;
  judge: (req: Request) => Promise<ModelOutcome<JudgeReply>>;
  now: () => number;
};

/** The real models in production or under `INTAKE_LIVE=1`; a stub that picks the pool's first rows everywhere else. */
export function defaultTheReadDeps(): TheReadDeps {
  const live = intakeLive();
  if (!live) return stubTheReadDeps();
  return {
    modelName: `${READ_SHORTLIST_MODEL}+${READ_JUDGE_MODEL}`,
    shortlistModel: READ_SHORTLIST_MODEL,
    judgeModel: READ_JUDGE_MODEL,
    shortlist: (req) => callModel({
      model: READ_SHORTLIST_MODEL, system: req.system, user: req.user, cacheSystem: req.cache === true,
      maxTokens: READ_SHORTLIST_MAX_TOKENS, effort: READ_SHORTLIST_EFFORT, schema: shortlistSchema,
      deadlineMs: req.deadlineMs, retryFloorMs: Math.min(INTAKE_RETRY_FLOOR_MS, req.deadlineMs / 2),
    }),
    judge: (req) => callModel({
      model: READ_JUDGE_MODEL, system: req.system, user: req.user, stream: true,
      maxTokens: READ_JUDGE_MAX_TOKENS, effort: READ_JUDGE_EFFORT, schema: judgeSchema,
      deadlineMs: req.deadlineMs, retryFloorMs: Math.min(INTAKE_RETRY_FLOOR_MS, req.deadlineMs / 2),
    }),
    now: () => Date.now(),
  };
}

const NO_USAGE = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

/**
 * No API call: the shortlist takes the pool's first keys, the judgement the first three with a plain
 * reason. `INTAKE_STUB` reaches the panel's other states: `nothing` (no pick fits), `busy` (the
 * judgement fails), and `INTAKE_STUB_DELAY_MS` holds each call that long, so the wait and Stop can
 * be seen. The switches are read by `stub.ts`.
 */
export function stubTheReadDeps(env: Record<string, string | undefined> = process.env): TheReadDeps {
  const mode = stubMode(env);
  const hold = async () => { const ms = stubDelayMs(env); if (ms > 0) await new Promise((r) => setTimeout(r, ms)); };
  return {
    modelName: STUB_MODEL,
    shortlistModel: STUB_MODEL,
    judgeModel: STUB_MODEL,
    shortlist: async (req) => {
      await hold();
      const keys = [...req.system.matchAll(/^(\d+)\|/gm)].slice(0, 12).map((m) => Number(m[1]));
      return { ok: true, value: { keys }, usage: NO_USAGE };
    },
    judge: async (req) => {
      await hold();
      if (mode === "busy") return { ok: false, errorClass: "upstream_busy", usage: NO_USAGE };
      if (mode === "malformed" || mode === "timeout") return { ok: false, errorClass: mode, usage: NO_USAGE };
      if (mode === "nothing") return { ok: true, value: { picks: [] }, usage: NO_USAGE };
      const keys = [...req.user.matchAll(/^(\d+)\|/gm)].slice(0, 3).map((m) => Number(m[1]));
      return { ok: true, value: { picks: keys.map((key) => ({ key, reason: "Its rules text builds the deck you described." })) }, usage: NO_USAGE };
    },
    now: () => Date.now(),
  };
}

/** What the read is built from, read before anything is reserved. */
export type TheReadInputs = {
  list: PoolList;
  /** The player's filtered pool, as list keys. */
  pool: Set<number>;
  /** True when the player set a filter: step 1 is then shown the pool's lines alone (plan (d)). */
  narrowed: boolean;
  decks: ReadDeck[];
  cards: ReadCard[];
  /** The collection digest the fingerprint was built from, re-checked before the answer is stored. */
  collection: string;
  fingerprint: string;
};

export async function loadTheReadInputs(userId: string, words: string, filters: ReadFilters): Promise<TheReadInputs> {
  const [list, facts, decks, collection, catalog] = await Promise.all([
    loadPoolList(),
    loadSearchFacts(userId, { ...filters, card: null }),
    loadReadDecks(userId),
    collectionDigest(userId),
    loadIntakeCatalog(),
  ]);
  // The pool is the free search's own list, so the read can never show a commander the filters exclude.
  const ranked = rankCandidates(facts.candidates, facts.answers, facts.card, facts.tribes);
  const poolIds = ranked.rows.map((r) => r.candidate.oracleId);
  const pool = new Set(poolIds.flatMap((id) => list.keyOf.get(id) ?? []));
  const cards = await loadReadCards(words, catalog.index, list, pool);
  const narrowed = filtersSet(filters);
  return {
    list, pool, narrowed, decks, cards, collection,
    fingerprint: readFingerprint({ words, filters, listGeneration: list.generation, pool: poolIds, collection, decks }),
  };
}

function filtersSet(f: ReadFilters): boolean {
  return f.colors.length > 0 || f.themes.length > 0 || (f.sets?.length ?? 0) > 0 || f.budgetDollars !== null || f.bracket !== null;
}

/**
 * Step 1's system prompt: the whole list, shared by every unfiltered press and sent as a cached
 * prefix, or, with a filter set, the pool's own lines (plan (d)), which are per player and sent
 * uncached: no other press would read them back, so a cache write would only add its premium.
 */
export function shortlistPrefix(inputs: Pick<TheReadInputs, "list" | "pool" | "narrowed">): string {
  if (!inputs.narrowed) return shortlistSystem(inputs.list.text);
  const lines = inputs.list.text.split("\n").filter((line) => inputs.pool.has(Number(line.slice(0, line.indexOf("|")))));
  return shortlistSystem(lines.join("\n"));
}

/** One press, end to end: what a probe, the eval and a test call. */
export async function runTheRead(
  userId: string,
  input: { readId: string; words: string; filters: ReadFilters },
  deps: TheReadDeps = defaultTheReadDeps(),
  inputs?: TheReadInputs,
): Promise<TheReadOutcome> {
  const begun = await beginTheRead(userId, input, deps, inputs);
  return begun.kind === "started" ? begun.finish() : begun;
}

/**
 * The press's first half, which the submit awaits (F8): the inputs, the fingerprint and the
 * reservation. A repeat or a refusal is the answer already; a started read hands back `finish`,
 * the two calls and the settle, which the submit schedules with `after()` and redirects past, so
 * the results page attaches to a read that is already running.
 */
export async function beginTheRead(
  userId: string,
  input: { readId: string; words: string; filters: ReadFilters },
  deps: TheReadDeps = defaultTheReadDeps(),
  /** The inputs, or a loader for them (a test counts its calls); omitted, they are read here. */
  inputs?: TheReadInputs | (() => Promise<TheReadInputs>),
): Promise<TheReadOutcome | { kind: "started"; readId: string; finish: () => Promise<TheReadOutcome> }> {
  const started0 = deps.now();
  // Three refusals, each BEFORE the pool is read, cheapest first. A read already running refuses
  // this one: a repeat of a stored ask is then refused too while another runs, the cheaper error,
  // since its words are kept and the next press answers it.
  if (await hasRunningRead(userId, new Date(started0))) return { kind: "in_flight" };
  // A player with no credit would pay the pool read only to be refused at the reservation. The
  // allowance is read without the reservation's lock, so this is a gate and not the authority:
  // `startRead` decides under its lock, and a failed read here lets the press through to it. The
  // price of the gate: a player out of credit is not served a free stored repeat by pressing again
  // (finding it needs the pool); the stored read stays reachable by its own address.
  const closed = await closedNow(userId, new Date(started0));
  if (closed) return { kind: closed };
  // And one press per player at a time through the pool read and the reservation, so a burst reads
  // the pool once, not once per press.
  const load = typeof inputs === "function" ? inputs : inputs ? async () => inputs : () => loadTheReadInputs(userId, input.words, input.filters);
  const admitted = await withReadAdmission(userId, async () => {
    // A press that arrives after another has reserved and let go finds the admission free, so the
    // running read is looked for again here, before anything is loaded.
    if (await hasRunningRead(userId, new Date(deps.now()))) return "running" as const;
    const facts = await load();
    const started = await startRead(userId, facts.fingerprint, deps.modelName, { readId: input.readId });
    return { facts, started };
  });
  if (admitted === "busy" || admitted === "running") return { kind: "in_flight" };
  const { facts, started } = admitted;
  if (started.kind === "stored") {
    const result = started.result ?? { picks: [], pool: facts.pool.size, weighed: 0 };
    return started.useful
      ? { kind: "read", readId: started.readId, result, repeat: true }
      : { kind: "nothing", readId: started.readId, result, repeat: true };
  }
  if (started.kind !== "started") return { kind: started.kind };
  return { kind: "started", readId: started.readId, finish: () => finishTheRead(userId, input, deps, facts, started, started0) };
}

/** Why the player's allowance is closed now, in the reservation's own order; null when a press may go on. */
async function closedNow(userId: string, now: Date): Promise<"paused" | "ownerShare" | "allowance" | null> {
  try {
    const closedBy = (a: Awaited<ReturnType<typeof readAllowance>>) =>
      a.paused ? "paused" : a.ownerShare ? "ownerShare" : a.used >= a.limit ? "allowance" : null;
    const first = closedBy(await readAllowance(userId, now, "intake"));
    if (first !== "allowance") return first;
    // A read the process died under still holds its unit until it is reaped, and `startRead` reaps
    // before it reserves. So a spent allowance is read again after reaping, once, before refusing.
    if ((await reapAbandonedReads(userId, now)) === 0) return first;
    return closedBy(await readAllowance(userId, now, "intake"));
  } catch {
    return null;
  }
}

async function finishTheRead(
  userId: string,
  input: { readId: string; words: string; filters: ReadFilters },
  deps: TheReadDeps,
  facts: TheReadInputs,
  started: { readId: string; callId: string },
  started0: number,
): Promise<TheReadOutcome> {
  const handle = { ...started, userId };
  const readId = started.readId;
  const billed: Billed[] = [];
  // Each call is its own part, with the effort it asked for (a stub's names none).
  const bill = (model: string, o: ModelOutcome<unknown>, step: "shortlist" | "judgement", effort: "low" | "medium" | "high") => {
    if (o.usage) billed.push({ model, usage: o.usage, step, effort: o.usage === NO_USAGE ? null : effort });
  };
  const failed = async (o: { errorClass: string }): Promise<TheReadOutcome> => {
    const errorClass = (o.errorClass === "upstream_rejected" ? "upstream_busy" : o.errorClass) as Exclude<ReadErrorClass, "nothing_valid" | "interrupted">;
    return (await settleTheRead(handle, { kind: "failed", errorClass }, billed)) ? { kind: "failed", errorClass } : { kind: "stopped" };
  };
  const nothing = async (weighed: number): Promise<TheReadOutcome> => {
    const result = { picks: [], pool: facts.pool.size, weighed };
    return (await settleTheRead(handle, { kind: "read", result }, billed, await rehash()))
      ? { kind: "nothing", readId, result, repeat: false }
      : { kind: "stopped" };
  };
  // The judgement reads ownership after the calls begin, so a collection that changed meanwhile
  // gave an answer the fingerprint does not describe: it is the player's, and is never a repeat's.
  const rehash = async () => ((await collectionDigest(userId)) === facts.collection ? {} : { rehash: `${facts.fingerprint}:moved:${readId}` });

  // Everything after the reservation settles the read, whatever throws: a read left pending would
  // hold the player's credit and their one slot until the reaper.
  try {
    return await calls();
  } catch (err) {
    console.error(`[the-read] ${readId} failed after its reservation`, err);
    await settleTheRead(handle, { kind: "failed", errorClass: "interrupted" }, billed).catch(() => undefined);
    return { kind: "failed", errorClass: "interrupted" };
  }

  async function calls(): Promise<TheReadOutcome> {
    // Step 1, the shortlist.
    if (!(await setReadPhase(handle, "shortlist"))) return { kind: "stopped" };
    if (facts.pool.size === 0) {
      // No call was made, so the ledger records a zero bill rather than none: a row with no cost
      // counts at its worst case until the reservation's TTL, as though a call were still billing.
      // `noCall`: it settles the cost and writes no part, since no provider call was made.
      billed.push({ model: deps.shortlistModel, usage: NO_USAGE, step: "shortlist", effort: null, noCall: true });
      return nothing(0);
    }
    const first = await deps.shortlist({
      system: shortlistPrefix(facts),
      cache: !facts.narrowed,
      user: shortlistRequest({ words: input.words, filters: input.filters, cards: facts.cards }),
      // Its own share, but never past what is left of the whole: loading the inputs counts too.
      deadlineMs: Math.max(1, Math.min(READ_SHORTLIST_DEADLINE_MS, READ_TOTAL_DEADLINE_MS - (deps.now() - started0))),
    });
    bill(deps.shortlistModel, first, "shortlist", READ_SHORTLIST_EFFORT);
    if (!first.ok) return failed(first);
    const shortlist = validShortlist(first.value, facts.pool);
    if (shortlist.length === 0) return nothing(0);

    // Step 2, the judgement, in whatever is left of the whole deadline.
    if (!(await setReadPhase(handle, "judge"))) {
      // Stopped or reaped between the calls: this settles nothing, since the read is no longer
      // pending, and only lands the shortlist's bill.
      await settleTheRead(handle, { kind: "failed", errorClass: "upstream_busy" }, billed);
      return { kind: "stopped" };
    }
    const candidates = await loadJudgeCandidates(userId, shortlist, facts.list);
    const second = await deps.judge({
      system: JUDGE_SYSTEM,
      user: judgeRequest({ words: input.words, filters: input.filters, decks: facts.decks, cards: facts.cards, candidates }),
      deadlineMs: Math.max(1, READ_TOTAL_DEADLINE_MS - (deps.now() - started0)),
    });
    bill(deps.judgeModel, second, "judgement", READ_JUDGE_EFFORT);
    if (!second.ok) return failed(second);
    const nameOf = new Map(candidates.map((c) => [c.key, c.name]));
    const result = { ...validJudgement({ reply: second.value, shortlist, idOf: facts.list.idOf, decks: facts.decks, nameOf }), pool: facts.pool.size, weighed: candidates.length };
    if (result.picks.length === 0) return nothing(candidates.length);
    return (await settleTheRead(handle, { kind: "read", result }, billed, await rehash()))
      ? { kind: "read", readId, result, repeat: false }
      : { kind: "stopped" };
  }
}

/**
 * The shortlist in full for the judgement (ruling 3): rules text, themes, whether the player owns
 * it, and how much of its decks' cards they own inside its identity (the search's own count).
 */
export async function loadJudgeCandidates(userId: string, keys: readonly number[], list: PoolList): Promise<JudgeCandidate[]> {
  const ids = keys.flatMap((k) => list.idOf.get(k) ?? []);
  const rows = (await db.execute(sql`
    select c.oracle_id as id, c.name, c.color_identity, c.type_line, coalesce(c.oracle_text, '') as oracle_text, cs.tags,
      exists (select 1 from collection_items ci where ci.user_id = ${userId} and ci.oracle_id = c.oracle_id) as owned,
      (select count(*) from commander_support_cards csc join cards sc on sc.oracle_id = csc.oracle_id
        where csc.commander_oracle_id = c.oracle_id and sc.color_identity <@ c.color_identity and csc.oracle_id <> c.oracle_id
          and exists (select 1 from collection_items ci where ci.user_id = ${userId} and ci.oracle_id = csc.oracle_id))::int as owned_support,
      (select count(*) from commander_support_cards csc join cards sc on sc.oracle_id = csc.oracle_id
        where csc.commander_oracle_id = c.oracle_id and sc.color_identity <@ c.color_identity and csc.oracle_id <> c.oracle_id)::int as support_total
    from cards c join commander_support cs on cs.commander_oracle_id = c.oracle_id
    where c.oracle_id = any(${sql.param(ids)}::uuid[])
  `)).rows as { id: string; name: string; color_identity: string[]; type_line: string | null; oracle_text: string; tags: EdhrecTag[] | null; owned: boolean; owned_support: number; support_total: number }[];
  const byId = new Map(rows.map((r) => [r.id, r]));
  return keys.flatMap((key) => {
    const r = byId.get(list.idOf.get(key) ?? "");
    if (!r) return [];
    return [{
      key, name: r.name, colors: colorsKey(r.color_identity), typeLine: r.type_line, oracleText: r.oracle_text,
      themes: leadingThemes(r.tags ?? [], 6), owned: r.owned, ownedSupport: r.owned_support, supportTotal: r.support_total,
    }];
  });
}
