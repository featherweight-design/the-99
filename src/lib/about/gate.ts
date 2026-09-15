// The /about gate's pure half — everything the proxy decides before it touches
// a database, plus the `next` validation the dismiss action repeats.
//
// Pure so it can be tested: the proxy itself needs a request, a session and a
// Postgres connection, and none of the rules below need any of the three.

import { ABOUT_VERSION } from "../copy/about";

/** The cookie the gate writes on its own redirect. */
export const ABOUT_COOKIE = "about_v";

/**
 * The cookie means "this browser has been sent to version N of the page, as
 * this account". Bound to the id rather than carrying the bare version: a
 * version alone would be honoured for whoever signs in next on this browser,
 * so a second reader on a shared machine would never see the page at all.
 *
 * Not signed. Forging it skips a page and reaches nothing else.
 */
export function cookieValue(userId: string, version: number = ABOUT_VERSION): string {
  return `${userId}.${version}`;
}

/** True when this browser has already been sent to the current version, as this reader. */
export function cookieIsCurrent(
  raw: string | undefined,
  userId: string,
  version: number = ABOUT_VERSION,
): boolean {
  return raw === cookieValue(userId, version);
}

/**
 * Where the reader was going, made safe to hand to `redirect()`.
 *
 * The value round-trips through a URL and a form, so it is attacker-controlled.
 * Anything that is not a same-origin relative path falls back to home rather
 * than being refused out loud — the reader asked for a page, not for an error
 * about the page they asked for.
 *
 * `//evil.com` is the one that matters: browsers read a protocol-relative URL
 * as another origin, and it passes a naive "starts with /" test.
 */
export function safeNext(raw: string | null | undefined): string {
  if (!raw) return "/";
  // NOT decoded here. Both callers hand over an already-decoded value —
  // `searchParams` and `FormData` each decode on the way in — so a second
  // decode eats the escapes that belong to the destination's own query:
  // `/commanders?q=a%26b` becomes `/commanders?q=a&b`, which is two parameters
  // where the reader had one, and `%23` becomes a fragment that is then
  // dropped. Dismissing would land them on a different search than the one they
  // left.
  if (!raw.startsWith("/")) return "/";
  try {
    // The RETURN is the guarantee, not a test before it: `pathname + search`
    // cannot carry a scheme or an authority, so `//evil.example` resolves and
    // comes back as `/`. An origin comparison was written here first and
    // removed as dead — every mutation of it passed, because this line had
    // already made it unreachable.
    const resolved = new URL(raw, "https://the99.invalid");
    return resolved.pathname + resolved.search;
  } catch {
    // `new URL` throws on a value no amount of guarding ahead of it makes safe.
    return "/";
  }
}

/**
 * Whether the gate should even look at this request. `/about` itself is exempt
 * or the redirect loops; everything Next serves for its own machinery is not a
 * page a reader is being sent away from.
 */
export function gateApplies(pathname: string): boolean {
  if (pathname === "/about") return false;
  if (pathname.startsWith("/api/")) return false;
  if (pathname.startsWith("/_next/")) return false;
  return true;
}

/**
 * Whether the gate should act on this request at all, given its method and
 * headers. Pure so the rule can be tested; the proxy supplies the headers.
 *
 * **Prefetches are the exclusion, not client navigations.** An earlier version
 * skipped every request carrying `RSC: 1`, which is every `<Link>` press in the
 * shell — so a reader who landed on the public `/` and clicked Decks never met
 * the gate at all, and the feature only worked on a hard reload. Next follows a
 * middleware redirect on a client transition, so those must be gated.
 *
 * A prefetch must NOT be: the response writes the cookie, so gating one would
 * mark the page shown because the reader's pointer passed over a link.
 */
export function gateHandles(method: string, headers: Headers): boolean {
  if (method !== "GET") return false;
  if (headers.get("Next-Router-Prefetch") === "1") return false;
  if (headers.get("purpose") === "prefetch") return false;
  // An RSC request that is not a prefetch is a real navigation the router will
  // follow a redirect for. A document request is the hard-navigation form of
  // the same thing.
  if (headers.get("RSC") === "1") return true;
  return (headers.get("accept") ?? "").includes("text/html");
}

/** What the gate wants done with a request it has decided to act on. Both
 *  answers carry the cookie — see `gateDecision`. */
export type GateDecision =
  | { kind: "pass"; cookie: string }
  | { kind: "redirect"; to: string; cookie: string };

/**
 * The gate's whole decision, given what the proxy has already read. Pure, so
 * the `Location` it builds and the cookie it attaches are testable — the proxy
 * around it is then only the mapping onto NextResponse.
 *
 * The cookie is attached to BOTH answers. On the redirect especially: a reader
 * who reads the page and leaves without pressing anything must not be sent
 * back to it on their next click, and a Server Component cannot set a cookie
 * during render, so this response is the only place it can be written.
 */
export function gateDecision(args: {
  userId: string;
  pathname: string;
  search: string;
  seen: number;
  version?: number;
}): GateDecision {
  const version = args.version ?? ABOUT_VERSION;
  const cookie = cookieValue(args.userId, version);
  if (args.seen >= version) return { kind: "pass", cookie };
  // The destination is encoded WHOLE, query included, so a `&` inside it
  // cannot read as the end of the `next` parameter.
  const to = `/about?next=${encodeURIComponent(args.pathname + args.search)}`;
  return { kind: "redirect", to, cookie };
}
