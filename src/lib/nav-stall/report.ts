/**
 * The stuck-loader report: what the browser knew when a loading screen had been up for
 * `STALL_AFTER_MS`, in a shape the server can check field by field. Shared by the client that
 * builds it and the route that logs it.
 *
 * Nothing in it is free text. Paths are reduced to PATTERNS (every segment the app does not name
 * becomes `[x]`, and the query is dropped), so no deck id, slug or search reaches a log; every
 * other field is a closed enum, a boolean or a bounded integer. The client's deployment id is sent
 * only so the server can say whether it is its own: the line logs `skew`, never the id.
 */

/** How long a loading screen stays up before the browser reports it. */
export const STALL_AFTER_MS = 8_000;

/** The largest body the route reads. A real report is about 500 bytes. */
export const MAX_STALL_BYTES = 2_048;

/** Every literal path segment the app routes on. Anything else is an id, a slug or a code. */
const KNOWN_SEGMENTS = new Set([
  "about", "accounts", "admin", "changes", "choose", "collection", "commanders", "decks", "discover",
  "groups", "history", "import", "models", "new", "precons", "proxies", "replace", "sets", "shopping",
  "summary", "switches",
]);

const MAX_SEGMENTS = 6;

/** `/decks/0b49…/import?x=1` → `/decks/[x]/import`. */
export function pathPattern(href: string): string {
  const path = href.split(/[?#]/)[0] ?? "";
  const segments = path.split("/").filter(Boolean).slice(0, MAX_SEGMENTS);
  return `/${segments.map((s) => (KNOWN_SEGMENTS.has(s) ? s : "[x]")).join("/")}`;
}

function isPattern(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 120) return false;
  if (value === "/") return true;
  if (!value.startsWith("/")) return false;
  const segments = value.slice(1).split("/");
  return segments.length <= MAX_SEGMENTS && segments.every((s) => s === "[x]" || KNOWN_SEGMENTS.has(s));
}

/** Which loading screen is up: the pending overlay, the in-page Suspense card, both, or neither. */
export const LOADERS = ["overlay", "fallback", "both", "none"] as const;
/** What started the report: a navigation still pending, or a page that committed into its fallback. */
export const KINDS = ["pending", "fallback"] as const;
/** `navigator.connection.effectiveType`, where the browser has it. */
export const CONNECTIONS = ["slow-2g", "2g", "3g", "4g", "unknown"] as const;
/**
 * How far the navigation's own RSC request for the target got (never a prefetch's): `none` (no
 * request started), `waiting` (no response yet), `headers` (the response began and its body has not
 * finished arriving) or `done` (the body arrived whole).
 */
export const RSC_STATES = ["none", "waiting", "headers", "done"] as const;

export type StallReport = {
  kind: (typeof KINDS)[number];
  from: string;
  to: string;
  at: string;
  /** The address bar already shows the target. */
  moved: boolean;
  elapsedMs: number;
  loader: (typeof LOADERS)[number];
  rsc: (typeof RSC_STATES)[number];
  /** The response's HTTP status once it began (0 before then). */
  rscStatus: number;
  /** From the request's start to its last stage reached: the headers, or the whole body. */
  rscMs: number;
  /** The bytes that arrived, once the body is whole (0 before then, or from a cache). */
  rscBytes: number;
  visible: boolean;
  /** The page was hidden at some point while it waited (a backgrounded tab is frozen, not stuck). */
  wasHidden: boolean;
  online: boolean;
  connection: (typeof CONNECTIONS)[number];
  /** A service worker controls the page. */
  worker: boolean;
  /** The deployment the page was loaded from, compared on the server and never logged. */
  deployment: string | null;
};

function int(value: unknown, max: number): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= max ? value : null;
}

function oneOf<T extends string>(value: unknown, set: readonly T[]): T | null {
  return typeof value === "string" && (set as readonly string[]).includes(value) ? (value as T) : null;
}

const DEPLOYMENT = /^dpl_[A-Za-z0-9]{1,48}$/;

/** The report, or null when any field is missing, out of range or not one of its closed values. */
export function parseStall(raw: unknown): StallReport | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const kind = oneOf(r.kind, KINDS);
  const loader = oneOf(r.loader, LOADERS);
  const rsc = oneOf(r.rsc, RSC_STATES);
  const connection = oneOf(r.connection, CONNECTIONS);
  const elapsedMs = int(r.elapsedMs, 3_600_000);
  const rscStatus = int(r.rscStatus, 599);
  const rscMs = int(r.rscMs, 3_600_000);
  const rscBytes = int(r.rscBytes, 100_000_000);
  const bools = [r.moved, r.visible, r.wasHidden, r.online, r.worker];
  const deployment = r.deployment === null ? null : typeof r.deployment === "string" && DEPLOYMENT.test(r.deployment) ? r.deployment : undefined;
  if (
    !kind || !loader || !rsc || !connection ||
    elapsedMs === null || rscStatus === null || rscMs === null || rscBytes === null ||
    !isPattern(r.from) || !isPattern(r.to) || !isPattern(r.at) ||
    bools.some((b) => typeof b !== "boolean") || deployment === undefined
  ) {
    return null;
  }
  return {
    kind, from: r.from, to: r.to, at: r.at, moved: r.moved as boolean, elapsedMs, loader,
    rsc, rscStatus, rscMs, rscBytes, visible: r.visible as boolean, wasHidden: r.wasHidden as boolean,
    online: r.online as boolean, connection, worker: r.worker as boolean, deployment,
  };
}

/** `same`, `other` (the page was loaded from another deployment: it outlived a deploy) or `unknown`. */
export function skewOf(client: string | null, server: string | undefined): "same" | "other" | "unknown" {
  if (!client || !server) return "unknown";
  return client === server ? "same" : "other";
}

/** One log line, every field `key=value`, so a log search can filter on any of them. */
export function stallLine(r: StallReport, skew: "same" | "other" | "unknown"): string {
  return (
    `[nav-stall] kind=${r.kind} from=${r.from} to=${r.to} at=${r.at} moved=${r.moved} ` +
    `elapsed=${r.elapsedMs} loader=${r.loader} rsc=${r.rsc} rscStatus=${r.rscStatus} rscMs=${r.rscMs} ` +
    `rscBytes=${r.rscBytes} visible=${r.visible} wasHidden=${r.wasHidden} online=${r.online} ` +
    `conn=${r.connection} worker=${r.worker} skew=${skew}`
  );
}
