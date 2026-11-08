import { paymentsEnabled, welcomeCreditsEnabled } from "../payments/flag";
import { PACKS, PLANS } from "../payments/packs";
import { publicPagesEnabled } from "../public/flag";
import type { LandingClaims } from "../public/landing-claims";
import { suggestedChangesV2Enabled } from "../tuning/flag";

/**
 * The landing's promises from the app-wide switches (`resolveFlags(null)`) and the shipped constants. The welcome count
 * and window come in as arguments: `payments/welcome.ts` holds them and opens the database, which this pure module (and its
 * test) must not.
 */
export function landingClaims(env: NodeJS.ProcessEnv, welcome: { units: number; days: number }): LandingClaims {
  return {
    welcome: welcomeCreditsEnabled(env) ? { units: welcome.units, days: welcome.days } : null,
    buying: paymentsEnabled(env)
      ? { pack: { units: PACKS.pack40.units, priceCents: PACKS.pack40.priceCents }, plan: { units: PLANS.monthly.units, priceCents: PLANS.monthly.priceCents } }
      : null,
    suggestedTwo: suggestedChangesV2Enabled(env),
    publicPages: publicPagesEnabled(env),
  };
}
