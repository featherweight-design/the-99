// /terms (launch epic B1): public in `src/proxy.ts`, one `LegalPage`. Signed in it is an article inside the shell (no tab lit);
// signed out it brings its own `<main>` and the legal header. Static text: `auth()` only picks the frame.

import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { LegalHeader } from "../../components/legal/legal-header";
import { LegalPage } from "../../components/legal/legal-page";
import { termsDoc } from "../../lib/copy/legal/terms";

export const metadata: Metadata = { title: termsDoc.title };

export default async function TermsRoute() {
  const { userId } = await auth();
  if (userId) return <LegalPage doc={termsDoc} />;
  return (
    <>
      <LegalHeader />
      <main className="flex flex-1 flex-col">
        <LegalPage doc={termsDoc} />
      </main>
    </>
  );
}
