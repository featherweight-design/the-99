import type { Metadata } from "next";
import { CostsView } from "../../components/admin/costs-view";
import { adminMetadata, requireAdmin } from "../../lib/admin/access";
import { adminCopy } from "../../lib/copy/admin";
import { listAccounts } from "../../lib/admin/accounts";
import { loadCosts } from "../../lib/admin/costs";
import { namesFor } from "../../lib/admin/names";
import { adminEnvironment } from "../../lib/admin/environment";
import { monthOf, parseMonth } from "../../lib/admin/costs-rule";

export const generateMetadata = (): Promise<Metadata> => adminMetadata<Metadata>({ title: adminCopy.tabs.costs });

/**
 * `/admin` is Costs (the plan: Costs comes first). `?month=YYYY-MM` steps back through UTC months;
 * anything else, or a month still to come, reads as the current one.
 */
export default async function AdminCostsPage({ searchParams }: { searchParams: Promise<{ month?: string | string[] }> }) {
  const { userId } = await requireAdmin();
  const now = new Date();
  const raw = (await searchParams).month;
  const month = parseMonth(Array.isArray(raw) ? raw[0] : raw, now);
  const [{ summary, detail }, { accounts }] = await Promise.all([loadCosts(month, now), listAccounts()]);
  // Every account the page draws is named masked (Admin R3, C5): the per-account rows. The typed elsewhere figure,
  // and with it who entered one, is retired: Anthropic's cost report gives elsewhere now.
  const names = namesFor(detail.accounts.map((a) => a.userId), accounts);
  return <CostsView s={summary} detail={detail} names={names} env={adminEnvironment() ?? undefined} month={month} current={monthOf(now)} viewerId={userId} />;
}
