import { modelOwnerUserId } from "../model/allowance";
import { listAccounts } from "./accounts";
import { inListOrder } from "./account-page";
import { readEveryInvite } from "./invites";
import { buildInviteTree, type InviteTree } from "./invite-tree-rule";

export type InviteTreePage = InviteTree & { clerk: "ok" | "down" };

/** M4, the Invites tab: Clerk's accounts and one read of every stock, open row and edge, as the tree. SERVER-ONLY. */
export async function loadInviteTree(now: Date = new Date()): Promise<InviteTreePage> {
  const [{ accounts, clerk }, every] = await Promise.all([listAccounts(), readEveryInvite()]);
  const ownerId = modelOwnerUserId();
  const tree = buildInviteTree({ accounts: inListOrder(accounts, ownerId), ownerId, ...every, now });
  return { ...tree, clerk };
}
