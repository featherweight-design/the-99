"use server";

import { inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "../../db";
import { cards } from "../../db/schema";
import { requireUserId } from "../../lib/auth";
import { isUuid } from "../../lib/uuid";
import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import type { DeckMutationResult } from "../../lib/decks/mutation-result";
import { deckSurfaces } from "../../lib/decks/revalidate";
import { revalidateClaims } from "../../lib/decks/revalidate-claims";
import {
  profileOfHead,
  readEvidenceStep,
  readOwnedOracleIds,
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
import { MODEL_TIMEOUT_MS, TUNING_MAX_TOKENS, TUNING_MODEL } from "../../lib/tuning/limits";
import { buildPrompt } from "../../lib/tuning/prompt";
import { tuningResponseSchema } from "../../lib/tuning/response-schema";
import { cancelRun, finishRun, persistRun, saveIntent, startRun } from "../../lib/tuning/run-store";
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
  const raw = formData.get("intent");
  const saved = await saveIntent(deckId, userId, typeof raw === "string" ? raw : "");
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
export async function runTuning(deckId: string, opts: { anyway?: boolean } = {}): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  if (!isUuid(deckId)) return { ok: false, message: deckTuningCopy.run.refused };
  const anyway = typeof opts === "object" && opts !== null && opts.anyway === true;

  const inputs = await tuningInputs(deckId, userId);
  if (!inputs) return { ok: false, message: deckTuningCopy.run.refused };
  const { head, games, intent, declared, fingerprint } = inputs;

  const gate = gateReason(await readTuningState(deckId, userId, fingerprint));
  if (gate && !(gate.kind === "unchanged" && anyway)) return { ok: false, message: gate.message };

  const started = await startRun(userId, deckId, fingerprint);
  if (started.kind === "allowance") return { ok: false, message: deckTuningCopy.allowance.spent };
  if (started.kind === "in_flight") return { ok: false, message: deckTuningCopy.announce.started };
  const { runId } = started;

  const fail = async (errorClass: Parameters<typeof finishRun>[1]["errorClass"], droppedCount?: number) => {
    if (await finishRun(runId, { status: "failed", errorClass, droppedCount })) revalidateDeck(deckId);
    return { ok: true } as const;
  };

  try {
    const profile = await profileOfHead(head);
    const owned = await readOwnedOracleIds(userId, [
      ...profile.cards.map((c) => c.oracleId),
      ...profile.skeleton.staples.map((s) => s.oracleId),
    ]);
    const pack = buildEvidencePack({ profile, play: buildPlayGroup(games), intent, owned });
    const { system, user } = buildPrompt(pack);
    const outcome = await callModel({
      model: TUNING_MODEL, system, user, maxTokens: TUNING_MAX_TOKENS,
      schema: tuningResponseSchema, deadlineMs: MODEL_TIMEOUT_MS,
    });
    if (!outcome.ok) return await fail(outcome.errorClass);

    // One catalog read of every name the model returned; injected so validate.ts stays pure.
    const names = [...new Set(outcome.value.suggestions.flatMap((s) => [s.add, s.cut]))];
    const rows = names.length === 0 ? [] : await db
      .select({ oracleId: cards.oracleId, name: cards.name, colorIdentity: cards.colorIdentity, commanderLegal: cards.commanderLegal })
      .from(cards)
      .where(inArray(cards.name, names));
    const resolveName = nameResolver(rows, new Set(pack.cards.map((c) => c.oracleId)));

    const { kept, droppedCount } = validateSuggestions({ response: outcome.value, pack, resolveName });
    if (kept.length === 0) return await fail("ungrounded", droppedCount);

    // The bracket flag: shown, never dropped (Hugh, 2026-09-23).
    const flagged = await withBracketAfter(head, profile, declared, kept);
    if (await persistRun(runId, flagged, droppedCount)) revalidateDeck(deckId);
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
  return readTuningState(deckId, userId, inputs.fingerprint);
}

/**
 * One of the generating manifest's four reads. The panel calls them in turn, so each tick lands
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
