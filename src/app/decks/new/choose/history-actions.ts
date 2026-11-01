"use server";

import { requireUserId } from "../../../../lib/auth";
import { choosePath } from "../../../../lib/commanders/place-paths";
import { loadChooseHistory } from "../../../../lib/intake/history-read";
import type { ChooseHistoryPage } from "../../../../lib/intake/history";

/**
 * One page of the player's own past runs (Help me choose History), and the poll that re-reads the
 * first page while a run is in flight. Read only and scoped to the reader (Help me choose's switch is
 * retired, always on), since an action is reachable by anyone who can name it.
 */
export async function chooseHistoryPage(cursor: string | null = null): Promise<ChooseHistoryPage> {
  const userId = await requireUserId();
  return loadChooseHistory(userId, { path: choosePath(true), cursor: typeof cursor === "string" ? cursor : null });
}
