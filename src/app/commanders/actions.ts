"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "../../lib/auth";
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
