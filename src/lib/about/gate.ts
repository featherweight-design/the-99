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
  let value: string;
  try {
    value = decodeURIComponent(raw);
  } catch {
    // decodeURIComponent THROWS on a lone escape rather than returning its
    // input, so this exists to stop a malformed link 500ing. Its result is not
    // separately observable — anything that fails to decode also fails the
    // leading-slash test below — so no test pins it, and that is stated here
    // rather than left to look like coverage.
    return "/";
  }
  if (!value.startsWith("/")) return "/";
  // ONE mechanism, deliberately. A separate string test for `//` and `/\` was
  // written first and then removed: it and the resolution below each caught
  // every case the other did, so neither could be shown to be load-bearing —
  // dropping either one on its own left every test passing. Resolution is the
  // general form (WHATWG reads `/\` as `//`), so it is the one that stays.
  try {
    // The RETURN is the guarantee, not a test before it: `pathname + search`
    // cannot carry a scheme or an authority, so `//evil.example` resolves and
    // comes back as `/`. An origin comparison was written here first and
    // removed as dead — every mutation of it passed, because this line had
    // already made it unreachable.
    const resolved = new URL(value, "https://the99.invalid");
    return resolved.pathname + resolved.search;
  } catch {
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
