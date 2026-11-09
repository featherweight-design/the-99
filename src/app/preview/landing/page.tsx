// /preview/landing: the signed-out landing exactly as `/` draws it (the same `landingTree`), for an admin to test before launch.
// Public in `src/proxy.ts` so a signed-out visitor reaches the page, which answers the app's 404 to anyone who is not an
// admin (`requireAdmin`), so nothing says the route exists. Shown whatever `PUBLIC_LANDING_ENABLED` says; the promises still
// NOT in robots.txt on purpose: a Disallow line would advertise an admin-only route. A non-admin gets a 404 and an admin gets
// noindex, nofollow, so nothing can be crawled or indexed anyway.
// read `resolveFlags(null)`, so it shows what the public would get. The launch form is a no-op action, and a banner says so.

import type { Metadata } from "next";
import { adminMetadata, requireAdmin } from "../../../lib/admin/access";
import { landingCopy } from "../../../lib/copy/landing";
import { resolveFlags } from "../../../lib/flags/snapshot";
import { landingTree } from "../../landing-entry";
import { previewLaunchEmailAction } from "./actions";

// Gated like the render: a stranger's 404 carries the root's metadata alone. No canonical, no Open Graph.
export const generateMetadata = (): Promise<Metadata> =>
  adminMetadata<Metadata>({ title: "The 99 landing preview", robots: { index: false, follow: false } });

export default async function LandingPreviewPage() {
  await requireAdmin();
  const landing = await landingTree(await resolveFlags(null), previewLaunchEmailAction);
  return (
    <>
      <p className="border-b-[1px] border-b-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-center text-[13px] text-[color:var(--fg-muted)]">
        {landingCopy.preview.note}
      </p>
      {landing}
    </>
  );
}
