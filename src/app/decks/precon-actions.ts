"use server";

// "Start with this precon" (handoff `design_handoff_the99_precons`, S1; audit finding 6). The deck
// itself is `startPreconDeck`: the precon's exact list, committed as v1, each card pinned to the
// box's printing (Hugh, 2026-10-14). A card illegal in Commander is kept, as the import keeps one,
// and the start dialog names it first (orchestrator ruling, 2026-10-11).

import { redirect } from "next/navigation";
import { requireUserId } from "../../lib/auth";
import { requestSwitchEnv } from "../../lib/switches/request";
import { validateDeckName } from "../../lib/decks/deck-name";
import { revalidateClaims } from "../../lib/decks/revalidate-claims";
import { PRECON_ADDED_PARAM, PRECON_ARRIVAL_PARAM, PRECON_ARRIVAL_VALUE } from "../../lib/decks/arrival";
import { preconsEnabled } from "../../lib/precons/flag";
import { startPreconDeck } from "../../lib/precons/start";
import { startPreconOwned as startOwned, type PreconStartResult } from "../../lib/precons/start-owned";
import { addedCopyEnabled } from "../../lib/collection/added-copy-flag";
import { collectionEditEnabled } from "../../lib/collection/edit-flag";
import { invalidateCollectionReaders } from "../../lib/collection/invalidate";
import { warmCommanderScores } from "../../lib/recs/warm";
import { isUuid } from "../../lib/uuid";
import { after } from "next/server";

export async function createDeckFromPrecon(fileName: string, rawName: string): Promise<void> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!preconsEnabled(env)) throw new Error("precons are off");
  const name = validateDeckName(rawName);
  if (typeof fileName !== "string" || fileName.length === 0 || fileName.length > 200) throw new Error("precon not found");

  const deckId = await startPreconDeck(userId, fileName, name, env);
  revalidateClaims(deckId, userId);
  redirect(`/decks/${deckId}?${PRECON_ARRIVAL_PARAM}=${PRECON_ARRIVAL_VALUE}`);
}

/**
 * "Start with this precon" with "I own this precon" selected: the box goes into the collection and the
 * deck starts, as ONE transaction (`startPreconOwned`), the copies reserved to the new deck so History's
 * "Went to" names it. `actionId` is a fresh uuid per press; a retry with it lands on the deck it made.
 * Redirects to the deck on success; a refusal is returned for the dialog to say so.
 */
export async function startPreconOwned(fileName: string, rawName: string, actionId: string): Promise<Extract<PreconStartResult, { ok: false }>> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!preconsEnabled(env)) throw new Error("precons are off");
  // A collection write, so it keeps the collection-edit rollout boundary every other write action keeps.
  if (!collectionEditEnabled(env)) throw new Error("collection editing is off");
  const name = validateDeckName(rawName);
  if (typeof fileName !== "string" || fileName.length === 0 || fileName.length > 200) return { ok: false, reason: "notFound" };
  if (!isUuid(actionId)) throw new Error("bad action id");
  const result = await startOwned(userId, fileName, name, actionId, env, addedCopyEnabled(env));
  if (!result.ok) return result;
  revalidateClaims(result.deckId, userId);
  // The add's entry rides the redirect so the deck page can draw its receipt; it is only a claim there (`readPreconAddReceipt`).
  // After the response, as every collection write does (`edit-actions.ts`, `settled`).
  after(async () => {
    invalidateCollectionReaders(userId);
    await warmCommanderScores(userId, env);
  });
  redirect(`/decks/${result.deckId}?${PRECON_ARRIVAL_PARAM}=${PRECON_ARRIVAL_VALUE}&${PRECON_ADDED_PARAM}=${result.entryId}`);
}
