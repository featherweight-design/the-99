"use server";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "../../../db";
import { cards, collectionItems } from "../../../db/schema";
import { loadAvailability } from "../../../lib/decks/availability-query";
import { buysCopy } from "../../../lib/intake/buys-card";
import { requireUserId } from "../../../lib/auth";
import { requestSwitchEnv } from "../../../lib/switches/request";
import { validateCreateAnswers, type CreateAnswers } from "../../../lib/intake/answers";
import { handOffTrial } from "../../../lib/intake/trial";
import { handOffReachOf, type HandOffReach } from "../../../lib/intake/hand-off-reach";
import { loadCardChip, type CardChip } from "../../../lib/intake/rows";
import { isCommanderCandidate } from "../../../lib/recs/score";
import { validateCardForDeck } from "../../../lib/decks/add-validation";
import { isBasicLand } from "../../../lib/decks/grouping";
import { isUuid } from "../../../lib/uuid";
import { sanitizeSelection } from "../../../lib/decks/selection-param";

/**
 * The hand-off's Bracket row (bracket reach PR 3b): what the deck `createDeck` would build from
 * these answers reaches, read before the player presses *Create deck*. It takes the create's OWN
 * arguments (the commander and the answers `CreatePreFilled` hands `createDeck`), checked by the
 * create's own validator, so the choice it draws is the create's.
 *
 * A Server Action's arguments are untrusted: the commander is re-checked as the create checks it,
 * and the build-around card is dropped where the create would drop it. One fill per call, like one
 * results row's trial. Null when there is nothing to choose and today's ceiling line stands.
 */
export async function handOffBracketReach(
  commanderOracleId: string,
  create: CreateAnswers,
  /** The `?select=` picks the create places beside the fill, exactly as `CreatePreFilled` hands them
   *  to `createDeck`: they are the deck's, so they move its bracket, its budget and its slots. */
  selectedOracleIds: string[] = [],
): Promise<HandOffReach | null> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (typeof commanderOracleId !== "string" || !isUuid(commanderOracleId)) throw new Error("commander not found");
  if (!Array.isArray(selectedOracleIds) || !selectedOracleIds.every((id) => typeof id === "string")) throw new Error("bad selection");
  const asked = validateCreateAnswers({ ...create, bracketBuys: false });
  if (asked.bracket === null || asked.bracket < 3) return null;

  const [commander] = await db.select().from(cards).where(eq(cards.oracleId, commanderOracleId));
  if (!commander || !commander.commanderLegal || !isCommanderCandidate(commander)) throw new Error("commander not found");

  // The create's own rules for what it places beside the fill (`createDeck`): the build-around card
  // first, then the picks, shape-filtered and deduped (`sanitizeSelection`, which also bounds them),
  // each legal in this deck; a basic named as the build-around card is dropped.
  const requested = sanitizeSelection([...(asked.cardOracleId ? [asked.cardOracleId] : []), ...selectedOracleIds]);
  const rows = requested.length === 0 ? [] : await db.select({
    oracleId: cards.oracleId, name: cards.name, commanderLegal: cards.commanderLegal,
    colorIdentity: cards.colorIdentity, typeLine: cards.typeLine,
  }).from(cards).where(inArray(cards.oracleId, requested));
  const placed = new Set(rows
    .filter((c) => !(c.oracleId === asked.cardOracleId && isBasicLand(c.typeLine)))
    .filter((c) => !validateCardForDeck(c, {
      commanderOracleId, commanderColorIdentity: commander.colorIdentity,
      partnerOracleId: null, partnerColorIdentity: null, built: 0,
    }))
    .map((c) => c.oracleId));
  const cardOracleId = asked.cardOracleId && placed.has(asked.cardOracleId) ? asked.cardOracleId : null;
  // In the create's order: the build-around card leads.
  const placedIds = requested.filter((id) => placed.has(id));

  const budgetCents = asked.budgetDollars === null ? null : asked.budgetDollars * 100;
  const trial = await handOffTrial(
    userId,
    { oracleId: commander.oracleId, name: commander.name, colorIdentity: commander.colorIdentity, manaCost: commander.manaCost },
    { budgetCents, bracket: asked.bracket, cardOracleId, ...(asked.sets.length > 0 ? { sets: asked.sets } : {}) },
    env,
    asked.pool === "own",
    placedIds,
  );
  const permits = trial.permits;
  const reach = trial.reach;
  // Nothing to draw: today's ceiling line, and no chip is read.
  if (!permits || !reach || reach.kind === "fixed" || reach.kind === "above") return null;

  // The picks beside the build-around card, read for the Hit line only when there is a set to buy.
  // Which of them the create BUYS is decided by one ownership read and one availability read over
  // them all, so only those are chipped: a long `?select=` costs two queries, not a chip each.
  const buying = reach.kind === "short" && reach.buy !== null && !permits.includes(reach.target);
  const picks = buying ? placedIds.filter((id) => id !== cardOracleId) : [];
  const basics = new Set(rows.filter((c) => isBasicLand(c.typeLine)).map((c) => c.oracleId));
  const selectedIds = picks.length === 0 ? [] : await Promise.all([
    db.select({ oracleId: collectionItems.oracleId }).from(collectionItems)
      .where(and(eq(collectionItems.userId, userId), inArray(collectionItems.oracleId, picks)))
      .then((owned) => new Set(owned.map((r) => r.oracleId))),
    loadAvailability(userId, { oracleIds: picks }),
  ]).then(([owned, availability]) => picks.filter((id) => !basics.has(id) && buysCopy(owned.has(id), availability.get(id))));
  const ids = [...new Set([
    ...selectedIds,
    ...trial.placedRaisers,
    ...(reach.kind === "short" && reach.buy ? reach.buy.raisers : []),
  ])];
  const [chips, gameChangers] = await Promise.all([
    Promise.all(ids.map(async (id) => [id, await loadCardChip(userId, id)] as const)),
    ids.length === 0 ? new Set<string>() : db.select({ oracleId: cards.oracleId }).from(cards)
      .where(and(inArray(cards.oracleId, ids), eq(cards.gameChanger, true)))
      .then((rows) => new Set(rows.map((r) => r.oracleId))),
  ]);
  const chipById = new Map<string, CardChip | null>(chips);
  return handOffReachOf({
    target: asked.bracket,
    permits,
    reach,
    placedRaisers: trial.placedRaisers,
    budgetCents,
    budgetLeftCents: trial.budgetLeftCents,
    chipOf: (id) => chipById.get(id) ?? null,
    isGameChanger: (id) => gameChangers.has(id),
    selectedIds,
  });
}
