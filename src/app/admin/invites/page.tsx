import type { Metadata } from "next";
import { InviteTreeView } from "../../../components/admin/invite-tree";
import { adminMetadata, requireAdmin } from "../../../lib/admin/access";
import { loadInviteTree } from "../../../lib/admin/invite-tree";
import { adminCopy } from "../../../lib/copy/admin";

export const generateMetadata = (): Promise<Metadata> => adminMetadata<Metadata>({ title: adminCopy.tabs.invites });

/** `/admin/invites`, the sixth tab (invites plan PR 6b; handoff Admin M4): who invited whom. */
export default async function AdminInvitesPage() {
  await requireAdmin();
  const tree = await loadInviteTree();
  return <InviteTreeView roots={tree.roots} accounts={tree.accounts} invited={tree.invited} waiting={tree.waiting} clerk={tree.clerk} />;
}
