import type { Metadata } from "next";
import { ModelsView } from "../../../components/admin/models-view";
import { adminMetadata, requireAdmin } from "../../../lib/admin/access";
import { adminCopy } from "../../../lib/copy/admin";
import { utcMonthName } from "../../../lib/admin/account-page-rule";
import { loadCosts } from "../../../lib/admin/costs";
import { monthOf } from "../../../lib/admin/costs-rule";
import { readJobValues } from "../../../lib/admin/github-variables";
import { MODEL_ROWS, rowSpend } from "../../../lib/admin/models";

export const generateMetadata = (): Promise<Metadata> => adminMetadata<Metadata>({ title: adminCopy.tabs.models });

/**
 * `/admin/models`, the fifth tab (admin STATES M1, M2; plan PR 10). Read only. The spend is the
 * Costs page's own detail for this UTC month (`loadCosts`), and the job switches are GitHub's
 * repository variables, read server-side; without a token they draw M2.
 */
export default async function AdminModelsPage() {
  const { userId, env } = await requireAdmin();
  const now = new Date();
  const [{ detail }, jobs] = await Promise.all([loadCosts(monthOf(now), userId, now), readJobValues()]);
  const rows = MODEL_ROWS.map((def) => ({ ...def, ...rowSpend(def, detail) }));
  return <ModelsView rows={rows} jobs={jobs} month={utcMonthName(now)} env={env} />;
}
