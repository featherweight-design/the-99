"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db } from "../../db";
import { decks } from "../../db/schema";
import { requireUserId } from "../../lib/auth";
import { deckSurfaces } from "../../lib/decks/revalidate";
import { parseStrategyKey } from "../../lib/strategy/focus";
import type { StrategyKey } from "../../lib/strategy/score";
import { isUuid } from "../../lib/uuid";

export type FocusResult = { ok: true; focus: StrategyKey | null } | { ok: false; reason: "not-found" | "invalid" };

/**
 * Pick a deck's focus, or clear it with `null` ("Keep it balanced"). Free: no model call and no credit.
 *
 * Any strategy the vocabulary names is accepted, not only the deck's top five, because the focus stays the player's pick
 * when its strategy falls out of them (`parseStrategyKey`). Written ONLY ON A CHANGE: the deck row's update moves the
 * reader's data stamp (`user_data_touch`), so a repeat press that wrote the same key would still stale every cached page.
 * Scoped by both ids in the statement, so ownership is enforced by the write itself.
 */
export async function setStrategyFocus(deckId: string, key: string | null): Promise<FocusResult> {
  const userId = await requireUserId();
  // Before the id reaches a `uuid` column: a crafted argument would otherwise surface as a 22P02.
  if (!isUuid(deckId)) return { ok: false, reason: "not-found" };
  const focus = key === null ? null : parseStrategyKey(key);
  if (key !== null && focus === null) return { ok: false, reason: "invalid" };

  const owned = and(eq(decks.id, deckId), eq(decks.userId, userId));
  const [changed] = await db
    .update(decks)
    .set({ strategyFocus: focus })
    .where(and(owned, sql`${decks.strategyFocus} is distinct from ${focus}::text`))
    .returning({ id: decks.id });
  if (!changed) {
    // Nothing written: the deck already had this focus, or it is not the reader's.
    const [own] = await db.select({ id: decks.id }).from(decks).where(owned);
    if (!own) return { ok: false, reason: "not-found" };
    return { ok: true, focus };
  }

  // Deferred, as `declareBracket` does: revalidating in the action's own run would ship the whole deck page back as
  // its reply, and the caller already draws the pick it sent.
  after(() => {
    for (const path of deckSurfaces(deckId)) revalidatePath(path);
  });
  return { ok: true, focus };
}
