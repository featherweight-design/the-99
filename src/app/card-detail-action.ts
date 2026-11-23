"use server";

import { sanitizeCommanderScope, sanitizeDeckScope } from "../lib/combos/deck-scope-param";
import type { BrowseCard } from "../lib/collection/browse";
import { loadVariantCombo, type CardCombo } from "../lib/combos/near-combos";
import { loadCardDetail } from "../lib/collection/card-detail";
import { currentUserId } from "../lib/auth";
import { perfRoute } from "../lib/perf/timing";
import { requestFlags } from "../lib/flags/request";
import { readerStoreForPage } from "../lib/stores/preference";
import { enforceHit } from "../lib/rate/observe";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Card detail for any oracle id, owned or not. Surfaces that list cards carry only the id,
 * so the modal's data is fetched on click rather than shipped with the page — a deck of 99
 * cards would otherwise send 99 cards' printings to the client for the one the user opens.
 *
 * Route-agnostic on purpose: it takes an oracle id and nothing else, and the commander
 * detail page's role lists open the same modal the deck builder does.
 */
export async function getCardDetail(
  oracleId: string,
  /**
   * The cards of the deck the modal was opened from, if any — what makes `in this deck`
   * sayable in the combo block and its scope line renderable.
   *
   * SENT BY THE CLIENT, and only ever used to CLASSIFY partners the reader already sees:
   * every id is checked against the combo index, never trusted as a claim about the deck.
   * A crafted list can therefore make the block say `in this deck` about a card the deck
   * does not hold, which shows that reader a wrong word about their own deck and nothing
   * else — no other reader's data is reachable through it, and the partner list itself is
   * derived from the card and the caller's own collection.
   */
  deckOracleIds?: readonly string[],
  /**
   * That deck's commanders, apart (combos close UI-3): what holds a command-zone-only piece and
   * reads the deck's colors. Sent by the client like the list, shape-checked and capped at two, and
   * used only to classify and filter the reader's own combo lines.
   */
  commanderOracleIds?: readonly string[],
): Promise<BrowseCard | null> {
  // `measure:load`'s spans (PERF_TIMING=1 only; a pass-through otherwise).
  const perf = perfRoute("getCardDetail");
  const userId = await perf.timed("auth", () => currentUserId());
  // No session (a token that lapsed before it refreshed): the same answer as a card not found, which the modal already treats
  // as a read that failed. A throw here reached Sentry as a failed request for a state the reader can recover from.
  if (userId === null) return null;
  // Server actions are reachable via crafted requests; a non-uuid would reach Postgres as a
  // cast error rather than a miss.
  if (!UUID.test(oracleId)) return null;
  // The same `card-detail` bucket as the read-ahead route, so the action is no way round its limit. Over it, the answer
  // is a read that failed, which the modal already draws.
  if ((await perf.timed("rate", () => enforceHit(userId, "card-detail"))) !== null) return null;
  // SHAPE-CHECKED AND CAPPED. This is a public endpoint and the argument is new; see
  // `sanitizeDeckScope`, which is where the rule lives so a test can call it rather than
  // restate it.
  const scoped = sanitizeDeckScope(deckOracleIds);
  const commanders = sanitizeCommanderScope(commanderOracleIds);
  const env = await requestFlags(userId);
  return perf.timed("loadCardDetail", () => loadCardDetail(userId, oracleId, scoped, env, commanders));
}

/**
 * The combo sheet the feed opens on its own (small items 12 PR 3b): one stored variant, with where each piece is for
 * the caller. Reads only the public combo index and the caller's own collection, so nothing of another reader is
 * reachable. Null is a combo that cannot be shown (signed out, over the limit, gone, or a piece the reader no longer owns),
 * which the provider answers with card details; a throw is a read that failed.
 */
export async function getComboSheet(variantId: string): Promise<CardCombo | null> {
  const userId = await currentUserId();
  if (userId === null) return null;
  if (typeof variantId !== "string" || variantId.length === 0 || variantId.length > 80) return null;
  if ((await enforceHit(userId, "card-detail")) !== null) return null;
  // The reader's store (store preference): a piece's buy tag is priced there, as card details' are.
  const combo = await loadVariantCombo({ userId, variantId, store: await readerStoreForPage(userId, await requestFlags(userId)) });
  // Both halves owned is what the feed item said; a piece no longer held is a combo that is no longer there.
  return combo && combo.others.length > 0 && combo.others.every((o) => o.state !== "notOwned") ? combo : null;
}
