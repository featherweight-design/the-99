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

import { captureClientError } from "../../lib/sentry/capture-client";
import { useClerk, useSignIn, useSignUp } from "@clerk/nextjs";
import * as Sentry from "@sentry/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { SignInFlow } from "./sign-in-flow";
import { toLanding } from "./auth-parts";
import { HOME, withReturn } from "../../lib/auth/return-to";

export const GOOGLE_REFUSED = "/sign-in?google=refused";
/** A real account at a second factor (N2): the sign-in sends the emailed code on arrival. */
export const GOOGLE_CODE = "/sign-in?google=code";
/** A sign-up by invitation that Google left short of a name or a password (Q6). */
export const GOOGLE_MISSING = "/sign-up?google=missing";
/**
 * How long each step of the way back may take before it gives up and refuses, so a reader is never left on "Signing in…".
 * Nothing in it has a deadline of its own: `clerk.loaded` waits on Clerk's script, and Clerk's protect step waits on Clerk's
 * UI bundle and then on a challenge dialog that resolves only when passed or failed. The protect step's deadline is long,
 * since a real person may be solving that challenge.
 */
export const SSO_STEP_TIMEOUT_MS = { load: 20_000, protect: 120_000, finalize: 20_000 } as const;
type Step = keyof typeof SSO_STEP_TIMEOUT_MS;
/** The Sentry tag for a way back that timed out, by the step it was stuck at. */
export type SsoStuckAt = `sso-callback-${Step}-timeout`;
type RefusedBranch = "signin-state" | "invite-signup-state" | "finalize-error" | "finalize-threw";

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
  // Whether the way back has answered (a landing, a way back to the sign-in, or a refusal): a step that settles later does
  // nothing more.
  const ended = useRef(false);
  // This render's sign-in and sign-up, for the refusal: Clerk hands a NEW object to the next render when it updates, so the
  // refusal's report and its reset read the latest. (The branch below reads the objects its step started with, as it always
  // has: the protect step settles the resource those objects wrap.)
  const latest = useRef({ signIn, signUp, router, landing });
  useEffect(() => {
    latest.current = { signIn, signUp, router, landing };
  });

  // The one refusal: G1, after clearing the attempt Google left (a refused Google account comes back `transferable` with an
  // id, and Clerk's `sso()` would then skip the next press's fresh attempt). `reset()` makes no API call.
  const refuse = useCallback((branch: RefusedBranch | null) => {
    if (ended.current) return;
    ended.current = true;
    const { signIn: si, signUp: su, router: r, landing: to } = latest.current;
    // Clerk's own status words only (enums: never an address, a name or an id), so production shows which branch turns a
    // reader away. The protect-step refusals report their own tags.
    if (branch) {
      Sentry.captureMessage("sso-callback-refused", {
        level: "info",
        tags: {
          site: "sso-callback-refused",
          branch,
          signInStatus: String(si.status ?? "none"),
          firstFactor: String(si.firstFactorVerification?.status ?? "none"),
          signUpStatus: String(su.status ?? "none"),
        },
      });
    }
    void si.reset().catch((e) => captureClientError("sign-in.sso-reset", e));
    r.replace(withReturn(GOOGLE_REFUSED, to));
  }, []);

  // The watchdog: one deadline per step, from the first paint (not gated on `clerk.loaded`, so a Clerk that never loads is
  // covered too). `step` moves it on; the step it times out at is the report's tag.
  const [step, setStep] = useState<Step>("load");
  useEffect(() => {
    const timer = setTimeout(() => {
      if (ended.current) return;
      const tag: SsoStuckAt = `sso-callback-${step}-timeout`;
      Sentry.captureException(new Error(tag), { tags: { site: tag } });
      refuse(null);
    }, SSO_STEP_TIMEOUT_MS[step]);
    return () => clearTimeout(timer);
  }, [step, refuse]);

  useEffect(() => {
    if (!clerk.loaded || ran.current || ended.current) return;
    ran.current = true;
    const go = (url: string) => {
      if (ended.current) return;
      ended.current = true;
      router.replace(url);
    };
    void (async () => {
      // Clerk's challenge for suspicious sign-ups can be pending when Google sends the reader back, and it is drawn here:
      // the state below is not final until it passes (clerk.com/docs/nextjs/guides/development/custom-flows/authentication/
      // bot-sign-up-protection). Clerk's own `<HandleSSOCallback />` runs this same step, but it also transfers a sign-in
      // into a sign-up, which the invitation-only rule forbids, and it cannot carry the invitation's, second factor's or
      // missing-fields ways back; so this callback stays and takes the one step. The server enforces the challenge, so a
      // missing or failing call fails closed (the reader is refused) and never lets a bot through. It is an `__internal_`
      // function: `sso-callback-protect.test.ts` fails if a Clerk bump drops it, and a miss at runtime is reported.
      // Two fixed tags (nothing of the error or the reader travels): `missing` is a Clerk change and the one to alert on;
      // `failed` is also a reader who failed or left the challenge, so it is a count to read rather than an alarm.
      const resolveProtect = clerk.__internal_resolvePendingProtectCheck;
      if (!resolveProtect) {
        Sentry.captureException(new Error("sso-callback-protect-missing"), { tags: { site: "sso-callback-protect-missing" } });
        return refuse(null);
      }
      setStep("protect");
      try {
        await resolveProtect.call(clerk, fromInvite ? "signUp" : "signIn");
      } catch (e) {
        if (ended.current) return;
        // One event under the existing tag, now with the error class and frames.
        captureClientError("sso-callback-protect-failed", e);
        return refuse(null);
      }
      if (ended.current) return;
      setStep("finalize");
      // A finalized session always lands, even after the watchdog gave up: a reader who is signed in is never left on G1.
      const navigate = toLanding((url) => {
        ended.current = true;
        router.replace(url);
      }, landing);
      let finalize: () => Promise<{ error: unknown }>;
      // The invitation's way back reads its sign-up first, so a sign-in abandoned earlier on this browser at a second
      // factor never sends the invitee to N2.
      if (fromInvite && signUp.verifications?.externalAccount?.status === "verified") {
        if (signUp.status === "missing_requirements") return go(GOOGLE_MISSING);
        if (signUp.status !== "complete") return refuse("invite-signup-state");
        finalize = () => signUp.finalize({ navigate });
      } else if (signIn.status === "needs_second_factor" || signIn.status === "needs_client_trust") return go(withReturn(GOOGLE_CODE, landing));
      else if (signIn.status === "complete") finalize = () => signIn.finalize({ navigate });
      else return refuse("signin-state");
      try {
        const { error } = await finalize();
        if (error) refuse("finalize-error");
        // Finalized: the landing (or a task's full load) is on its way, so the watchdog stands down.
        else ended.current = true;
      } catch (e) {
        captureClientError("sign-in.sso-finalize", e);
        refuse("finalize-threw");
      }
    })();
  }, [clerk.loaded, signIn, signUp, router, fromInvite, landing, refuse, clerk]);

  return <SignInFlow googleReturning landing={landing} />;
}
