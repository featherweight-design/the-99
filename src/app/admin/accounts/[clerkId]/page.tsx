import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountPageView } from "../../../../components/admin/account-page";
import { adminMetadata, requireAdmin } from "../../../../lib/admin/access";
import { loadAccountPage } from "../../../../lib/admin/account-page";

type Props = { params: Promise<{ clerkId: string }> };

export const generateMetadata = (): Promise<Metadata> => adminMetadata<Metadata>({ title: "Accounts" });

/**
 * `/admin/accounts/<clerkId>`, one account's page (admin STATES A4 to A7). The gate comes before the id
 * is read, so a stranger learns nothing about which accounts exist; an id this environment knows nothing
 * about is the app's 404.
 */
export default async function AdminAccountPage({ params }: Props) {
  await requireAdmin();
  const { clerkId } = await params;
  const page = await loadAccountPage(clerkId);
  if (!page) notFound();
  return <AccountPageView page={page} />;
}
