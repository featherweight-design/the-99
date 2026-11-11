// /sso-callback: where Google hands a reader back to the in-app sign-in (Small items 11 A2, ruling 3 and G1).
//
// Public in `src/proxy.ts`: the reader has no session until this page finishes the sign-in. Kept out of search.

import type { Metadata } from "next";
import { FLYER_MAIN } from "../../components/join/newcomer-column";
import { SsoCallback } from "../../components/sign-in/sso-callback";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function SsoCallbackPage() {
  return (
    <main className={FLYER_MAIN}>
      <SsoCallback />
    </main>
  );
}
