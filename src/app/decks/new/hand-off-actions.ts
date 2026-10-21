"use server";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "../../../db";
import { cards } from "../../../db/schema";
import { requireUserId } from "../../../lib/auth";
import { requestSwitchEnv } from "../../../lib/switches/request";
import { helpMeChooseEnabled } from "../../../lib/intake/flag";
import { bracketReachEnabled } from "../../../lib/intake/bracket-reach-flag";
import { validateCreateAnswers, type CreateAnswers } from "../../../lib/intake/answers";
import { handOffTrial } from "../../../lib/intake/trial";
import { handOffReachOf, type HandOffReach } from "../../../lib/intake/hand-off-reach";
import { loadCardChip, type CardChip } from "../../../lib/intake/rows";
import { isCommanderCandidate } from "../../../lib/recs/score";
import { validateCardForDeck } from "../../../lib/decks/add-validation";
import { isBasicLand } from "../../../lib/decks/grouping";
import { isUuid } from "../../../lib/uuid";

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
export async function handOffBracketReach(commanderOracleId: string, create: CreateAnswers): Promise<HandOffReach | null> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!helpMeChooseEnabled(env) || !bracketReachEnabled(env)) throw new Error("not found");
  if (typeof commanderOracleId !== "string" || !isUuid(commanderOracleId)) throw new Error("commander not found");
  const asked = validateCreateAnswers({ ...create, bracketBuys: false });
  if (asked.bracket === null || asked.bracket < 3) return null;

  const [commander] = await db.select().from(cards).where(eq(cards.oracleId, commanderOracleId));
  if (!commander || !commander.commanderLegal || !isCommanderCandidate(commander)) throw new Error("commander not found");

  // The create's rule for the build-around card: legal in this deck and not a basic, else dropped.
  let cardOracleId: string | null = null;
  if (asked.cardOracleId) {
    const [card] = await db.select({
      oracleId: cards.oracleId, name: cards.name, commanderLegal: cards.commanderLegal,
      colorIdentity: cards.colorIdentity, typeLine: cards.typeLine,
    }).from(cards).where(eq(cards.oracleId, asked.cardOracleId));
    if (card && !isBasicLand(card.typeLine) && !validateCardForDeck(card, {
      commanderOracleId, commanderColorIdentity: commander.colorIdentity,
      partnerOracleId: null, partnerColorIdentity: null, built: 0,
    })) cardOracleId = card.oracleId;
  }

  const budgetCents = asked.budgetDollars === null ? null : asked.budgetDollars * 100;
  const trial = await handOffTrial(
    userId,
    { oracleId: commander.oracleId, name: commander.name, colorIdentity: commander.colorIdentity, manaCost: commander.manaCost },
    { budgetCents, bracket: asked.bracket, cardOracleId },
    env,
    asked.pool === "own",
  );
  const permits = trial.permits;
  if (!permits) return null;

  const ids = [...new Set([
    ...trial.placedRaisers,
    ...(trial.reach?.kind === "short" && trial.reach.buy ? trial.reach.buy.raisers : []),
  ])];
  const [chips, gameChangers] = await Promise.all([
    Promise.all(ids.map(async (id) => [id, await loadCardChip(userId, id, env)] as const)),
    ids.length === 0 ? new Set<string>() : db.select({ oracleId: cards.oracleId }).from(cards)
      .where(and(inArray(cards.oracleId, ids), eq(cards.gameChanger, true)))
      .then((rows) => new Set(rows.map((r) => r.oracleId))),
  ]);
  const chipById = new Map<string, CardChip | null>(chips);
  return handOffReachOf({
    target: asked.bracket,
    permits,
    reach: trial.reach,
    placedRaisers: trial.placedRaisers,
    budgetCents,
    budgetLeftCents: trial.budgetLeftCents,
    chipOf: (id) => chipById.get(id) ?? null,
    isGameChanger: (id) => gameChangers.has(id),
  });
}
