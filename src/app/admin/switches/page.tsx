import type { Metadata } from "next";
import { SwitchesList } from "../../../components/admin/switches-list";
import { adminMetadata, requireAdmin } from "../../../lib/admin/access";
import { loadSwitchesList } from "../../../lib/admin/switches";

export const generateMetadata = (): Promise<Metadata> => adminMetadata<Metadata>({ title: "Switches" });

/** `/admin/switches`, the second tab (admin STATES L1 to L6). Read only in this PR (admin plan 8a). */
export default async function AdminSwitchesPage() {
  const { env } = await requireAdmin();
  const list = await loadSwitchesList();
  return <SwitchesList rows={list.rows} total={list.total} env={env} overridesRead={list.overridesRead} clerk={list.clerk} />;
}
