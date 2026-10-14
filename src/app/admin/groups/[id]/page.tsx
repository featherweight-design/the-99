import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GroupPageView } from "../../../../components/admin/group-page";
import { adminMetadata, requireAdmin } from "../../../../lib/admin/access";
import { adminCopy } from "../../../../lib/copy/admin";
import { loadGroupPage } from "../../../../lib/admin/groups";
import { isGroupId } from "../../../../lib/admin/groups-rule";

type Props = { params: Promise<{ id: string }> };

export const generateMetadata = (): Promise<Metadata> => adminMetadata<Metadata>({ title: adminCopy.tabs.groups });

/**
 * `/admin/groups/<id>`, one group's page (admin STATES G2, G4). The gate comes before the id is
 * checked, so a stranger learns nothing about which groups exist; an id that is not a uuid, or names
 * no group, is the app's 404.
 */
export default async function AdminGroupPage({ params }: Props) {
  const { userId } = await requireAdmin();
  const { id } = await params;
  if (!isGroupId(id)) notFound();
  const page = await loadGroupPage(id, userId);
  if (!page) notFound();
  return <GroupPageView page={page} />;
}
