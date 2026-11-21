// The new-deck screen's "Your picks": the synergy picks carried from the commander page in `?select=` (guided build, G9),
// drawn with a name, an image and whether the reader owns a copy. Read-only; `createDeck` still checks every id it is given.
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards, commanderScores } from "../../db/schema";
import { resolveOwnedPrintings } from "../collection/owned-printings";

export type SelectedPick = { oracleId: string; name: string; imageUri: string | null; owned: boolean };

/** The picks in the order asked for; an id the catalog does not hold is dropped. A failed owned read marks every pick unowned (`resolveOwnedPrintings`). */
export async function loadSelectedPicks(userId: string, oracleIds: string[]): Promise<SelectedPick[]> {
  if (oracleIds.length === 0) return [];
  const [rows, owned] = await Promise.all([
    db.select({ oracleId: cards.oracleId, name: cards.name, imageUri: cards.imageUri }).from(cards).where(inArray(cards.oracleId, oracleIds)),
    resolveOwnedPrintings(userId, oracleIds),
  ]);
  const byId = new Map(rows.map((r) => [r.oracleId, r]));
  return oracleIds.flatMap((id) => {
    const row = byId.get(id);
    if (!row) return [];
    const copy = owned.get(id);
    return [{ oracleId: id, name: copy?.printedName ?? row.name, imageUri: copy?.imageUri ?? row.imageUri, owned: copy !== undefined }];
  });
}

/**
 * The reader's own page for a commander (`/commanders/<slug>`), the picks block's "Change" link, or null when the commander has
 * no scored row for them (the link is then not drawn). Commander slugs are per reader (`commander_scores`).
 */
export async function commanderPageHref(userId: string, oracleId: string): Promise<string | null> {
  const [row] = await db
    .select({ slug: commanderScores.slug })
    .from(commanderScores)
    .where(and(eq(commanderScores.userId, userId), eq(commanderScores.oracleId, oracleId)))
    .limit(1)
    .catch(() => []);
  return row ? `/commanders/${row.slug}` : null;
}
