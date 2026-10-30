"use server";

import { requireUserId } from "../../lib/auth";
import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import { revalidateClaims } from "../../lib/decks/revalidate-claims";
import { requestSwitchEnv } from "../../lib/switches/request";
import { suggestedChangesV2Copy } from "../../lib/copy/suggested-changes-v2";
import { suggestedChangesV2Enabled } from "../../lib/tuning/flag";
import { applyPicks, parseSetPulls, setPicked, undoSet, type ApplySetRefusal } from "../../lib/tuning/v2/apply-set";
import { readSetPermits } from "../../lib/tuning/v2/set-bracket";
import { isUuid } from "../../lib/uuid";

/**
 * Suggested changes v2's apply, undo and pick (plan PR 4). No caller until the results UI (PR 6), behind
 * `SUGGESTED_CHANGES_V2_ENABLED`. The refusal words are the per-line ones v10 already shows; the UI PR gives each refusal
 * its own words through `/copy-review` once the handoff's screens exist.
 */
export type ApplySetActionResult = { ok: true; itemIds: string[] } | { ok: false; message: string; refusal?: ApplySetRefusal };

const MAX_SIDE = 20;
const ids = (v: unknown): string[] | null =>
  Array.isArray(v) && v.length <= MAX_SIDE && v.every((x) => typeof x === "string" && isUuid(x)) ? (v as string[]) : null;

async function v2Reader() {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  return suggestedChangesV2Enabled(env) ? { userId, env } : null;
}

/**
 * `pulls` (Small items 4, item 2): the confirmation's staged pulls, `{ itemId, sourceDeckId }` per held addition, at most
 * one per picked addition (`parseSetPulls`). Last and optional, so a set with none is the call it always was.
 */
export async function applySuggestionSet(
  runId: string, addIds: unknown, cutIds: unknown, actionId: string, pulls?: unknown,
): Promise<ApplySetActionResult> {
  const refused = { ok: false as const, message: deckTuningCopy.lists.applyRefused };
  const reader = await v2Reader();
  const adds = ids(addIds);
  const cuts = ids(cutIds);
  if (!reader || !isUuid(runId) || !isUuid(actionId) || !adds || !cuts) return refused;
  const staged = parseSetPulls(pulls, adds);
  if (!staged) return refused;
  const r = await applyPicks({ runId, addIds: adds, cutIds: cuts, actionId, pulls: staged, ...reader });
  if (!r.ok) return { ...refused, refusal: r.refusal };
  revalidateClaims(r.deckId, reader.userId);
  // A deck a copy came out of: its draft and its claim both moved.
  for (const id of r.sourceDeckIds ?? []) revalidateClaims(id, reader.userId);
  return { ok: true, itemIds: r.itemIds };
}

export async function undoSuggestionSet(applySet: string): Promise<ApplySetActionResult> {
  const refused = { ok: false as const, message: deckTuningCopy.lists.undoRefused };
  const reader = await v2Reader();
  if (!reader || !isUuid(applySet)) return refused;
  const r = await undoSet({ applySet, ...reader });
  if (!r.ok) {
    // A deck a copy was pulled out of has moved on: the refusal names it, in the same place the undo's refusal shows.
    const message = r.refusal.kind === "pullMoved" ? suggestedChangesV2Copy.undoPullRefused(r.refusal.deckName) : refused.message;
    return { ok: false, message, refusal: r.refusal };
  }
  revalidateClaims(r.deckId, reader.userId);
  for (const id of r.sourceDeckIds ?? []) revalidateClaims(id, reader.userId);
  return { ok: true, itemIds: r.itemIds };
}

/** Free, and revalidates nothing: the deck is unchanged, and a pick moves no figure any page draws. */
export async function pickSuggestion(itemId: string, picked: boolean): Promise<{ ok: boolean }> {
  const reader = await v2Reader();
  if (!reader || !isUuid(itemId) || typeof picked !== "boolean") return { ok: false };
  return { ok: (await setPicked(itemId, reader.userId, picked)) !== null };
}

/** The brackets the deck would permit with the picked set applied (`readSetPermits`): free, read-only, revalidates nothing. */
export async function readSuggestionSetBracket(runId: string, addIds: unknown, cutIds: unknown): Promise<{ permits: number[] } | null> {
  const reader = await v2Reader();
  const adds = ids(addIds);
  const cuts = ids(cutIds);
  if (!reader || !isUuid(runId) || !adds || !cuts || adds.length + cuts.length === 0) return null;
  const permits = await readSetPermits({ runId, addIds: adds, cutIds: cuts, ...reader });
  return permits ? { permits } : null;
}
