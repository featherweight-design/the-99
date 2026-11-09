import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactElement } from "react";
import { Landing } from "../components/landing/landing";
import { landingCopy } from "../lib/copy/landing";
import { resolveFlags } from "../lib/flags/snapshot";
import { landingClaims } from "../lib/landing/claims";
import { packPriceEnv, planPriceEnv } from "../lib/payments/stripe";
import { WELCOME_DAYS, WELCOME_UNITS } from "../lib/payments/welcome";
import { publicLandingEnabled } from "../lib/public/flag";
import { siteOrigin } from "../lib/public/site-origin";
import { readLandingCommanders } from "../lib/public/landing-commanders";
import { readLandingPrecon } from "../lib/public/landing-precon";
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
 * - The data is the catalog's alone (`readLandingStats`, `readLandingCommanders`, `readLandingPrecon`), cached on the catalog generation.
 * - Every promise that rides a switch (welcome credits, payments, the 2-credit rule, public pages) is decided here from the same
 *   `resolveFlags(null)` and handed down as `claims` (`lib/landing/claims.ts`); a switch that is off leaves its line out.
 * - The launch action is handed to the page as a prop: the public surface (`src/components/landing`) may not import an action.
 */
export async function SignedOutLanding(): Promise<ReactElement | null> {
  const flags = await resolveFlags(null);
  if (!publicLandingEnabled(flags)) return null;
  await observeAnonymousHit(await headers());
  const [stats, commanders, precon] = await Promise.all([readLandingStats(), readLandingCommanders(), readLandingPrecon()]);
  const claims = landingClaims(flags, { units: WELCOME_UNITS, days: WELCOME_DAYS }, { ...packPriceEnv(), ...planPriceEnv() });
  return <Landing stats={stats} commanders={commanders} launchAction={saveLandingLaunchEmailAction} precon={precon} claims={claims} />;
}

/**
 * Held out of search while the app is invite-only: `robots.ts` allows `/`, so flipping the landing's switch alone would make it
 * indexable. Launch removes `robots` from `landingMetadata()` (a one-line change) and this constant with it.
 */
export const LANDING_ROBOTS = { index: false, follow: true } as const;

/**
 * The landing's page metadata, or null while its switch is off (the caller keeps `/`'s own). Decided from `resolveFlags(null)`
 * like the page, so it adds no auth or cookie read; `page.tsx` calls it only for a signed-out reader. Robots: landing is `LANDING_ROBOTS` (noindex) until launch. No image: no shipped asset is OG-shaped.
 */
export async function landingMetadata(): Promise<Metadata | null> {
  if (!publicLandingEnabled(await resolveFlags(null))) return null;
  const { title, description } = landingCopy.meta;
  return {
    metadataBase: siteOrigin(),
    title,
    description,
    alternates: { canonical: "/" },
    openGraph: { title, description, url: "/", type: "website", siteName: landingCopy.topBar.wordmarkPhone },
    twitter: { card: "summary", title, description },
    robots: LANDING_ROBOTS,
  };
}
