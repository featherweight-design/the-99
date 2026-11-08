import { headers } from "next/headers";
import type { ReactElement } from "react";
import { Landing } from "../components/landing/landing";
import { resolveFlags } from "../lib/flags/snapshot";
import { publicLandingEnabled } from "../lib/public/flag";
import { readLandingCommanders } from "../lib/public/landing-commanders";
import { readLandingStats } from "../lib/public/landing-stats";
import { observeAnonymousHit } from "../lib/rate/anon";
import { saveLandingLaunchEmailAction } from "./landing-actions";

/**
 * The signed-out branch of `/` (public landing PR 4a): the landing when `PUBLIC_LANDING_ENABLED` is on, or null, which `page.tsx`
 * reads as "draw the short sign-in page". Reached only from the signed-out branch, so a signed-in reader's Home never runs it.
 *
 * - The switch is plumbing and decided with no account (`resolveFlags(null)`), so every visitor gets the same page.
 * - `observeAnonymousHit` counts the visitor's read after the response (observe only), as the public card and commander pages
 *   count theirs. It is called HERE and not in `page.tsx` because Home is a cached page (`check:list-cache`): this file is
 *   outside `src/lib`, which that guard follows, and holds the one request header the count needs.
 * - The data is the catalog's alone (`readLandingStats`, `readLandingCommanders`), cached on the catalog generation.
 * - The launch action is handed to the page as a prop: the public surface (`src/components/landing`) may not import an action.
 */
export async function SignedOutLanding(): Promise<ReactElement | null> {
  if (!publicLandingEnabled(await resolveFlags(null))) return null;
  await observeAnonymousHit(await headers());
  const [stats, commanders] = await Promise.all([readLandingStats(), readLandingCommanders()]);
  return <Landing stats={stats} commanders={commanders} launchAction={saveLandingLaunchEmailAction} />;
}
