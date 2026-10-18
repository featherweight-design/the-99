import { createHash } from "node:crypto";
import { after } from "next/server";
import { resolveSwitchEnv } from "../switches/snapshot";
import { rateLimitEnabled } from "./flag";
import { recordHit } from "./observe";
import { overLimit, RATE_RULES } from "./rules";

/**
 * Anonymous reads (launch epic F3 groundwork, PR 2): the public card and commander pages have a visitor and no account.
 * OBSERVE-ONLY, exactly like `observeHit`: after the response it counts the hit under a key made from the visitor's network
 * address and logs what the `public-read` rule WOULD refuse. Nothing is refused, and nothing calls this until the pages ship.
 *
 * THE KEY IS PSEUDONYMOUS, NOT UNLINKABLE. `anon:` plus the first 16 hex of SHA-256 over the network address (an IPv6 address
 * on its /64, the unit a household or host is given) and the UTC day. The daily part stops one visitor's rows being joined
 * across days; it does NOT make the hash irreversible (the IPv4 space is small enough to enumerate), and no secret is
 * introduced to pretend otherwise. The privacy page says "a one-way hash of your network address, kept for up to an hour":
 * `RETAIN_MS` deletes every row older than that on the next hit, by anyone. The `anon:` prefix cannot collide with a Clerk id.
 */
export const ANON_PREFIX = "anon:";
export const UNKNOWN_KEY = `${ANON_PREFIX}unknown`;

/** The visitor's network address from the platform's headers, or null. Vercel sets these itself; they are spoofable elsewhere, which an observe-only counter tolerates. */
export function clientAddress(headers: Pick<Headers, "get">): string | null {
  const direct = headers.get("x-real-ip") ?? headers.get("x-vercel-forwarded-for");
  const first = direct ?? headers.get("x-forwarded-for")?.split(",")[0];
  const address = first?.trim();
  return address ? address : null;
}

/** An IPv6 address reduced to its /64 (the first four groups); anything else unchanged. */
export function networkOf(address: string): string {
  if (!address.includes(":") || address.includes(".")) return address; // IPv4, or an IPv4-mapped form
  const [head, tail = ""] = address.split("::");
  const groups = head === "" ? [] : head.split(":");
  const rest = address.includes("::") ? tail.split(":").filter((g) => g !== "") : [];
  const filled = address.includes("::") ? [...groups, ...Array(Math.max(0, 8 - groups.length - rest.length)).fill("0"), ...rest] : groups;
  return `${filled.slice(0, 4).map((g) => g.toLowerCase().replace(/^0+(?=.)/, "")).join(":")}::/64`;
}

/** The `rate_hits` key for a visitor on a UTC day. */
export function anonKey(address: string | null, now: Date = new Date()): string {
  if (address === null) return UNKNOWN_KEY;
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
