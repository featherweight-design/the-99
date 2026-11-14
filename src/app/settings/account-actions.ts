"use server";

// Account in Settings (handoff `design_handoff_the99_account_settings`, READINESS clarifications 1 and 5). Two writes on
// the reader's own Clerk account, each ENFORCED by its own rate rule. Neither names another account: a session id that
// is not the reader's is refused exactly as a missing one is, so the answer reveals nothing about it.
//
// The delete only asks Clerk to delete the user. Clerk's `user.deleted` webhook then runs `purgeAccount` (Stripe step 0
// cancels a plan, the purge erases every row, the sweep backstops a missed webhook), exactly as a delete from Clerk's
// hosted page did (`docs/agents/account-purge.md`).

import { auth, clerkClient, reverificationError } from "@clerk/nextjs/server";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { enforceHit } from "../../lib/rate/observe";
import { captureServerError } from "../../lib/sentry/capture";

/** Clerk's session ids: `sess_` and a base62 tail. Anything else is refused before Clerk is asked. */
const SESSION_ID = /^sess_[A-Za-z0-9]{10,64}$/;

/** Clerk's own rate limit answers 429; it reads to the reader as ours does. */
const clerkLimited = (err: unknown) => isClerkAPIResponseError(err) && err.status === 429;

export type DeleteAccountOutcome = { ok: true } | { ok: false; reason: "limited" | "failed" };

/**
 * Deletes the signed-in reader's account (clarification 1). The step-up comes first: without a strict re-verification
 * (Clerk's `strict`, a first factor within 10 minutes for an account without two-step) it returns Clerk's reverification
 * error, which `useReverification` on the client answers by drawing D2 and then calling this again. Only then is the
 * hit counted, so a step-up round trip costs one hit, not two.
 */
export async function deleteAccountAction(): Promise<DeleteAccountOutcome | ReturnType<typeof reverificationError>> {
  const { userId, has } = await auth();
  if (!userId) throw new Error("unauthenticated");
  if (!has({ reverification: "strict" })) return reverificationError("strict");
  if ((await enforceHit(userId, "account-delete")) !== null) return { ok: false, reason: "limited" };
  try {
    await (await clerkClient()).users.deleteUser(userId);
    return { ok: true };
  } catch (err) {
    if (clerkLimited(err)) return { ok: false, reason: "limited" };
    // A second press that raced the first finds the account already gone: that is the outcome asked for.
    if (isClerkAPIResponseError(err) && err.status === 404) return { ok: true };
    captureServerError("account-delete", err);
    return { ok: false, reason: "failed" };
  }
}

export type SignOutDeviceOutcome = { ok: true } | { ok: false; reason: "limited" | "failed" };

/**
 * Signs one of the reader's OTHER devices out (Devices row, Sign out). The session must belong to the reader and must not
 * be the one asking: this device signs out from the account menu. Any refusal of the session itself, a stranger's, an
 * unknown id or this device's, is the same `failed`, so the answer is not an oracle on other accounts' session ids.
 */
export async function signOutDeviceAction(sessionId: unknown): Promise<SignOutDeviceOutcome> {
  const { userId, sessionId: current } = await auth();
  if (!userId) throw new Error("unauthenticated");
  if (typeof sessionId !== "string" || !SESSION_ID.test(sessionId) || sessionId === current) return { ok: false, reason: "failed" };
  if ((await enforceHit(userId, "device-sign-out")) !== null) return { ok: false, reason: "limited" };
  try {
    const clerk = await clerkClient();
    // Only an id among the reader's OWN active sessions is revoked. Listing them, rather than fetching the asked-for id,
    // never touches another account's session at all, so no answer or timing can depend on one.
    // 500 is Clerk's page maximum; no honest account holds more active sessions than that.
    const own = await clerk.sessions.getSessionList({ userId, status: "active", limit: 500 });
    if (!own.data.some((s) => s.id === sessionId)) return { ok: false, reason: "failed" };
    await clerk.sessions.revokeSession(sessionId);
    return { ok: true };
  } catch (err) {
    if (clerkLimited(err)) return { ok: false, reason: "limited" };
    // Any other 4xx is Clerk refusing this session (it ended between the list and the revoke): not worth a report.
    if (!(isClerkAPIResponseError(err) && err.status >= 400 && err.status < 500)) captureServerError("device-sign-out", err);
    return { ok: false, reason: "failed" };
  }
}
