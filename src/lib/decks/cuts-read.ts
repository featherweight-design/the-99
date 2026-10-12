import { createHash } from "node:crypto";

import { and, desc, eq, lt, max } from "drizzle-orm";

import { db } from "../../db";
import { chainArt } from "../cards/chain-art";
import {
  cards,
  commanderPairSupport,
  commanderPairSupportCards,
  commanderSupport,
  commanderSupportCards,
  deckCards,
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
  }, { isolationLevel: "repeatable read" });
  if (header?.state !== "ok" || rows.length === 0) return null;
  return {
    deckCount: header.deckCount,
    listed: rows.length,
    inclusion: new Map(rows.map((r) => [r.oracleId, r.inclusion])),
  };
}

/** What a run's inputs were: the list, the locks, the declared bracket, the intent and the Key cards, hashed. */
export function cutsFingerprint(head: ProfileHead, locked: readonly string[], intent: string | null, keyCards: readonly string[]): string {
  // The Key cards are an input too: a same-list overview retry can change which cards the model
  // may not name, so a result made under one set is not current under another.
  return createHash("sha256")
    .update(JSON.stringify([listFingerprint(head), [...locked].sort(), head.declaredBracket ?? null, intent, [...keyCards].sort()]))
    .digest("hex");
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
  /** The overview's Key cards, which are never cut. Part of the fingerprint. */
  keyCards: string[];
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
  }, { isolationLevel: "repeatable read" });
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
  const keyCards = await readKeyCardNames(head);
  const fingerprint = cutsFingerprint(head, locked, intent, keyCards);
  return { head, facts, locked, allLocked, readVersion, fingerprint, intent, keyCards };
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

/** The reader's own abandoned Proposed cuts runs on a deck: this tool, this deck, this reader, still
 *  pending past the cutoff. The reader is part of the predicate because a state read can name any
 *  deck id, and must write nothing to a run it does not own. */
export const reapableCutsRuns = (deckId: string, userId: string, now: Date) => and(
  cutsRunsOfDeck(deckId),
  eq(deckSuggestionRuns.userId, userId),
  eq(deckSuggestionRuns.status, "pending"),
  lt(deckSuggestionRuns.createdAt, reapCutoff(now)),
);

// NO `accessMode: "read only"` on this file's snapshots. A read-only transaction on the pooled Neon
// connection left the NEXT transaction taken from the pool read-only too, and `reapCutsRuns` below
// then failed with "cannot execute UPDATE in a read-only transaction" in a real server (found by
// `probe:cuts-panel`; a script outside Next never reproduced it). The snapshots write nothing, so
// `repeatable read` alone keeps what they need: one instant.

/**
 * Fail the reader's abandoned Proposed cuts runs on this deck as `interrupted` and refund their
 * units, in one transaction. The same cutoff as the other tool's.
 */
export async function reapCutsRuns(deckId: string, userId: string, now: Date = new Date()): Promise<void> {
  await db.transaction(async (tx) => {
    const reaped = await tx.update(deckSuggestionRuns)
      .set({ status: "failed", errorClass: "interrupted" })
      .where(reapableCutsRuns(deckId, userId, now))
      .returning({ callId: deckSuggestionRuns.modelCallId });
    for (const r of reaped) await settleModelCall(tx, r.callId, "refunded", undefined, now);
  });
}

/**
 * The panel's state for this tool. Reaps on the way past, then reads the newest run, the newest ok
 * run with its cuts, and the allowance measured against this feature's own call. With `runId`
 * (History's re-review) the cuts are that ok run's instead, when the reader owns it on this deck.
 */
export async function readCutsState(deckId: string, userId: string, now: Date = new Date(), runId: string | null = null): Promise<CutsState> {
  await reapCutsRuns(deckId, userId, now);

  const runOf = cutsRunsOfDeck(deckId);
  const mine = eq(deckSuggestionRuns.userId, userId);
  // The newest run, the ok run shown (the newest, or the one named) and its cuts are ONE instant: read apart, a run settling
  // between the statements would show a status that never sat beside those cuts.
  const [{ newest, lastOk, rows, reviewed }, allowance] = await Promise.all([
    db.transaction(async (tx) => {
      const [newest] = await tx.select({
        id: deckSuggestionRuns.id,
        status: deckSuggestionRuns.status,
        errorClass: deckSuggestionRuns.errorClass,
        createdAt: deckSuggestionRuns.createdAt,
        droppedCount: deckSuggestionRuns.droppedCount,
      }).from(deckSuggestionRuns).where(and(runOf, mine))
        .orderBy(desc(deckSuggestionRuns.createdAt)).limit(1);
      const okRun = (id: string | null) => tx.select({
        id: deckSuggestionRuns.id,
        fingerprint: deckSuggestionRuns.inputFingerprint,
        createdAt: deckSuggestionRuns.createdAt,
        promptVersion: deckSuggestionRuns.promptVersion,
        profileVersion: deckSuggestionRuns.profileVersion,
        validationReport: deckSuggestionRuns.validationReport,
      }).from(deckSuggestionRuns).where(okCutsRunWhere(deckId, userId, id))
        .orderBy(desc(deckSuggestionRuns.createdAt)).limit(1);
      // A run named by id (History's re-review) is read only when it is the reader's own ok run of
      // this tool on this deck; anything else reads as the ordinary panel.
      const [reviewed] = runId ? await okRun(runId) : [];
      const [lastOk] = reviewed ? [reviewed] : await okRun(null);
      const rows = lastOk
        ? await tx.select({
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
      // Whether each cut can still be taken, read in the same instant: a card still in the list,
      // not a commander, not locked. Cut re-checks all three under the deck lock.
      // One after the other: a transaction is one connection.
      const held = rows.length === 0 ? [] : await tx.select({ oracleId: deckCards.oracleId }).from(deckCards).where(eq(deckCards.deckId, deckId));
      const [deck] = rows.length === 0 ? [] : await tx.select({ commander: decks.commanderOracleId, partner: decks.partnerOracleId }).from(decks).where(eq(decks.id, deckId));
      const locks: ReadonlySet<string> = rows.length > 0 && neverCutEnabled() ? await liveLockedIds(tx, deckId) : new Set();
      const inList = new Set(held.map((h) => h.oracleId));
      const commanders = new Set([deck?.commander, deck?.partner].filter((x): x is string => !!x));
      const live = rows.map((r) => ({
        ...r,
        inDeck: inList.has(r.cutOracleId) && !commanders.has(r.cutOracleId),
        locked: locks.has(r.cutOracleId),
      }));
      return { newest, lastOk, rows: live, reviewed: reviewed ?? null };
    }, { isolationLevel: "repeatable read" }),
    readAllowance(userId, now, "proposed_cuts"),
  ]);

  const run: CutsRun | null = newest ? { ...newest, status: newest.status as CutsRun["status"] } : null;
  // A cut is a card in this deck: the hover preview draws the deck's pick, else the owned printing, as
  // card details does (`chainArt`), not the catalog's arbitrary one.
  const art = await chainArt(userId, deckId, rows.map((r) => r.cutOracleId));
  return {
    run,
    items: rows.map((r): CutItem => ({ ...r, cutImageUri: art.get(r.cutOracleId) ?? r.cutImageUri, verdict: r.verdict as CutItem["verdict"] })),
    // Stored by `persistCutsRun` as a cuts report; the column's static type is the other tool's.
    itemsReport: (lastOk?.validationReport ?? null) as unknown as CutsReport | null,
    lastOkFingerprint: lastOk?.fingerprint ?? null,
    lastOkAt: lastOk?.createdAt ?? null,
    modelVersionMoved: lastOk
      ? lastOk.promptVersion !== CUTS_PROMPT_VERSION || lastOk.profileVersion !== PROFILE_VERSION
      : false,
    allowance,
    review: reviewed ? { runId: reviewed.id, at: reviewed.createdAt } : null,
  };
}

/** The ok-run predicate: the newest ok run, or the one the reader named. Exported so its emitted
 *  SQL is pinned: a named run is still the reader's own, on this deck, of this tool. */
export function okCutsRunWhere(deckId: string, userId: string, runId: string | null) {
  return and(
    cutsRunsOfDeck(deckId),
    eq(deckSuggestionRuns.userId, userId),
    eq(deckSuggestionRuns.status, "ok"),
    runId ? eq(deckSuggestionRuns.id, runId) : undefined,
  );
}
