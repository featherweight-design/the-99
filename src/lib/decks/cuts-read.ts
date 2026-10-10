import { createHash } from "node:crypto";

import { and, desc, eq, lt, max } from "drizzle-orm";

import { db } from "../../db";
import {
  cards,
  commanderPairSupport,
  commanderPairSupportCards,
  commanderSupport,
  commanderSupportCards,
  deckCutItems,
  decks,
  deckSuggestionRuns,
  deckVersions,
} from "../../db/schema";
import { canonicalPair } from "../edhrec/pair";
import { readAllowance, settleModelCall } from "../model/allowance";
import { listFingerprint } from "../profile/fingerprint";
import { readProfileHead, type ProfileHead } from "../profile/load";
import { PROFILE_VERSION } from "../profile/version";
import type { Bracket } from "../profile/types";
import { readShownSynopsis } from "../synopsis/generate";
import { cutFacts, type CutFacts, type CutSupport } from "../tuning/cuts";
import { CUTS_PROMPT_VERSION } from "../tuning/cuts-prompt";
import type { CutsRun, CutsState, CutItem } from "../tuning/cuts-state";
import type { CutsReport } from "../tuning/cuts-validate";
import { proposedCutsEnabled } from "../tuning/flag";
import { PROPOSED_CUTS_TOOL } from "../tuning/limits";
import { reapCutoff } from "../tuning/reaper";
import { neverCutEnabled } from "./never-cut-flag";
import { liveLockedIds } from "./locks";
import { profileOfHead } from "./tuning-read";

/**
 * The commander's (or the pair's own) EDHREC support list, as inclusion percents. Null when there
 * is no usable list: no row, a row whose page was absent or degraded, or a list with no cards.
 * The engine then runs without the inclusion signal and names it missing (ruling 6).
 *
 * A pair reads the PAIR's page only. Neither commander's own page describes the decks that run the
 * two together, and falling back to one would score the other's cards against the wrong decks.
 */
export async function readCutSupport(commander: string, partner: string | null): Promise<CutSupport | null> {
  const key = (t: typeof commanderPairSupport | typeof commanderPairSupportCards, pair: ReturnType<typeof canonicalPair>) => and(
    eq(t.commanderOracleId, pair.commanderOracleId),
    eq(t.partnerOracleId, pair.partnerOracleId),
  );
  // The header and its card rows are published together by an index copy; read apart, a copy
  // landing between the two statements would pair one generation's state with another's list.
  const { header, rows } = await db.transaction(async (tx) => {
    if (partner) {
      const pair = canonicalPair(commander, partner);
      const [[h], r] = await Promise.all([
        tx.select({ state: commanderPairSupport.synergyState, deckCount: commanderPairSupport.deckCount })
          .from(commanderPairSupport).where(key(commanderPairSupport, pair)),
        tx.select({ oracleId: commanderPairSupportCards.oracleId, inclusion: commanderPairSupportCards.inclusion })
          .from(commanderPairSupportCards).where(key(commanderPairSupportCards, pair)),
      ]);
      return { header: h, rows: r };
    }
    const [[h], r] = await Promise.all([
      tx.select({ state: commanderSupport.synergyState, deckCount: commanderSupport.deckCount })
        .from(commanderSupport).where(eq(commanderSupport.commanderOracleId, commander)),
      tx.select({ oracleId: commanderSupportCards.oracleId, inclusion: commanderSupportCards.inclusion })
        .from(commanderSupportCards).where(eq(commanderSupportCards.commanderOracleId, commander)),
    ]);
    return { header: h, rows: r };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
  if (header?.state !== "ok" || rows.length === 0) return null;
  return {
    deckCount: header.deckCount,
    listed: rows.length,
    inclusion: new Map(rows.map((r) => [r.oracleId, r.inclusion])),
  };
}

export type ProposedCutsInputs = {
  head: ProfileHead;
  facts: CutFacts;
  /** The deck's live locks, read in the same snapshot as `head`. Empty while `NEVER_CUT_ENABLED` is off. */
  locked: string[];
  /** Every card but the commander(s) is locked: nothing a run could cut. */
  allLocked: boolean;
  /** The deck's newest version number in the same snapshot as `head`, or null for none. */
  readVersion: number | null;
  /** The list, the locks, the declared bracket and the intent, hashed: what the run's inputs were. */
  fingerprint: string;
  /** What the player said the deck is for, as stored on the deck; null when they said nothing. */
  intent: string | null;
};

/**
 * What a Proposed cuts run reads: the facts for this deck as it stands. Null when the switch is
 * off or the deck is not the reader's (ownership is in `readProfileHead`'s `where`).
 *
 * The head, the locks and the newest version number come from ONE repeatable-read snapshot, as
 * `tuningInputs` takes them: read apart, a commit landing between them would pair the list before
 * it with the locks after it. The profile is built from exactly that head (`profileOfHead`), and
 * the declared bracket comes from the same head, so a flag is a fact only against the bracket the
 * list was read under.
 */
export async function readProposedCuts(deckId: string, userId: string): Promise<ProposedCutsInputs | null> {
  if (!proposedCutsEnabled()) return null;
  const snapshot = await db.transaction(async (tx) => {
    const head = await readProfileHead(tx, deckId, userId);
    if (!head) return null;
    const [v] = await tx.select({ n: max(deckVersions.number) }).from(deckVersions)
      .where(eq(deckVersions.deckId, deckId));
    const locked = neverCutEnabled() ? [...(await liveLockedIds(tx, deckId))] : [];
    const [d] = await tx.select({ intent: decks.intent }).from(decks)
      .where(and(eq(decks.id, deckId), eq(decks.userId, userId)));
    return { head, readVersion: v?.n ?? null, locked, intent: d?.intent?.trim() ? d.intent : null };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
  if (!snapshot) return null;
  const { head, readVersion, locked, intent } = snapshot;
  const [profile, support] = await Promise.all([
    profileOfHead(head),
    readCutSupport(head.commanderOracleId, head.partnerOracleId),
  ]);
  const facts = cutFacts({
    profile,
    locked: new Set(locked),
    support,
    declaredBracket: (head.declaredBracket as Bracket | null) ?? null,
  });
  const lockedSet = new Set(locked);
  const body = head.cards.filter((c) => c.oracleId !== head.commanderOracleId && c.oracleId !== head.partnerOracleId);
  const allLocked = body.length > 0 && body.every((c) => lockedSet.has(c.oracleId));
  const fingerprint = createHash("sha256")
    .update(JSON.stringify([listFingerprint(head), [...locked].sort(), head.declaredBracket ?? null, intent]))
    .digest("hex");
  return { head, facts, locked, allLocked, readVersion, fingerprint, intent };
}

/**
 * The names of the deck's overview Key cards, never to be cut. The overview is
 * `readShownSynopsis`'s (the one written for this very list, else the newest shown); a deck with
 * none has no Key cards, which the prompt says plainly. Names the deck no longer holds are inert:
 * the validator compares them to cards in the pack.
 */
export async function readKeyCardNames(head: ProfileHead): Promise<string[]> {
  const shown = await readShownSynopsis(head.deckId, head.userId, listFingerprint(head));
  return (shown?.content?.keyCards ?? []).map((k) => k.card);
}

/** A deck's Proposed cuts runs: the tool is part of the scope, as `suggestedRunsOfDeck`'s is. */
const cutsRunsOfDeck = (deckId: string) => and(
  eq(deckSuggestionRuns.deckId, deckId),
  eq(deckSuggestionRuns.tool, PROPOSED_CUTS_TOOL),
);

/**
 * Fail this deck's abandoned Proposed cuts runs as `interrupted` and refund their units, in one
 * transaction. Scoped to the deck and the tool, so one player opening a deck writes nothing across
 * other players' rows and never reaps a Suggested changes run. The same cutoff as the other tool's.
 */
export async function reapCutsRuns(deckId: string, now: Date = new Date()): Promise<void> {
  await db.transaction(async (tx) => {
    const reaped = await tx.update(deckSuggestionRuns)
      .set({ status: "failed", errorClass: "interrupted" })
      .where(and(
        cutsRunsOfDeck(deckId),
        eq(deckSuggestionRuns.status, "pending"),
        lt(deckSuggestionRuns.createdAt, reapCutoff(now)),
      ))
      .returning({ callId: deckSuggestionRuns.modelCallId });
    for (const r of reaped) await settleModelCall(tx, r.callId, "refunded", undefined, now);
  });
}

/**
 * The panel's state for this tool. Reaps on the way past, then reads the newest run, the newest ok
 * run with its cuts, and the allowance measured against this feature's own call.
 */
export async function readCutsState(deckId: string, userId: string, now: Date = new Date()): Promise<CutsState> {
  await reapCutsRuns(deckId, now);

  const runOf = cutsRunsOfDeck(deckId);
  const mine = eq(deckSuggestionRuns.userId, userId);
  const [[newest], [lastOk], allowance] = await Promise.all([
    db.select({
      id: deckSuggestionRuns.id,
      status: deckSuggestionRuns.status,
      errorClass: deckSuggestionRuns.errorClass,
      createdAt: deckSuggestionRuns.createdAt,
      droppedCount: deckSuggestionRuns.droppedCount,
    }).from(deckSuggestionRuns).where(and(runOf, mine))
      .orderBy(desc(deckSuggestionRuns.createdAt)).limit(1),
    db.select({
      id: deckSuggestionRuns.id,
      fingerprint: deckSuggestionRuns.inputFingerprint,
      createdAt: deckSuggestionRuns.createdAt,
      promptVersion: deckSuggestionRuns.promptVersion,
      profileVersion: deckSuggestionRuns.profileVersion,
      validationReport: deckSuggestionRuns.validationReport,
    }).from(deckSuggestionRuns).where(and(runOf, mine, eq(deckSuggestionRuns.status, "ok")))
      .orderBy(desc(deckSuggestionRuns.createdAt)).limit(1),
    readAllowance(userId, now, "proposed_cuts"),
  ]);

  const rows = lastOk
    ? await db.select({
        id: deckCutItems.id,
        cutOracleId: deckCutItems.cutOracleId,
        cutName: cards.name,
        cutTypeLine: cards.typeLine,
        cutImageUri: cards.imageUri,
        reason: deckCutItems.reason,
        evidence: deckCutItems.evidence,
        position: deckCutItems.position,
        verdict: deckCutItems.verdict,
      })
        .from(deckCutItems)
        .innerJoin(cards, eq(cards.oracleId, deckCutItems.cutOracleId))
        .where(eq(deckCutItems.runId, lastOk.id))
        .orderBy(deckCutItems.position)
    : [];

  const run: CutsRun | null = newest ? { ...newest, status: newest.status as CutsRun["status"] } : null;
  return {
    run,
    items: rows.map((r): CutItem => ({ ...r, verdict: r.verdict as CutItem["verdict"] })),
    // Stored by `persistCutsRun` as a cuts report; the column's static type is the other tool's.
    itemsReport: (lastOk?.validationReport ?? null) as unknown as CutsReport | null,
    lastOkFingerprint: lastOk?.fingerprint ?? null,
    lastOkAt: lastOk?.createdAt ?? null,
    modelVersionMoved: lastOk
      ? lastOk.promptVersion !== CUTS_PROMPT_VERSION || lastOk.profileVersion !== PROFILE_VERSION
      : false,
    allowance,
  };
}
