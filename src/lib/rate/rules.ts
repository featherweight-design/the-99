/**
 * Request rate rules, as arithmetic (payments scope PR S, 2026-10-13). Pure and client-safe.
 *
 * A rule is a fixed window: `limit` hits per `windowMs` per player per bucket. Fixed rather than
 * sliding, because the count is one upserted row per window (`observe.ts`) and a sliding window
 * would need a row per hit. A burst straddling a boundary can therefore reach twice the limit; the
 * limits are guard rails against a scripted loop, not a fairness mechanism.
 *
 * OBSERVE-ONLY. Nothing here blocks: `observe.ts` logs what WOULD be refused. The limits are
 * provisional until a few days of those logs say what a real reader does; the app's own background
 * fetches are the heaviest honest callers (`/collection` pulls its withheld cards in batches of 200,
 * about 15 for a 3,000-card collection), so a limit below that would refuse the app to itself.
 */

export type RateRule = { limit: number; windowMs: number };

export const RATE_RULES = {
  /** `GET /api/card-detail`: read ahead on hover, so a fast sweep down a decklist is dozens. */
  "card-detail": { limit: 240, windowMs: 60_000 },
  /** `GET /api/collection-fields` and `GET /api/discovery-fields`: the background batch loops. */
  "draw-fields": { limit: 120, windowMs: 60_000 },
} as const satisfies Record<string, RateRule>;

export type RateBucket = keyof typeof RATE_RULES;

/** The start of the window `now` falls in. */
export function windowStart(now: Date, windowMs: number): Date {
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
}

/** Whether the `hits`th hit in a window is over the rule. */
export function overLimit(hits: number, rule: RateRule): boolean {
  return hits > rule.limit;
}
