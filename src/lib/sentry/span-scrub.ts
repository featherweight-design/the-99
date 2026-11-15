// What a traced span may carry to Sentry (`beforeSendSpan`, every runtime). Sentry 11 streams spans
// (`traceLifecycle: "stream"`, set explicitly in `options.ts`), and in that mode `beforeSendTransaction` is never called: every
// span, the segment ("transaction") included, passes here instead. Pure: every runtime and the tests load it.
//
// DEFAULT-DENY, the same rule as errors: nothing about who the reader is, and no URL beyond its route PATTERN.
//   - A URL is reduced: the app's own (a bare path, or a URL on the app's own host) to its route PATTERN, or `/[unknown]`
//     (`/_next/[path]` for build assets) when no route has it; any other host to its scheme and host alone
//     (`https://edhrec.com/[path]`), since a third party's path holds card and commander slugs.
//   - The NAME is kept only when it reduces to such a path, optionally after an HTTP method, or is one of Next's own fixed
//     span names (with a reduced path after it, or nothing), or is SQL (a `db` span, string literals cut). Anything else, a `ui.*` span named by the element's selector (which carries `aria-label`,
//     `title` and `alt`, so a deck's or a friend's name) included, is replaced by the span's op.
//   - A STRING attribute is kept only when its key is on `STRING_KEEP` (fixed vocabularies: the op, the method, the SDK's
//     own fields), or is a URL key and reduces to a path as above. A web vital's element, target or source (an element
//     selector) is cut to its bare tag name. Every other string, and any array but the SDK's integration names, is dropped.
//   - A number or a boolean is kept (it cannot carry a name), except under `user.*`, `client.*` or an address key.
// The SDK sends a span UNMODIFIED when this throws, so it never throws: a failure leaves a span with no attributes.
import { routePattern } from "./route-pattern";

const REDACTED = "[redacted]";

/** An email, or a Clerk user, session or organization id: never sent, wherever it appears. */
export const PERSONAL = /[^\s@/]+@[^\s@/]+\.[a-z]{2,}|\b(user|sess|org)_[A-Za-z0-9]{6,}/i;

const STRING_KEEP = new Set([
  "sentry.op", "sentry.origin", "sentry.source", "sentry.span.source", "sentry.segment.id", "sentry.release", "sentry.environment",
  "sentry.sdk.name", "sentry.sdk.version", "sentry.trace.lifecycle", "sentry.trace_lifecycle", "sentry.idle_span_finish_reason",
  "http.request.method", "http.method", "url.scheme", "server.address", "network.protocol.name", "network.protocol.version",
  "db.system", "db.system.name", "db.operation", "db.operation.name", "next.span_type", "otel.kind",
  "browser.web_vital.inp.interaction_type", "resource.render_blocking_status", "browser.script.invoker_type",
]);
const URL_KEYS = new Set(["url.full", "http.url", "url.path", "http.target", "url.original", "http.route", "sentry.segment.name", "url.template", "next.route", "next.span_name", "browser.web_vital.lcp.url"]);
const SQL_KEYS = new Set(["db.statement", "db.query.text"]);
const ELEMENT_KEY = /^browser\.web_vital\.[a-z]+\.(element|target|source(\.\d+)?)$/;
const NUMBER_DENIED = /^(user|client)\.|(^|\.)(ip|address|peer)(\.|$)/;

/** One of Next's own span names; what follows it is kept only when it is a reduced path (`fixedName`). */
const NEXT_NAME = /^(render route \(app\)|executing api route \(app\)|resolve page components|resolve segment modules|build component tree|start response|generateMetadata|generateViewport|Middleware\.execute|NextNodeServer\.[A-Za-z]+|AppRender\.[A-Za-z]+|AppRouteRouteHandlers\.[A-Za-z]+)(?: (.*))?$/;
/** A reduced path, optionally with a method and an origin: what `scrubUrlish` makes is route patterns and `[...]` holders. */
const SAFE_PATH = /^(?:[A-Z]{3,7} )?(?:https?:\/\/[a-z0-9.-]+(?::\d+)?)?\/[a-z0-9._\-[\]/]*$/i;

/** The app's own hosts: production, staging and preview deployments, a dev machine, and the page the browser is on. */
function ownHost(host: string): boolean {
  if (/^(www\.)?the-99\.dev$|\.vercel\.app$|^localhost(:\d+)?$|^127\.0\.0\.1(:\d+)?$/i.test(host)) return true;
  return typeof window !== "undefined" && window.location?.host === host;
}

/** One of the app's paths, reduced to its route pattern; a path no route has says nothing more than that. */
function scrubPath(path: string): string {
  const pattern = routePattern(path.split(/[?#]/, 1)[0]);
  if (pattern !== "[unknown]") return pattern;
  return path.startsWith("/_next/") ? "/_next/[path]" : "/[unknown]";
}

/** A full URL or a path, reduced: the app's own to a route pattern, another host's to its scheme and host, no query. */
export function scrubUrlish(value: string): string {
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (!ownHost(url.host)) return `${url.origin}/[path]`;
      return `${url.origin}${scrubPath(url.pathname)}`;
    } catch {
      return REDACTED;
    }
  }
  return value.startsWith("/") ? scrubPath(value) : value;
}

/** One of Next's own names, with what follows kept only when it is a reduced path; null when it is not one of them. */
function fixedName(reduced: string): string | null {
  const m = NEXT_NAME.exec(reduced);
  if (!m) return null;
  return m[2] !== undefined && SAFE_PATH.test(m[2]) ? reduced : m[1];
}

const stripSqlLiterals = (sql: string) => sql.replace(/'(?:[^']|'')*'/g, "'?'");

/** Every URL or path in a string reduced, SQL literals cut, any email or Clerk id replaced. */
export function reduceUrls(name: string): string {
  const reduced = stripSqlLiterals(name).replace(/(https?:\/\/[^\s]+|(?<![\w.])\/[^\s]*)/g, (m) => scrubUrlish(m));
  return PERSONAL.test(reduced) ? reduced.replace(new RegExp(PERSONAL.source, "gi"), REDACTED) : reduced;
}

/** A span's name as it may leave: a reduced path, one of Next's names, SQL on a `db` span, else the op. */
export function scrubSpanName(name: string, op?: string): string {
  const reduced = reduceUrls(name);
  if (op?.startsWith("db")) return reduced;
  if (!op?.startsWith("ui.")) {
    if (SAFE_PATH.test(reduced)) return reduced;
    const fixed = fixedName(reduced);
    if (fixed !== null) return fixed;
  }
  return op && /^[a-z][a-z0-9._-]{0,63}$/i.test(op) ? op : "span";
}

/** An element selector (`body > div.x > button[aria-label="..."]`) cut to its last element's bare tag name. */
export function tagNameOf(selector: string): string | undefined {
  // Quoted values and attribute selectors first, so a `>` inside an `aria-label` cannot pick the "tag".
  const bare = selector.replace(/"[^"]*"|'[^']*'/g, "").replace(/\[[^\]]*\]/g, "");
  const last = bare.split(">").pop()?.trim() ?? "";
  return /^[a-z][a-z0-9-]{0,31}/i.exec(last)?.[0].toLowerCase();
}

function scrubAttribute(key: string, value: unknown, op: string | undefined): unknown {
  if (typeof value === "number") return Number.isFinite(value) && !NUMBER_DENIED.test(key) ? value : undefined;
  if (typeof value === "boolean") return NUMBER_DENIED.test(key) ? undefined : value;
  if (Array.isArray(value)) {
    return key === "sentry.sdk.integrations" && value.every((v) => typeof v === "string" && /^[A-Za-z]{1,64}$/.test(v)) ? value : undefined;
  }
  if (typeof value !== "string") return undefined;
  if (ELEMENT_KEY.test(key)) return tagNameOf(value);
  if (URL_KEYS.has(key)) {
    const reduced = reduceUrls(value);
    if (SAFE_PATH.test(reduced)) return reduced;
    return key === "next.span_name" ? (fixedName(reduced) ?? undefined) : undefined;
  }
  if (SQL_KEYS.has(key)) return op?.startsWith("db") ? reduceUrls(value) : undefined;
  if (STRING_KEEP.has(key) && !PERSONAL.test(value) && value.length <= 128) return value;
  return undefined;
}

type SpanLike = { name: string; attributes?: Record<string, unknown> };

export function scrubSpan<T extends SpanLike>(span: T): T {
  try {
    const op = typeof span.attributes?.["sentry.op"] === "string" ? (span.attributes["sentry.op"] as string) : undefined;
    const attributes: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(span.attributes ?? {})) {
      const kept = scrubAttribute(key, value, op);
      if (kept !== undefined) attributes[key] = kept;
    }
    return { ...span, name: scrubSpanName(span.name, op), attributes };
  } catch {
    return { ...span, name: REDACTED, attributes: {} };
  }
}
