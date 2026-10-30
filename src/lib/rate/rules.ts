/**
 * Request rate rules, as arithmetic (payments scope PR S, 2026-10-13). Pure and client-safe.
 *
 * A rule is a fixed window: `limit` hits per `windowMs` per player per bucket. Fixed rather than
 * sliding, because the count is one upserted row per window (`observe.ts`) and a sliding window
 * would need a row per hit. A burst straddling a boundary can therefore reach twice the limit; the
 * limits are guard rails against a scripted loop, not a fairness mechanism.
 *
 * OBSERVE-ONLY, except `checkout`. Nothing else here blocks: `observe.ts` logs what WOULD be refused. The limits are
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
  /** `POST /api/card-scan/match`: one lookup per stable detection, at most 2 a second while scanning a stack. */
  "card-scan": { limit: 150, windowMs: 60_000 },
  /**
   * Creating a Checkout Session (payments scope §5.4). The ONE enforced bucket: `checkout.ts` refuses the
   * 11th in an hour whatever `RATE_LIMIT_ENABLED` says, because a Session is a card-testing surface and
   * no honest reader starts ten purchases in an hour.
   */
  checkout: { limit: 10, windowMs: 3_600_000 },
  /**
   * The public card and commander pages (launch epic F3), per VISITOR rather than per player: a signed-out visitor has no
   * account, so `anon.ts` keys the hit on a hash of their network address. Provisional, observe-only like the rest. An honest
   * reader opens a handful of pages a minute; a crawler opens hundreds, so 120 a minute sits well clear of one and well under
   * the other. Counted at the origin, so a page the CDN serves from cache is not counted: real limiting of cached hits belongs
   * to the platform firewall.
   */
  "public-read": { limit: 120, windowMs: 60_000 },
  /** An invite by email, per sender (invites R11): a sender holds a handful of invites, so dozens an hour is a loop. */
  "invite-email": { limit: 30, windowMs: 3_600_000 },
  /** A newcomer's Send code at `/join`, keyed by the token's SENDER, since the newcomer has no account (R11). */
  "invite-claim": { limit: 30, windowMs: 3_600_000 },
  /** A newcomer's code typed at `/join`, keyed by the token's sender (R11). Five wrong tries end a claim anyway. */
  "invite-code": { limit: 60, windowMs: 3_600_000 },
  /** A newcomer's Send code at `/join/<CODE>` for a flyer code, keyed by the code's creator (the newcomer has no account). */
  "flyer-claim": { limit: 60, windowMs: 3_600_000 },
  /** A newcomer's code typed at `/join/<CODE>`, keyed by the code's creator. Five wrong tries end a claim anyway. */
  "flyer-code": { limit: 120, windowMs: 3_600_000 },
  /**
   * An address left on the flyer launch list (flyer trial PR 3), per VISITOR (`anon.ts` keys it on a hash of the network address):
   * the reader has no account and the write is a stranger's. ENFORCED, like `checkout`, whatever `RATE_LIMIT_ENABLED` says: the
   * eleventh in an hour is refused. An honest reader leaves one address, a household a few.
   */
  "launch-list": { limit: 10, windowMs: 3_600_000 },
  /** A problem report (flyer trial PR 5), per player. Observe-only: an honest reader sends one or two; dozens an hour is a loop. */
  feedback: { limit: 20, windowMs: 3_600_000 },
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

/** How long a window's row is kept, whoever it belongs to: the bound on a row written after its account was purged. */
export const RETAIN_MS = 60 * 60 * 1000;
