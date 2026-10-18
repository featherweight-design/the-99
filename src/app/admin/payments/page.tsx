import type { Metadata } from "next";
import { PaymentsView } from "../../../components/admin/payments-view";
import { adminMetadata, requireAdmin } from "../../../lib/admin/access";
import { listAccounts } from "../../../lib/admin/accounts";
import { loadCosts } from "../../../lib/admin/costs";
import { monthOf, monthStart, parseMonth, shiftMonth } from "../../../lib/admin/costs-rule";
import { namesFor } from "../../../lib/admin/names";
import { adminCopy } from "../../../lib/copy/admin";
import { loadPaymentsMonth } from "../../../lib/payments/admin-read";

export const generateMetadata = (): Promise<Metadata> => adminMetadata<Metadata>({ title: adminCopy.tabs.payments });

/**
 * `/admin/payments` (admin plan A2b): a UTC month's revenue beside its model spend, the month's bought and gifted
 * lots, and Grant credits. `?month=YYYY-MM` steps back through months exactly as Costs does.
 */
export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<{ month?: string | string[] }> }) {
  await requireAdmin();
  const now = new Date();
  const raw = (await searchParams).month;
  const month = parseMonth(Array.isArray(raw) ? raw[0] : raw, now);
  const [payments, { summary }, { accounts, clerk }] = await Promise.all([
    loadPaymentsMonth(monthStart(month), monthStart(shiftMonth(month, 1))),
    // Spend is the Costs page's own figure for this environment; Anthropic's workspace read is not needed here.
    loadCosts(month, now, { workspace: false }),
    listAccounts(),
  ]);
  const ids = [...payments.grants.map((g) => g.userId), ...payments.gifts.flatMap((g) => [g.userId, g.actorId])];
  return (
    <PaymentsView
      month={month}
      current={monthOf(now)}
      payments={payments}
      spendMicro={summary.calls.micro}
      names={namesFor(ids, accounts)}
      accounts={accounts.map((a) => ({ id: a.id, name: a.name, email: a.email }))}
      clerk={clerk}
    />
  );
}
