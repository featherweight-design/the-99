"use server";

import { inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { db } from "../../db";
import { cards } from "../../db/schema";
import { requireUserId } from "../../lib/auth";
import { requestSwitchEnv } from "../../lib/switches/request";
import { castFaceText } from "../../lib/cards/facet";
import { creditsCopy } from "../../lib/copy/credits";
import { deckCutsCopy } from "../../lib/copy/deck-cuts";
import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";
import { readCutsState, readProposedCuts, reapCutsRuns } from "../../lib/decks/cuts-read";
import type { DeckMutationResult } from "../../lib/decks/mutation-result";
import { deckBodySize } from "../../lib/decks/deck-size";
import { deckSurfaces } from "../../lib/decks/revalidate";
import { revalidateClaims } from "../../lib/decks/revalidate-claims";
import { commanderName, profileOfHead } from "../../lib/decks/tuning-read";
import { readCutsPlan } from "../../lib/decks/cuts-plan-read";
import { deckNameIndex, normalizeName } from "../../lib/synopsis/facts";
import { callModel } from "../../lib/model/client";
import { FEATURE_CALLS } from "../../lib/model/prices";
import { cutCounts } from "../../lib/tuning/cuts-count";
import { cutsCountSummary, recordToolCount } from "../../lib/tuning/tool-counts";
import { buildCutsPack, type CutsPack } from "../../lib/tuning/cuts-evidence";
import { buildCutsPrompt } from "../../lib/tuning/cuts-prompt";
import { finishCutsRun, persistCutsRun, startCutsRun } from "../../lib/tuning/cuts-run-store";
import type { CutsPanel } from "../../lib/tuning/cuts-state";
import { cutItem, setCutKept, undoCutItem, type CutOutcome } from "../../lib/tuning/cuts-verdicts";
import { cutsResponseSchema } from "../../lib/tuning/cuts-schema";
import { validateCuts, type CutsReport } from "../../lib/tuning/cuts-validate";
import { proposedCutsEnabled } from "../../lib/tuning/flag";
import { MODEL_TIMEOUT_MS, TUNING_EFFORT, TUNING_MAX_TOKENS, TUNING_MODEL, TUNING_RETRY_FLOOR_MS } from "../../lib/tuning/limits";
import { retryable } from "../../lib/tuning/retry";
import { runIsPending, type Billed } from "../../lib/tuning/run-store";
import { listFingerprint } from "../../lib/profile/fingerprint";
import { heldStubOutcome } from "../../lib/tuning/stub";
import { isUuid } from "../../lib/uuid";

/**
 * Proposed cuts' server actions, in the shape of `tuning-actions.ts`'s `runTuning`. Every
 * one is a PUBLIC ENDPOINT, so every gate the panel applies is re-applied here, and every argument
 * is checked for what it claims to be (an id that is not a uuid is refused, not handed to Postgres).
 * The transactions live in `src/lib/tuning/cuts-run-store.ts`.
 */

function revalidateDeck(deckId: string): void {
  for (const path of deckSurfaces(deckId)) revalidatePath(path);
}

/**
 * A name the model returned, resolved against the cards it was OFFERED, as the overview's own
 * validator resolves one (`deckNameIndex`, `normalizeName`): case, spacing and curly quotes folded,
 * and a face answering for its card unless two offered cards share it. A name that resolves to
 * nothing is dropped by the validator as a card that does not exist.
 */
function packNameResolver(pack: CutsPack): (name: string) => { oracleId: string } | null {
  const index = deckNameIndex(pack.cards);
  return (name) => {
    const hit = index.get(normalizeName(name));
    return hit ? { oracleId: hit.oracleId } : null;
  };
}

/**
 * One Proposed cuts run, start to finish: the model pass over a deck that is over 100.
 *
 * The order is the design. Every refusal that needs no credit comes first (the switch, the ids, a
 * deck that is not the reader's, a deck that is not over 100, a deck with every card locked), then
 * `startCutsRun`'s one transaction holding the unit and the pending row, committed before any
 * network call. Everything after that sits in one `try`, so a throw anywhere fails the run and
 * refunds its unit: no unit is ever spent on a call never made.
 *
 * `callModel` makes the one schema-failure retry inside the run's single deadline.
 */
export async function runProposedCuts(
  deckId: string,
  opts: { runId?: string } = {},
): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!proposedCutsEnabled(env) || !isUuid(deckId)) return { ok: false, message: deckCutsCopy.run.refused };
  // The panel names its run so it can wait on that run and no other (`await-run.ts`). Anything but
  // a uuid is refused rather than dropped: a wait keyed on an id the row does not carry would never end.
  const requested = typeof opts === "object" && opts !== null ? opts.runId : undefined;
  if (requested !== undefined && (typeof requested !== "string" || !isUuid(requested))) {
    return { ok: false, message: deckCutsCopy.run.refused };
  }

  const inputs = await readProposedCuts(deckId, userId, env);
  if (!inputs) return { ok: false, message: deckCutsCopy.run.refused };
  const { head, facts, allLocked, fingerprint, readVersion, intent, keyCards } = inputs;

  // Both refusals land BEFORE `startCutsRun` reserves a credit: "No credit is used" is true of the
  // server, not only of a disabled button.
  if (facts.over === 0) return { ok: false, message: deckCutsCopy.run.notOver };
  if (allLocked) return { ok: false, message: lockedCardsCopy.tuning.allLocked(await commanderName(head)) };

  const [name, textRows, plan] = await Promise.all([
    commanderName(head),
    // Oracle text for the cards that could come out: the front face only (`castFaceText`), the
    // configuration the recall eval chose. Catalog data, so no `playerText`.
    facts.cards.length === 0 ? [] : db
      .select({ id: cards.oracleId, text: cards.oracleText, layout: cards.layout })
      .from(cards)
      .where(inArray(cards.oracleId, facts.cards.map((c) => c.oracleId))),
    // The deck's plan: its combos, the commander's text and the colours it leans on.
    profileOfHead(head, env).then(readCutsPlan).catch(() => undefined),
  ]);
  const texts = new Map(textRows.flatMap((r) => {
    const t = castFaceText(r.text, r.layout);
    return t ? [[r.id, t] as const] : [];
  }));
  // The intent the player already stored on the deck (the one Suggested changes reads); it goes
  // through `playerText` inside the pack. No notes in this version.
  const pack = buildCutsPack({ facts, commanderName: name, keyCards, intent, texts, ...(plan ? { plan } : {}) });
  // Every card left to cut is a Key card: the validator would drop every answer, so no credit is held.
  if (pack.cards.length > 0 && pack.cards.every((c) => pack.keyCardIds.includes(c.oracleId))) {
    return { ok: false, message: deckCutsCopy.panel.allLocked(await commanderName(head)) };
  }
  const { system, user } = buildCutsPrompt(pack);
  // The reservation prices a request at the feature's input ceiling, so a prompt past it is refused
  // here, before a credit is held, rather than sent at a cost the spend cap never counted. Three
  // characters a token over-counts English and card text alike.
  if (Math.ceil((system.length + user.length) / 3) > FEATURE_CALLS.proposed_cuts.inputCeilingTokens) {
    return { ok: false, message: deckCutsCopy.run.tooBig };
  }

  // A run abandoned by a process that is gone would otherwise answer "in flight" until someone
  // opened the panel.
  await reapCutsRuns(deckId, userId);
  const started = await startCutsRun(userId, deckId, fingerprint, readVersion, { runId: requested, env });
  if (started.kind === "paused") return { ok: false, message: creditsCopy.pausedServer };
  if (started.kind === "ownerShare") return { ok: false, message: creditsCopy.ownerShare(new Date()) };
  if (started.kind === "allowance") return { ok: false, message: deckTuningCopy.allowance.spent };
  if (started.kind === "in_flight") return { ok: false, message: deckTuningCopy.announce.started };
  // The last card was locked after the read's snapshot: refused under the lock, nothing reserved.
  if (started.kind === "allLocked") {
    return { ok: false, message: lockedCardsCopy.tuning.allLocked(await commanderName(head)) };
  }

  // The run and its ledger unit, held for the whole request: every settle below reaches the unit by
  // its own id, so a deck deleted mid-call still gets its bill onto the ledger.
  const run = { runId: started.runId, callId: started.callId };
  // What each call was billed for, once it returned. Every outcome write after that records them together.
  const billed: Billed[] = [];
  const fail = async (
    errorClass: Parameters<typeof finishCutsRun>[1]["errorClass"],
    report?: CutsReport,
  ) => {
    if (await finishCutsRun(run, { status: "failed", errorClass, droppedCount: report?.drops.length, report }, billed.length > 0 ? billed : undefined)) {
      revalidateDeck(deckId);
    }
    return { ok: true } as const;
  };

  // The call and its settle run AFTER the response (`after()`): the request returns once the run holds
  // its unit and its pending row, and the run finishes whether or not the player stays. The panel
  // reads the run until it settles.
  const work = async (): Promise<unknown> => {
    try {
      // One more ask when no card survived (a reply of hallucinated or repeated cards, or a degenerate one). The
      // reservation is two attempts of one call: the second ask is made only when the first cost no more than one
      // attempt's worth, and gets no retry of its own inside `callModel`, so the two stay inside what was set aside.
      // The credit is given back only when the second ask also leaves no card to cut.
      const startedAt = Date.now();
      let checked: ReturnType<typeof validateCuts>;
      for (let attempt = 1; ; attempt++) {
        const outcome = (attempt === 1 ? await heldStubOutcome(env) : null) ?? await callModel({
          model: TUNING_MODEL, system, user, maxTokens: TUNING_MAX_TOKENS,
          schema: cutsResponseSchema(pack.ask), deadlineMs: attempt === 1 ? MODEL_TIMEOUT_MS : MODEL_TIMEOUT_MS - (Date.now() - startedAt),
          effort: TUNING_EFFORT, retryFloorMs: attempt === 1 ? TUNING_RETRY_FLOOR_MS : MODEL_TIMEOUT_MS,
        });
        if (outcome.usage) billed.push({ model: TUNING_MODEL, usage: outcome.usage, step: attempt === 1 ? "cuts" : "cuts_retry", effort: TUNING_EFFORT });
        // A rejection is stored as busy: the distinction is kept for the overview only, for now.
        if (!outcome.ok) return await fail(outcome.errorClass === "upstream_rejected" ? "upstream_busy" : outcome.errorClass);

        checked = validateCuts({ reply: outcome.value, pack, resolveName: packNameResolver(pack) });
        if (checked.kept.length > 0 || attempt === 2) break;
        // A deleted deck or the reaper may have settled the run while the first ask was out: no second ask is
        // made for a run that is no longer pending. The first ask's usage is recorded late, as ever.
        if (!(await runIsPending(run.runId))) return await fail("upstream_busy");
        // After that await, so the deadline it measures is the one left now.
        if (!retryable(billed, checked.dropped, Date.now() - startedAt, { feature: "proposed_cuts", lockedRule: "keyCard" })) break;
      }
      const { kept } = checked;
      const report: CutsReport = { ...checked.report, chips: cutCounts(facts, (head.declaredBracket as 1 | 2 | 3 | 4 | 5 | null) ?? null, name).chips };
      // No card survived: refunded like every failure, and the report says why.
      if (kept.length === 0) return await fail("ungrounded", report);

      if (await persistCutsRun(run, kept, report, billed.length > 0 ? billed : undefined)) revalidateDeck(deckId);
      return undefined;
    } catch (err) {
      // Nobody is waiting on this request, so a throw is logged, not rethrown; the run is failed and refunded.
      console.error(`[cuts] run ${run.runId} threw after its reservation`, err);
      await fail("upstream_busy").catch(() => undefined);
      return undefined;
    }
  };
  after(work);
  return { ok: true };
}

/**
 * The panel's one read: the run state, and the count the model reads for the deck as it stands.
 * Null when the switch is off, the id is not a uuid or the deck is not the reader's.
 *
 * `resultCurrent` is the re-offer rule (README open 9, decided in the R2 audit): the newest ok
 * run's cuts stand while the deck still matches the fingerprint they were made against, and a cut
 * pressed FROM them moves that fingerprint in its own transaction (`cuts-verdicts.ts`), so only an edit that is not
 * one of their own cuts retires them and brings the offer back.
 */
export async function readCutsPanel(deckId: string, runId: string | null = null): Promise<CutsPanel | null> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!proposedCutsEnabled(env) || !isUuid(deckId)) return null;
  const inputs = await readProposedCuts(deckId, userId, env);
  if (!inputs) return null;
  const { head, facts, locked, allLocked: lockedOut, fingerprint } = inputs;
  const keyCards = inputs.keyCards;
  const [state, name] = await Promise.all([
    // `runId` is History's re-review: that past run's cuts. Anything not a uuid reads as ordinary.
    readCutsState(deckId, userId, new Date(), runId && isUuid(runId) ? runId : null, env),
    commanderName(head),
  ]);
  const declared = (head.declaredBracket as 1 | 2 | 3 | 4 | 5 | null) ?? null;
  // Key cards that are still candidates, resolved the way the validator resolves them. A name the
  // deck no longer holds, a duplicate, or a locked card counts for nothing; and when every card
  // the player has not locked is a Key card, a deeper look has nothing it may name.
  const byName = deckNameIndex(facts.cards);
  const liveKey = new Set(keyCards.flatMap((k) => { const hit = byName.get(normalizeName(k)); return hit ? [hit.oracleId] : []; }));
  const allLocked = lockedOut || (facts.cards.length > 0 && facts.cards.every((c) => liveKey.has(c.oracleId)));
  const counts = cutCounts(facts, declared, name);
  // History's free row: once per version of the LIST, written the first time this list's count is
  // read. Keyed on the list alone (`listFingerprint`), not on the tool's input fingerprint, which
  // also moves with a lock, the intent or a declared bracket on an unchanged list.
  const summary = cutsCountSummary(facts);
  if (summary) {
    await recordToolCount({ deckId, userId, tool: "proposed_cuts", listFingerprint: listFingerprint(head), readVersion: inputs.readVersion, summary });
  }
  return {
    ...state,
    total: facts.total,
    bodySize: deckBodySize(head.partnerOracleId !== null),
    over: facts.over,
    commander: name,
    allLocked,
    lockedCount: locked.length,
    keyCount: liveKey.size,
    declaredBracket: declared,
    edhrecDecks: facts.support?.deckCount ?? null,
    thin: facts.missing.includes("inclusion"),
    rows: counts.rows,
    // The chips quote the figures the run's cites were checked against; the rows above stay live.
    chips: state.itemsReport?.chips ?? counts.chips,
    resultCurrent: state.lastOkFingerprint === fingerprint && !state.modelVersionMoved,
    asked: state.itemsReport?.over ?? state.items.length,
  };
}

const REFUSALS = deckCutsCopy.panel.refusals;

/** A verdict's outcome as the message the panel draws. The run's fingerprint follows a cut inside
 *  the verdict's own transaction (`cuts-verdicts.ts`), so there is nothing to chain here. */
async function settleVerdict(outcome: CutOutcome, userId: string, membership: boolean): Promise<DeckMutationResult> {
  if (!outcome.ok) {
    return { ok: false, message: outcome.reason === "cutGone" ? REFUSALS.cutGone : outcome.reason === "cutLocked" ? REFUSALS.cutLocked : outcome.reason === "moved" ? REFUSALS.moved : outcome.reason === "stale" ? REFUSALS.stale : REFUSALS.generic };
  }
  // A cut or an undo changes deck membership, so it retires every surface a claim reaches (the
  // collection, commanders, discover, the changes page); Keep and Show it again move no card.
  if (membership) revalidateClaims(outcome.deckId, userId);
  else revalidateDeck(outcome.deckId);
  return { ok: true };
}

/** Cut: writes to the list straight away, refused when the card is locked or gone. */
/** `review`: pressed on a past run History opened, re-checked card by card (`VerdictMode`). */
export async function cutProposed(itemId: string, review = false): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!proposedCutsEnabled(env) || !isUuid(itemId)) return { ok: false, message: REFUSALS.generic };
  return settleVerdict(await cutItem(itemId, userId, { review: review === true }, env), userId, true);
}

export async function undoProposedCut(itemId: string, review = false): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!proposedCutsEnabled(env) || !isUuid(itemId)) return { ok: false, message: REFUSALS.generic };
  return settleVerdict(await undoCutItem(itemId, userId, { review: review === true }, env), userId, true);
}

/** Keep and Show it again change no card, so they move no fingerprint. */
export async function keepProposedCut(itemId: string): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!proposedCutsEnabled(env) || !isUuid(itemId)) return { ok: false, message: REFUSALS.generic };
  return settleVerdict(await setCutKept(itemId, userId, true), userId, false);
}

export async function restoreProposedCut(itemId: string): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!proposedCutsEnabled(env) || !isUuid(itemId)) return { ok: false, message: REFUSALS.generic };
  return settleVerdict(await setCutKept(itemId, userId, false), userId, false);
}
