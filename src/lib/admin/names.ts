import { adminCopy } from "../copy/admin";
import type { Account } from "./accounts";

/** An account as the admin's pages name it: its Clerk name, else its email, else its id. */
export const accountName = (a: Account) => a.name ?? a.email ?? a.id;

/**
 * How a page names the accounts an override or an event carries (the switch page's and the group
 * page's history): `userName` for any account id, and `actor` for who made a change, `You` when it
 * was the viewer. An id outside the universe reads as itself.
 */
export function accountNames(accounts: readonly Account[], viewerId: string) {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const userName = (id: string) => {
    const a = byId.get(id);
    return a ? accountName(a) : id;
  };
  const actor = (id: string) => (id === viewerId ? adminCopy.switch.history.you : userName(id));
  return { userName, actor };
}
