import type { Metadata } from "next";
import { FlyerCodes } from "../../../components/admin/flyer-codes";
import { InviteTreeView } from "../../../components/admin/invite-tree";
import { EmailPreviewCard } from "../../../components/admin/email-preview-card";
import { LaunchEmailCard } from "../../../components/admin/launch-email-card";
import { adminMetadata, requireAdmin } from "../../../lib/admin/access";
import { readFlyerCodes } from "../../../lib/admin/flyers";
import { flyersView } from "../../../lib/admin/flyers-rule";
import { loadGroupHeads } from "../../../lib/admin/groups";
import { loadInviteTree } from "../../../lib/admin/invite-tree";
import { adminCopy } from "../../../lib/copy/admin";
import { flyerTrialEnabled } from "../../../lib/flyer/flag";
import { requestFlags } from "../../../lib/flags/request";

// The launch email's Send next N runs here as a Server Action: up to 25 sends, each with an 8s timeout (`launch-rule.ts`).
export const maxDuration = 300;

export const generateMetadata = (): Promise<Metadata> => adminMetadata<Metadata>({ title: adminCopy.tabs.invites });

/**
 * `/admin/invites`, the sixth tab (invites plan PR 6b; handoff Admin M4): who invited whom, under the Flyer codes
 * section (flyer trial PR 4a), which the trial's switch decides for the admin reading it.
 */
export default async function AdminInvitesPage() {
  const { userId } = await requireAdmin();
  const showFlyers = flyerTrialEnabled(await requestFlags(userId));
  const [tree, flyers, groups] = await Promise.all([loadInviteTree(), showFlyers ? readFlyerCodes(userId) : null, showFlyers ? loadGroupHeads() : []]);
  return (
    <>
      {flyers && <FlyerCodes view={flyersView(flyers, new Date())} groups={groups.map((g) => ({ id: g.id, name: g.name })).sort((a, b) => a.name.localeCompare(b.name))} />}
      {/* Whatever the flyer switch says: at launch the trial is off and the list is still to be emailed. */}
      {/* The same padded column and 12px gap as the Flyer codes section above and the tree below. */}
      <div className="flex flex-col gap-[12px] px-[16px] pt-[16px] md:px-[28px] md:pt-[22px]">
        <LaunchEmailCard />
        <EmailPreviewCard />
      </div>
      <InviteTreeView roots={tree.roots} accounts={tree.accounts} invited={tree.invited} waiting={tree.waiting} clerk={tree.clerk} />
    </>
  );
}
