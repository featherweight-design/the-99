// /sso-callback: where Google hands a reader back to the in-app sign-in (Small items 11 A2, ruling 3 and G1).
//
// Public in `src/proxy.ts`: the reader has no session until this page finishes the sign-in. Kept out of search. `?from=invite`
// marks the way back from the invitation's Google press (`/sign-up/new`, R2), the only one read as a sign-up.

import type { Metadata } from "next";
import { FLYER_MAIN } from "../../components/join/newcomer-column";
import { SSO_FROM_INVITE } from "../../components/sign-in/auth-parts";
import { SsoCallback } from "../../components/sign-in/sso-callback";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function SsoCallbackPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { from } = await searchParams;
  return (
    <main className={FLYER_MAIN}>
      <SsoCallback fromInvite={from === SSO_FROM_INVITE} />
    </main>
  );
}
