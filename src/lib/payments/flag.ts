/**
 * `PAYMENTS_ENABLED`: buying credits (payments scope §9, "Feature switches"). `'true'` on staging, unset on
 * production until Hugh walks it, and opened to his group first through the group overrides (Q13). Exactly
 * `'true'` turns it on; the literal `off` is the kill switch that stops sales in one move. It gates the
 * Checkout action and every buy surface, and NOTHING that settles money already taken: the webhook, the
 * refund and dispute handlers and the account purge never read it.
 */
export function paymentsEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.PAYMENTS_ENABLED === "true";
}

/**
 * An allowance with this reader's `PAYMENTS_ENABLED` stamped on it, so the credit line (L4, L8) knows whether to offer
 * `Get more credits` without every surface reading a switch. `env` is the request's resolved switches
 * (`requestSwitchEnv`), never `process.env`; an allowance read elsewhere carries no stamp and reads as off.
 */
export function withPayments<T extends object>(allowance: T, env: NodeJS.ProcessEnv): T & { payments: boolean } {
  return { ...allowance, payments: paymentsEnabled(env) };
}

/**
 * `WELCOME_CREDITS_ENABLED`: the welcome grant for a new sign-up (launch epic D1, ruling L5). `'true'` on staging, unset
 * on production until Hugh turns it on. It requires `PAYMENTS_ENABLED`, checked here so an override of this one never
 * raises its parent. It gates only the WRITE of a new lot: a lot already granted is spent whatever the switch says, as a
 * taken payment is.
 */
export function welcomeCreditsEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.WELCOME_CREDITS_ENABLED === "true" && paymentsEnabled(env);
}
