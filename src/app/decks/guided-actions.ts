"use server";

import { after } from "next/server";

import { requireUserId } from "../../lib/auth";
import { requestFlags } from "../../lib/flags/request";
import { loadGuidedOffer, type GuidedOffer } from "../../lib/guided/offer";
import { beginGuided, type GuidedBegin, type GuidedPicks } from "../../lib/guided/run";
import { readGuidedState, reapGuided, type GuidedState } from "../../lib/guided/store";
import { revalidateClaims } from "../../lib/decks/revalidate-claims";
import { preconUpgradeEnabled } from "../../lib/precons/upgrade/flag";
import { isUuid } from "../../lib/uuid";

/**
 * The guided build on an existing deck (a retry after a refused start, or a deck made before the switch came on): start a run
 * and read a deck's run state. PUBLIC ENDPOINTS, so every gate is re-applied here: the session, the reader's switch
 * (`PRECON_UPGRADE_ENABLED`, which guided rides) and the shape of the id. The deck is the reader's own in each read and write.
 * Starting reserves the credits and writes the pending row before returning; the model runs in `after()`, so the page that
 * hosts the press carries the run's `maxDuration`.
 */
export type StartGuidedResult = { ok: true } | { ok: false; reason: Exclude<GuidedBegin, { ok: true }>["reason"] | "closed" };

export async function startGuidedAction(deckId: string, picks: GuidedPicks): Promise<StartGuidedResult> {
  const userId = await requireUserId();
  const env = await requestFlags(userId);
  if (!preconUpgradeEnabled(env) || !isUuid(deckId)) return { ok: false, reason: "closed" };
  const begun = await beginGuided(userId, deckId, picks, env);
  if (!begun.ok) return begun;
  after(begun.run);
  revalidateClaims(deckId, userId);
  return { ok: true };
}

/** The deck's newest run, after a reap so a dead run does not read as running. Null when there is none or the switch is off. */
export async function readGuidedStateAction(deckId: string): Promise<GuidedState | null> {
  const userId = await requireUserId();
  const env = await requestFlags(userId);
  if (!preconUpgradeEnabled(env) || !isUuid(deckId)) return null;
  await reapGuided(userId, deckId);
  return readGuidedState(userId, deckId);
}

/**
 * What the Guided sheet needs before the deck exists: the commander's strategies (from the cards the reader can use) and their credit
 * standing. Null when the switch is off or an id is not a uuid. Read only, no charge. PUBLIC ENDPOINT: session, switch and shape are
 * re-applied; every read is the caller's own.
 */
export async function guidedOfferAction(commanderOracleId: string, partnerOracleId: string | null): Promise<GuidedOffer | null> {
  const userId = await requireUserId();
  const env = await requestFlags(userId);
  if (!preconUpgradeEnabled(env) || !isUuid(commanderOracleId) || (partnerOracleId !== null && !isUuid(partnerOracleId))) return null;
  return loadGuidedOffer(userId, partnerOracleId === null ? [commanderOracleId] : [commanderOracleId, partnerOracleId], env);
}
