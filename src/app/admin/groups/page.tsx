import type { Metadata } from "next";
import { GroupsList } from "../../../components/admin/groups-list";
import { adminMetadata, requireAdmin } from "../../../lib/admin/access";
import { adminCopy } from "../../../lib/copy/admin";
import { loadGroupsList } from "../../../lib/admin/groups";

export const generateMetadata = (): Promise<Metadata> => adminMetadata<Metadata>({ title: adminCopy.tabs.groups });

/** `/admin/groups`, the third tab (admin STATES G1, G5; plan 9a). */
export default async function AdminGroupsPage() {
  await requireAdmin();
  const list = await loadGroupsList();
  return <GroupsList cards={list.cards} count={list.count} meta={list.meta} clerk={list.clerk} />;
}
