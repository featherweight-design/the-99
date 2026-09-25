import { buildFillPlan } from "../../app/decks/actions";
import { loadAvailability } from "../decks/availability-query";
import { deckBodySize } from "../decks/deck-size";
import { capToBody } from "../decks/fill";
import { isBasicLand } from "../decks/grouping";
import { loadPrices } from "../discovery/price";
import { db } from "../../db";
import { sql } from "drizzle-orm";
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
 * build-around card is placed as the create places it, first. When it has never been stocked it
 * cannot be priced: `unpricedCard` says so, and the row's buy figure leaves it out, never counting it
 * at $0 (F8).
 */
export type TrialFigures = {
  /** Cards in the body, commander excluded: 99, or 98 beside a partner. */
  body: number;
  /** Of those, the copies the player can sleeve from what they own. */
  owned: number;
  /** What the rest costs, in cents; the never-stocked build-around card is not in it. */
  buyCents: number;
  /** The build-around card must be bought and has never been stocked. */
  unpricedCard: boolean;
};

export async function trialFill(
  userId: string,
  commander: { oracleId: string; name: string; colorIdentity: string[] },
  answers: DeckAnswers,
): Promise<TrialFigures> {
  const card = answers.cardOracleId;
  const plan = await buildFillPlan(userId, [commander], new Set(card ? [card] : []), { answers });
  // The plan fills a whole body beside the card, so the card's row would make it 100: cap it
  // exactly as `createDeck` and `fillDeck` do.
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
  let unpricedCard = false;
  for (const r of rows) {
    const f = facts.get(r.oracleId);
    const a = availability.get(r.oracleId);
    const buys = !f || (!isBasicLand(f.type_line) && (!f.owned || (a !== undefined && a.free <= 0)));
    if (!buys) {
      owned += r.quantity;
      continue;
    }
    const price = prices.get(r.oracleId)?.liveCents ?? null;
    if (price === null) {
      if (r.oracleId === card) unpricedCard = true;
      continue;
    }
    buyCents += price * r.quantity;
  }
  return { body: rows.reduce((n, r) => n + r.quantity, 0), owned, buyCents, unpricedCard };
}
