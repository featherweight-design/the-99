import type { Metadata } from "next";
import { adminMetadata, requireAdmin } from "../../lib/admin/access";

export const generateMetadata = (): Promise<Metadata> => adminMetadata<Metadata>({ title: "Costs" });

/**
 * `/admin` is Costs (the plan: Costs comes first). This PR ships the gate and the shell; the page's
 * tiles, trend and caps arrive with the Costs core, so for now the head stands alone.
 */
export default async function AdminCostsPage() {
  await requireAdmin();
  return null;
}
