// What a traced span may carry to Sentry (`beforeSendSpan`, every runtime). Sentry 11 streams spans
// (`traceLifecycle: "stream"`, set explicitly in `options.ts`), and in that mode `beforeSendTransaction` is never called: every
// span, the segment ("transaction") included, passes here instead. Pure: every runtime and the tests load it.
//
// The same rule as errors: nothing about who the reader is, and no URL beyond its route PATTERN.
//   - the name, and every URL or path inside it, becomes the route pattern (`/decks/[id]`); a path no route has keeps only
//     its plain lowercase segments (`/v1/users/[id]`); an email or a Clerk id anywhere in it becomes `[redacted]`;
//   - `user.*`, every header, query, fragment, cookie and body attribute, the client address and the user agent are dropped;
//   - a URL attribute (`url.full`, `http.url`, ...) is reduced like the name; a SQL statement loses its string literals;
//   - any other string attribute that holds an email or a Clerk id is dropped.
// The SDK sends a span UNMODIFIED when this throws, so it never throws: a failure leaves a span with no attributes.
import { routePattern } from "./route-pattern";
import { redactLinkTokens } from "./scrub";

const REDACTED = "[redacted]";

/** An email, or a Clerk user, session or organization id: never sent, wherever it appears. */
export const PERSONAL = /[^\s@/]+@[^\s@/]+\.[a-z]{2,}|\b(user|sess|org)_[A-Za-z0-9]{6,}/i;

const DROPPED_KEY = /^user\.|(^|\.)(query|fragment|cookies?|headers?|body)(\.|$)|^client\.address$|^http\.client_ip$|^net\.(sock\.)?peer\.|user_agent|^http\.user_agent$/;
const URL_KEYS = new Set(["url.full", "http.url", "url.path", "http.target", "url.original", "http.route", "sentry.segment.name", "url.template", "next.route"]);
const SQL_KEYS = new Set(["db.statement", "db.query.text"]);

/** A path reduced to its route pattern, or for a path no route has, its plain segments with the rest `[id]`. */
function scrubPath(path: string): string {
  const bare = path.split(/[?#]/, 1)[0];
  const pattern = routePattern(bare);
  if (pattern !== "[unknown]") return pattern;
  const segments = bare.split("/").map((s) => (s === "" || /^[a-z][a-z-]{0,23}$/.test(s) || /^v\d{1,2}$/.test(s) ? s : "[id]"));
  return redactLinkTokens(segments.join("/"));
}

/** A full URL or a path, reduced: the origin kept, the path to a pattern, the query and fragment gone. */
export function scrubUrlish(value: string): string {
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      return `${url.origin}${scrubPath(url.pathname)}`;
    } catch {
      return REDACTED;
    }
  }
  return value.startsWith("/") ? scrubPath(value) : value;
}

const stripSqlLiterals = (sql: string) => sql.replace(/'(?:[^']|'')*'/g, "'?'");

/** A span's name: SQL literals cut, every URL or path in it reduced, any email or Clerk id replaced. */
export function scrubSpanName(name: string): string {
  const reduced = stripSqlLiterals(name).replace(/(https?:\/\/[^\s]+|(?<![\w.])\/[^\s]*)/g, (m) => scrubUrlish(m));
  return PERSONAL.test(reduced) ? reduced.replace(new RegExp(PERSONAL.source, "gi"), REDACTED) : reduced;
}

function scrubAttribute(key: string, value: unknown): unknown {
  if (DROPPED_KEY.test(key)) return undefined;
  if (typeof value === "string") {
    if (URL_KEYS.has(key)) return scrubSpanName(value);
    if (SQL_KEYS.has(key)) return scrubSpanName(value);
    if (PERSONAL.test(value)) return undefined;
    if (/^https?:\/\//i.test(value) || value.startsWith("/")) return scrubUrlish(value);
    return value;
  }
  if (Array.isArray(value) && value.some((v) => typeof v === "string" && PERSONAL.test(v))) return undefined;
  return value;
}

type SpanLike = { name: string; attributes?: Record<string, unknown> };

export function scrubSpan<T extends SpanLike>(span: T): T {
  try {
    const attributes: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(span.attributes ?? {})) {
      const kept = scrubAttribute(key, value);
      if (kept !== undefined) attributes[key] = kept;
    }
    return { ...span, name: scrubSpanName(span.name), attributes };
  } catch {
    return { ...span, name: REDACTED, attributes: {} };
  }
}
