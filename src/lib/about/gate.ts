// The /about gate's pure half — everything the proxy decides before it touches
// a database, plus the `next` validation the dismiss action repeats.
//
// Pure so it can be tested: the proxy itself needs a request, a session and a
// Postgres connection, and none of the rules below need any of the three.

import { ABOUT_VERSION, type AboutEntry } from "../copy/about";
import { isFirstRun, switchedIds, unseenEntries, type SeenState } from "./visible";

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
  // An authority, rejected BEFORE resolution. This guard was removed once as
  // dead — its mutation passed — and that was wrong: the case testing it was
  // `//evil.example`, whose path is empty, so the resolved answer was `/` and
  // coincided with the fallback. `//evil.example/decks` resolves to `/decks`,
  // which never leaves the origin but sends the reader to a route they did not
  // ask for, and a crafted link decides which one. WHATWG reads a leading
  // `/\` the same way.
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/";
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
  // The bare roots as well as the prefixes: the proxy's matcher includes
  // `/(api|trpc)(.*)`, which matches `/api` with no trailing slash, and a
  // signed-in HTML GET to it would otherwise enter the gate's read and its
  // redirect instead of being left to the handler or to a 404.
  for (const ns of ["/api", "/trpc", "/_next"]) {
    if (pathname === ns || pathname.startsWith(`${ns}/`)) return false;
  }
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

// ---------------------------------------------------------------------------
// The sheet (About R6). With `ABOUT_SHEET_ENABLED` on, nothing above redirects:
// the proxy decides whether a document load draws the one-time sheet instead,
// and hands that decision to the root layout on a request header.

/**
 * The sheet's cookie: "this browser has SHOWN the sheet for version N, as this
 * account". A NEW name on purpose (R6 audit E1). `about_v` means "SENT to N",
 * and a browser that was redirected and never acknowledged still holds
 * `<userId>.9` — reading that as "shown" would hide the sheet from exactly the
 * readers who are behind.
 */
export const SHEET_COOKIE = "about_sheet";

/**
 * Set by the proxy on a document load that draws the sheet: `0` for a first-run reader, or the
 * ids of the visible entries this reader has not seen, comma-separated, in page order.
 */
export const SHEET_HEADER = "x-about-sheet";

/**
 * The sheet cookie's value: the reader, the version, and every switched entry this deployment
 * draws. The switched ids are what retire it when a switch flips: a browser that has shown the
 * sheet for one set of entries has not shown it for a set with one more in it, so the cookie
 * stops matching and the proxy decides again. With no switch on it is `<userId>.<version>`,
 * byte for byte what it was before entries had switches, so no browser is re-asked.
 */
export function sheetCookieValue(
  userId: string,
  visible: readonly AboutEntry[],
  version: number = ABOUT_VERSION,
): string {
  return [cookieValue(userId, version), ...switchedIds(visible)].join("+");
}

/** True when this browser has already shown the sheet for these entries, as this reader. */
export function sheetCookieIsCurrent(
  raw: string | undefined,
  userId: string,
  visible: readonly AboutEntry[],
  version: number = ABOUT_VERSION,
): boolean {
  return raw === sheetCookieValue(userId, visible, version);
}

/**
 * A full document load — the only request that renders the root layout, and so
 * the only one that can draw the sheet.
 *
 * The opposite of `gateHandles`'s rule on purpose. A redirect is followed on a
 * client transition, so the gate acts on RSC requests; the sheet is DRAWN by the
 * root layout, which a client transition keeps mounted and never re-renders. A
 * sheet decided on an RSC request would be marked shown in the cookie without
 * ever reaching the screen — a tab left open across the deploy would lose it.
 */
export function isDocumentLoad(method: string, headers: Headers): boolean {
  if (method !== "GET") return false;
  if (headers.get("Next-Router-Prefetch") === "1") return false;
  if (headers.get("purpose") === "prefetch") return false;
  if (headers.get("RSC") === "1") return false;
  return (headers.get("accept") ?? "").includes("text/html");
}

export type SheetDecision =
  | { show: false; cookie: string }
  | { show: true; header: string; cookie: string };

/**
 * Whether this document load draws the sheet, and what the header tells the root layout. Both
 * answers carry the cookie, so the sheet shows once per browser per set of entries and a
 * current reader costs one read.
 */
export function sheetDecision(args: {
  userId: string;
  seen: SeenState;
  visible: readonly AboutEntry[];
  version?: number;
}): SheetDecision {
  const cookie = sheetCookieValue(args.userId, args.visible, args.version ?? ABOUT_VERSION);
  if (isFirstRun(args.seen)) return { show: true, header: "0", cookie };
  const unseen = unseenEntries(args.visible, args.seen);
  if (unseen.length === 0) return { show: false, cookie };
  return { show: true, header: unseen.map((e) => e.id).join(","), cookie };
}
