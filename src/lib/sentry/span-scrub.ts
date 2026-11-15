// What a traced span may carry to Sentry (`beforeSendSpan`, every runtime). Sentry 11 streams spans
// (`traceLifecycle: "stream"`, set explicitly in `options.ts`), and in that mode `beforeSendTransaction` is never called: every
// span, the segment ("transaction") included, passes here instead. Pure: every runtime and the tests load it.
//
// DEFAULT-DENY, the same rule as errors: nothing about who the reader is, and no URL beyond its route PATTERN.
//   - A URL is reduced: the app's own (a bare path, or a URL on the app's own host) to its route PATTERN, or `/[unknown]`
//     (`/_next/[path]` for build assets) when no route has it; any other host to its scheme and host alone
//     (`https://edhrec.com/[path]`), since a third party's path holds card and commander slugs.
//   - The NAME is kept only when it reduces to such a path, optionally after an HTTP method, or is one of Next's own fixed
//     span names (with a reduced path after it, or nothing). A `db` span leaves as its op alone: no SQL in its name,
//     its description or any attribute (a literal, quoted or not, could be a player's text or an id). Anything else, a `ui.*` span named by the element's selector (which carries `aria-label`,
//     `title` and `alt`, so a deck's or a friend's name) included, is replaced by the span's op.
//   - A STRING attribute is kept only when its key is on `STRING_KEEP` (fixed vocabularies: the op, the method, the SDK's
//     own fields), or is a URL key and reduces to a path as above. A web vital's element, target or source (an element
//     selector) is cut to its bare tag name. Every other string, and any array but the SDK's integration names, is dropped.
//   - A number or a boolean is kept (it cannot carry a name), except under `user.*`, `client.*` or an address key.
//   - A span the SDK named by its method alone (a server root at its start, an outgoing request) is named METHOD plus its
//     route pattern (`http.route`, `next.route`, `url.path`, `http.target`) or the reduced `url.full`; a name reduced to a path
//     marks `sentry.source`, `sentry.span.source` and `sentry.segment.name.source` as `route`, and a segment's
//     `sentry.segment.name` is its own scrubbed name. `sentry.description` is scrubbed like the name.
// The SDK sends a span UNMODIFIED when this throws, so it never throws: a failure leaves a span with no attributes.
import { routePattern } from "./route-pattern";
import { routeFileToPattern } from "./tags";

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
/** Where a name came from: kept only as one of the SDK's own words. */
const SOURCE_KEYS = new Set(["sentry.source", "sentry.span.source", "sentry.segment.name.source"]);
const SOURCE_WORDS = new Set(["custom", "url", "route", "view", "component", "task"]);
/** Where a span's own route is read from when the SDK named it by its method alone, best first. */
const ROUTE_KEYS = ["http.route", "next.route", "url.path", "http.target", "url.full"];
const BARE_METHOD = /^(RSC )?[A-Z]{3,7}$/;
const URL_KEYS = new Set(["url.full", "http.url", "url.path", "http.target", "url.original", "http.route", "url.template", "next.route", "next.span_name", "browser.web_vital.lcp.url"]);
const SQL_KEYS = new Set(["db.statement", "db.query.text"]);
const ELEMENT_KEY = /^browser\.web_vital\.[a-z]+\.(element|target|source(\.\d+)?)$/;
const NUMBER_DENIED = /^(user|client)\.|(^|\.)(ip|address|peer)(\.|$)/;

/** One of Next's own span names; what follows it is kept only when it is a reduced path (`fixedName`). */
const NEXT_NAME = /^(render route \(app\)|executing api route \(app\)|resolve page components|resolve segment modules|build component tree|start response|generateMetadata|generateViewport|Middleware\.execute|NextNodeServer\.[A-Za-z]+|AppRender\.[A-Za-z]+|AppRouteRouteHandlers\.[A-Za-z]+|middleware(?: [A-Z]{3,7})?)(?: (.*))?$/;
/** A reduced path, optionally with a method and an origin: what `scrubUrlish` makes is route patterns and `[...]` holders. */
const SAFE_PATH = /^(?:RSC )?(?:[A-Z]{3,7} )?(?:https?:\/\/[a-z0-9.-]+(?::\d+)?)?\/[a-z0-9._\-[\]/]*$/i;

/** The app's own hosts: production, staging and preview deployments, a dev machine, and the page the browser is on. */
function ownHost(host: string): boolean {
  if (/^(www\.)?the-99\.dev$|\.vercel\.app$|^localhost(:\d+)?$|^127\.0\.0\.1(:\d+)?$/i.test(host)) return true;
  return typeof window !== "undefined" && window.location?.host === host;
}

/** One of the app's paths, reduced to its route pattern; a path no route has says nothing more than that. */
function scrubPath(path: string): string {
  const bare = path.split(/[?#]/, 1)[0];
  // Next names a page by its route FILE in places (`/about/page`, `/(list)/commanders/page`): read that first, or
  // `/about/page` would fit `/about/[area]`.
  if (/\/(page|route)$|\/\(/.test(bare)) {
    const fromFile = routePattern(routeFileToPattern(bare));
    if (fromFile !== "[unknown]") return fromFile;
  }
  const pattern = routePattern(bare);
  if (pattern !== "[unknown]") return pattern;
  if (bare === "/_not-found") return bare;
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

/**
 * The one rule for which names may leave, for a span's own name and for the `sentry.segment.name` every span carries: a
 * reduced path (`GET /decks/[id]`, `RSC GET ...`) or one of Next's fixed names; null for anything else.
 */
export function acceptedName(reduced: string): string | null {
  if (SAFE_PATH.test(reduced)) return reduced;
  return fixedName(reduced);
}

const opName = (op: string | undefined) => (op && /^[a-z][a-z0-9._-]{0,63}$/i.test(op) ? op : "span");

/** A span's name as it may leave: a reduced path or one of Next's names, else the op (always the op for a `db` span). */
export function scrubSpanName(name: string, op?: string): string {
  if (op?.startsWith("db")) return opName(op);
  const reduced = reduceUrls(name);
  if (!op?.startsWith("ui.")) {
    const accepted = acceptedName(reduced);
    if (accepted !== null) return accepted;
  }
  return opName(op);
}

/** An element selector (`body > div.x > button[aria-label="..."]`) cut to its last element's bare tag name. */
export function tagNameOf(selector: string): string | undefined {
  // Quoted values and attribute selectors first, so a `>` inside an `aria-label` cannot pick the "tag".
  const bare = selector.replace(/"[^"]*"|'[^']*'/g, "").replace(/\[[^\]]*\]/g, "");
  const last = bare.split(">").pop()?.trim() ?? "";
  return /^[a-z][a-z0-9-]{0,31}/i.exec(last)?.[0].toLowerCase();
}

function scrubAttribute(key: string, value: unknown): unknown {
  if (typeof value === "number") return Number.isFinite(value) && !NUMBER_DENIED.test(key) ? value : undefined;
  if (typeof value === "boolean") return NUMBER_DENIED.test(key) ? undefined : value;
  if (Array.isArray(value)) {
    return key === "sentry.sdk.integrations" && value.every((v) => typeof v === "string" && /^[A-Za-z]{1,64}$/.test(v)) ? value : undefined;
  }
  if (typeof value !== "string") return undefined;
  if (ELEMENT_KEY.test(key)) return tagNameOf(value);
  if (key === "sentry.segment.name") return acceptedName(reduceUrls(value)) ?? undefined;
  if (URL_KEYS.has(key)) {
    const reduced = reduceUrls(value);
    if (SAFE_PATH.test(reduced)) return reduced;
    return key === "next.span_name" ? (fixedName(reduced) ?? undefined) : undefined;
  }
  if (SQL_KEYS.has(key)) return undefined;
  if (STRING_KEEP.has(key) && !PERSONAL.test(value) && value.length <= 128) return value;
  return undefined;
}

type SpanLike = { name: string; attributes?: Record<string, unknown> };

/** METHOD plus the span's own route, for a span the SDK named by its method alone; null when it has no route to read. */
function methodAndRoute(method: string, attributes: Record<string, unknown>): string | null {
  // Another site first: its path can match one of the app's routes and would be named as ours. Its host alone, then.
  const full = attributes["url.full"];
  if (typeof full === "string" && /^https?:\/\//i.test(full)) {
    try {
      const url = new URL(full);
      if (!ownHost(url.host)) return `${method} ${url.origin}/[path]`;
    } catch {
      return null;
    }
  }
  const server = attributes["server.address"];
  if (typeof server === "string" && /^[a-z0-9.-]+(:\d+)?$/i.test(server) && !ownHost(server)) {
    const scheme = attributes["url.scheme"] === "http" ? "http" : "https";
    return `${method} ${scheme}://${server.toLowerCase()}/[path]`;
  }
  for (const key of ROUTE_KEYS) {
    const value = attributes[key];
    if (typeof value !== "string" || !(value.startsWith("/") || /^https?:\/\//i.test(value))) continue;
    const named = reduceUrls(`${method} ${value}`);
    if (SAFE_PATH.test(named)) return named;
  }
  return null;
}

export function scrubSpan<T extends SpanLike & { is_segment?: boolean }>(span: T): T {
  try {
    const raw = span.attributes ?? {};
    const op = typeof raw["sentry.op"] === "string" ? (raw["sentry.op"] as string) : undefined;
    const attributes: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (SOURCE_KEYS.has(key)) {
        if (typeof value === "string" && SOURCE_WORDS.has(value)) attributes[key] = value;
        continue;
      }
      if (key === "sentry.description") continue;
      const kept = scrubAttribute(key, value);
      if (kept !== undefined) attributes[key] = kept;
    }
    const trimmed = span.name.trim();
    const byMethod = BARE_METHOD.test(trimmed) ? methodAndRoute(trimmed, raw) : null;
    const name = byMethod ?? scrubSpanName(span.name, op);
    // A name that is now a path is a route, whatever the SDK called it before the scrub.
    if (SAFE_PATH.test(name) && !op?.startsWith("db")) {
      for (const key of SOURCE_KEYS) if (key in raw) attributes[key] = "route";
    }
    // A segment's own `sentry.segment.name` is its name, scrubbed the same way (the SDK wrote it before any rename).
    if (span.is_segment && "sentry.segment.name" in raw) attributes["sentry.segment.name"] = name;
    if (typeof raw["sentry.description"] === "string") {
      attributes["sentry.description"] = byMethod ?? scrubSpanName(raw["sentry.description"] as string, op);
    }
    return { ...span, name, attributes };
  } catch {
    return { ...span, name: REDACTED, attributes: {} };
  }
}
