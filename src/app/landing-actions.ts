"use server";

// The public landing page's "Tell me at launch" (plan `2026-11-08-public-landing-demo.md`, PR 1). The visitor has no
// account and no flyer: the address goes on the launch list against no code. It lives beside the other root-page actions
// (`welcome-actions.ts`, `tour-actions.ts`) because the landing is the signed-out branch of `/` (`page.tsx`).
//
// NO CALLER YET: the landing page (PR 4) is the first. Until a client component imports it, Next leaves it out of the
// action manifest, so no request can reach it.

import { headers } from "next/headers";
import { saveLaunchEmailNoCode } from "../lib/flyer/launch-list";
import { overAnonymousLimit } from "../lib/rate/anon";

/**
 * What the page is told: saved, or the field's own refusal, or too many tries. `saveLaunchListAction`'s outcomes less
 * `launched`: that one answers the flyer trial's switch, which this path does not read.
 */
export type LandingLaunchOutcome = { ok: true } | { ok: false; reason: "invalid" | "throttled" };

/**
 * Leave an address on the launch list from the landing page. Per visitor and ENFORCED (the `launch-list` bucket, as the
 * flyer path): a stranger's write with no account to count it under. An address already on the list answers `ok` like a
 * new one (the store's insert does nothing on a conflict), so the page never says whether an address is listed.
 * Not gated on `FLYER_TRIAL_ENABLED`, which is off in production and decides the flyer's own list only.
 */
export async function saveLandingLaunchEmailAction(email: unknown): Promise<LandingLaunchOutcome> {
  if (typeof email !== "string") return { ok: false, reason: "invalid" };
  if (await overAnonymousLimit(await headers(), "launch-list")) return { ok: false, reason: "throttled" };
  return saveLaunchEmailNoCode(email);
}
