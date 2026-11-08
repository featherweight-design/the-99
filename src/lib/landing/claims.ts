import { paymentsEnabled, welcomeCreditsEnabled } from "../payments/flag";
import { PACKS, packsConfigured, PLANS, plansConfigured } from "../payments/packs";
import { publicPagesEnabled } from "../public/flag";
import type { LandingClaims } from "../public/landing-claims";
import { suggestedChangesV2Enabled } from "../tuning/flag";

/**
 * The landing's promises from the app-wide switches (`resolveFlags(null)`) and the shipped constants. The welcome count
 * and window come in as arguments: `payments/welcome.ts` holds them and opens the database, which this pure module (and its
 * test) must not. `priceIds` is the Stripe Price ids the entry reads (`packPriceEnv`, `planPriceEnv`): with a Price unset the pack or the
 * plan is not on sale, so nothing says what a credit costs.
 */
export function landingClaims(env: NodeJS.ProcessEnv, welcome: { units: number; days: number }, priceIds: Record<string, string | undefined>): LandingClaims {
  return {
    welcome: welcomeCreditsEnabled(env) ? { units: welcome.units, days: welcome.days } : null,
    buying: paymentsEnabled(env) && packsConfigured(priceIds) && plansConfigured(priceIds)
      ? { pack: { units: PACKS.pack40.units, priceCents: PACKS.pack40.priceCents }, plan: { units: PLANS.monthly.units, priceCents: PLANS.monthly.priceCents } }
      : null,
    suggestedTwo: suggestedChangesV2Enabled(env),
    publicPages: publicPagesEnabled(env),
  };
}
