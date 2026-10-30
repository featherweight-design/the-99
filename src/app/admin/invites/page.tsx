import type { Metadata } from "next";
import { FlyerCodes } from "../../../components/admin/flyer-codes";
import { InviteTreeView } from "../../../components/admin/invite-tree";
import { adminMetadata, requireAdmin } from "../../../lib/admin/access";
import { readFlyerCodes } from "../../../lib/admin/flyers";
import { flyersView } from "../../../lib/admin/flyers-rule";
import { loadInviteTree } from "../../../lib/admin/invite-tree";
import { adminCopy } from "../../../lib/copy/admin";
import { flyerTrialEnabled } from "../../../lib/flyer/flag";
import { requestSwitchEnv } from "../../../lib/switches/request";

export const generateMetadata = (): Promise<Metadata> => adminMetadata<Metadata>({ title: adminCopy.tabs.invites });

/**
 * `/admin/invites`, the sixth tab (invites plan PR 6b; handoff Admin M4): who invited whom, under the Flyer codes
 * section (flyer trial PR 4a), which the trial's switch decides for the admin reading it.
 */
export default async function AdminInvitesPage() {
  const { userId } = await requireAdmin();
  const showFlyers = flyerTrialEnabled(await requestSwitchEnv(userId));
  const [tree, flyers] = await Promise.all([loadInviteTree(), showFlyers ? readFlyerCodes(userId) : null]);
  return (
    <>
      {flyers && <FlyerCodes view={flyersView(flyers, new Date())} />}
      <InviteTreeView roots={tree.roots} accounts={tree.accounts} invited={tree.invited} waiting={tree.waiting} clerk={tree.clerk} />
    </>
  );
}
