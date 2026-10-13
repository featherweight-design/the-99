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
};

export async function trialFill(
  userId: string,
  // `manaCost` feeds the basics pip census in `planFill`; required so a caller cannot omit it.
  commander: { oracleId: string; name: string; colorIdentity: string[]; manaCost: string | null },
  answers: DeckAnswers,
): Promise<TrialFigures> {
  const card = answers.cardOracleId;
  // The card is placed beside the plan below, so the plan counts it, as the create this trial
  // predicts does.
  const plan = await buildFillPlan(userId, [commander], new Set(card ? [card] : []), {
    answers, selected: await placedCardsOf(card ? [card] : []),
  });
  // The plan is sized to the slots the card leaves (`buildFillPlan` plans body - placed), and the
  // cap is kept exactly as `createDeck` and `fillDeck` keep it, as the rule the body obeys.
  const rows = capToBody([...(card ? [{ oracleId: card, quantity: 1 }] : []), ...plan.rows], deckBodySize(false));
  const ids = [...new Set(rows.map((r) => r.oracleId))];

  const [prices, availability, facts] = await Promise.all([
    loadPrices(ids),
    loadAvailability(userId, { oracleIds: ids }),
    db.execute(sql`
      select c.oracle_id, c.type_line,
        exists (select 1 from collection_items ci where ci.user_id = ${userId} and ci.oracle_id = c.oracle_id) as owned
      from cards c where c.oracle_id = any(${sql.param(ids)}::uuid[])
    `).then((r) => new Map((r.rows as { oracle_id: string; type_line: string; owned: boolean }[]).map((x) => [x.oracle_id, x]))),
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
  return { body: rows.reduce((n, r) => n + r.quantity, 0), owned, buyCents, unpricedCard };
}
