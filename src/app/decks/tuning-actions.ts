"use server";

import { inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";

import { db } from "../../db";
import { cards } from "../../db/schema";
import { requireUserId } from "../../lib/auth";
import { isUuid } from "../../lib/uuid";
import { creditsCopy } from "../../lib/copy/credits";
import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import type { DeckMutationResult } from "../../lib/decks/mutation-result";
import { deckSurfaces } from "../../lib/decks/revalidate";
import { revalidateClaims } from "../../lib/decks/revalidate-claims";
import {
  profileOfHead,
  commanderName,
  readEvidenceStep,
  readOwnedOracleIds,
  readTuningContext,
  readTuningState,
  tuningInputs,
  withBracketAfter,
  EVIDENCE_STEPS,
  type EvidenceStep,
} from "../../lib/decks/tuning-read";
import { callModel } from "../../lib/model/client";
import { buildPlayGroup } from "../../lib/profile/play";
import { buildEvidencePack } from "../../lib/tuning/evidence";
import { gateReason } from "../../lib/tuning/gate";
import { MODEL_TIMEOUT_MS, TUNING_EFFORT, TUNING_MAX_TOKENS, TUNING_MODEL, TUNING_RETRY_FLOOR_MS } from "../../lib/tuning/limits";
import { buildPrompt } from "../../lib/tuning/prompt";
import { tuningResponseSchema } from "../../lib/tuning/response-schema";
import { cancelRun, finishRun, persistRun, saveIntent, startRun, type Billed } from "../../lib/tuning/run-store";
import type { TuningState } from "../../lib/tuning/state";
import { nameResolver } from "../../lib/tuning/resolve-names";
import { validateSuggestions } from "../../lib/tuning/validate";
import { applyItem, setDismissed, undoItem } from "../../lib/tuning/verdicts";

/**
 * Deck tuning's server actions. Every one is a PUBLIC ENDPOINT, as `logGame` says of itself, so
 * every gate the panel applies is re-applied here: a stale tab or a replayed request meets the
 * same rule the button does. The transactions live in `src/lib/tuning/run-store.ts` and
 * `verdicts.ts`, where the probe reaches them; these add the session and the revalidation.
 *
 * THE TYPES DO NOT REACH THE WIRE. Every argument is checked for what it claims to be before it
 * is used: an id that is not a uuid is refused rather than handed to Postgres to throw on, and
 * `anyway` counts only as the literal `true`, or `{ anyway: "false" }` would pass the gate.
 */

function revalidateDeck(deckId: string): void {
  for (const path of deckSurfaces(deckId)) revalidatePath(path);
}

/**
 * The deck's one line. Every save clears `intent_seeded`: the app writes `true` when it fills a
 * deck, and the player's first edit — the only thing that calls this — makes the line theirs.
 */
export async function saveDeckIntent(deckId: string, formData: FormData): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  if (!isUuid(deckId)) return { ok: false, message: deckTuningCopy.intent.refused };
  // A field that is missing or not text is a refusal, never an empty line: reading it as ""
  // would clear the player's intent on a malformed request.
  const raw = formData instanceof FormData ? formData.get("intent") : null;
  if (typeof raw !== "string") return { ok: false, message: deckTuningCopy.intent.refused };
  const saved = await saveIntent(deckId, userId, raw);
  if (saved === "tooLong") return { ok: false, message: deckTuningCopy.intent.tooLong };
  if (saved === "refused") return { ok: false, message: deckTuningCopy.intent.refused };
  revalidateDeck(deckId);
  return { ok: true };
}

/**
 * One tuning run, start to finish. `anyway` is the drawn `Suggest again anyway`: it passes the
 * `unchanged` reason and no other.
 *
 * The order is the design: the gate, then `startRun`'s one transaction holding the unit and the
 * pending row, committed before any network call. Everything after that sits in one `try`, so a
 * throw anywhere fails the run and refunds its unit: no unit is ever spent on a call never made.
 */
export async function runTuning(
  deckId: string,
  opts: { anyway?: boolean; runId?: string } = {},
): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  if (!isUuid(deckId)) return { ok: false, message: deckTuningCopy.run.refused };
  const anyway = typeof opts === "object" && opts !== null && opts.anyway === true;
  // The panel names its run so its Stop can cancel that run and no other. Anything but a uuid is
  // refused rather than dropped: a Stop keyed on an id the row does not carry could never land.
  const requested = typeof opts === "object" && opts !== null ? opts.runId : undefined;
  if (requested !== undefined && (typeof requested !== "string" || !isUuid(requested))) {
    return { ok: false, message: deckTuningCopy.run.refused };
  }

  const inputs = await tuningInputs(deckId, userId);
  if (!inputs) return { ok: false, message: deckTuningCopy.run.refused };
  const { head, games, intent, declared, fingerprint, readVersion, locked, allLocked } = inputs;

  // `allLocked` is a gate reason, so this refusal lands BEFORE `startRun` reserves a credit: the
  // panel's "No credit is used." is true of the server, not only of a disabled button.
  const gate = gateReason(await readTuningState(deckId, userId, fingerprint, new Date(), { allLocked }));
  if (gate && !(gate.kind === "unchanged" && anyway)) return { ok: false, message: gate.message };

  const started = await startRun(userId, deckId, fingerprint, readVersion, { runId: requested });
  if (started.kind === "paused") return { ok: false, message: creditsCopy.pausedServer };
  if (started.kind === "ownerShare") return { ok: false, message: creditsCopy.ownerShare(new Date()) };
  if (started.kind === "allowance") return { ok: false, message: deckTuningCopy.allowance.spent };
  if (started.kind === "in_flight") return { ok: false, message: deckTuningCopy.announce.started };
  // The last card was locked after the gate's snapshot: refused under the lock, nothing reserved.
  if (started.kind === "allLocked") {
    return { ok: false, message: lockedCardsCopy.tuning.allLocked(await commanderName(head)) };
  }

  // The run and its ledger unit, held for the whole request: every settle below reaches the unit
  // by its own id, so a deck deleted mid-call (which cascades the run row away) still gets its bill.
  const run = { runId: started.runId, callId: started.callId };
  // What the call was billed for, once it returned. Every outcome write after that records it: a
  // failed one, since a refund still burned the tokens, and a late one that finds the run already
  // Stopped or reaped, since the call billed all the same (`run-store.ts`, `recordLate`).
  let billed: Billed | undefined;
  const fail = async (errorClass: Parameters<typeof finishRun>[1]["errorClass"], droppedCount?: number) => {
    if (await finishRun(run, { status: "failed", errorClass, droppedCount }, billed)) revalidateDeck(deckId);
    return { ok: true } as const;
  };

  try {
    const profile = await profileOfHead(head);
    const [owned, { overview, universal }] = await Promise.all([
      readOwnedOracleIds(userId, [
        ...profile.cards.map((c) => c.oracleId),
        ...profile.skeleton.staples.map((s) => s.oracleId),
      ]),
      readTuningContext(head),
    ]);
    const pack = buildEvidencePack({
      profile, play: buildPlayGroup(games), intent, owned, overview, universal, locked: new Set(locked),
    });
    const { system, user } = buildPrompt(pack);
    const outcome = await callModel({
      model: TUNING_MODEL, system, user, maxTokens: TUNING_MAX_TOKENS,
      schema: tuningResponseSchema, deadlineMs: MODEL_TIMEOUT_MS,
      effort: TUNING_EFFORT, retryFloorMs: TUNING_RETRY_FLOOR_MS,
    });
    if (outcome.usage) billed = { model: TUNING_MODEL, usage: outcome.usage };
    // A rejection is stored as busy here: the distinction is kept for the overview only, for now.
    if (!outcome.ok) return await fail(outcome.errorClass === "upstream_rejected" ? "upstream_busy" : outcome.errorClass);

    // One catalog read of every name the model returned; injected so validate.ts stays pure.
    const names = [...new Set(outcome.value.suggestions.flatMap((s) => [s.add, s.cut]))];
    const rows = names.length === 0 ? [] : await db
      .select({ oracleId: cards.oracleId, name: cards.name, colorIdentity: cards.colorIdentity, commanderLegal: cards.commanderLegal })
      .from(cards)
      .where(inArray(cards.name, names));
    const resolveName = nameResolver(rows, new Set(pack.cards.map((c) => c.oracleId)));

    const { kept, droppedCount, drops } = validateSuggestions({ response: outcome.value, pack, resolveName });
    // F10: every suggestion cut a card the player locked. Its own class, so the empty result says
    // that rather than `ungrounded`'s three causes. Refunded like every failure.
    if (kept.length === 0 && drops.length > 0 && drops.every((d) => d.rule === "neverCut")) {
      return await fail("locked_only", droppedCount);
    }
    if (kept.length === 0) return await fail("ungrounded", droppedCount);

    // The bracket flag: shown, never dropped (Hugh, 2026-09-23).
    const flagged = await withBracketAfter(head, profile, declared, kept);
    if (await persistRun(run, flagged, droppedCount, billed)) revalidateDeck(deckId);
    return { ok: true };
  } catch (err) {
    await fail("upstream_busy");
    throw err;
  }
}

/** Stop: the run the panel was watching, by id, so a late press cannot cancel the next one. */
export async function cancelTuningRun(deckId: string, runId: string): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  if (!isUuid(deckId) || !isUuid(runId)) return { ok: true };
  if (await cancelRun(runId, deckId, userId)) revalidateDeck(deckId);
  return { ok: true };
}

/**
 * What a surface calls to draw the panel. The Analysis tab has no address, so no route loader
 * can load this only when the panel shows; the panel asks for it. Never builds the profile.
 * Null for a deck that is not the reader's.
 */
export async function readTuningPanel(deckId: string): Promise<TuningState | null> {
  const userId = await requireUserId();
  if (!isUuid(deckId)) return null;
  const inputs = await tuningInputs(deckId, userId);
  if (!inputs) return null;
  return readTuningState(deckId, userId, inputs.fingerprint, new Date(), { allLocked: inputs.allLocked });
}

/**
 * One of the generating manifest's reads. The panel calls them in turn, so each tick lands
 * on a read that finished. Disclosure only: the run rebuilds everything itself.
 */
export async function readTuningEvidence(deckId: string, step: EvidenceStep): Promise<number | null> {
  const userId = await requireUserId();
  if (!isUuid(deckId) || !EVIDENCE_STEPS.includes(step)) return null;
  return readEvidenceStep(deckId, userId, step);
}

async function verdict(
  itemId: string,
  write: (userId: string) => Promise<string | null>,
  refused: string,
  claims: boolean,
): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  if (!isUuid(itemId)) return { ok: false, message: refused };
  const deckId = await write(userId);
  if (!deckId) return { ok: false, message: refused };
  if (claims) revalidateClaims(deckId, userId);
  else revalidateDeck(deckId);
  return { ok: true };
}

export async function applySuggestion(itemId: string): Promise<DeckMutationResult> {
  return verdict(itemId, (u) => applyItem(itemId, u), deckTuningCopy.card.applyRefused, true);
}

export async function undoSuggestion(itemId: string): Promise<DeckMutationResult> {
  return verdict(itemId, (u) => undoItem(itemId, u), deckTuningCopy.card.undoRefused, true);
}

export async function dismissSuggestion(itemId: string): Promise<DeckMutationResult> {
  return verdict(itemId, (u) => setDismissed(itemId, u, true), deckTuningCopy.card.verdictRefused, false);
}

export async function restoreSuggestion(itemId: string): Promise<DeckMutationResult> {
  return verdict(itemId, (u) => setDismissed(itemId, u, false), deckTuningCopy.card.verdictRefused, false);
}
