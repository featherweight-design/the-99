import { sql } from "drizzle-orm";

import { db } from "../../db";
import type { Billed } from "../model/allowance";
import { callModel, type ModelOutcome } from "../model/client";
import { collectionDigest, loadReadCards, loadReadDecks } from "./the-read-load";
import {
  READ_JUDGE_EFFORT, READ_JUDGE_MAX_TOKENS, READ_JUDGE_MODEL, READ_SHORTLIST_DEADLINE_MS, READ_SHORTLIST_EFFORT,
  READ_SHORTLIST_MAX_TOKENS, READ_SHORTLIST_MODEL, READ_TOTAL_DEADLINE_MS, INTAKE_RETRY_FLOOR_MS,
} from "./limits";
import { colorsKey, leadingThemes, loadPoolList, type PoolList } from "./pool-list";
import { rankCandidates } from "./rank";
import { setReadPhase, settleTheRead, startRead, type ReadErrorClass } from "./run-store";
import { loadIntakeCatalog, loadSearchFacts } from "./search";
import { intakeLive, STUB_MODEL } from "./stub";
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

/** No API call: the shortlist takes the pool's first keys, the judgement the first three with a plain reason. */
export function stubTheReadDeps(): TheReadDeps {
  return {
    modelName: STUB_MODEL,
    shortlistModel: STUB_MODEL,
    judgeModel: STUB_MODEL,
    shortlist: async (req) => {
      const keys = [...req.system.matchAll(/^(\d+)\|/gm)].slice(0, 12).map((m) => Number(m[1]));
      return { ok: true, value: { keys }, usage: NO_USAGE };
    },
    judge: async (req) => {
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

export async function runTheRead(
  userId: string,
  input: { readId: string; words: string; filters: ReadFilters },
  deps: TheReadDeps = defaultTheReadDeps(),
  inputs?: TheReadInputs,
): Promise<TheReadOutcome> {
  const started0 = deps.now();
  const facts = inputs ?? await loadTheReadInputs(userId, input.words, input.filters);
  const started = await startRead(userId, facts.fingerprint, deps.modelName, { readId: input.readId });
  if (started.kind === "stored") {
    const result = started.result ?? { picks: [], pool: facts.pool.size, weighed: 0 };
    return started.useful
      ? { kind: "read", readId: started.readId, result, repeat: true }
      : { kind: "nothing", readId: started.readId, result, repeat: true };
  }
  if (started.kind !== "started") return { kind: started.kind };
  const handle = { ...started, userId };
  const readId = started.readId;
  const billed: Billed[] = [];
  const bill = (model: string, o: ModelOutcome<unknown>) => { if (o.usage) billed.push({ model, usage: o.usage }); };
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
    if (facts.pool.size === 0) return nothing(0);
    const first = await deps.shortlist({
      system: shortlistPrefix(facts),
      cache: !facts.narrowed,
      user: shortlistRequest({ words: input.words, filters: input.filters, cards: facts.cards }),
      deadlineMs: READ_SHORTLIST_DEADLINE_MS,
    });
    bill(deps.shortlistModel, first);
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
    bill(deps.judgeModel, second);
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
