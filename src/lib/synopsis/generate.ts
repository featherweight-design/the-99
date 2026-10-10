import { overviewV2Enabled } from "./overview-v2";
import { loadComboFacts } from "./combo-facts";
import { factCounts, interaction } from "../benchmarks/interaction";
import { benchmarkInput } from "../benchmarks/load";
import { deckBenchmarksEnabled } from "../decks/benchmarks-flag";
import { readLabels } from "../labels/read";
import type { InteractionCounts } from "./facts-extra";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "../../db";
import { cards, deckProfiles, deckSynopses, decks } from "../../db/schema";
import { isUniqueViolation } from "../db-error";
import { AllowanceSpentError, recordModelUsage, reserveModelCall, settleModelCall } from "../model/allowance";
import { callModel, type ModelOutcome, type ModelUsage } from "../model/client";
import { readProfileHead } from "../profile/load";
import { readStoredReading, sameList, type StoredProfileDeps } from "../profile/stored";
import { loadUniversalStaples } from "../staples/universal";
import { buildSynopsisFacts, deckNameIndex, normalizeName, type SynopsisFacts } from "./facts";
import { SYNOPSIS_CONTRACT_VERSION, SYNOPSIS_CONTRACT_VERSION_V2, SYNOPSIS_DEADLINE_MS, SYNOPSIS_MAX_TOKENS, SYNOPSIS_MAX_TOKENS_V8, SYNOPSIS_REPAIR_MIN_MS, synopsisContractVersion } from "./limits";
import { FREE_ATTEMPTS, freeRunAvailable, freeRunsFor, methodNoticeOf } from "./method-notice";
import { SYNOPSIS_EFFORT, SYNOPSIS_MODEL } from "./model";
import { buildSynopsisPrompt, isRepair } from "./prompt";
import { reapSynopses } from "./reaper";
import { synopsisResponseSchema, synopsisResponseSchemaV8Wire, type SynopsisReply, type SynopsisReplyV8Wire, type SynopsisResponse } from "./response-schema";
import { STUB_MODEL, stubDelay, stubMode, stubReply, synopsisLive } from "./stub";
import type { CheckedSynopsis, SectionId, SectionVerdict, SynopsisOutcome } from "./types";
import { marksIn, validateSynopsis } from "./validate";
import { normalizeV8, validateSynopsisV8, weaknessLines } from "./validate-v8";
import { overviewDataMovedFor } from "../notices/overview";
import { noticesEnabled } from "../notices/flag";
import { holdsIllegalCard, liveOffendingIds } from "../notices/read";

/**
 * Writing a synopsis: reserve, call, check, store, settle. SERVER-ONLY: it imports the database.
 * Exported from here rather than from the action module so `probe:synopsis` can call the real
 * functions; from a `"use server"` module they would become public actions.
 *
 * IT NEVER ANALYZES. A synopsis is written from the STORED reading, and only a fresh one (plan,
 * decision 1): the press that analyzed has already stored it, and a write asked for over a stale
 * or missing reading is refused rather than paying for an analysis nobody pressed.
 *
 * ONLY A WHOLE ANSWER SPENDS (Hugh, 2026-09-24, replacing 2026-09-23's "any section passes"): a
 * write, the player's Try again included, is spent only when all four sections render after the
 * repair (`chargeFor`); anything less refunds the unit, while its dollars stay counted. A run is written
 * `pending` in the transaction that reserves its unit, and settled in the transaction that writes
 * its outcome, so the two can never disagree.
 */

type Card = { oracleId: string; name: string };

export type SynopsisRow = {
  id: string;
  fingerprint: string;
  contractVersion: number;
  createdAt: Date;
  content: CheckedSynopsis;
  /** The change log head the reading it was written from had seen (deck notices plan D11). */
  seenSeq?: number;
};

export type WriteResult =
  /** A new run finished; `shown` is false when every section was refused. */
  | { kind: "written"; outcome: SynopsisOutcome; synopsis: SynopsisRow | null }
  /** The list already has a synopsis: nothing was called or charged. */
  | { kind: "reused"; synopsis: SynopsisRow }
  /** No reading, or a stale one: a write needs a fresh analysis of the list it describes. Also what
   *  a write gets when the list moved on its way to the reservation: nothing was called or charged. */
  | { kind: "no_reading" }
  /** Refused at the reservation: the player's allowance (`allowance`), the app-wide spend cap
   *  (`paused`) or the owner's testing share (`ownerShare`). Nothing was called or charged. */
  | { kind: "allowance" }
  | { kind: "paused" }
  | { kind: "ownerShare" }
  | { kind: "in_flight" }
  /** The reaper failed this run as `interrupted` before its answer landed; the answer was discarded
   *  and nothing was charged. */
  | { kind: "superseded" }
  /** A retry with nothing to retry, or a retry over a list the synopsis no longer describes. */
  | { kind: "nothing_to_retry" }
  /** The deck holds a card a legality notice stands for (deck notices HANDOFF §6, plan D10): a new
   *  overview is withheld. Refused before the reservation, so nothing was called or charged. */
  | { kind: "illegal" };

/** `deadlineMs` is what is left of the write's one budget: the repair gets only the remainder. */
export type ModelCall = (req: { system: string; user: string; deadlineMs: number; v2?: boolean }, facts: SynopsisFacts) =>
  Promise<ModelOutcome<SynopsisReply>>;

export type GenerateDeps = {
  /** Stored on the run, so the harness can tell models apart and a probe can prove the stub ran. */
  modelName: string;
  model: ModelCall;
  now: () => Date;
  profile?: StoredProfileDeps;
};

/** The real model in production or under `SYNOPSIS_LIVE=1`; the stub everywhere else. */
export function defaultDeps(): GenerateDeps {
  const live = synopsisLive();
  return {
    modelName: live ? SYNOPSIS_MODEL : STUB_MODEL,
    model: live
      // Contract 8 (the v2 method) asks for a bigger reply and constrains it to its own schema.
      ? (req): Promise<ModelOutcome<SynopsisReply>> => req.v2
        ? callModel({
          model: SYNOPSIS_MODEL,
          system: req.system,
          user: req.user,
          maxTokens: SYNOPSIS_MAX_TOKENS_V8,
          effort: SYNOPSIS_EFFORT,
          schema: synopsisResponseSchemaV8Wire,
          deadlineMs: req.deadlineMs,
        })
        : callModel({
          model: SYNOPSIS_MODEL,
          system: req.system,
          user: req.user,
          maxTokens: SYNOPSIS_MAX_TOKENS,
          effort: SYNOPSIS_EFFORT,
          schema: synopsisResponseSchema,
          deadlineMs: req.deadlineMs,
        })
      : async (req, facts) => {
        await stubDelay();
        return stubReply(facts, stubMode(), isRepair(req.user), !!req.v2);
      },
    now: () => new Date(),
  };
}

// ---------------------------------------------------------------------------------------------
// Pure decisions, unit-tested.

export function shown(content: CheckedSynopsis | null): boolean {
  return !!content && content.verdicts.some((v) => v.status === "ok");
}

export function outcomeOf(verdicts: readonly SectionVerdict[]): "survived" | "refused" {
  return verdicts.every((v) => v.status === "ok") ? "survived" : "refused";
}

/**
 * THE CREDIT RULE (Hugh, 2026-09-24): a write is charged only when all four sections render. Any
 * refused section refunds the reservation, whatever the rest shows; what the call cost is still
 * recorded as spend (#914).
 */
export function chargeFor(content: CheckedSynopsis | null): "spent" | "refunded" {
  return content && outcomeOf(content.verdicts) === "survived" ? "spent" : "refunded";
}

/** Two replies' usage, for a write that made the repair call too. */
export function sumUsage(a: ModelUsage | undefined, b: ModelUsage | undefined): ModelUsage | undefined {
  if (!a || !b) return a ?? b;
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
  };
}

export function refusedSections(content: CheckedSynopsis): SectionId[] {
  return content.verdicts.filter((v) => v.status === "refused").map((v) => v.section);
}

/**
 * A section retry's result: the stored passing sections BYTE FOR BYTE, and only the retried
 * sections from the new reply. So a retry can never change what the player already read, and the
 * modal's "The rest did" stays true (plan, decision 6).
 */
export function mergeRetry(
  stored: CheckedSynopsis,
  fresh: CheckedSynopsis,
  retried: readonly SectionId[],
): { content: CheckedSynopsis; anyRetriedPassed: boolean } {
  const take = (s: SectionId) => retried.includes(s);
  const verdicts = stored.verdicts.map((v) => (take(v.section) ? fresh.verdicts.find((f) => f.section === v.section)! : v));
  const content: CheckedSynopsis = {
    verdicts,
    overview: take("overview") ? fresh.overview : stored.overview,
    primer: take("primer") ? fresh.primer : stored.primer,
    keyCards: take("keyCards") ? fresh.keyCards : stored.keyCards,
    weaknesses: take("weaknesses") ? fresh.weaknesses : stored.weaknesses,
    // The land range is the facts', not a section's: the fresh check read the same facts.
    lands: fresh.lands ?? stored.lands,
    cards: { ...stored.cards, ...fresh.cards },
  };
  // Contract 8: the evidence follows its section, and the checklist follows the Weaknesses it chose
  // them from. A stored answer with neither (contract 7) stays without.
  if (stored.evidence && fresh.evidence) {
    const primer = take("primer");
    const e = stored.evidence;
    const f = fresh.evidence;
    content.evidence = {
      strategy: primer ? f.strategy : e.strategy,
      keep: primer ? f.keep : e.keep,
      sendBack: primer ? f.sendBack : e.sendBack,
      tips: primer ? f.tips : e.tips,
      keyCards: take("keyCards") ? f.keyCards : e.keyCards,
      weaknesses: take("weaknesses") ? f.weaknesses : e.weaknesses,
    };
  }
  const assessment = take("weaknesses") ? fresh.assessment : stored.assessment;
  if (assessment) content.assessment = assessment;
  const anyRetriedPassed = verdicts.some((v) => take(v.section) && v.status === "ok");
  return { content, anyRetriedPassed };
}

// ---------------------------------------------------------------------------------------------
// Reads.

/** The draft's synopsis: the newest finished run with at least one section shown. */
export async function readShownSynopsis(
  deckId: string,
  userId: string,
  list?: string,
  /** A caller's transaction, when the overview must come from the same snapshot as its list. */
  on: Pick<typeof db, "select"> = db,
): Promise<SynopsisRow | null> {
  const [row] = await on
    .select({
      id: deckSynopses.id,
      fingerprint: deckSynopses.fingerprint,
      contractVersion: deckSynopses.contractVersion,
      createdAt: deckSynopses.createdAt,
      content: deckSynopses.content,
      seenSeq: deckSynopses.seenSeq,
    })
    .from(deckSynopses)
    .where(and(
      eq(deckSynopses.deckId, deckId),
      eq(deckSynopses.userId, userId),
      eq(deckSynopses.status, "done"),
      sql`${deckSynopses.content} -> 'verdicts' @> '[{"status":"ok"}]'::jsonb`,
    ))
    // THE LIST'S OWN OVERVIEW FIRST, when a list is named: reuse is keyed on the fingerprint alone
    // (ruling B), so after A, an edit and a write of B, and a revert to A, A's overview is still
    // A's. Newest-only would describe the deck as B and write, and charge, a duplicate A (7d).
    .orderBy(...(list ? [sql`(${deckSynopses.fingerprint} = ${list}) desc`] : []), desc(deckSynopses.createdAt))
    .limit(1);
  return row?.content ? (row as SynopsisRow) : null;
}

/**
 * The fresh reading a write works from, with the list it describes. Null when there is none.
 *
 * ONE STORED ROW. `readStoredReading` answers from its own transaction, so the row's list is read
 * after it, and the row must still be the one the reading came from: the same `computed_at` as
 * the reading's `analyzedAt`, and no edit since. A new analysis stored, or an edit, in between
 * would otherwise hand the model one list's profile under another list's fingerprint. Comparing
 * against the READING's stamp rather than an earlier read of the row is what lets the quiet
 * rebuild of an older `PROFILE_VERSION` through, since that rebuild moves `computed_at` itself.
 */
async function freshReading(deckId: string, userId: string, deps?: StoredProfileDeps) {
  const reading = await readStoredReading(deckId, userId, deps);
  if (!reading?.fresh) return null;
  const [row] = await db
    .select({ list: deckProfiles.fingerprint, at: deckProfiles.computedAt, dirty: deckProfiles.dirty, seenSeq: deckProfiles.seenSeq })
    .from(deckProfiles)
    .where(and(eq(deckProfiles.deckId, deckId), eq(deckProfiles.userId, userId)));
  if (!row || row.dirty || row.at.getTime() !== reading.analyzedAt.getTime()) return null;
  return { profile: reading.profile, list: row.list, seenSeq: row.seenSeq };
}

/** Exported for the eval harness, which must run this exact input builder rather than a copy. */
export async function factsFor(
  profile: Parameters<typeof buildSynopsisFacts>[0],
  /** Read the combos of any size, assembled or one card short (one query). Off unless the v2 method is on. */
  v2: boolean = overviewV2Enabled(),
  /** Quote the evidence benchmarks' interaction reading (plan PR 1b), so the Overview and the
   *  Analysis tab's grade agree. Off with the switch: the facts are exactly the classifier's. */
  benchmarks: boolean = deckBenchmarksEnabled(),
): Promise<SynopsisFacts> {
  return (await factsWithSource(profile, v2, benchmarks)).facts;
}

/** `factsFor`, saying whether the interaction figures are the benchmarks' (`shared`) or the
 *  classifier's: a failed label read falls back, and the write stamps the contract it really used. */
export async function factsWithSource(
  profile: Parameters<typeof buildSynopsisFacts>[0],
  v2: boolean,
  benchmarks: boolean,
): Promise<{ facts: SynopsisFacts; shared: boolean }> {
  const ids = profile.cards.map((c) => c.oracleId);
  const texts = ids.length === 0 ? [] : await db
    .select({ oracleId: cards.oracleId, oracleText: cards.oracleText, keywords: cards.keywords })
    .from(cards)
    .where(inArray(cards.oracleId, ids));
  const anySize = v2 ? await loadComboFacts(profile) : null;
  const shared = benchmarks ? await sharedInteraction(profile, texts) : null;
  const facts = buildSynopsisFacts(profile, new Map(texts.map((t) => [t.oracleId, t.oracleText])), await loadUniversalStaples(), anySize,
    v2 ? new Map(texts.map((t) => [t.oracleId, t.keywords])) : null,
    shared);
  return { facts, shared: shared !== null };
}

/** The benchmarks' interaction reading over the profile's own list: fresh labels, and a card's rules
 *  text where it has none. Null when the label read fails, which keeps the classifier's figures. */
async function sharedInteraction(
  profile: Parameters<typeof buildSynopsisFacts>[0],
  texts: readonly { oracleId: string; oracleText: string | null; keywords: string[] }[],
): Promise<InteractionCounts | null> {
  try {
    const labels = await readLabels(profile.cards.map((c) => c.oracleId));
    const rows = texts.map((t) => ({ ...t, manaCost: null, colorIdentity: [] }));
    return factCounts(interaction(benchmarkInput(profile, rows, labels, []).cards));
  } catch (error) {
    console.error("shared interaction read failed", error);
    return null;
  }
}

/** Check a reply under the contract it was written for: the one validator the write, the repair and the eval harness all call. */
export async function checkReply(value: SynopsisReply, facts: SynopsisFacts, v2: boolean): Promise<CheckedSynopsis> {
  if (!v2) {
    const reply = value as SynopsisResponse;
    return validateSynopsis(reply, facts, await catalogFor(reply, facts));
  }
  const reply = normalizeV8(value as SynopsisReplyV8Wire);
  return validateSynopsisV8(reply, facts, await catalogFor({ weaknesses: weaknessLines(reply) }, facts));
}

/** The one repair call's prompt: the facts, the passing sections to return unchanged, each refused section's reason. Shared by the write and the eval harness. */
export function repairPrompt(facts: SynopsisFacts, content: CheckedSynopsis, failing: SectionId[], v2: boolean, first?: SynopsisReply) {
  return buildSynopsisPrompt(facts, { keep: content, refused: failing, first }, { v2, contract8: v2 });
}

/**
 * The repair's result merged over the first answer: checked by the same rules, every passing
 * section byte for byte, a refused section the repair fails again left refused. A repair that
 * did not come back (`ok: false`) leaves the first answer as it was. Shared by the write and the
 * eval harness, so what the gate measures is what a reader is shown.
 */
export async function applyRepair(
  first: CheckedSynopsis,
  repair: ModelOutcome<SynopsisReply>,
  failing: SectionId[],
  facts: SynopsisFacts,
  v2: boolean,
): Promise<CheckedSynopsis> {
  if (!repair.ok) return first;
  return mergeRetry(first, await checkReply(repair.value, facts, v2), failing).content;
}

/** The catalog cards Weaknesses names that the deck does not hold. Exported for the eval harness,
 *  which must run this exact read rather than a copy. */
export async function catalogFor(reply: Pick<SynopsisResponse, "weaknesses">, facts: SynopsisFacts): Promise<Map<string, Card>> {
  const deck = deckNameIndex(facts.cards);
  const keys = [...new Set(reply.weaknesses.flatMap(marksIn).map(normalizeName))].filter((k) => !deck.has(k));
  if (keys.length === 0) return new Map();
  const rows = await db
    .select({ oracleId: cards.oracleId, name: cards.name })
    .from(cards)
    .where(inArray(sql`lower(${cards.name})`, keys));
  return new Map(rows.map((r) => [normalizeName(r.name), r]));
}

// ---------------------------------------------------------------------------------------------
// Writes.

/** Reap, reserve a unit, insert the pending run: one transaction, before any network call.
 *  Exported for its unit test, which proves a refusal under the lock reserves nothing. */
export async function startRun(
  deckId: string,
  userId: string,
  list: string,
  model: string,
  now: Date,
  retryOf: string | null,
  /** False on a retry, which rewrites the synopsis for this very list on purpose. */
  checkReuse: boolean,
  /** The reading's change log head, stamped on the run (deck notices plan D11). */
  seenSeq = 0,
  /**
   * The list's overview is being REPLACED because the data under it moved (D11). The check under
   * the lock then counts only an overview written for this reading or a later one, which is what a
   * concurrent press would have written; the moved one it replaces does not stop it.
   */
  replacing = false,
  /** The contract the run is written under: 8 while the v2 method is on. */
  contractVersion: number = SYNOPSIS_CONTRACT_VERSION,
  /**
   * The press is the method-change REWRITE (`method-notice.ts`): the deck's shown overview was
   * written under an older contract and no rewrite has produced a new one. `free` is the first
   * two tries, `paid` is the fallback once both are used (the audit's 1e). Either bypasses the
   * reuse early return, because the point is to rewrite an overview the list already has.
   *
   * DECIDED AGAIN under the deck's lock, which every rewrite for a deck takes. A rewrite that
   * produced an overview since the press read it ends the need, and the press is a plain one
   * (so reuse hands that overview back). `free` is granted only while fewer than `FREE_ATTEMPTS`
   * `system` calls exist for the deck at the new contract: granted, the call is reserved as
   * `origin = 'system'` and takes no credit; refused (the cap), the press falls through to the
   * PLAYER path as `paid`, allowance check included, so a third attempt is the player's own.
   */
  method: "free" | "paid" | null = null,
): Promise<{ kind: "started"; runId: string; callId: string } | { kind: "allowance" } | { kind: "paused" } | { kind: "ownerShare" } | { kind: "in_flight" } | { kind: "reused"; synopsis: SynopsisRow } | { kind: "illegal" } | { kind: "no_reading" }> {
  // The reap COMMITS ON ITS OWN, before the reservation: a spent allowance rolls the reservation's
  // transaction back, and a reap inside it would roll back too, leaving an abandoned run locking
  // the deck for as long as the allowance stays spent.
  await db.transaction((tx) => reapSynopses(tx, deckId, now));
  try {
    const handle = await db.transaction(async (tx) => {
      // THE DECK ROW'S LOCK, FIRST, on every write: the order every card edit takes, so an edit
      // waits for this reservation or this waits for the edit. Everything checked below is then
      // the list the reservation is for.
      const [deck] = await tx
        .select({ commander: decks.commanderOracleId, partner: decks.partnerOracleId })
        .from(decks)
        .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
        .for("update");
      if (!deck) throw new ListMovedError();
      // THE LEGALITY CHECK, AGAIN, under the same lock (deck notices HANDOFF §6), and before the
      // list's: a card that makes the deck illegal also moves its list, and `illegal` is the answer
      // that says why. `run` checks first so a withheld write reads nothing.
      if (noticesEnabled()
        && (await liveOffendingIds(tx, deckId, [deck.commander, ...(deck.partner ? [deck.partner] : [])])).length > 0) {
        throw new IllegalDeckError();
      }
      // THE LIST, AGAIN. `run` read the reading before it got here, and an edit committing in
      // between would otherwise be charged for, and written, as the list it replaced. The reading
      // must still be clean, still be the one `run` read (`list`), and still describe the live
      // list by the stored reading's own rule (`sameList`, which reads a pre-0054 row correctly).
      const [head, [reading]] = await Promise.all([
        readProfileHead(tx, deckId, userId),
        tx.select({ fingerprint: deckProfiles.fingerprint, profileVersion: deckProfiles.profileVersion, dirty: deckProfiles.dirty })
          .from(deckProfiles)
          .where(and(eq(deckProfiles.deckId, deckId), eq(deckProfiles.userId, userId))),
      ]);
      if (!head || !reading || reading.dirty || reading.fingerprint !== list || !sameList(reading, head)) {
        throw new ListMovedError();
      }
      let origin: "player" | "system" = "player";
      let rewrite = method;
      if (method) {
        // The deck row is locked FOR UPDATE above, and every rewrite for a deck starts here, so
        // this count cannot be passed by two presses at once.
        const runs = await freeRunsFor(tx, deckId);
        if (runs.succeeded) rewrite = null;
        else if (method === "free" && runs.attempts < FREE_ATTEMPTS) origin = "system";
        else rewrite = "paid";
      }
      const unit = await reserveModelCall(tx, userId, "synopsis", model, now, origin);
      if ("refused" in unit) throw new AllowanceSpentError(unit.refused);
      // REUSE, DECIDED AGAIN UNDER THE LOCK `reserveModelCall` just took. Two first presses both
      // read "no synopsis" before either wrote; if the first finished before the second got here,
      // the one-pending index is clear again and only this check stops a second, charged write.
      if (checkReuse && origin === "player") {
        // Any shown overview for THIS list, not only the newest: the same rule the read uses.
        const [shownNow] = await tx.select({ id: deckSynopses.id })
          .from(deckSynopses)
          .where(and(eq(deckSynopses.deckId, deckId), eq(deckSynopses.userId, userId), eq(deckSynopses.status, "done"),
            eq(deckSynopses.fingerprint, list),
            replacing ? sql`${deckSynopses.seenSeq} >= ${seenSeq}` : sql`true`,
            // A paid rewrite counts only an overview already at the new contract: the older one it
            // replaces is exactly what the press is for.
            rewrite ? sql`${deckSynopses.contractVersion} >= ${SYNOPSIS_CONTRACT_VERSION_V2}` : sql`true`,
            sql`${deckSynopses.content} -> 'verdicts' @> '[{"status":"ok"}]'::jsonb`))
          .limit(1);
        if (shownNow) throw new AlreadyWrittenError();
      }
      const [row] = await tx.insert(deckSynopses).values({
        deckId, userId, fingerprint: list, contractVersion,
        model, modelCallId: unit.id, status: "pending", retryOf, createdAt: now, seenSeq,
      }).returning({ id: deckSynopses.id });
      return { runId: row.id, callId: unit.id };
    });
    return { kind: "started", ...handle };
  } catch (err) {
    if (err instanceof IllegalDeckError) return { kind: "illegal" };
    if (err instanceof ListMovedError) return { kind: "no_reading" };
    if (err instanceof AllowanceSpentError) return { kind: err.refused };
    if (err instanceof AlreadyWrittenError) {
      const synopsis = await readShownSynopsis(deckId, userId, list);
      if (synopsis) return { kind: "reused", synopsis };
    }
    if (isUniqueViolation(err)) return { kind: "in_flight" };
    throw err;
  }
}

class AlreadyWrittenError extends Error {}
class IllegalDeckError extends Error {}
class ListMovedError extends Error {}

/**
 * The outcome and the unit, together. Guarded on `pending`, so a run the reaper already failed
 * changes nothing here, and its late result is discarded. False when superseded.
 *
 * The run arrives with its unit's id (`callId`), held by the caller since the start, so the bill
 * reaches the ledger even when the run row is GONE: `deck_synopses.deck_id` cascades on a deck
 * delete while `model_calls` is kept.
 */
export async function finishRun(
  { runId, callId }: { runId: string; callId: string },
  set: {
    outcome: SynopsisOutcome;
    content: CheckedSynopsis | null;
    usage: { inputTokens: number; outputTokens: number } | null;
    charge: "spent" | "refunded";
    /** What the call was billed for, when it got a response; written on the unit as it settles. */
    billed?: { model: string; usage: ModelUsage };
    /** The failing call's HTTP status, when it had one (`ModelOutcome.status`). */
    errorStatus?: number;
  },
  now: Date = new Date(),
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const rows = await tx.update(deckSynopses)
      .set({
        status: "done",
        outcome: set.outcome,
        content: set.content,
        inputTokens: set.usage?.inputTokens ?? null,
        outputTokens: set.usage?.outputTokens ?? null,
        errorStatus: set.errorStatus ?? null,
      })
      .where(and(eq(deckSynopses.id, runId), eq(deckSynopses.status, "pending")))
      .returning({ callId: deckSynopses.modelCallId });
    for (const r of rows) await settleModelCall(tx, r.callId, set.charge, set.billed, now);
    if (rows.length === 0 && set.billed) {
      // A LATE OUTCOME: the reaper settled this run first, or its deck was deleted and took the run
      // row with it, so nothing about the run or the credit moves, but the call billed all the
      // same and its unit counts at its worst case until its meters land. Reached by the unit's
      // own id, never through the run row. `recordModelUsage` writes them only while none are
      // recorded.
      await recordModelUsage(tx, callId, set.billed, now);
    }
    return rows.length > 0;
  });
}

/**
 * What a failed call settles its run with: the call's own class, and its HTTP status when it had
 * one, so the row says whether the upstream was busy or refused the request (H33). Refunded,
 * always: no answer came back to charge for.
 */
export function failedRunSet(
  outcome: Extract<ModelOutcome<unknown>, { ok: false }>,
  billed: { model: string; usage: ModelUsage } | undefined,
): Parameters<typeof finishRun>[1] {
  return { outcome: outcome.errorClass, content: null, usage: null, charge: "refunded", billed, errorStatus: outcome.status };
}

async function run(
  deckId: string,
  userId: string,
  deps: GenerateDeps,
  retry: SynopsisRow | null,
): Promise<WriteResult> {
  // FIRST, before the reading, the reuse check and the reservation: a withheld overview spends
  // nothing and starts no run, a retry included.
  // Behind the notices switch: off, the check is not there and the write runs as before.
  if (noticesEnabled() && (await holdsIllegalCard(deckId, userId))) return { kind: "illegal" };
  // Read once: a write is made wholly under one contract, whatever the switch does mid-flight.
  const v2 = overviewV2Enabled();
  const benchmarks = deckBenchmarksEnabled();
  const reading = await freshReading(deckId, userId, deps.profile);
  if (!reading) return { kind: "no_reading" };
  const current = await readShownSynopsis(deckId, userId, reading.list);
  if (retry && (!current || current.id !== retry.id || current.fingerprint !== reading.list)) return { kind: "nothing_to_retry" };
  const replacing = !retry && !!current && current.fingerprint === reading.list
    && (await overviewDataMovedFor(deckId, userId, current.seenSeq ?? 0));
  // THE METHOD-CHANGE REWRITE (free, then paid once both tries are spent), decided from eligibility and not from which button was pressed
  // (the audit's build rule 1): the notice's press, ruling D's, Re-analyze's chained write and a
  // section retry all reach here. Only with the switch on, so a deck on contract 7 reads nothing extra.
  const notice = v2 ? methodNoticeOf({ v2, shown: current && { contractVersion: current.contractVersion, overviewOk: !!current.content?.overview }, runs: await freeRunsFor(db, deckId) }) : null;
  const method = notice ? (freeRunAvailable(notice) ? "free" : "paid") : null;
  if (!retry && current && current.fingerprint === reading.list && !replacing && !method) {
    // REUSE IS KEYED ON THE LIST (ruling B): a contract change never rewrites it. The one exception
    // is data under the list moving (deck notices D11): the read marks that overview stale and
    // offers *Write a new overview*, which must then write one rather than hand the same one back.
    return { kind: "reused", synopsis: current };
  }

  // The contract is the one the facts were really built under: with the switch on, a failed label
  // read falls back to the classifier's figures and is stamped 7 or 8, not 9 or 10.
  const { facts, shared } = await factsWithSource(reading.profile, v2, benchmarks);
  const contract = synopsisContractVersion(v2, shared);

  // A section retry works only on the synopsis for this very list, under this very contract. One
  // written under another contract is rewritten whole instead: a document never mixes two
  // contracts (plan, decision 2), so it never quotes two interaction readings either.
  let base: SynopsisRow | null = null;
  if (retry && current && current.contractVersion === contract) {
    if (refusedSections(current.content).length === 0) return { kind: "nothing_to_retry" };
    base = current;
  }
  const refused = base ? refusedSections(base.content) : null;
  const prompt = buildSynopsisPrompt(facts, base && refused ? { keep: base.content, refused } : undefined, { v2, contract8: v2 });

  const started = await startRun(deckId, userId, reading.list, deps.modelName, deps.now(), base?.id ?? null, !retry, reading.seenSeq, replacing, contract, method);
  if (started.kind !== "started") return started;

  // EVERY PATH AFTER THE RESERVATION SETTLES THE RUN. A throw anywhere past here (the catalog
  // read, the checks, the store) is settled as a refunded upstream failure, so the unit comes
  // straight back and the one-pending index does not hold the deck until the reaper.
  //
  // `billed` is in scope for the WHOLE block for the same reason: once the call has returned, every
  // settle records what it cost, the fallback in the `catch` included. A throw in the catalog read
  // or the checks comes after a reply that was billed all the same.
  let billed: { model: string; usage: ModelUsage } | undefined;
  // ONE budget for the whole write, the repair included (contract B): the repair is sent only with
  // what is left of it, so the write can never outlast the deck page's `maxDuration`.
  const startedAt = deps.now().getTime();
  const remaining = () => SYNOPSIS_DEADLINE_MS - (deps.now().getTime() - startedAt);
  const call = async (req: { system: string; user: string }): Promise<ModelOutcome<SynopsisReply>> => {
    try {
      return await deps.model({ ...req, deadlineMs: remaining(), v2 }, facts);
    } catch (error) {
      console.error("synopsis model call threw", error);
      return { ok: false, errorClass: "upstream_busy" };
    }
  };
  try {
    const outcome = await call(prompt);
    if (outcome.usage) billed = { model: deps.modelName, usage: outcome.usage };

    if (!outcome.ok) {
      const settled = await finishRun(started, failedRunSet(outcome, billed), deps.now());
      return settled ? { kind: "written", outcome: outcome.errorClass, synopsis: null } : { kind: "superseded" };
    }

    let usage: ModelUsage | undefined = outcome.usage;
    let content = await checkReply(outcome.value, facts, v2);
    if (base && refused) {
      content = mergeRetry(base.content, content, refused).content;
    } else if (refusedSections(content).length > 0 && remaining() >= SYNOPSIS_REPAIR_MIN_MS) {
      // CONTRACT B: ONE repair, before the player sees anything. It is the section-retry prompt:
      // the facts, the first answer's passing sections to return unchanged, and each refused
      // section's reason. Checked by the same rules, and merged so every passing section stays
      // byte for byte. A refused section the repair fails again stays refused, now with the
      // repair's own reason and counts, which is what a later Try again is asked to fix.
      const failing = refusedSections(content);
      const repair = await call(repairPrompt(facts, content, failing, v2, outcome.value));
      usage = sumUsage(usage, repair.usage);
      if (usage) billed = { model: deps.modelName, usage };
      content = await applyRepair(content, repair, failing, facts, v2);
    }
    const charge = chargeFor(content);
    const result = outcomeOf(content.verdicts);
    const written = await finishRun(
      started,
      { outcome: result, content, usage: usage ?? null, charge, billed },
      deps.now(),
    );
    if (!written) return { kind: "superseded" };
    return {
      kind: "written",
      outcome: result,
      synopsis: shown(content)
        ? { id: started.runId, fingerprint: reading.list, contractVersion: contract, createdAt: deps.now(), content }
        : null,
    };
  } catch (error) {
    console.error("synopsis write failed after its reservation", error);
    const settled = await finishRun(started, { outcome: "upstream_busy", content: null, usage: null, charge: "refunded", billed }, deps.now());
    return settled ? { kind: "written", outcome: "upstream_busy", synopsis: null } : { kind: "superseded" };
  }
}

/** Write the deck's synopsis, or return the one already written for this list. */
export function writeSynopsisFor(deckId: string, userId: string, deps: GenerateDeps = defaultDeps()): Promise<WriteResult> {
  return run(deckId, userId, deps, null);
}

/**
 * Rewrite the refused sections of the synopsis the player is looking at (`synopsisId`), and only
 * those. Refused unless it is still the deck's synopsis and still describes the current list.
 */
export async function retrySynopsisFor(
  deckId: string,
  userId: string,
  synopsisId: string,
  deps: GenerateDeps = defaultDeps(),
): Promise<WriteResult> {
  const current = await readShownSynopsis(deckId, userId);
  if (!current || current.id !== synopsisId) return { kind: "nothing_to_retry" };
  return run(deckId, userId, deps, current);
}
