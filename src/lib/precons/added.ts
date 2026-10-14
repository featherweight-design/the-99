/**
 * Whether a player has added a precon to their collection, read from the ledger: the add's entry
 * carries `precon:<file>` as its source (`add.ts`). Its own module, so a page that only asks the
 * question does not import the write path.
 */
import { and, eq, isNotNull, like, sql } from "drizzle-orm";
import { db } from "../../db";
import { collectionHistory } from "../../db/schema";

const PREFIX = "precon:";
export const preconSource = (fileName: string) => `${PREFIX}${fileName}`;

type LedgerLink = { id: string; revertedBy: string | null };

/**
 * The entries whose effect stands. An entry stands while nothing reverted it, or while the revert
 * that did has itself been reverted, and so on up the chain: add, revert, revert leaves the add's
 * cards in the collection though the add still carries `reverted_by`. Pure; `links` holds every
 * entry the chains pass through (a revert missing from it stands).
 */
export function standingIds(links: readonly LedgerLink[]): Set<string> {
  const by = new Map(links.map((l) => [l.id, l.revertedBy]));
  const memo = new Map<string, boolean>();
  const stands = (id: string): boolean => {
    const known = memo.get(id);
    if (known !== undefined) return known;
    // A chain is finite and acyclic (each entry is reverted at most once, by a later entry), so walk
    // it to its end and fold back: each revert flips the one below it.
    const chain: string[] = [];
    let at: string | null | undefined = id;
    while (at && !memo.has(at)) { chain.push(at); at = by.get(at) ?? null; }
    let s = at ? !memo.get(at) : true;
    for (let i = chain.length - 1; i >= 0; i--) {
      memo.set(chain[i], s);
      s = !s;
    }
    return memo.get(id) ?? true;
  };
  return new Set(links.filter((l) => stands(l.id)).map((l) => l.id));
}

export type StandingPreconAdd = { id: string; fileName: string; createdAt: Date };

type Holding = { tokenOracleId: string; quantity: number; printings?: { tokenPrintingId: string; quantity: number }[] };

/**
 * The player's precon adds whose cards still stand, oldest first, for one precon or every one. With
 * `withTokens`, each carries the tokens it read (`precon_tokens`, 0117: ask only where that has run).
 */
export async function standingPreconAdds(
  userId: string,
  runner: Pick<typeof db, "select">,
  opts: { fileName?: string; withTokens?: boolean } = {},
): Promise<(StandingPreconAdd & { tokens: Holding[] })[]> {
  const { fileName, withTokens } = opts;
  const adds = await runner
    .select({
      id: collectionHistory.id, source: collectionHistory.source, createdAt: collectionHistory.createdAt, revertedBy: collectionHistory.revertedBy,
      tokens: withTokens ? collectionHistory.preconTokens : sql<null>`null`,
    })
    .from(collectionHistory)
    .where(and(
      eq(collectionHistory.userId, userId),
      eq(collectionHistory.kind, "add"),
      fileName === undefined ? like(collectionHistory.source, `${PREFIX}%`) : eq(collectionHistory.source, preconSource(fileName)),
    ));
  if (adds.length === 0) return [];
  // Only a revert that was itself reverted can flip anything: one nobody reverted stands, as absent.
  const reverts = adds.some((a) => a.revertedBy !== null)
    ? await runner.select({ id: collectionHistory.id, revertedBy: collectionHistory.revertedBy }).from(collectionHistory)
      .where(and(eq(collectionHistory.userId, userId), eq(collectionHistory.kind, "revert"), isNotNull(collectionHistory.revertedBy)))
    : [];
  const standing = standingIds([...adds, ...reverts]);
  return adds
    .filter((a) => standing.has(a.id) && a.source !== null)
    .map((a) => ({ id: a.id, fileName: a.source!.slice(PREFIX.length), createdAt: a.createdAt, tokens: a.tokens ?? [] }))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || (a.id < b.id ? -1 : 1));
}

/** The newest add of this precon whose cards still stand, as an ISO date, or null. */
export async function preconAddedOn(userId: string, fileName: string, runner: Pick<typeof db, "select"> = db): Promise<string | null> {
  const adds = await standingPreconAdds(userId, runner, { fileName });
  return adds.length > 0 ? adds[adds.length - 1].createdAt.toISOString() : null;
}
