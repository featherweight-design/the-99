"use server";

import { inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "../../db";
import { cards } from "../../db/schema";
import { requireUserId } from "../../lib/auth";
import { castFaceText } from "../../lib/cards/facet";
import { creditsCopy } from "../../lib/copy/credits";
import { deckCutsCopy } from "../../lib/copy/deck-cuts";
import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";
import { readKeyCardNames, readProposedCuts, reapCutsRuns } from "../../lib/decks/cuts-read";
import type { DeckMutationResult } from "../../lib/decks/mutation-result";
import { deckSurfaces } from "../../lib/decks/revalidate";
import { commanderName } from "../../lib/decks/tuning-read";
import { callModel } from "../../lib/model/client";
import { buildCutsPack, type CutsPack } from "../../lib/tuning/cuts-evidence";
import { buildCutsPrompt } from "../../lib/tuning/cuts-prompt";
import { cancelCutsRun, finishCutsRun, persistCutsRun, startCutsRun } from "../../lib/tuning/cuts-run-store";
import { cutsResponseSchema } from "../../lib/tuning/cuts-schema";
import { validateCuts, type CutsReport } from "../../lib/tuning/cuts-validate";
import { proposedCutsEnabled } from "../../lib/tuning/flag";
import { MODEL_TIMEOUT_MS, TUNING_EFFORT, TUNING_MAX_TOKENS, TUNING_MODEL, TUNING_RETRY_FLOOR_MS } from "../../lib/tuning/limits";
import type { Billed } from "../../lib/tuning/run-store";
import { isUuid } from "../../lib/uuid";

/**
 * Proposed cuts' server actions, in the shape of `tuning-actions.ts`'s `runTuning` and Stop. Every
 * one is a PUBLIC ENDPOINT, so every gate the panel applies is re-applied here, and every argument
 * is checked for what it claims to be (an id that is not a uuid is refused, not handed to Postgres).
 * The transactions live in `src/lib/tuning/cuts-run-store.ts`.
 */

function revalidateDeck(deckId: string): void {
  for (const path of deckSurfaces(deckId)) revalidatePath(path);
}

/**
 * A name the model returned, resolved against the cards it was OFFERED. A name two offered cards
 * share resolves to nothing rather than to whichever came last, and the validator drops it as a
 * card that does not exist.
 */
function packNameResolver(pack: CutsPack): (name: string) => { oracleId: string } | null {
  const byName = new Map<string, string[]>();
  for (const c of pack.cards) byName.set(c.name, [...(byName.get(c.name) ?? []), c.oracleId]);
  return (name) => {
    const ids = byName.get(name);
    return ids && ids.length === 1 ? { oracleId: ids[0] } : null;
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
  if (!proposedCutsEnabled() || !isUuid(deckId)) return { ok: false, message: deckCutsCopy.run.refused };
  // The panel names its run so its Stop can cancel that run and no other. Anything but a uuid is
  // refused rather than dropped: a Stop keyed on an id the row does not carry could never land.
  const requested = typeof opts === "object" && opts !== null ? opts.runId : undefined;
  if (requested !== undefined && (typeof requested !== "string" || !isUuid(requested))) {
    return { ok: false, message: deckCutsCopy.run.refused };
  }

  const inputs = await readProposedCuts(deckId, userId);
  if (!inputs) return { ok: false, message: deckCutsCopy.run.refused };
  const { head, facts, allLocked, fingerprint, readVersion, intent } = inputs;

  // Both refusals land BEFORE `startCutsRun` reserves a credit: "No credit is used" is true of the
  // server, not only of a disabled button.
  if (facts.over === 0) return { ok: false, message: deckCutsCopy.run.notOver };
  if (allLocked) return { ok: false, message: lockedCardsCopy.tuning.allLocked(await commanderName(head)) };

  // A run abandoned by a process that is gone would otherwise answer "in flight" until someone
  // opened the panel.
  await reapCutsRuns(deckId, userId);
  const started = await startCutsRun(userId, deckId, fingerprint, readVersion, { runId: requested });
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
  // What the call was billed for, once it returned. Every outcome write after that records it.
  let billed: Billed | undefined;
  const fail = async (
    errorClass: Parameters<typeof finishCutsRun>[1]["errorClass"],
    report?: CutsReport,
  ) => {
    if (await finishCutsRun(run, { status: "failed", errorClass, droppedCount: report?.drops.length, report }, billed)) {
      revalidateDeck(deckId);
    }
    return { ok: true } as const;
  };

  try {
    const [name, keyCards, textRows] = await Promise.all([
      commanderName(head),
      readKeyCardNames(head),
      // Oracle text for the cards that could come out: the front face only (`castFaceText`), the
      // configuration the recall eval chose. Catalog data, so no `playerText`.
      facts.cards.length === 0 ? [] : db
        .select({ id: cards.oracleId, text: cards.oracleText, layout: cards.layout })
        .from(cards)
        .where(inArray(cards.oracleId, facts.cards.map((c) => c.oracleId))),
    ]);
    const texts = new Map(textRows.flatMap((r) => {
      const t = castFaceText(r.text, r.layout);
      return t ? [[r.id, t] as const] : [];
    }));
    // The intent the player already stored on the deck (the one Suggested changes reads); it goes
    // through `playerText` inside the pack. No notes in this version.
    const pack = buildCutsPack({ facts, commanderName: name, keyCards, intent, texts });
    const { system, user } = buildCutsPrompt(pack);
    const outcome = await callModel({
      model: TUNING_MODEL, system, user, maxTokens: TUNING_MAX_TOKENS,
      schema: cutsResponseSchema(facts.over), deadlineMs: MODEL_TIMEOUT_MS,
      effort: TUNING_EFFORT, retryFloorMs: TUNING_RETRY_FLOOR_MS,
    });
    if (outcome.usage) billed = { model: TUNING_MODEL, usage: outcome.usage };
    // A rejection is stored as busy: the distinction is kept for the overview only, for now.
    if (!outcome.ok) return await fail(outcome.errorClass === "upstream_rejected" ? "upstream_busy" : outcome.errorClass);

    const { kept, report } = validateCuts({ reply: outcome.value, pack, resolveName: packNameResolver(pack) });
    // Nothing survived the checks: refunded like every failure, and the report says why.
    if (kept.length === 0) return await fail("ungrounded", report);

    if (await persistCutsRun(run, kept, report, billed)) revalidateDeck(deckId);
    return { ok: true };
  } catch (err) {
    await fail("upstream_busy");
    throw err;
  }
}

/** Stop: the run the panel was watching, by id, so a late press cannot cancel the next one. */
export async function cancelProposedCuts(deckId: string, runId: string): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  if (!proposedCutsEnabled() || !isUuid(deckId) || !isUuid(runId)) return { ok: true };
  if (await cancelCutsRun(runId, deckId, userId)) revalidateDeck(deckId);
  return { ok: true };
}
