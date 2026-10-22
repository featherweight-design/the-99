"use server";

import { requireUserId } from "../../../../lib/auth";
import { requestSwitchEnv } from "../../../../lib/switches/request";
import { helpMeChooseEnabled } from "../../../../lib/intake/flag";
import { loadChooseHistory } from "../../../../lib/intake/history-read";
import type { ChooseHistoryPage } from "../../../../lib/intake/history";

/**
 * One page of the player's own past runs (Help me choose History), and the poll that re-reads the
 * first page while a run is in flight. Read only and scoped to the reader; the switch is re-checked
 * for them, since an action is reachable by anyone who can name it.
 */
export async function chooseHistoryPage(cursor: string | null = null): Promise<ChooseHistoryPage> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!helpMeChooseEnabled(env)) throw new Error("not found");
  return loadChooseHistory(userId, { cursor: typeof cursor === "string" ? cursor : null });
}
