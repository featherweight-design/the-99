/**
 * The form's ONE read for its bracket heads-up (`form-reach.ts`). SERVER-ONLY and not `"use server"`:
 * it takes a reader id, so only an action that authenticated the reader may call it.
 *
 * Per reader, cached per page on the data stamp and every resolved switch (`cachePageForUser`): only
 * the owned cards that can move a bracket (a Game Changer, a combo piece, a search, mass land
 * denial, an extra turn), each with its identity and the facts the rule reads. No buying half: the
 * form names no card to buy (Hugh's ruling (a), `form-reach.ts`).
 */
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { cachePageForUser } from "../cache/page-cache";
import { loadAvailability } from "../decks/availability-query";
import { buysCopy } from "./buys-card";
import { isLandFace } from "../cards/facet";
import { loadBracketGateFacts } from "./fill-facts";
import type { FormCard, FormReachData } from "./form-reach";

type CardRow = { oracle_id: string; name: string; color_identity: string[] | null };

/** The ids a query returns, less every card whose front face is a land (a spell with a land back stays). */
async function movable(query: ReturnType<typeof sql>): Promise<string[]> {
  return ((await db.execute(query)).rows as { oracle_id: string; type_line: string }[])
    .filter((r) => !isLandFace(r.type_line)).map((r) => r.oracle_id);
}

export async function loadOwnedMovers(userId: string): Promise<FormCard[]> {
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
    loadAvailability(userId, { oracleIds: movers }),
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

export async function loadFormReach(userId: string, env: NodeJS.ProcessEnv): Promise<FormReachData> {
  const cards = await cachePageForUser(userId, "form-reach", [], async () => ({ value: await loadOwnedMovers(userId), store: true }), env);
  return { cards };
}
