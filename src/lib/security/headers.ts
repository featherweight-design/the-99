/**
 * The response headers every page and route carries (payments scope PR S, 2026-10-13). Pure: no
 * imports from the app, so `next.config.ts` can load it at build time.
 *
 * ENFORCED: the five headers that cannot change what a page does. A Content-Security-Policy is
 * sent REPORT-ONLY first, because a policy enforced blind would take the app down: the violations
 * it reports (`/api/csp-report`) are the measurement the enforced policy is written from.
 *
 * What the policy has to allow is what the app loads today, found by reading `src/`:
 *   - Scryfall's card images (`cards.scryfall.io`) and symbols (`svgs.scryfall.io`);
 *   - Clerk's browser script and API, on the Frontend API host the publishable key names, plus its
 *     telemetry, avatars and bot-challenge frame. Signing in and the account page are Clerk's HOSTED
 *     pages (#1606), a full navigation away from this origin, so nothing here governs them;
 *   - Next's own inline scripts and styles, hence `'unsafe-inline'` until a nonce is wired through
 *     the proxy (a later step, once the reports say what else is left);
 *   - the service worker (`/sw.js`, same origin) and the manifest, both `'self'`.
 */

export type HeaderEntry = { key: string; value: string };

/** The Frontend API host a Clerk publishable key names: `pk_test_<base64 of "host$">`. Null if it is not one. */
export function clerkFrontendHost(publishableKey: string | undefined): string | null {
  const m = /^pk_(?:test|live)_([A-Za-z0-9+/=_-]+)$/.exec(publishableKey ?? "");
  if (!m) return null;
  try {
    const host = Buffer.from(m[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return /^[a-z0-9.-]+\$$/i.test(host) ? host.slice(0, -1) : null;
  } catch {
    return null;
  }
}

/** The report-only policy. `clerkHost` is added to the script, connect and frame sources when known. */
export function contentSecurityPolicy(clerkHost: string | null): string {
  const clerk = clerkHost ? [`https://${clerkHost}`] : [];
  const sources = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...clerk, "https://challenges.cloudflare.com"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https://cards.scryfall.io", "https://svgs.scryfall.io", "https://img.clerk.com"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", ...clerk, "https://clerk-telemetry.com"],
    "frame-src": ["https://challenges.cloudflare.com"],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  } as const;
  const body = Object.entries(sources).map(([d, v]) => `${d} ${v.join(" ")}`).join("; ");
  return `${body}; report-uri ${CSP_REPORT_PATH}`;
}

export const CSP_REPORT_PATH = "/api/csp-report";

/**
 * Every header, for every path. HSTS omits `includeSubDomains` and `preload` on purpose: the apex
 * hosts other things, and a preload is not undoable. `camera=(self)` leaves the camera to this origin for the card
 * scanner's route. Microphone, geolocation, payment, USB and the interest cohort are denied. Every directive
 * NOT named keeps its browser default, deliberately (the app uses the clipboard, for one).
 */
export function securityHeaders(opts: { production: boolean; clerkHost: string | null }): HeaderEntry[] {
  const enforced: HeaderEntry[] = [
    { key: "Strict-Transport-Security", value: "max-age=31536000" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  ];
  // Development serves eval'd scripts and a websocket, which would drown the reports in noise.
  return opts.production
    ? [...enforced, { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy(opts.clerkHost) }]
    : enforced;
}
