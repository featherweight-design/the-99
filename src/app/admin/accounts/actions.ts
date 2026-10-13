"use server";

import { requireAdmin } from "../../../lib/admin/access";
import { moveAccount, type MoveResult } from "../../../lib/admin/group-writes";

// The Accounts page's one write (admin plan 9b): `Change group`. Every export calls `requireAdmin()` on
// its first line, so a stranger's press is the app's 404 (STATES D4); `actions.test.ts` reads every
// action module under src/app/admin and fails on an export that does not. The lib re-checks the ids.

/** Move an account into a group, between groups, or (`groupId` null) out of every group (STATES G7). */
export async function moveAccountToGroup(accountId: string, groupId: string | null, confirmed?: number): Promise<MoveResult> {
  const { userId } = await requireAdmin();
  const count = typeof confirmed === "number" && Number.isInteger(confirmed) ? confirmed : null;
  // `accountId` is the account moved, never the reader: the actor is the gate's own `userId`.
  return moveAccount(userId, typeof accountId === "string" ? accountId : "", groupId === null || typeof groupId === "string" ? groupId : "", count);
}
