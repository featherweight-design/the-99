import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FlyerFit } from "../../../../../components/admin/flyer-fit";
import { FlyerPrintBar } from "../../../../../components/admin/flyer-print-bar";
import { FlyerSheet } from "../../../../../components/admin/flyer-sheet";
import { adminMetadata, requireAdmin } from "../../../../../lib/admin/access";
import { fmtDay } from "../../../../../lib/admin/invites-rule";
import { adminCopy } from "../../../../../lib/copy/admin";
import { findFlyerCode } from "../../../../../lib/flyer/claim";
import { flyerTrialEnabled } from "../../../../../lib/flyer/flag";
import { flyerJoinUrl, flyerPrintable, flyerQr } from "../../../../../lib/flyer/print-rule";
import { siteOrigin } from "../../../../../lib/public/site-origin";
import { requestSwitchEnv } from "../../../../../lib/switches/request";
import "./print.css";

export const generateMetadata = (): Promise<Metadata> => adminMetadata<Metadata>({ title: adminCopy.tabs.invites });

/**
 * `/admin/invites/flyers/[code]` (flyer trial PR 4c; board `Print.dc.html`): a live code's flyer at letter size with the QR
 * drawn here on the server from `https://<site>/join/<CODE>`. The gate first (a stranger gets the app's 404), then the
 * trial's switch as the section's own; an unknown or malformed code is the same 404. A revoked code still opens (small
 * items 7, `Print-Revoked.dc.html`: an old link or Back lands here): its bar says when it was revoked and offers no Print
 * or Download QR, the flyer shows dimmed, and `@media print` hides it.
 */
export default async function FlyerPrintPage({ params }: { params: Promise<{ code: string }> }) {
  const { userId } = await requireAdmin();
  if (!flyerTrialEnabled(await requestSwitchEnv(userId))) notFound();
  const { code: raw } = await params;
  const row = await findFlyerCode(raw);
  if (!row) notFound();
  const revoked = !flyerPrintable(row) && row.revokedAt ? fmtDay(row.revokedAt) : null;
  const url = flyerJoinUrl(siteOrigin(), row.code);
  const qr = flyerQr(url);
  return (
    <div className="flyer-print-page" data-testid="flyer-print-page">
      <FlyerPrintBar store={row.label} code={row.code} qr={qr} revoked={revoked} />
      <FlyerFit dimmed={revoked !== null}>
        <FlyerSheet url={url} qr={qr} />
      </FlyerFit>
    </div>
  );
}
