"use server";

import { requireUserId } from "../../lib/auth";
import { revalidateClaims } from "../../lib/decks/revalidate-claims";
import { requestFlags } from "../../lib/flags/request";
import { picksShape, type UpgradePicks } from "../../lib/precons/upgrade/apply";
import { applyUpgradeOnDeck, undoUpgradeOnDeck, type DeckApplyResult, type DeckUndoResult } from "../../lib/precons/upgrade/deck-apply";
import { preconUpgradeEnabled } from "../../lib/precons/upgrade/flag";
import { isUuid } from "../../lib/uuid";

/**
 * Upgrade precon on the deck page (addendum A2c, G17): Apply a kept run's swaps to the deck, and its Undo. PUBLIC ENDPOINTS, so
 * every gate is re-applied here: the session, the reader's switch (`PRECON_UPGRADE_ENABLED`) and the shape of the ids. The deck
 * is the reader's own in the write's own SQL. Both are free: only a run costs credits. Both revalidate the claim surfaces, as
 * `applySuggestionSet` does, because the deck's list moved.
 */

/** `picks`: the adds and cuts the player kept (fresh start R2); absent, the whole run. Malformed picks are refused before any read. */
export async function applyPreconUpgradeOnDeck(deckId: string, runId: string, picks?: UpgradePicks): Promise<DeckApplyResult> {
  const userId = await requireUserId();
  const env = await requestFlags(userId);
  if (!preconUpgradeEnabled(env) || !isUuid(deckId) || !isUuid(runId)) return { ok: false, reason: "closed" };
  const picked = picks === undefined ? undefined : picksShape(picks);
  if (picked === null) return { ok: false, reason: "picks" };
  const r = picked === undefined ? await applyUpgradeOnDeck(userId, deckId, runId) : await applyUpgradeOnDeck(userId, deckId, runId, picked);
  if (r.ok) revalidateClaims(deckId, userId);
  return r;
}

export async function undoPreconUpgradeOnDeck(deckId: string, runId: string): Promise<DeckUndoResult> {
  const userId = await requireUserId();
  const env = await requestFlags(userId);
  if (!preconUpgradeEnabled(env) || !isUuid(deckId) || !isUuid(runId)) return { ok: false };
  const r = await undoUpgradeOnDeck(userId, deckId, runId);
  if (r.ok) revalidateClaims(deckId, userId);
  return r;
}
