import type { Metadata } from "next";
import { AccountsList } from "../../../components/admin/accounts-list";
import { adminMetadata, requireAdmin } from "../../../lib/admin/access";
import { loadAccountsList } from "../../../lib/admin/account-page";

export const generateMetadata = (): Promise<Metadata> => adminMetadata<Metadata>({ title: "Accounts" });

/** `/admin/accounts`, the fourth tab (admin STATES A1 to A3; plan 9b). */
export default async function AdminAccountsPage() {
  const { env } = await requireAdmin();
  const list = await loadAccountsList();
  return <AccountsList rows={list.rows} clerk={list.clerk} month={list.month} env={env} />;
}
