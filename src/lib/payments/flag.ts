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
