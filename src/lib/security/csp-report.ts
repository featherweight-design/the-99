/**
 * Reads a browser's CSP violation report down to one log line. Pure.
 *
 * The endpoint is public (a browser sends reports with no session) and anyone can POST to it, so
 * what comes out is built only from fields that are cut to a closed shape: a directive name from a
 * fixed alphabet, an origin without path or query, a page path without query. Nothing a reporter
 * typed reaches the log as free text, and a report that does not parse to those shapes is dropped.
 */

/** Largest body read; a real report is well under 2 KB. */
export const MAX_REPORT_BYTES = 16 * 1024;

const DIRECTIVE = /^[a-z-]{3,40}$/;

/** `https://host` from a URL, or one of CSP's keywords (`inline`, `eval`, `data`, `blob`, `self`); else null. */
export function originOf(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) return null;
  if (/^(inline|eval|data|blob|self|wasm-eval|trusted-types-policy)$/.test(value)) return value;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" && u.protocol !== "http:") {
      const scheme = u.protocol.replace(":", "");
      return /^[a-z][a-z0-9+.-]{0,15}$/.test(scheme) ? scheme : null;
    }
    return /^[a-z0-9.-]{1,100}(:\d{1,5})?$/i.test(u.host) ? `${u.protocol}//${u.host}` : null;
  } catch {
    return null;
  }
}

/** The path of a page URL with no query or fragment, as ids are never in a path the app's pages put there. */
function pathOf(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const p = new URL(value).pathname;
    // Collapse anything id-shaped, so a deck's uuid is not logged.
    return p.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id").slice(0, 80);
  } catch {
    return null;
  }
}

export type CspViolation = { directive: string; blocked: string; page: string };

/** The violations in a body: the legacy `{"csp-report": {...}}` shape, or the Reporting API's array. */
export function parseReports(raw: unknown): CspViolation[] {
  const items: unknown[] = Array.isArray(raw) ? raw : [raw];
  const out: CspViolation[] = [];
  for (const item of items.slice(0, 10)) {
    if (typeof item !== "object" || item === null) continue;
    const o = item as Record<string, unknown>;
    const body = (o["csp-report"] ?? o.body ?? null) as Record<string, unknown> | null;
    if (typeof body !== "object" || body === null) continue;
    const directive = String(body["effective-directive"] ?? body.effectiveDirective ?? body["violated-directive"] ?? "").split(" ")[0];
    const blocked = originOf(body["blocked-uri"] ?? body.blockedURL ?? body.blockedURI);
    const page = pathOf(body["document-uri"] ?? body.documentURL ?? body.documentURI);
    if (!DIRECTIVE.test(directive) || !blocked || !page) continue;
    out.push({ directive, blocked, page });
  }
  return out;
}

/** A log budget per instance and minute, so a flood of reports cannot become a flood of log lines. */
export function makeLogBudget(perMinute: number, now: () => number = Date.now) {
  let minute = 0;
  let used = 0;
  return (): boolean => {
    const m = Math.floor(now() / 60_000);
    if (m !== minute) { minute = m; used = 0; }
    if (used >= perMinute) return false;
    used += 1;
    return true;
  };
}
