import { buildFillPlan } from "../decks/fill-plan";
import { placedCardsOf } from "../decks/costs-of";
import { loadAvailability } from "../decks/availability-query";
import { deckBodySize } from "../decks/deck-size";
import { capToBody } from "../decks/fill";
import { isBasicLand } from "../decks/grouping";
import { loadPrices, slotFor } from "../discovery/price";
import { db } from "../../db";
import { sql } from "drizzle-orm";
import { buysCopy } from "./buys-card";
import type { DeckAnswers } from "./fill-facts";
import type { Bracket } from "./rank";
import type { BracketReach } from "./bracket-reach";

/**
 * One result row's ownership figures (brief §2 ruling 7, §6): the deck this commander would be
 * built into from these answers, filled for real, and read as "you own 41 of its 99 · about $120 to
 * buy".
 *
 * IT FILTERS NOTHING. It runs for the rows on screen only, and no commander is ever dropped by a fill
 * the player never saw: every pass or fail is `rank.ts`'s, over facts that need no fill.
 *
 * THE FIGURES ARE THE SHOPPING LIST'S. A basic is never a buy. An unowned card is, and so is an owned
 * one whose every copy a committed deck claims, priced at the cheapest printing stocked now. The
 * build-around card is placed as the create places it, first. When it must be bought and has no
 * live price, the row's buy figure leaves it out, never counting it at $0 (F8), and `unpricedCard`
 * says WHY in the price reader's own terms (`slotFor`): `notStocked` when it was priced once and
 * has sold out, `absent` when there is no price on record at all. The two read differently.
 */
export type TrialFigures = {
  /** Cards in the body, commander excluded: 99, or 98 beside a partner. */
  body: number;
  /** Of those, the copies the player can sleeve from what they own. */
  owned: number;
  /** What the rest costs, in cents; a build-around card with no live price is not in it. */
  buyCents: number;
  /** Set only when the build-around card must be bought and has no live price. */
  unpricedCard: "notStocked" | "absent" | null;
  /**
   * The bracket this deck lands in, when one of 3 or more was asked and `BRACKET_REACH_ENABLED` put
   * a reach on the plan. Null otherwise. Read by `permitsOf` over the trial's OWN rows (plan review
   * 5), never `collectionPermits` alone: an "any cards" fill can buy a Game Changer the gate admits
   * and land at the target with no raiser at all. Under own-only only the rows the player can sleeve
   * count, since the bought rest is not in that deck.
   */
  bracket: {
    target: Bracket;
    permits: Bracket[];
    /** What the cheapest set to buy toward the target costs, when the deck falls short of it and
     *  one is stocked. Null when the deck reaches the target or nothing buyable does. */
    buyCents: number | null;
  } | null;
};

export async function trialFill(
  userId: string,
  // `manaCost` feeds the basics pip census in `planFill`; required so a caller cannot omit it.
  commander: { oracleId: string; name: string; colorIdentity: string[]; manaCost: string | null },
  answers: DeckAnswers,
  env: NodeJS.ProcessEnv,
  /** Only cards I own: the bracket figure reads the deck the create would build, the sleeveable
   *  fill. The ownership figures stay the ordinary fill's ("its usual 99"). */
  ownedOnly = false,
): Promise<TrialFigures> {
  const card = answers.cardOracleId;
  // The card is placed beside the plan below, so the plan counts it, as the create this trial
  // predicts does.
  const plan = await buildFillPlan(userId, [commander], new Set(card ? [card] : []), {
    answers, selected: await placedCardsOf(card ? [card] : []), env,
  });
  // The plan is sized to the slots the card leaves (`buildFillPlan` plans body - placed), and the
  // cap is kept exactly as `createDeck` and `fillDeck` keep it, as the rule the body obeys.
  const rows = capToBody([...(card ? [{ oracleId: card, quantity: 1 }] : []), ...plan.rows], deckBodySize(false));
  const ids = [...new Set(rows.map((r) => r.oracleId))];

  const [prices, availability, facts, bracket] = await Promise.all([
    loadPrices(ids),
    loadAvailability(userId, { oracleIds: ids, env }),
    db.execute(sql`
      select c.oracle_id, c.type_line,
        exists (select 1 from collection_items ci where ci.user_id = ${userId} and ci.oracle_id = c.oracle_id) as owned
      from cards c where c.oracle_id = any(${sql.param(ids)}::uuid[])
    `).then((r) => new Map((r.rows as { oracle_id: string; type_line: string; owned: boolean }[]).map((x) => [x.oracle_id, x]))),
    bracketFigure(userId, commander, answers, env, ownedOnly, plan),
  ]);

  let owned = 0;
  let buyCents = 0;
  let unpricedCard: TrialFigures["unpricedCard"] = null;
  for (const r of rows) {
    const f = facts.get(r.oracleId);
    const a = availability.get(r.oracleId);
    const buys = !f || (!isBasicLand(f.type_line) && buysCopy(f.owned, a));
    if (!buys) {
      owned += r.quantity;
      continue;
    }
    const price = prices.get(r.oracleId)?.liveCents ?? null;
    if (price === null) {
      if (r.oracleId === card) {
        const slot = slotFor(prices.get(r.oracleId)).kind;
        unpricedCard = slot === "notStocked" ? "notStocked" : "absent";
      }
      continue;
    }
    buyCents += price * r.quantity;
  }
  return { body: rows.reduce((n, r) => n + r.quantity, 0), owned, buyCents, unpricedCard, bracket };
}

/**
 * `TrialFigures.bracket`: the bracket the deck the create would build lands in, and what is left to
 * buy to hit the target, both by the rule over that deck's finished rows (`buildFillPlan`'s
 * `bracketAfter`). Under own-only that deck is the sleeveable fill under the create's own options
 * (`pool: "sleeveable"`, `failClosed`), never the ordinary fill filtered: the sleeveable fill drops
 * claimed cards BEFORE choosing replacements, so it can pick a raiser the ordinary one never reached.
 */
async function bracketFigure(
  userId: string,
  commander: { oracleId: string; name: string; colorIdentity: string[]; manaCost: string | null },
  answers: DeckAnswers,
  env: NodeJS.ProcessEnv,
  ownedOnly: boolean,
  plan: Awaited<ReturnType<typeof buildFillPlan>>,
): Promise<TrialFigures["bracket"]> {
  if (answers.bracket === null || answers.bracket < 3 || !plan.bracketReach) return null;
  const card = answers.cardOracleId;
  const deck = ownedOnly
    ? await buildFillPlan(userId, [commander], new Set(card ? [card] : []), {
      answers, selected: await placedCardsOf(card ? [card] : []), pool: "sleeveable", failClosed: true, env,
    })
    : plan;
  if (!deck.bracketReach || !deck.bracketAfter) return null;
  return { target: deck.bracketReach.target, ...deck.bracketAfter };
}

/**
 * The hand-off's trial (bracket reach PR 3b): the ONE deck `createDeck` would build from these
 * answers, filled the way the create fills it (under own-only the sleeveable pool, failing closed),
 * so the choice the Bracket row draws is the create's own. It reads the plan, never re-deriving it:
 * `bracketAfter` for what that finished deck lands in, `bracketReach` for the set *Hit bracket N*
 * places (the create places it before the fill buys anything, so no part of it is bought twice), and
 * the rows the fill placed to reach a bracket.
 */
export async function handOffTrial(
  userId: string,
  commander: { oracleId: string; name: string; colorIdentity: string[]; manaCost: string | null },
  answers: DeckAnswers,
  env: NodeJS.ProcessEnv,
  ownedOnly: boolean,
  /** Every card the create places beside the fill: the build-around card and the `?select=` picks.
   *  Defaults to the card alone. They are fixed in the reach, charged to the budget and take slots. */
  placedIds: readonly string[] = answers.cardOracleId ? [answers.cardOracleId] : [],
): Promise<{
  /** Null when no reach ran: under bracket 3, or the switch off. */
  permits: Bracket[] | null;
  /** The rows the fill placed to reach a bracket (`source: "bracket"`), in plan order. */
  placedRaisers: string[];
  reach: BracketReach | null;
  budgetLeftCents: number | null;
}> {
  const placed = [...new Set([...(answers.cardOracleId ? [answers.cardOracleId] : []), ...placedIds])];
  const plan = await buildFillPlan(userId, [commander], new Set(placed), {
    answers, selected: await placedCardsOf(placed), env,
    ...(ownedOnly ? { pool: "sleeveable" as const, failClosed: true } : {}),
  });
  if (answers.bracket === null || answers.bracket < 3 || !plan.bracketReach || !plan.bracketAfter) {
    return { permits: null, placedRaisers: [], reach: null, budgetLeftCents: null };
  }
  return {
    permits: plan.bracketAfter.permits,
    placedRaisers: plan.rows.filter((r) => r.source === "bracket").map((r) => r.oracleId),
    reach: plan.bracketReach,
    budgetLeftCents: plan.budgetLeftCents ?? null,
  };
}
