"use client";
// The way back from Google (Small items 11 A2, G1). A Google account that matches an account signs in to it (M2) and goes
// Home; one that asks for a second factor goes to N2 (`?google=code`). Anything else (a Google account with no account
// behind it, which is Clerk's transferable sign-in, a refusal, a cancel or an error) returns to the sign-in with G1's line.
// The sign-in is never transferred to a sign-up: sign-up is by invitation only, and only from the invitation's own page.
// While it works the page is P1 with the Google press busy, as the reader left it (A1 M2).

import { useClerk, useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { SignInFlow } from "./sign-in-flow";

export const GOOGLE_REFUSED = "/sign-in/new?google=refused";
/** A real account at a second factor (N2): the sign-in sends the emailed code on arrival. */
export const GOOGLE_CODE = "/sign-in/new?google=code";

export function SsoCallback() {
  const clerk = useClerk();
  const { signIn } = useSignIn();
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (!clerk.loaded || ran.current) return;
    ran.current = true;
    const refuse = () => router.replace(GOOGLE_REFUSED);
    void (async () => {
      if (signIn.status === "needs_second_factor" || signIn.status === "needs_client_trust") return router.replace(GOOGLE_CODE);
      if (signIn.status !== "complete") return refuse();
      try {
        const { error } = await signIn.finalize({
          navigate: ({ decorateUrl }) => {
            const url = decorateUrl("/");
            if (url.startsWith("http")) window.location.href = url;
            else router.replace(url);
          },
        });
        if (error) refuse();
      } catch {
        refuse();
      }
    })();
  }, [clerk.loaded, signIn, router]);

  return (
    <>
      <SignInFlow googleReturning />
      {/* Clerk draws its bot check here when it asks for one. */}
      <div id="clerk-captcha" />
    </>
  );
}
