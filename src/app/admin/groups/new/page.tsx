import type { Metadata } from "next";
import { GroupPageView } from "../../../../components/admin/group-page";
import { adminMetadata, requireAdmin } from "../../../../lib/admin/access";
import { loadGroupPage } from "../../../../lib/admin/groups";

export const generateMetadata = (): Promise<Metadata> => adminMetadata<Metadata>({ title: "New group" });

/** `/admin/groups/new` (admin STATES G3): the editor with empty fields and no members; Create saves. */
export default async function AdminNewGroupPage() {
  const { userId } = await requireAdmin();
  const page = await loadGroupPage(null, userId);
  return <GroupPageView page={page!} />;
}
