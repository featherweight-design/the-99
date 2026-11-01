import type { Metadata } from "next";
import { DeletedGroupToast } from "../../../components/admin/deleted-group-toast";
import { GroupsList } from "../../../components/admin/groups-list";
import { deletedParam } from "../../../lib/admin/groups-rule";
import { adminMetadata, requireAdmin } from "../../../lib/admin/access";
import { adminCopy } from "../../../lib/copy/admin";
import { loadGroupsList } from "../../../lib/admin/groups";

export const generateMetadata = (): Promise<Metadata> => adminMetadata<Metadata>({ title: adminCopy.tabs.groups });

/** `/admin/groups`, the third tab (admin STATES G1, G5; plan 9a). */
export default async function AdminGroupsPage({ searchParams }: { searchParams: Promise<{ deleted?: string | string[] }> }) {
  await requireAdmin();
  const [list, params] = await Promise.all([loadGroupsList(), searchParams]);
  return (
    <>
      <GroupsList cards={list.cards} count={list.count} meta={list.meta} clerk={list.clerk} />
      {/* A landed delete's toast (small items 9, item 7). */}
      <DeletedGroupToast name={deletedParam(params.deleted)} />
    </>
  );
}
