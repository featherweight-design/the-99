// /sign-in: the in-app sign-in (Small items 11, item 4: addenda A1 and A2; boards P1 to P8).
//
// Public in `src/proxy.ts`, and kept out of search. Every way in reaches it: the public pages' links, a `<SignInButton>` and a
// protected page a stranger opens (Clerk's `signInUrl`, in `app/layout.tsx` and the proxy), each with the page to come back
// to as `redirect_url` (or a button's forced one, `sign_in_force_redirect_url`), which `signInReturn` keeps only when it is on
// this site. A reader already signed in goes there at once; it is decided here rather than in the proxy because only the page
// reads the destination. `?google=refused` is the way back from Google with nothing to sign in to (`app/sso-callback`), drawn
// as G1's line under the Google press; `?google=code` is the way back to a real account that asks for a second factor, drawn
// as N2.

import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { FLYER_MAIN } from "../../components/join/newcomer-column";
import { SignInFlow } from "../../components/sign-in/sign-in-flow";
import { requestHost, signInReturn } from "../../lib/auth/return-to";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const landing = signInReturn(params, requestHost(await headers()));
  const { userId } = await auth();
  if (userId) redirect(landing);
  return (
    // A <main> of its own: signed out, the shell draws none (`Shell`).
    <main className={FLYER_MAIN}>
      <SignInFlow landing={landing} googleRefused={params.google === "refused"} googleCode={params.google === "code"} />
    </main>
  );
}
