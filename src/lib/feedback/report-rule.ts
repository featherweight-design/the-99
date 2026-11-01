// What a problem report accepts (flyer trial PR 5). Pure: the action validates with it, the form counts with it.
// Nothing here reaches a model prompt, so none of it goes through `playerText`.

import { redactLinkTokens } from "../sentry/scrub";

/** The caps the form and the action share. */
export const WHAT_MAX = 2000;
export const DOING_MAX = 1000;
const PAGE_MAX = 200;
const ID_MAX = 64;

/** Which door the form was opened from. */
export const REPORT_SOURCES = ["error", "about", "report"] as const;
export type ReportSource = (typeof REPORT_SOURCES)[number];

export type ReportInput = {
  what: unknown;
  doing: unknown;
  /** The path the reader was on (`location.pathname`); the action keeps the path alone. */
  page: unknown;
  source: unknown;
  /** The boundary's digest, when a server error carried one. */
  digest: unknown;
  /** The Sentry event id of a browser-side throw. */
  sentryEventId: unknown;
};

export type ParsedReport = {
  what: string;
  doing: string | null;
  page: string | null;
  source: ReportSource;
  digest: string | null;
  sentryEventId: string | null;
};

/** An id the app handed out (a digest, a Sentry event id): short and made of word characters, else nothing. */
function idOf(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= ID_MAX && /^[\w-]+$/.test(value) ? value : null;
}

/** A path only: no origin, query or hash, a link token replaced, capped. A value that is not a path is nothing. */
export function pageOf(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return null;
  // Control characters go first: one inside a token (`/join/AB\u0001CD`) would otherwise split it past the redaction.
  const path = redactLinkTokens(value.split(/[?#]/, 1)[0].replace(/[\u0000-\u001f\u007f]/g, ""));
  return path.slice(0, PAGE_MAX) || null;
}

/** The report as stored, or null when the first box is empty, a field is not a string over its cap, or the door is unknown. */
export function parseReport(input: ReportInput): ParsedReport | null {
  if (typeof input.what !== "string" || typeof input.doing !== "string") return null;
  // A NUL cannot be stored in the jsonb answers (the insert would fail after the visit was counted).
  const what = input.what.replace(/\u0000/g, "").trim();
  const doing = input.doing.replace(/\u0000/g, "").trim();
  if (what.length === 0 || what.length > WHAT_MAX || doing.length > DOING_MAX) return null;
  if (!REPORT_SOURCES.includes(input.source as ReportSource)) return null;
  return {
    what,
    doing: doing.length > 0 ? doing : null,
    page: pageOf(input.page),
    source: input.source as ReportSource,
    digest: idOf(input.digest),
    sentryEventId: idOf(input.sentryEventId),
  };
}

/**
 * A coarse device line from the user agent: the browser and the system, never the version string or the whole header.
 * "Safari on iPhone", "Chrome on Windows". Unknown parts read as "Unknown".
 */
export function deviceSummary(userAgent: string | null | undefined): string {
  const ua = userAgent ?? "";
  const system =
    /iPhone|iPod/.test(ua) ? "iPhone"
    : /iPad/.test(ua) ? "iPad"
    : /Android/.test(ua) ? "Android"
    : /Windows/.test(ua) ? "Windows"
    : /Mac OS X|Macintosh/.test(ua) ? "Mac"
    : /CrOS/.test(ua) ? "ChromeOS"
    : /Linux/.test(ua) ? "Linux"
    : "Unknown";
  const browser =
    /Edg(e|A|iOS)?\//.test(ua) ? "Edge"
    : /OPR\/|Opera/.test(ua) ? "Opera"
    : /Firefox\/|FxiOS\//.test(ua) ? "Firefox"
    : /CriOS\/|Chrome\//.test(ua) ? "Chrome"
    : /Safari\//.test(ua) ? "Safari"
    : "Unknown";
  return `${browser} on ${system}`;
}
