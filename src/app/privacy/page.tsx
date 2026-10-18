// /privacy (launch epic B1): public in `src/proxy.ts`, one `LegalPage`. Signed in it is an article inside the shell (no tab lit);
// signed out it brings its own `<main>` and the legal header. Static text: `auth()` only picks the frame.

import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { LegalHeader } from "../../components/legal/legal-header";
import { LegalPage } from "../../components/legal/legal-page";
import { privacyDoc } from "../../lib/copy/legal/privacy";

export const metadata: Metadata = { title: privacyDoc.title };

export default async function PrivacyRoute() {
  const { userId } = await auth();
  if (userId) return <LegalPage doc={privacyDoc} />;
  return (
    <>
      <LegalHeader />
      <main className="flex flex-1 flex-col">
        <LegalPage doc={privacyDoc} />
      </main>
    </>
  );
}
