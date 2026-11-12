"use client";
// The way back from Google (Small items 11 A2, G1). A Google account that matches an account signs in to it (M2) and goes
// to `landing`, the page the sign-in was opened from; one that asks for a second factor goes to N2 (`?google=code`). Anything else (a Google account with no account
// behind it, which is Clerk's transferable sign-in, a refusal, a cancel or an error) returns to the sign-in with G1's line.
// The sign-in is never transferred to a sign-up: sign-up is by invitation only, and only from the invitation's own page.
// While it works the page is P1 with the Google press busy, as the reader left it (A1 M2).
//
// A sign-up Google made is the invitation's own (`/sign-up`, R2: the Google press there starts the sign-up with the ticket
// first), and only that press marks its way back (`?from=invite`, `fromInvite`). Without the mark the sign-up is never read,
// so a sign-up left on this browser by an earlier visit to the invitation, Google-verified or not, never takes a failed
// sign-in's way back. With it, a sign-up Google verified goes Home when complete and to Q6 (`?google=missing`) with something
// missing; anything else is G1.

import { useClerk, useSignIn, useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { SignInFlow } from "./sign-in-flow";
import { toLanding } from "./auth-parts";
import { HOME, withReturn } from "../../lib/auth/return-to";

export const GOOGLE_REFUSED = "/sign-in?google=refused";
/** A real account at a second factor (N2): the sign-in sends the emailed code on arrival. */
export const GOOGLE_CODE = "/sign-in?google=code";
/** A sign-up by invitation that Google left short of a name or a password (Q6). */
export const GOOGLE_MISSING = "/sign-up?google=missing";

export function SsoCallback({ fromInvite = false, landing = HOME }: {
  /** The way back from the invitation's Google press (`SSO_CALLBACK_INVITE`), not the sign-in's. */
  fromInvite?: boolean;
  /**
   * Where a sign-in lands, as the sign-in sent it (`redirect_url`) and `app/sso-callback` checked it again. The sign-in's
   * ways back (G1, N2) carry it too, so a sign-in finished there lands in the same place. The invitation's way back has none:
   * a new account lands Home.
   */
  landing?: string;
}) {
  const clerk = useClerk();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (!clerk.loaded || ran.current) return;
    ran.current = true;
    const refuse = () => router.replace(withReturn(GOOGLE_REFUSED, landing));
    void (async () => {
      const navigate = toLanding((url) => router.replace(url), landing);
      let finalize: () => Promise<{ error: unknown }>;
      // The invitation's way back reads its sign-up first, so a sign-in abandoned earlier on this browser at a second
      // factor never sends the invitee to N2.
      if (fromInvite && signUp.verifications?.externalAccount?.status === "verified") {
        if (signUp.status === "missing_requirements") return router.replace(GOOGLE_MISSING);
        if (signUp.status !== "complete") return refuse();
        finalize = () => signUp.finalize({ navigate });
      } else if (signIn.status === "needs_second_factor" || signIn.status === "needs_client_trust") return router.replace(withReturn(GOOGLE_CODE, landing));
      else if (signIn.status === "complete") finalize = () => signIn.finalize({ navigate });
      else return refuse();
      try {
        const { error } = await finalize();
        if (error) refuse();
      } catch {
        refuse();
      }
    })();
  }, [clerk.loaded, signIn, signUp, router, fromInvite, landing]);

  return (
    <>
      <SignInFlow googleReturning landing={landing} />
      {/* Clerk draws its bot check here when it asks for one. */}
      <div id="clerk-captcha" />
    </>
  );
}
