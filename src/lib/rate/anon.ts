import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { after } from "next/server";
import { resolveSwitchEnv } from "../switches/snapshot";
import { rateLimitEnabled } from "./flag";
import { recordHit } from "./observe";
import { overLimit, RATE_RULES, type RateBucket } from "./rules";

/**
 * Anonymous reads (launch epic F3 groundwork, PR 2): the public card and commander pages have a visitor and no account.
 * OBSERVE-ONLY, exactly like `observeHit`: after the response it counts the hit under a key made from the visitor's network
 * address and logs what the `public-read` rule WOULD refuse. Nothing is refused. The public card page calls it
 * (`src/app/card/[slug]/page.tsx`, behind `PUBLIC_PAGES_ENABLED`).
 *
 * THE KEY IS PSEUDONYMOUS, NOT UNLINKABLE. `anon:` plus the first 16 hex of SHA-256 over the network address (an IPv6 address
 * on its /64, the unit a household or host is given) and the UTC day. The daily part stops one visitor's rows being joined
 * across days; it does NOT make the hash irreversible (the IPv4 space is small enough to enumerate), and no secret is
 * introduced to pretend otherwise. CLEANUP IS OPPORTUNISTIC AND WINDOW-BASED, with no minimum or maximum
 * age to promise: a count deletes this key's rows from EARLIER windows (so a minute-window row can go within seconds of the
 * next minute's count) and every row, anyone's, older than the counting window's start minus `RETAIN_MS`; if no count ever
 * follows, a row stays. The privacy page must say only that the hash is held briefly in a request counter and cleared
 * out as later requests are counted, and must NOT say "kept for up to an hour" or "deleted after an hour". The `anon:`
 * prefix cannot collide with a Clerk id.
 */
export const ANON_PREFIX = "anon:";
export const UNKNOWN_KEY = `${ANON_PREFIX}unknown`;

/**
 * One header value as a syntactically valid IPv4 or IPv6 address, or null. Brackets (`[::1]`) and a trailing port (`1.2.3.4:80`,
 * `[::1]:80`) are dropped first, since a proxy may send either; a valid bare address comes back unchanged. Anything else (free
 * text, a list, "unknown") is null, so header text an attacker controls cannot mint a fresh `rate_hits` key per request.
 */
function validAddress(raw: string | null | undefined): string | null {
  let text = raw?.trim() ?? "";
  if (!text) return null;
  const bracketed = /^\[([^\]]+)\](?::\d{1,5})?$/.exec(text);
  if (bracketed) text = bracketed[1];
  else {
    const withPort = /^(\d{1,3}(?:\.\d{1,3}){3}):\d{1,5}$/.exec(text);
    if (withPort) text = withPort[1];
  }
  return isIP(text) !== 0 ? text : null;
}

/** The visitor's network address from the platform's headers, or null when absent or not a valid IP. Vercel sets these itself; they are spoofable elsewhere, which an observe-only counter tolerates and an enforced one (`overAnonymousLimit`) bounds only on Vercel. The key carries the UTC day, so a window that straddles midnight counts twice. */
export function clientAddress(headers: Pick<Headers, "get">): string | null {
  // Platform headers first, then the first hop of x-forwarded-for. The first VALID one wins; an empty or malformed header is absent, so it cannot shadow a real one.
  const candidates = [headers.get("x-real-ip"), headers.get("x-vercel-forwarded-for"), headers.get("x-forwarded-for")?.split(",")[0]];
  for (const c of candidates) {
    const ok = validAddress(c);
    if (ok) return ok;
  }
  return null;
}

/** An IPv6 address as eight 16-bit groups, or null when it is not one (an embedded dotted IPv4 tail counts as two groups). */
function groupsOf(address: string): number[] | null {
  let text = address;
  const dotted = /(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(text);
  if (dotted) {
    const o = dotted.slice(1).map(Number);
    if (o.some((n) => n > 255)) return null;
    text = text.slice(0, dotted.index) + ((o[0] << 8) | o[1]).toString(16) + ":" + ((o[2] << 8) | o[3]).toString(16);
  }
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const side = (h: string) => (h === "" ? [] : h.split(":"));
  const head = side(halves[0]);
  const tail = halves.length === 2 ? side(halves[1]) : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  const all = [...head, ...Array(Math.max(0, fill)).fill("0"), ...tail];
  if (all.length !== 8 || all.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  return all.map((g) => parseInt(g, 16));
}

/**
 * A network address as the unit one visitor is counted by: IPv4 as written; an IPv6 address that carries an IPv4 (the
 * mapped `::ffff:` range, in dotted, hexadecimal or expanded spelling) as that IPv4; any other IPv6 address reduced to its
 * /64 (the first four groups), canonically spelled. Brackets, a `%zone` id and letter case are dropped first, so one
 * visitor written two ways is one key. Text that is neither is returned trimmed and lowercased, unreduced.
 */
export function networkOf(raw: string): string {
  const address = raw.trim().replace(/^\[|\]$/g, "").replace(/%.*$/, "").toLowerCase();
  if (!address.includes(":")) return address;
  const g = groupsOf(address);
  if (g === null) return address;
  if (g.slice(0, 5).every((n) => n === 0) && g[5] === 0xffff) return `${g[6] >> 8}.${g[6] & 255}.${g[7] >> 8}.${g[7] & 255}`;
  return `${g.slice(0, 4).map((n) => n.toString(16)).join(":")}::/64`;
}

/** The `rate_hits` key for a visitor on a UTC day. */
export function anonKey(address: string | null, now: Date = new Date()): string {
  if (address === null || validAddress(address) === null) return UNKNOWN_KEY;
  const day = now.toISOString().slice(0, 10);
  return ANON_PREFIX + createHash("sha256").update(`${networkOf(address)}|${day}`).digest("hex").slice(0, 16);
}

/**
 * Counts one anonymous read after the response is sent. The switch is resolved with no account (`resolveSwitchEnv(null)`:
 * `RATE_LIMIT_ENABLED` is a plumbing switch and takes only the app-wide override), and every failure is swallowed:
 * counting costs a visitor nothing. The log line carries the bucket, the count and the limit, never the key.
 */
export async function observeAnonymousHit(headers: Pick<Headers, "get">): Promise<void> {
  let on = false;
  try {
    on = rateLimitEnabled(await resolveSwitchEnv(null));
  } catch {
    return;
  }
  if (!on) return;
  const key = anonKey(clientAddress(headers));
  after(async () => {
    try {
      const hits = await recordHit(key, "public-read");
      if (overLimit(hits, RATE_RULES["public-read"])) {
        console.warn(`[rate] would refuse bucket=public-read hits=${hits} limit=${RATE_RULES["public-read"].limit}`);
      }
    } catch {
      // Counting is best effort by design.
    }
  });
}

/** Hits a window the shared `UNKNOWN_KEY` is allowed in an enforced bucket (or the bucket's own limit, if lower). */
export const UNKNOWN_CAP = 3;

/**
 * An ENFORCED anonymous hit: counts one in `bucket` under the visitor's key and says whether it is over the rule. Unlike
 * `observeAnonymousHit` it counts before answering and does not look at `RATE_LIMIT_ENABLED`; the launch list is a stranger's
 * write. A counting failure lets the hit through (fail open): a database hiccup must not turn every reader away.
 *
 * A request with no valid address is counted under the shared `UNKNOWN_KEY` with a LOW cap (`UNKNOWN_CAP` a window), not let
 * through uncounted: letting it through would make "send no address header" a way round every cap. The cap is low because the
 * shared key pools every such visitor, and on Vercel a real visitor always has an address, so the pool is nearly all abuse; a
 * few hits a window still lets a stray honest one in.
 */
export async function overAnonymousLimit(headers: Pick<Headers, "get">, bucket: RateBucket): Promise<boolean> {
  const address = clientAddress(headers);
  const rule = address === null ? { ...RATE_RULES[bucket], limit: Math.min(RATE_RULES[bucket].limit, UNKNOWN_CAP) } : RATE_RULES[bucket];
  try {
    return overLimit(await recordHit(anonKey(address), bucket), rule);
  } catch {
    return false;
  }
}
