"use client";
// The way back from Google (Small items 11 A2, G1). A Google account that matches an account signs in to it (M2) and goes
// Home; one that asks for a second factor goes to N2 (`?google=code`). Anything else (a Google account with no account
// behind it, which is Clerk's transferable sign-in, a refusal, a cancel or an error) returns to the sign-in with G1's line.
// The sign-in is never transferred to a sign-up: sign-up is by invitation only, and only from the invitation's own page.
// While it works the page is P1 with the Google press busy, as the reader left it (A1 M2).
//
// A sign-up Google made is the invitation's own (`/sign-up/new`, R2: the Google press there starts the sign-up with the ticket
// first), and only that press marks its way back (`?from=invite`, `fromInvite`). Without the mark the sign-up is never read,
// so a sign-up left on this browser by an earlier visit to the invitation, Google-verified or not, never takes a failed
// sign-in's way back. With it, a sign-up Google verified goes Home when complete and to Q6 (`?google=missing`) with something
// missing; anything else is G1.

import { useClerk, useSignIn, useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { SignInFlow } from "./sign-in-flow";
import { toHome } from "./auth-parts";

export const GOOGLE_REFUSED = "/sign-in/new?google=refused";
/** A real account at a second factor (N2): the sign-in sends the emailed code on arrival. */
export const GOOGLE_CODE = "/sign-in/new?google=code";
/** A sign-up by invitation that Google left short of a name or a password (Q6). */
export const GOOGLE_MISSING = "/sign-up/new?google=missing";

export function SsoCallback({ fromInvite = false }: {
  /** The way back from the invitation's Google press (`SSO_CALLBACK_INVITE`), not the sign-in's. */
  fromInvite?: boolean;
}) {
  const clerk = useClerk();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (!clerk.loaded || ran.current) return;
    ran.current = true;
    const refuse = () => router.replace(GOOGLE_REFUSED);
    void (async () => {
      if (signIn.status === "needs_second_factor" || signIn.status === "needs_client_trust") return router.replace(GOOGLE_CODE);
      const navigate = toHome((url) => router.replace(url));
      let finalize: () => Promise<{ error: unknown }>;
      if (signIn.status === "complete") finalize = () => signIn.finalize({ navigate });
      else if (fromInvite && signUp.verifications?.externalAccount?.status === "verified") {
        if (signUp.status === "missing_requirements") return router.replace(GOOGLE_MISSING);
        if (signUp.status !== "complete") return refuse();
        finalize = () => signUp.finalize({ navigate });
      } else return refuse();
      try {
        const { error } = await finalize();
        if (error) refuse();
      } catch {
        refuse();
      }
    })();
  }, [clerk.loaded, signIn, signUp, router, fromInvite]);

  return (
    <>
      <SignInFlow googleReturning />
      {/* Clerk draws its bot check here when it asks for one. */}
      <div id="clerk-captcha" />
    </>
  );
}
