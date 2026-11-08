/**
 * What the landing may promise (public landing PR 4b, READINESS-audit finding 10). Plain data, decided by the entry
 * (`app/landing-entry.tsx`, through `lib/landing/claims.ts`) and handed to the page: the page's own files may not reach the
 * switches or the payments constants (`check:public-reads`), so every figure and every on/off answer arrives here.
 *
 * A promise whose switch is off is `null` or `false`, and the page OMITS its line: there is no drawn "off" state.
 */
export type LandingClaims = {
  /** The welcome grant, or null while `WELCOME_CREDITS_ENABLED` is off. */
  welcome: { units: number; days: number } | null;
  /** The pack and the monthly plan, as sold (`PACKS`, `PLANS`), or null while payments are off: nothing then says what a credit costs. */
  buying: { pack: { units: number; priceCents: number }; plan: { units: number; priceCents: number } } | null;
  /** Whether Suggested changes can cost 2 credits (the v2 rule). Off, it is 1 credit a run. */
  suggestedTwo: boolean;
  /** `PUBLIC_PAGES_ENABLED`: the Written for real cards link to `/commander/<slug>` only while the public pages answer. */
  publicPages: boolean;
};

/** Whole dollars read plainly (`$5`), anything else to the cent (`$4.50`). */
export function dollars(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}
