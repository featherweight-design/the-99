"use server";

// "Start with this precon" (handoff `design_handoff_the99_precons`, S1; audit finding 6). The deck
// itself is `startPreconDeck`: the precon's exact list, committed as v0 (the precon's own), each card pinned to the
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
import { noCollectionEntryEnabled } from "../../lib/collection/edit-flag";
import { addPreconForUser } from "../../lib/precons/add";
import { readPickCatalog } from "../../lib/precons/list-read";
import { PICK_MAX, recoverCommitted, resolvePick, runPickAdds, type PickOutcome } from "../../lib/precons/pick";
import { committedPreconAdds } from "../../lib/precons/added";
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

/**
 * Precons I own (no-collection entry S4 to S7): adds each ticked box with `addPreconForUser`, once per box and each
 * with its own id, so each is its own History entry with its tokens marked. The request is checked against the
 * catalog as a closed set (`resolvePick`). A box that refuses does not stop the others, and nothing is retried here:
 * the outcomes say which landed, and a retry with the same ids is answered from the committed entries.
 */
export async function addPrecons(requests: unknown): Promise<PickOutcome[]> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!preconsEnabled(env)) throw new Error("precons are off");
  // `noCollectionEntryEnabled` needs collection editing, the rollout boundary every collection write keeps.
  if (!noCollectionEntryEnabled(env)) throw new Error("the precon pick is off");
  // A retry is answered from the entries it already wrote BEFORE the catalog is read, so a refresh that landed between
  // the commit and the retry cannot refuse an add that stands. Only the rest are checked and added.
  // The whole request is held to one box and one id each, and the cap, before anything is recovered or added.
  if (!Array.isArray(requests) || requests.length === 0 || requests.length > PICK_MAX) throw new Error("bad pick");
  const fields = (requests as unknown[]).map((r) => (typeof r === "object" && r !== null ? (r as Record<string, unknown>) : {}));
  if (new Set(fields.map((f) => f.fileName)).size !== fields.length || new Set(fields.map((f) => f.actionId)).size !== fields.length) throw new Error("bad pick");
  const ids = Array.isArray(requests)
    ? (requests as unknown[]).map((r) => (typeof r === "object" && r !== null ? (r as Record<string, unknown>).actionId : null)).filter((id): id is string => isUuid(id))
    : [];
  const split = recoverCommitted(requests, await committedPreconAdds(userId, ids));
  if (split === null) throw new Error("bad pick");
  let added: PickOutcome[] = [];
  if (split.rest.length > 0) {
    const boxes = resolvePick(split.rest, await readPickCatalog());
    if (boxes === null) throw new Error("bad pick");
    const placements = addedCopyEnabled(env);
    added = await runPickAdds(boxes, (fileName, actionId) => addPreconForUser(userId, fileName, actionId, env, placements));
  }
  const outcomes = [...split.recovered, ...added];
  if (outcomes.some((o) => o.ok)) {
    // A pick that stays on the page (S7) must see the nav unlock now, so the readers are retired in the response;
    // the scores warm after it, as every collection write does.
    invalidateCollectionReaders(userId);
    after(() => warmCommanderScores(userId, env));
  }
  return outcomes;
}
