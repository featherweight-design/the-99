import { adminCopy } from "../copy/admin";
import type { Account } from "./accounts";
import { unlistedAccount } from "./mask";

/** An account as the admin's pages name it: its masked name (Admin R3, D1). */
export const accountName = (a: Account) => a.name;

/**
 * How a page names the accounts an override or an event carries (the switch page's and the group
 * page's history): `userName` for any account id, and `actor` for who made a change, `You` when it
 * was the viewer. An id outside the universe reads as one Clerk holds no name for (`Account ·9xQe`).
 */
export function accountNames(accounts: readonly Account[], viewerId: string) {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const userName = (id: string) => {
    const a = byId.get(id);
    return accountName(a ?? unlistedAccount(id));
  };
  const actor = (id: string) => (id === viewerId ? adminCopy.switch.history.you : userName(id));
  return { userName, actor };
}
