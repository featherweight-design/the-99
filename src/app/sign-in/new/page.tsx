// /sign-in/new: the in-app sign-in (Small items 11, item 4: addenda A1 and A2; boards P1 to P8).
//
// Public in `src/proxy.ts`, unlinked and kept out of search until the cutover PR points `/sign-in` here; `/sign-in` itself is
// still Clerk's hosted page. A reader already signed in goes Home. `?google=refused` is the way back from Google with nothing
// to sign in to (`app/sso-callback`), drawn as G1's line under the Google press; `?google=code` is the way back to a real
// account that asks for a second factor, drawn as N2.

import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FLYER_MAIN } from "../../../components/join/newcomer-column";
import { SignInFlow } from "../../../components/sign-in/sign-in-flow";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { userId } = await auth();
  if (userId) redirect("/");
  const { google } = await searchParams;
  return (
    // A <main> of its own: signed out, the shell draws none (`Shell`).
    <main className={FLYER_MAIN}>
      <SignInFlow googleRefused={google === "refused"} googleCode={google === "code"} />
    </main>
  );
}
