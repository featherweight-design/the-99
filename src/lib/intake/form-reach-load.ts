/**
 * The form's ONE read for its bracket heads-up (`form-reach.ts`). SERVER-ONLY and not `"use server"`:
 * it takes a reader id, so only an action that authenticated the reader may call it.
 *
 * THE COLLECTION HALF is per reader, cached per page on the data stamp and every resolved switch
 * (`cachePageForUser`): only the owned cards that can move a bracket (a Game Changer, a combo piece,
 * a search, mass land denial, an extra turn), each with its identity and the facts the rule reads.
 * THE BUYING HALF is the same for every player, the catalog's Game Changers with a live price, cached
 * once per catalog generation (Hugh: cache it per identity; one entry holds all of them, and the form
 * filters by color).
 */
import { sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "../../db";
import { cachePageForUser } from "../cache/page-cache";
import { catalogGeneration } from "../cache/catalog-generation";
import { DEPLOYMENT_ID } from "../cache/deployment";
import { loadAvailability } from "../decks/availability-query";
import { loadPrices } from "../discovery/price";
import { buysCopy } from "./buys-card";
import { isLandFace } from "../cards/facet";
import { loadBracketGateFacts } from "./fill-facts";
import type { BuyCard, FormCard, FormReachData } from "./form-reach";

type CardRow = { oracle_id: string; name: string; color_identity: string[] | null };

/** The ids a query returns, less every card whose front face is a land (a spell with a land back stays). */
async function movable(query: ReturnType<typeof sql>): Promise<string[]> {
  return ((await db.execute(query)).rows as { oracle_id: string; type_line: string }[])
    .filter((r) => !isLandFace(r.type_line)).map((r) => r.oracle_id);
}

export async function loadOwnedMovers(userId: string, env: NodeJS.ProcessEnv): Promise<FormCard[]> {
  // THE BUILDER'S OWN BOUNDS: a Commander-legal card (`ownedColorLegalPool`) whose front face is
  // not a land (`reachCandidates`), so the form never counts a raiser the fill could not place.
  const ownedIds = await movable(sql`
    select distinct c.oracle_id, c.type_line from collection_items ci join cards c on c.oracle_id = ci.oracle_id
    where ci.user_id = ${userId} and c.commander_legal
  `);
  if (ownedIds.length === 0) return [];
  const facts = await loadBracketGateFacts(ownedIds);
  const movers = ownedIds.filter((id) => {
    const f = facts.flagsOf(id);
    return f.gameChanger || f.massLandDenial || f.extraTurn || facts.combosOf(id).length > 0 || facts.searches(id);
  });
  if (movers.length === 0) return [];
  const [rows, availability] = await Promise.all([
    db.execute(sql`
      select c.oracle_id, c.name, c.color_identity from cards c
      where c.oracle_id = any(${sql.param(movers)}::uuid[])
    `).then((r) => r.rows as CardRow[]),
    loadAvailability(userId, { oracleIds: movers, env }),
  ]);
  const pieces = movers.filter((id) => facts.combosOf(id).length > 0);
  return rows.map((r) => {
    const id = r.oracle_id;
    const f = facts.flagsOf(id);
    const searches = facts.searches(id);
    return {
      id, name: r.name, identity: r.color_identity ?? [], ...f,
      free: !buysCopy(true, availability.get(id)),
      combos: [...facts.combosOf(id)],
      searches,
      reaches: searches ? pieces.filter((p) => p !== id && facts.reaches(id, p)) : [],
    };
  });
}

export async function loadBuyableGameChangers(): Promise<BuyCard[]> {
  const ids = new Set(await movable(sql`
    select c.oracle_id, c.type_line from cards c where c.game_changer and c.commander_legal
  `));
  const rows = ids.size === 0 ? [] : (await db.execute(sql`
    select c.oracle_id, c.name, c.color_identity from cards c where c.oracle_id = any(${sql.param([...ids])}::uuid[])
  `)).rows as CardRow[];
  const prices = await loadPrices(rows.map((r) => r.oracle_id));
  return rows.flatMap((r) => {
    const cents = prices.get(r.oracle_id)?.liveCents ?? null;
    return cents === null ? [] : [{ id: r.oracle_id, name: r.name, identity: r.color_identity ?? [], priceCents: cents }];
  });
}

export async function loadFormReach(userId: string, env: NodeJS.ProcessEnv): Promise<FormReachData> {
  const generation = await catalogGeneration();
  const [cards, buyable] = await Promise.all([
    cachePageForUser(userId, "form-reach", [], async (resolved) => ({ value: await loadOwnedMovers(userId, resolved), store: true }), env),
    unstable_cache(loadBuyableGameChangers, ["form-reach-buy", DEPLOYMENT_ID, generation], { revalidate: 86_400 })(),
  ]);
  return { cards, buyable };
}
