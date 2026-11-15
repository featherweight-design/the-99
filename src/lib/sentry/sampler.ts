// Which traces are kept (`tracesSampler`, every runtime). Pure: the browser, the server and the tests load it.
//
// One rate for the app, `TRACE_SAMPLE_RATE`: lower it here, in one line, if the span quota needs it. Two exceptions,
// matched on every path the SDK hands over (the span's name, the request's URL, the URL attributes, the address bar),
// so a name Next has not parameterized yet still matches:
//   - DROPPED (0): routes a machine calls on a timer or anyone can call, which say nothing about a reader's speed:
//     the readiness and liveness checks, the crons, and the public CSP report sink (a stranger could post to it).
//   - QUIET (`QUIET_SAMPLE_RATE`): routes a page calls over and over (a scan asks per card, a table polls every 20s),
//     where 10% would be most of the quota and a hundredth still shows their latency.
// An incoming trace (`sentry-trace`, `baggage`) decides only on ordinary routes: `parentSampled` is honoured there, so a
// browser's page load and the server work it caused are kept or dropped together and their traces link. On a DROPPED
// route the answer is 0 whatever the parent says, so nothing can force it. On a QUIET route the parent's flag is ignored
// and the quiet rate returned, but core still compares that rate with the incoming `sample_rand`, so a caller sending
// `sentry-sample_rand=0.000001` can force a quiet or ordinary route. That only spends the free span quota (Developer plan,
// no payment method: overage is dropped, never billed; the error quota is separate), and anyone holding the public DSN
// could post spans straight to Sentry anyway.

export const TRACE_SAMPLE_RATE = 0.1;
export const QUIET_SAMPLE_RATE = 0.01;

const DROPPED: readonly RegExp[] = [/^\/api\/health$/, /^\/api\/live$/, /^\/api\/cron(\/|$)/, /^\/api\/csp-report$/];

const QUIET: readonly RegExp[] = [
  /^\/api\/card-scan\/(match|timing)$/,
  /^\/api\/rule-zero\/tables\/[^/]+$/,
  /^\/api\/nav-stall$/,
  /^\/api\/scan-lab\//,
];

/** What the SDK passes the sampler, as far as this reads it. */
export type SamplerContext = {
  name?: string;
  parentSampled?: boolean;
  attributes?: Record<string, unknown>;
  normalizedRequest?: { url?: string };
  location?: { pathname?: string };
};

const URL_ATTRIBUTES = ["url.path", "http.target", "url.full", "http.url", "http.route", "next.route", "sentry.segment.name"];

/** A path from a span name (`GET /api/health`), a full URL or a bare path; null when it holds none. */
function pathOf(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const rest = value.trim().replace(/^[A-Z]+\s+/, "");
  let path: string;
  if (/^https?:\/\//i.test(rest)) {
    try {
      path = new URL(rest).pathname;
    } catch {
      return null;
    }
  } else if (rest.startsWith("/")) {
    path = rest;
  } else {
    return null;
  }
  return path.split(/[?#]/, 1)[0].replace(/\/+$/, "").toLowerCase() || "/";
}

export function pathsOf(ctx: SamplerContext): string[] {
  const values: unknown[] = [ctx.name, ctx.normalizedRequest?.url, ctx.location?.pathname];
  for (const key of URL_ATTRIBUTES) values.push(ctx.attributes?.[key]);
  return values.map(pathOf).filter((p): p is string => p !== null);
}

/**
 * The sample rate for a root span: 0 for a dropped route and the quiet rate for a chatty one, whatever the parent says;
 * otherwise the parent's decision when there is one (so traces link), else `TRACE_SAMPLE_RATE`.
 */
export function traceRate(ctx: SamplerContext): number {
  const paths = pathsOf(ctx);
  if (paths.some((p) => DROPPED.some((re) => re.test(p)))) return 0;
  if (paths.some((p) => QUIET.some((re) => re.test(p)))) return QUIET_SAMPLE_RATE;
  if (typeof ctx.parentSampled === "boolean") return ctx.parentSampled ? 1 : 0;
  return TRACE_SAMPLE_RATE;
}
