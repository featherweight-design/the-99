// The back bar's one database read (About visual build, PR 6a): the name of the deck the ? was pressed on, for the
// reader's OWN deck only. A single-row select scoped to the owner by id, so another account's deck id reads nothing and
// the bar falls back to the section's name. No cross-user read (`src/lib/social/` holds those).

import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { decks } from "../../db/schema";
import { isUuid } from "../uuid";

export async function ownDeckName(userId: string, deckId: string | null): Promise<string | null> {
  if (!isUuid(deckId)) return null;
  const [row] = await db
    .select({ name: decks.name })
    .from(decks)
    .where(and(eq(decks.id, deckId as string), eq(decks.userId, userId)))
    .limit(1);
  return row?.name ?? null;
}
