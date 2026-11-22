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
 * withheld cards in batches of 500, about 6 for a 3,000-card collection), so a limit below that would
 * refuse the app to itself.
 */

export type RateRule = { limit: number; windowMs: number };

export const RATE_RULES = {
  /** `GET /api/card-detail`: read ahead on hover, so a fast sweep down a decklist is dozens. */
  "card-detail": { limit: 240, windowMs: 60_000 },
  /** `GET`/`POST /api/collection-fields` and `GET /api/discovery-fields`: the background batch loops. */
  "draw-fields": { limit: 120, windowMs: 60_000 },
  /** `POST /api/card-scan/match`: at most three lookups per card (`server-scan.ts`), each retried up to twice, at most 2 a second while scanning a stack. */
  "card-scan": { limit: 150, windowMs: 60_000 },
  /** `POST /api/scan-lab/spike`: one row per tapped card and per 40 frames compared, so a few a minute while scanning. */
  "scan-lab-spike": { limit: 60, windowMs: 60_000 },
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
  /**
   * A newcomer's Send code at `/join/<CODE>` for a flyer code, ENFORCED per visitor and code. A flyer is claimed in a room
   * (a store night), and a shop's Wi-Fi is ONE visitor (`anon.ts` keys on the network address), so the whole room spends this
   * one allowance: 300 an hour, where 60 turned the sixty-first person at the counter away.
   */
  "flyer-claim": { limit: 300, windowMs: 3_600_000 },
  /**
   * A newcomer's code typed at `/join/<CODE>`, ENFORCED per visitor and code. Five wrong tries end a claim anyway. Every
   * claim types a code, and a typo takes a second try, so this is twice `flyer-claim`: a limit below it would stop the room
   * at the code step after the Send code had let it through.
   */
  "flyer-code": { limit: 600, windowMs: 3_600_000 },
  /**
   * The BACKSTOP on each of the four above across every visitor of ONE code (`codeKey`: an invite token or a flyer code,
   * hashed with its sender), ENFORCED: it bounds a writer who rotates addresses, and it is counted only for a visit its
   * own cap let through. Per code, so a writer who fills it holds off only the link they already have, never the sender's
   * other invites or another flyer. The two invite backstops are five times the per-visitor limit. The two flyer backstops
   * are EQUAL to theirs (300 and 600): a store night's room is one Wi-Fi, so one visitor, and it is the per-visitor cap
   * that meets it first; the backstop is then the same wall for a writer who spreads across networks, and a room of
   * tens to low hundreds stays under both. The real bound on a flyer code is its fifty places (`flyerOpenness`); what these
   * walls mostly bound is the email each Send code costs.
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
   * An open of the launch email's unsubscribe link (`/unsubscribe`), per VISITOR (`anon.ts`), ENFORCED. Each is one indexed
   * delete; this bounds a stranger's load. An honest reader opens it once; a mail scanner opening the link adds a few.
   */
  "launch-unsubscribe": { limit: 20, windowMs: 3_600_000 },
  /**
   * The one-click POST (`/api/unsubscribe`), per VISITOR, ENFORCED, and high: a mail provider's servers send many recipients'
   * one-click unsubscribes from a few addresses, so the limit sits far above any launch list's size. Not a ceiling across every
   * visitor, which one stranger could spend for everyone. Each is one indexed delete.
   */
  "launch-one-click": { limit: 600, windowMs: 3_600_000 },
  /**
   * Every email the app sends through Resend, per RECIPIENT (`src/lib/invites/mail-limits.ts`: the address folded by `foldEmail`
   * so `+tags` and Gmail dots share one count, then hashed, never stored), ENFORCED: 3 an hour and (the next bucket) 10 a day
   * (Hugh, 2026-11-14). An honest recipient asks for a code, perhaps twice more after a typo; a script that points the code step
   * at one stranger's inbox sends hundreds. The per-network flyer limit stays at 300.
   */
  "mail-recipient": { limit: 3, windowMs: 3_600_000 },
  "mail-recipient-day": { limit: 10, windowMs: 86_400_000 },
  /**
   * The CEILING on app emails a UTC day across every recipient, ENFORCED. The `limit` here is only the free plan's default
   * (Resend's 100 a day, shared with Concert Crawl, less margin); the number the send reads is `mailDailyCap()` in
   * `mail-limits.ts`, from `RESEND_DAILY_SEND_CAP`, which Hugh raises with the Resend plan. The row's window is what counts.
   */
  "mail-all-day": { limit: 70, windowMs: 86_400_000 },
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
  /**
   * A friend code typed in Add a friend (friend links R1), per player, ENFORCED. EVERY try counts, a right one too, so a
   * hit cannot reset a guesser's count: 10 an hour and (the next bucket) 30 a day. At about 8.9 × 10⁸ codes, a month of
   * full days finds a given code with odds near one in a million. An honest player types a handful.
   */
  "friend-code": { limit: 10, windowMs: 3_600_000 },
  "friend-code-day": { limit: 30, windowMs: 86_400_000 },
  /** Friend requests sent, by link or code, per player, ENFORCED: 20 a day. Opening a link already asked sends nothing and is not counted. */
  "friend-request-day": { limit: 20, windowMs: 86_400_000 },
  /** The admin "send every email template to me" button, per admin, ENFORCED: one press (three emails) in five minutes, so a held key cannot spend the day's mail cap. */
  "admin-mail-preview": { limit: 1, windowMs: 300_000 },
  /** Reset link and code, per player, ENFORCED: 5 a day, so rotation cannot churn tokens or codes. */
  "friend-reset-day": { limit: 5, windowMs: 86_400_000 },
  /**
   * A friend link opened SIGNED OUT, per VISITOR across every link (`anon.ts`, no scope), ENFORCED: the page names its owner
   * (Q2), so past the cap it draws the ended card, naming nobody. An honest visitor opens a link or two a few times; a walker
   * of tokens opens thousands.
   */
  "friend-landing": { limit: 30, windowMs: 3_600_000 },
  /**
   * Join on a friend link's signed-out landing (friend links R1, PR 2), per VISITOR and link, ENFORCED: each Join holds one
   * of the owner's invites for ten minutes and a link holds two at once, so 3 an hour lets an honest retry through while one
   * visitor cannot keep both slots full. The next bucket is the link's ceiling across every visitor (`codeKey`).
   */
  "friend-join": { limit: 3, windowMs: 3_600_000 },
  "friend-join-all": { limit: 20, windowMs: 3_600_000 },
  /** A problem report or check-in (flyer trial PR 5), per player, ENFORCED: an honest reader sends one or two; dozens an hour is a loop. */
  feedback: { limit: 20, windowMs: 3_600_000 },
  /**
   * Account in Settings (2026-11-14), per player, ENFORCED. Deleting the account: an honest reader deletes once (a step-up
   * round trip is counted once, after it passes), and a failed attempt retried takes a second or third, so 5 an hour.
   */
  "account-delete": { limit: 5, windowMs: 3_600_000 },
  /** Signing one of your own devices out: a reader with a handful of devices signs each out once; dozens an hour is a loop. */
  "device-sign-out": { limit: 30, windowMs: 3_600_000 },
  /** Your name, from `/friends` or Settings, which also writes Clerk's `firstName`: a few edits, never dozens, in an hour. */
  "display-name": { limit: 20, windowMs: 3_600_000 },
  /**
   * The Start dialog's bracket fact on an Upgrade this precon run's picked subset (`upgradeSetBracketAction`), per player, ENFORCED.
   * Free to the player but one profile build each, read on every pick toggled: a player ticking through a 15-swap run's 30 lines
   * quickly is tens a minute, so 120 a minute leaves room for that and bounds a scripted loop. Over the limit the fact is left off.
   */
  "upgrade-set-bracket": { limit: 120, windowMs: 60_000 },
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
