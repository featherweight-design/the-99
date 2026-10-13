/**
 * What is for sale, as the server knows it (payments scope §5.4). Pure: the client sends a pack id
 * from this closed set and nothing else, and the server sets the Stripe Price, the quantity (1), the
 * currency and every other field. The webhook checks a paid Session against the same entry, so a
 * Session for some other Price, quantity, currency or amount grants nothing.
 *
 * Prices are Hugh's starting point (Q3, 2026-10-13): $5 for 40 credits, which never expire. A Price
 * id differs between Stripe's test and live modes, so each pack names the variable holding it.
 */
export const PACKS = {
  pack40: { units: 40, priceCents: 500, currency: "usd", priceEnv: "STRIPE_PRICE_PACK_40" },
} as const;

export type PackId = keyof typeof PACKS;
export type Pack = (typeof PACKS)[PackId] & { id: PackId };

export function isPackId(value: unknown): value is PackId {
  return typeof value === "string" && Object.hasOwn(PACKS, value);
}

/**
 * Whether every pack's Price variable is set. Until it is, no paid Session can be judged: a Price
 * the registry cannot name might be ours, so the webhook answers 503 and Stripe retries, rather than
 * refusing (and recording) a real payment for good.
 */
export function packsConfigured(env: Record<string, string | undefined>): boolean {
  return Object.values(PACKS).every((p) => (env[p.priceEnv]?.trim() ?? "") !== "");
}

/** The pack a Stripe Price id is for, or null when the Price is none of ours (or its variable is unset). */
export function packForPrice(priceId: string, env: Record<string, string | undefined>): Pack | null {
  for (const id of Object.keys(PACKS) as PackId[]) {
    const configured = env[PACKS[id].priceEnv]?.trim();
    if (configured && configured === priceId) return { ...PACKS[id], id };
  }
  return null;
}
