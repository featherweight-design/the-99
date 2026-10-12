import type { Metadata } from "next";
import { CostsView } from "../../components/admin/costs-view";
import { adminMetadata, requireAdmin } from "../../lib/admin/access";
import { loadCosts } from "../../lib/admin/costs";
import { monthOf, parseMonth } from "../../lib/admin/costs-rule";

export const generateMetadata = (): Promise<Metadata> => adminMetadata<Metadata>({ title: "Costs" });

/**
 * `/admin` is Costs (the plan: Costs comes first). `?month=YYYY-MM` steps back through UTC months;
 * anything else, or a month still to come, reads as the current one.
 */
export default async function AdminCostsPage({ searchParams }: { searchParams: Promise<{ month?: string | string[] }> }) {
  const { userId } = await requireAdmin();
  const now = new Date();
  const raw = (await searchParams).month;
  const month = parseMonth(Array.isArray(raw) ? raw[0] : raw, now);
  const summary = await loadCosts(month, userId, now);
  return <CostsView s={summary} month={month} current={monthOf(now)} viewerId={userId} />;
}
