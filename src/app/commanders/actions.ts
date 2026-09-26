"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "../../lib/auth";
import { isAvail, writeCommandersAvail } from "../../lib/commanders/avail-pref";
import { revalidateUserLists } from "../../lib/cache/user-lists";
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
  revalidateUserLists(userId);
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
 * One request per SETTLED query, never per keystroke: it re-derives the pool,
 * which is the same read the ranking does.
 *
 * Null when the query matches more names than the lookup classifies. The caller
 * reads it as the failed round trip reads its own: an unanswered question, and
 * nothing on screen may then claim to speak for the whole index.
 */
export async function findExcludedMatches(
  query: string,
  opts: { sort: "fit" | "new" },
): Promise<ExcludedMatch[] | null> {
  const userId = await requireUserId();
  const trimmed = query.trim();
  // A one-character query matches most of the index and answers nothing worth a
  // round trip; an empty one is not a search at all.
  if (trimmed.length < 2) return [];

  const { collection } = await loadDiscoveryPool(userId);
  const [matches, builtOracleIds] = await Promise.all([
    // One oracle-id set and no second aggregate, exactly as `loadDiscovery`
    // asks it: the lane scores the whole collection, so the two support counts
    // would be the same count.
    loadNameMatches(
      trimmed,
      collection.map((c) => c.oracleId),
    ),
    loadBuiltCommanderIds(userId),
  ]);

  return matches === null ? null : classifyMatches(matches, { sort: opts.sort, builtOracleIds });
}

/**
 * Remember the mode the reader just chose on `/commanders`, so the page opens in it next time its
 * URL names none (Hugh, 2026-09-27). Called on the reader's own flip or Clear (the chassis puts
 * the mode inside Clear's scope), never on a render-time climb-down, so only a choice is saved.
 *
 * The write runs IN the action, not in `after()`. Next runs a page's server actions one at a
 * time, so two quick flips write in the order they were made; two `after()` callbacks carry no
 * such order, and the older choice could land last. Nothing waits on the answer either way (the
 * view fires and forgets), and nothing is revalidated, since the page reads the mode fresh on
 * each request and a render in this action's run would only ship the page back in its reply. A
 * value that is not a mode is dropped at this boundary; the column's check refuses it too.
 */
export async function rememberCommandersAvail(avail: unknown): Promise<void> {
  if (!isAvail(avail)) return;
  const userId = await requireUserId();
  await writeCommandersAvail(userId, avail);
}
