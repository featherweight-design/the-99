"use server";

// The newcomer's three steps at `/join/<CODE>` for a flyer code (flyer trial PR 2a; PR 3 draws the page), and the launch list.
// The newcomer has no account, so each action finds the code's CREATOR (Hugh) and decides `FLYER_TRIAL_ENABLED` for
// THEM (`resolveSwitchEnv(creator)`); off reads as an ended code, which names nobody. What binds a claim to this
// browser is the claim secret in an httpOnly cookie scoped to the code's own path. The rate buckets (`flyer-claim`,
// `flyer-code`) are keyed by the creator, observe-only.

import { cookies, headers } from "next/headers";
import { confirmFlyerCode, findFlyerCode, handOverFlyer, startFlyerClaim, type ConfirmResult, type HandOverResult, type StartResult } from "../../lib/flyer/claim";
import { flyerTrialEnabled } from "../../lib/flyer/flag";
import { flyerCookieName, flyerCookieOptions } from "../../lib/flyer/cookie";
import { saveLaunchEmail } from "../../lib/flyer/launch-list";
import { atFloor } from "../../lib/invites/floor";
import { overAnonymousLimit } from "../../lib/rate/anon";
import { observeHit } from "../../lib/rate/observe";
import { resolveSwitchEnv } from "../../lib/switches/snapshot";

/** The code's creator when the trial is on for them; null when it is off or the code is nobody's. */
async function liveCreator(code: unknown): Promise<string | null> {
  if (typeof code !== "string") return null;
  const row = await findFlyerCode(code);
  if (!row) return null;
  return flyerTrialEnabled(await resolveSwitchEnv(row.createdBy)) ? row.createdBy : null;
}

const ENDED = { ok: false, reason: "ended" } as const;

/** What the page is told of a claim: never the claim secret, which only the cookie carries. */
export type FlyerClaimOutcome = { ok: true; mailed: boolean } | Exclude<StartResult, { ok: true }>;

export async function startFlyerClaimAction(code: unknown, email: unknown): Promise<FlyerClaimOutcome> {
  const creator = await liveCreator(code);
  if (!creator || typeof code !== "string") return ENDED;
  if (typeof email !== "string") return { ok: false, reason: "invalid" };
  await observeHit(creator, "flyer-claim");
  const jar = await cookies();
  // The same floor as the invite path, so the answer's speed tells nothing about the address.
  const result = await atFloor(() => startFlyerClaim(code, email, jar.get(flyerCookieName(code))?.value ?? null));
  if (result.ok) {
    jar.set(flyerCookieName(code), result.claimSecret, flyerCookieOptions());
    return { ok: true, mailed: result.mailed };
  }
  return result;
}

export async function confirmFlyerCodeAction(code: unknown, typed: unknown): Promise<ConfirmResult> {
  const creator = await liveCreator(code);
  if (!creator || typeof code !== "string") return ENDED;
  if (typeof typed !== "string") return { ok: false, reason: "wrong", triesLeft: 0 };
  await observeHit(creator, "flyer-code");
  const jar = await cookies();
  return confirmFlyerCode(code, typed, jar.get(flyerCookieName(code))?.value ?? null);
}

export async function handOverFlyerAction(code: unknown): Promise<HandOverResult> {
  const creator = await liveCreator(code);
  if (!creator || typeof code !== "string") return ENDED;
  const jar = await cookies();
  return handOverFlyer(code, jar.get(flyerCookieName(code))?.value ?? null);
}

/** What the page is told of a launch-list save: the field's own refusal, or that the trial has ended for good. */
export type LaunchListOutcome = { ok: true } | { ok: false; reason: "invalid" | "launched" | "throttled" };

/**
 * Leave an address on the launch list from a used-up, revoked or unknown flyer. A code that exists is judged by its
 * creator's switch: once the trial is off (public launch) the list has been emailed and takes no more. A code nobody
 * made is saved against no code, so a mistyped one answers as an ended one does.
 */
export async function saveLaunchListAction(code: unknown, email: unknown): Promise<LaunchListOutcome> {
  if (typeof code !== "string" || typeof email !== "string") return { ok: false, reason: "invalid" };
  // Per visitor, enforced: a stranger's write, with no account to count it under.
  if (await overAnonymousLimit(await headers(), "launch-list")) return { ok: false, reason: "throttled" };
  const row = await findFlyerCode(code);
  // A code nobody made has no creator: the app-wide switch decides, so a mistyped one after launch answers as an ended one.
  const env = await resolveSwitchEnv(row ? row.createdBy : null);
  if (!flyerTrialEnabled(env)) return { ok: false, reason: "launched" };
  return saveLaunchEmail(code, email);
}
