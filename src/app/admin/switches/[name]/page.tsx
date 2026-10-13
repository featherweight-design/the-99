import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SwitchPageView } from "../../../../components/admin/switch-page";
import { adminMetadata, requireAdmin } from "../../../../lib/admin/access";
import { loadSwitchPage } from "../../../../lib/admin/switches";
import { switchCopy } from "../../../../lib/copy/admin";
import { isSwitchName } from "../../../../lib/switches/registry";

type Props = { params: Promise<{ name: string }>; searchParams: Promise<{ account?: string | string[] }> };

const titleOf = (name: string) => (isSwitchName(name) ? switchCopy[name].label : "Switches");

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => adminMetadata<Metadata>({ title: titleOf((await params).name) });

/**
 * `/admin/switches/<VARIABLE>`, one switch's page (admin STATES F1 to F13). Read only in this PR
 * (admin plan 8b). The gate comes before the name is checked, so a stranger learns nothing about
 * which names exist. `?account=` preselects Check an account; an id outside the universe selects
 * nothing.
 */
export default async function AdminSwitchPage({ params, searchParams }: Props) {
  const { userId } = await requireAdmin();
  const { name } = await params;
  if (!isSwitchName(name)) notFound();
  const raw = (await searchParams).account;
  const { page, overridesRead, clerk } = await loadSwitchPage(name, userId);
  const account = Array.isArray(raw) ? raw[0] : raw;
  return (
    <SwitchPageView
      page={page}
      overridesRead={overridesRead}
      clerk={clerk}
      account={page.explanations.some((e) => e.id === account) ? account! : null}
    />
  );
}
