"use server";

// The public landing page's "Tell me at launch" (plan `2026-11-08-public-landing-demo.md`, PR 1). The visitor has no
// account and no flyer: the address goes on the launch list against no code. It lives beside the other root-page actions
// (`welcome-actions.ts`, `tour-actions.ts`) because the landing is the signed-out branch of `/` (`page.tsx`).
//
// Its caller is the landing's launch panel, which receives it as a prop from the root page (`landing-entry.tsx`): the
// public surface may not import a server action, so the page hands it over.

import { headers } from "next/headers";
import { saveLaunchEmailNoCode } from "../lib/flyer/launch-list";
import { isEmailShape } from "../lib/invites/rules";
import { overAnonymousCeiling, overAnonymousLimit } from "../lib/rate/anon";

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
  // A malformed address is refused before the ceiling is counted, so it cannot fill everyone's allowance.
  if (!isEmailShape(email)) return { ok: false, reason: "invalid" };
  // Then the ceiling across every visitor (the anonymous-write rule): per-visitor cap first, so one noisy visitor cannot spend it.
  if (await overAnonymousCeiling("launch-list-all")) return { ok: false, reason: "throttled" };
  if (await overAnonymousCeiling("launch-list-all-day")) return { ok: false, reason: "throttled" };
  return saveLaunchEmailNoCode(email);
}
