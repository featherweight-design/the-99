import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "../../db";
import { cards, deckProfiles, deckSynopses } from "../../db/schema";
import { isUniqueViolation } from "../db-error";
import { AllowanceSpentError, reserveModelCall, settleModelCall } from "../model/allowance";
import { callModel, type ModelOutcome } from "../model/client";
import { readStoredReading, type StoredProfileDeps } from "../profile/stored";
import { buildSynopsisFacts, deckNameIndex, normalizeName, type SynopsisFacts } from "./facts";
import { SYNOPSIS_CONTRACT_VERSION, SYNOPSIS_DEADLINE_MS, SYNOPSIS_MAX_TOKENS } from "./limits";
import { SYNOPSIS_MODEL } from "./model";
import { buildSynopsisPrompt } from "./prompt";
import { reapSynopses } from "./reaper";
import { synopsisResponseSchema, type SynopsisResponse } from "./response-schema";
import { STUB_MODEL, stubMode, stubReply, synopsisLive } from "./stub";
import type { CheckedSynopsis, SectionId, SectionVerdict, SynopsisOutcome } from "./types";
import { marksIn, validateSynopsis } from "./validate";

/**
 * Writing a synopsis: reserve, call, check, store, settle. SERVER-ONLY: it imports the database.
 * Exported from here rather than from the action module so `probe:synopsis` can call the real
 * functions; from a `"use server"` module they would become public actions.
 *
 * IT NEVER ANALYZES. A synopsis is written from the STORED reading, and only a fresh one (plan,
 * decision 1): the press that analyzed has already stored it, and a write asked for over a stale
 * or missing reading is refused rather than paying for an analysis nobody pressed.
 *
 * ONLY A SUCCESSFUL ANSWER SPENDS (Hugh, 2026-09-23; plan, decision 4). A first write is spent
 * when any section passes; a section retry only when a RETRIED section passes. A run is written
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
};

export type WriteResult =
  /** A new run finished; `shown` is false when every section was refused. */
  | { kind: "written"; outcome: SynopsisOutcome; synopsis: SynopsisRow | null }
  /** The list already has a synopsis: nothing was called or charged. */
  | { kind: "reused"; synopsis: SynopsisRow }
  /** No reading, or a stale one: a write needs a fresh analysis of the list it describes. */
  | { kind: "no_reading" }
  | { kind: "allowance" }
  | { kind: "in_flight" }
  /** A retry with nothing to retry, or a retry over a list the synopsis no longer describes. */
  | { kind: "nothing_to_retry" };

export type ModelCall = (req: { system: string; user: string }, facts: SynopsisFacts) =>
  Promise<ModelOutcome<SynopsisResponse>>;

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
      ? (req) => callModel({
        model: SYNOPSIS_MODEL,
        system: req.system,
        user: req.user,
        maxTokens: SYNOPSIS_MAX_TOKENS,
        schema: synopsisResponseSchema,
        deadlineMs: SYNOPSIS_DEADLINE_MS,
      })
      : async (_req, facts) => stubReply(facts, stubMode()),
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
    cards: { ...stored.cards, ...fresh.cards },
  };
  const anyRetriedPassed = verdicts.some((v) => take(v.section) && v.status === "ok");
  return { content, anyRetriedPassed };
}

// ---------------------------------------------------------------------------------------------
// Reads.

/** The draft's synopsis: the newest finished run with at least one section shown. */
export async function readShownSynopsis(deckId: string, userId: string): Promise<SynopsisRow | null> {
  const [row] = await db
    .select({
      id: deckSynopses.id,
      fingerprint: deckSynopses.fingerprint,
      contractVersion: deckSynopses.contractVersion,
      createdAt: deckSynopses.createdAt,
      content: deckSynopses.content,
    })
    .from(deckSynopses)
    .where(and(
      eq(deckSynopses.deckId, deckId),
      eq(deckSynopses.userId, userId),
      eq(deckSynopses.status, "done"),
      sql`${deckSynopses.content} -> 'verdicts' @> '[{"status":"ok"}]'::jsonb`,
    ))
    .orderBy(desc(deckSynopses.createdAt))
    .limit(1);
  return row?.content ? (row as SynopsisRow) : null;
}

/** The fresh reading a write works from, with the list it describes. Null when there is none. */
async function freshReading(deckId: string, userId: string, deps?: StoredProfileDeps) {
  const reading = await readStoredReading(deckId, userId, deps);
  if (!reading?.fresh) return null;
  const [row] = await db
    .select({ list: deckProfiles.fingerprint })
    .from(deckProfiles)
    .where(and(eq(deckProfiles.deckId, deckId), eq(deckProfiles.userId, userId)));
  return row ? { profile: reading.profile, list: row.list } : null;
}

async function factsFor(profile: Parameters<typeof buildSynopsisFacts>[0]): Promise<SynopsisFacts> {
  const ids = profile.cards.map((c) => c.oracleId);
  const texts = ids.length === 0 ? [] : await db
    .select({ oracleId: cards.oracleId, oracleText: cards.oracleText })
    .from(cards)
    .where(inArray(cards.oracleId, ids));
  return buildSynopsisFacts(profile, new Map(texts.map((t) => [t.oracleId, t.oracleText])));
}

/** The catalog cards Weaknesses names that the deck does not hold. */
async function catalogFor(reply: SynopsisResponse, facts: SynopsisFacts): Promise<Map<string, Card>> {
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

/** Reap, reserve a unit, insert the pending run: one transaction, before any network call. */
async function startRun(
  deckId: string,
  userId: string,
  list: string,
  model: string,
  now: Date,
  retryOf: string | null,
): Promise<{ kind: "started"; runId: string } | { kind: "allowance" } | { kind: "in_flight" }> {
  try {
    const runId = await db.transaction(async (tx) => {
      await reapSynopses(tx, deckId, now);
      const unit = await reserveModelCall(tx, userId, "synopsis", now);
      if (!unit) throw new AllowanceSpentError();
      const [row] = await tx.insert(deckSynopses).values({
        deckId, userId, fingerprint: list, contractVersion: SYNOPSIS_CONTRACT_VERSION,
        model, modelCallId: unit.id, status: "pending", retryOf, createdAt: now,
      }).returning({ id: deckSynopses.id });
      return row.id;
    });
    return { kind: "started", runId };
  } catch (err) {
    if (err instanceof AllowanceSpentError) return { kind: "allowance" };
    if (isUniqueViolation(err)) return { kind: "in_flight" };
    throw err;
  }
}

/**
 * The outcome and the unit, together. Guarded on `pending`, so a run the reaper already failed
 * changes nothing here, and its late result is discarded. False when superseded.
 */
export async function finishRun(
  runId: string,
  set: {
    outcome: SynopsisOutcome;
    content: CheckedSynopsis | null;
    usage: { inputTokens: number; outputTokens: number } | null;
    charge: "spent" | "refunded";
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
      })
      .where(and(eq(deckSynopses.id, runId), eq(deckSynopses.status, "pending")))
      .returning({ callId: deckSynopses.modelCallId });
    for (const r of rows) await settleModelCall(tx, r.callId, set.charge, now);
    return rows.length > 0;
  });
}

async function run(
  deckId: string,
  userId: string,
  deps: GenerateDeps,
  retry: SynopsisRow | null,
): Promise<WriteResult> {
  const reading = await freshReading(deckId, userId, deps.profile);
  if (!reading) return { kind: "no_reading" };
  const current = await readShownSynopsis(deckId, userId);

  // A section retry works only on the synopsis for this very list, under this very contract. One
  // written under an older contract is rewritten whole instead: a document never mixes two
  // contracts (plan, decision 2).
  let base: SynopsisRow | null = null;
  if (retry) {
    if (!current || current.id !== retry.id || current.fingerprint !== reading.list) return { kind: "nothing_to_retry" };
    if (current.contractVersion === SYNOPSIS_CONTRACT_VERSION) {
      if (refusedSections(current.content).length === 0) return { kind: "nothing_to_retry" };
      base = current;
    }
  } else if (current && current.fingerprint === reading.list) {
    // REUSE IS KEYED ON THE LIST ALONE (ruling B): a contract change never rewrites it.
    return { kind: "reused", synopsis: current };
  }

  const facts = await factsFor(reading.profile);
  const refused = base ? refusedSections(base.content) : null;
  const prompt = buildSynopsisPrompt(facts, base && refused ? { keep: base.content, refused } : undefined);

  const started = await startRun(deckId, userId, reading.list, deps.modelName, deps.now(), base?.id ?? null);
  if (started.kind !== "started") return started;

  let outcome: ModelOutcome<SynopsisResponse>;
  try {
    outcome = await deps.model(prompt, facts);
  } catch (error) {
    console.error("synopsis model call threw", error);
    outcome = { ok: false, errorClass: "upstream_busy" };
  }

  if (!outcome.ok) {
    await finishRun(started.runId, { outcome: outcome.errorClass, content: null, usage: null, charge: "refunded" }, deps.now());
    return { kind: "written", outcome: outcome.errorClass, synopsis: null };
  }

  const checked = validateSynopsis(outcome.value, facts, await catalogFor(outcome.value, facts));
  let content = checked;
  let charge: "spent" | "refunded" = shown(checked) ? "spent" : "refunded";
  if (base && refused) {
    const merged = mergeRetry(base.content, checked, refused);
    content = merged.content;
    charge = merged.anyRetriedPassed ? "spent" : "refunded";
  }
  const result = outcomeOf(content.verdicts);
  const written = await finishRun(started.runId, { outcome: result, content, usage: outcome.usage, charge }, deps.now());
  if (!written) return { kind: "in_flight" };
  return {
    kind: "written",
    outcome: result,
    synopsis: shown(content)
      ? { id: started.runId, fingerprint: reading.list, contractVersion: SYNOPSIS_CONTRACT_VERSION, createdAt: deps.now(), content }
      : null,
  };
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
