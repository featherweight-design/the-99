"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "../../lib/auth";
import { loadBuiltCommanderIds, loadNameMatches } from "../../lib/discovery/candidates";
import { classifyMatches, type ExcludedMatch } from "../../lib/discovery/excluded-match";
import { loadDiscoveryPool } from "../../lib/discovery/list";
import { deleteAllScores } from "../../lib/recs/store";

/**
 * Retry action for the commanders recommendations page.
 * Clears the user's persisted scores so the next render recomputes from scratch,
 * refetching any commander whose synergy data was missed during an EDHREC outage.
 * Deleting only the 'degraded' rows would leave a non-empty, non-degraded table —
 * the fast path — and those commanders would drop out of the list for good.
 * Submit via: <form action={retryRecs}><button type="submit">Retry</button></form>
 */
export async function retryRecs() {
  const userId = await requireUserId();
  await deleteAllScores(userId);
  revalidatePath("/commanders");
  // A recompute can reorder the list, and slugs carry rank-order dedup suffixes,
  // so cached detail pages go stale too.
  revalidatePath("/commanders/[slug]", "page");
}

/**
 * The commanders a name search matched that the SERVER removed from the list —
 * built, below the floor, below it only against this pool, or never measurable.
 *
 * It answers the one question the client cannot: those rows are absent from the
 * payload, so a search that finds nothing on screen cannot tell "nothing is
 * called that" from "it is here, and something is holding it back". Rows the
 * colour pips or the join mode removed are deliberately not its business — the
 * client holds them and can say so without asking.
 *
 * One request per SETTLED query, never per keystroke: it re-derives the free
 * pool, which is the same read the ranking does.
 *
 * Null when the query matches more names than the lookup classifies. The caller
 * reads it as the failed round trip reads its own: an unanswered question, and
 * nothing on screen may then claim to speak for the whole index.
 */
export async function findExcludedMatches(
  query: string,
  opts: { sort: "fit" | "new"; avail: "all" | "free" },
): Promise<ExcludedMatch[] | null> {
  const userId = await requireUserId();
  const trimmed = query.trim();
  // A one-character query matches most of the index and answers nothing worth a
  // round trip; an empty one is not a search at all.
  if (trimmed.length < 2) return [];

  const { collection, scored } = await loadDiscoveryPool(userId, opts.avail);
  const [matches, builtOracleIds] = await Promise.all([
    loadNameMatches(
      trimmed,
      scored.map((c) => c.oracleId),
      // The whole collection only when it is not the pool being scored, exactly
      // as `loadDiscovery` passes it: under `all` the two counts are the same
      // count and the second aggregate would re-derive the first.
      opts.avail === "free" ? collection.map((c) => c.oracleId) : undefined,
    ),
    loadBuiltCommanderIds(userId),
  ]);

  return matches === null ? null : classifyMatches(matches, { sort: opts.sort, builtOracleIds });
}
