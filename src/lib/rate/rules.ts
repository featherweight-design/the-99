/**
 * Request rate rules, as arithmetic (payments scope PR S, 2026-10-13). Pure and client-safe.
 *
 * A rule is a fixed window: `limit` hits per `windowMs` per player per bucket. Fixed rather than
 * sliding, because the count is one upserted row per window (`observe.ts`) and a sliding window
 * would need a row per hit. A burst straddling a boundary can therefore reach twice the limit; the
 * limits are guard rails against a scripted loop, not a fairness mechanism.
 *
 * ENFORCED, every bucket but `public-read` (Hugh 2026-11-11, "enforce all", at these limits, after 14 days of
 * production logs showed no "would refuse" line): `enforceHit` refuses the hit over the limit, as do the
 * anonymous counters in `anon.ts`. `public-read` stays observe-only (`observeAnonymousHit` logs what WOULD be
 * refused): a page render cannot answer 429. The app's own background fetches are the heaviest honest callers (`/collection` pulls its
 * withheld cards in batches of 200, about 15 for a 3,000-card collection), so a limit below that would
 * refuse the app to itself.
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
   * Creating a Checkout Session (payments scope §5.4). ENFORCED: `checkout.ts` refuses the
   * 11th in an hour, because a Session is a card-testing surface and
   * no honest reader starts ten purchases in an hour.
   */
  checkout: { limit: 10, windowMs: 3_600_000 },
  /**
   * The public card and commander pages (launch epic F3), per VISITOR rather than per player: a signed-out visitor has no
   * account, so `anon.ts` keys the hit on a hash of their network address. Observe-only here; the Vercel Firewall refuses it (same limit, per IP, `docs/agents/ops.md`). An honest
   * reader opens a handful of pages a minute; a crawler opens hundreds, so 120 a minute sits well clear of one and well under
   * the other. Counted at the origin, so a page the CDN serves from cache is not counted: real limiting of cached hits belongs
   * to the platform firewall.
   */
  "public-read": { limit: 120, windowMs: 60_000 },
  /** An invite by email, per sender (invites R11), ENFORCED: a sender holds a handful of invites, so dozens an hour is a loop. Only the sender can spend it. */
  "invite-email": { limit: 30, windowMs: 3_600_000 },
  /**
   * A newcomer's Send code at `/join`, ENFORCED per VISITOR AND TOKEN (`anon.ts`, the token hashed into the key, never
   * stored): keyed by the sender, a stranger hammering one link would lock the sender's other invites out.
   */
  "invite-claim": { limit: 30, windowMs: 3_600_000 },
  /** A newcomer's code typed at `/join`, ENFORCED per visitor and token like `invite-claim`. Five wrong tries end a claim anyway. */
  "invite-code": { limit: 60, windowMs: 3_600_000 },
  /** A newcomer's Send code at `/join/<CODE>` for a flyer code, ENFORCED per visitor and code. */
  "flyer-claim": { limit: 60, windowMs: 3_600_000 },
  /** A newcomer's code typed at `/join/<CODE>`, ENFORCED per visitor and code. Five wrong tries end a claim anyway. */
  "flyer-code": { limit: 120, windowMs: 3_600_000 },
  /**
   * The BACKSTOP on each of the four above across every visitor of ONE code (`codeKey`: an invite token or a flyer code,
   * hashed with its sender), ENFORCED, at five times the per-visitor limit: it bounds a writer who rotates addresses, and
   * it is counted only for a visit its own cap let through. Per code, so a writer who fills it holds off only the link
   * they already have, never the sender's other invites or another flyer. A full room claiming one flyer at a store
   * night is tens, well under 300.
   */
  "invite-claim-all": { limit: 150, windowMs: 3_600_000 },
  "invite-code-all": { limit: 300, windowMs: 3_600_000 },
  "flyer-claim-all": { limit: 300, windowMs: 3_600_000 },
  "flyer-code-all": { limit: 600, windowMs: 3_600_000 },
  /**
   * An address left on the flyer launch list (flyer trial PR 3), per VISITOR (`anon.ts` keys it on a hash of the network address):
   * the reader has no account and the write is a stranger's. ENFORCED, like `checkout`: the
   * eleventh in an hour is refused. An honest reader leaves one address, a household a few.
   */
  "launch-list": { limit: 10, windowMs: 3_600_000 },
  /**
   * The CEILING on launch-list writes across every visitor, ENFORCED, for the same reason as `report-anon-all`. Measured
   * 2026-11-08: no launch-list row on either deployment and one flyer code in production. A full room at a store night
   * signing up in one hour is tens, so 60 an hour and 300 a day leaves room for that and bounds a rotating writer.
   */
  "launch-list-all": { limit: 60, windowMs: 3_600_000 },
  "launch-list-all-day": { limit: 300, windowMs: 86_400_000 },
  /**
   * A problem report filed SIGNED OUT, per VISITOR (`anon.ts`): 10 an hour, ENFORCED like `launch-list`. The daily cap is the
   * next bucket, because a bucket holds one window.
   */
  "report-anon": { limit: 10, windowMs: 3_600_000 },
  /** The same visitor's DAILY cap on signed-out reports (30 a day), ENFORCED; both buckets must pass. */
  "report-anon-day": { limit: 30, windowMs: 86_400_000 },
  /**
   * The CEILING on signed-out reports across every visitor (`anon.ts`, `ANON_ALL_KEY`), ENFORCED: per-visitor caps cannot stop
   * a writer who rotates addresses (an IPv6 /48 holds 65,536 /64s). Measured 2026-11-08, read-only: production and staging
   * have never stored a signed-out report (and production has six accounts), so honest volume is near zero; 30 an hour and
   * 100 a day is far above any honest burst and bounds what an address-rotating writer can store. Counted only for a visit
   * its own caps let through.
   */
  "report-anon-all": { limit: 30, windowMs: 3_600_000 },
  "report-anon-all-day": { limit: 100, windowMs: 86_400_000 },
  /** A problem report or check-in (flyer trial PR 5), per player, ENFORCED: an honest reader sends one or two; dozens an hour is a loop. */
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

/** Whether the `hits`th hit is the one that reaches half the rule: the window's single "near" log line. */
export function reachesHalf(hits: number, rule: RateRule): boolean {
  return hits === Math.ceil(rule.limit / 2);
}

/** Whole seconds until the window `now` falls in ends, at least 1: a refusal's `Retry-After`. */
export function retryAfterSec(now: Date, rule: RateRule): number {
  const end = windowStart(now, rule.windowMs).getTime() + rule.windowMs;
  return Math.max(1, Math.ceil((end - now.getTime()) / 1000));
}

/** How long a window's row is kept, whoever it belongs to: the bound on a row written after its account was purged. */
export const RETAIN_MS = 60 * 60 * 1000;

/** How long a bucket's row must outlive its window start: `RETAIN_MS`, or the whole window when that is longer (a day cap's row starts at 00:00 and has to survive the day, or the sweep would reset the cap). */
export function retainMs(bucket: RateBucket): number {
  return Math.max(RETAIN_MS, RATE_RULES[bucket].windowMs);
}
