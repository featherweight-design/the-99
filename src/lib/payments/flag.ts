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
