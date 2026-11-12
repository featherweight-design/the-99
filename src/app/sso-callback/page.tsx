// /sso-callback: where Google hands a reader back to the in-app sign-in (Small items 11 A2, ruling 3 and G1).
//
// Public in `src/proxy.ts`: the reader has no session until this page finishes the sign-in. Kept out of search. `?from=invite`
// marks the way back from the invitation's Google press (`/sign-up`, R2), the only one read as a sign-up, and a new
// account lands Home. The sign-in's own way back carries where it lands as `redirect_url`, checked here again rather than
// trusted, because anyone can write this address into a link.

import type { Metadata } from "next";
import { headers } from "next/headers";
import { FLYER_MAIN } from "../../components/join/newcomer-column";
import { SSO_FROM_INVITE } from "../../components/sign-in/sso-paths";
import { SsoCallback } from "../../components/sign-in/sso-callback";
import { HOME, requestHost, signInReturn } from "../../lib/auth/return-to";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function SsoCallbackPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const fromInvite = params.from === SSO_FROM_INVITE;
  const landing = fromInvite ? HOME : signInReturn(params, requestHost(await headers()));
  return (
    <main className={FLYER_MAIN}>
      <SsoCallback fromInvite={fromInvite} landing={landing} />
    </main>
  );
}
