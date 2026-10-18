import type { MonthKey } from "./costs-rule";

/**
 * Anthropic's cost report as arithmetic (the admin cost-report plan, 2026-10-17). Pure and
 * client-safe: `anthropic-cost.ts` makes the requests, holds the key and hands the bodies here.
 * Nothing here sees a key, a header or a status.
 *
 * `amount` comes back as a decimal string in CENTS. It is summed exactly, per workspace, and
 * rounded to micro-dollars once, half away from zero, so a month of sub-micro lines is never
 * rounded away line by line. No `parseFloat` anywhere: a float would lose digits a bill carries.
 */

/** The workspace this app bills to, matched by its trimmed name, ignoring case. */
export const WORKSPACE_NAME = "The 99";
/** More pages than this, for either list, is read as a body off the documented shape. */
export const MAX_PAGES = 10;
export const COST_REPORT_URL = "https://api.anthropic.com/v1/organizations/cost_report";
export const WORKSPACES_URL = "https://api.anthropic.com/v1/organizations/workspaces";
/** $0.05: the least the ledger may run ahead of the bill before the page says so. */
export const LEDGER_AHEAD_FLOOR_MICRO = 50_000;
// BigInt(), never `10n`: the repo's TypeScript target is below ES2020, where bigint literals are refused.
const ZERO = BigInt(0);
const TWO = BigInt(2);
const TEN = BigInt(10);
/** A cent in micro-dollars. */
const MICRO_PER_CENT = BigInt(10_000);
/** 10^n, exactly. */
function pow10(n: number): bigint {
  let out = BigInt(1);
  for (let i = 0; i < n; i++) out *= TEN;
  return out;
}

export type CostUnread = "no_key" | "refused" | "rejected" | "upstream" | "shape" | "no_workspace" | "ambiguous_workspace";

/** What the page is handed: figures and an ISO instant, never an id, a key or upstream text. */
export type WorkspaceCost =
  | { ok: true; asOf: string; workspaceMicro: number }
  | { ok: false; kind: CostUnread; count?: number };

/** An exact amount of cents: `units` × 10^-`scale`. */
export type Exact = { units: bigint; scale: number };

const DECIMAL = /^-?\d+(\.\d+)?$/;

/** A cost line's `amount`, exactly, or null when it is not a plain decimal. A leading `-` is a credit. */
export function parseCost(amount: string): Exact | null {
  if (!DECIMAL.test(amount)) return null;
  const negative = amount.startsWith("-");
  const [whole, frac = ""] = (negative ? amount.slice(1) : amount).split(".");
  const units = BigInt(whole + frac);
  return { units: negative ? -units : units, scale: frac.length };
}

const rescale = (x: Exact, scale: number): bigint => x.units * pow10(scale - x.scale);

function add(a: Exact, b: Exact): Exact {
  const scale = Math.max(a.scale, b.scale);
  return { units: rescale(a, scale) + rescale(b, scale), scale };
}

/** Exact cents to micro-dollars, rounded once, half away from zero. */
function toMicro(x: Exact): number {
  const negative = x.units < ZERO;
  const q = (negative ? -x.units : x.units) * MICRO_PER_CENT;
  const d = pow10(x.scale);
  const rounded = (TWO * q + d) / (TWO * d);
  return Number(negative ? -rounded : rounded);
}

/** A decimal string of cents to micro-dollars, half away from zero; null when it is not one. */
export function centsToMicro(amount: string): number | null {
  const exact = parseCost(amount);
  return exact ? toMicro(exact) : null;
}

export type CostRow = { workspaceId: string | null; cents: Exact };

/** Each workspace's micro-dollars: its lines summed exactly, then rounded once. The default workspace is `null`. */
export function sumCents(rows: readonly CostRow[]): Map<string | null, number> {
  const sums = new Map<string | null, Exact>();
  for (const r of rows) {
    const had = sums.get(r.workspaceId);
    sums.set(r.workspaceId, had ? add(had, r.cents) : r.cents);
  }
  return new Map([...sums].map(([id, x]) => [id, toMicro(x)]));
}

/** One workspace's month, in micro-dollars: 0 when no line names it. */
export function workspaceMicro(rows: readonly CostRow[], workspaceId: string): number {
  return sumCents(rows).get(workspaceId) ?? 0;
}

/**
 * The window a month is asked for. A past month ends at the next month's start (`ending_at` is
 * exclusive). The current month ends NOW, floored to the minute, never a future instant; in the
 * month's own first minute that would be an empty window, so the end is omitted instead.
 */
export function reportWindow(month: MonthKey, now: Date): { startingAt: string; endingAt: string | null } {
  const start = Date.UTC(month.year, month.month, 1);
  const next = Date.UTC(month.year, month.month + 1, 1);
  const iso = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
  if (now.getTime() >= next) return { startingAt: iso(start), endingAt: iso(next) };
  const minute = Math.floor(now.getTime() / 60_000) * 60_000;
  return { startingAt: iso(start), endingAt: minute > start ? iso(minute) : null };
}

/** One page of the month's cost report: daily buckets, grouped by workspace, a month to a page. */
export function costReportUrl(w: { startingAt: string; endingAt: string | null }, page?: string): string {
  const q = [
    `starting_at=${encodeURIComponent(w.startingAt)}`,
    ...(w.endingAt ? [`ending_at=${encodeURIComponent(w.endingAt)}`] : []),
    "bucket_width=1d",
    "group_by[]=workspace_id",
    "limit=31",
    ...(page ? [`page=${encodeURIComponent(page)}`] : []),
  ];
  return `${COST_REPORT_URL}?${q.join("&")}`;
}

/** One page of the workspace list. Never `include_archived=true`: an archived workspace is not The 99. */
export function workspacesUrl(afterId?: string): string {
  return `${WORKSPACES_URL}?limit=1000${afterId ? `&after_id=${encodeURIComponent(afterId)}` : ""}`;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** One cost report page, or null when the body is off the documented shape (a non-USD line included). */
export function parseCostPage(body: unknown): { rows: CostRow[]; hasMore: boolean; nextPage: string | null } | null {
  if (!isObject(body) || !Array.isArray(body.data) || typeof body.has_more !== "boolean") return null;
  const nextPage = body.next_page ?? null;
  if (nextPage !== null && typeof nextPage !== "string") return null;
  if (body.has_more && nextPage === null) return null;
  const rows: CostRow[] = [];
  for (const bucket of body.data) {
    if (!isObject(bucket) || !Array.isArray(bucket.results)) return null;
    for (const r of bucket.results) {
      if (!isObject(r) || typeof r.amount !== "string" || r.currency !== "USD") return null;
      const workspaceId = r.workspace_id ?? null;
      if (workspaceId !== null && typeof workspaceId !== "string") return null;
      const cents = parseCost(r.amount);
      if (!cents) return null;
      rows.push({ workspaceId, cents });
    }
  }
  return { rows, hasMore: body.has_more, nextPage };
}

export type WorkspaceItem = { id: string; name: string; archived: boolean };

/** One workspace list page, or null when the body is off the documented shape. */
export function parseWorkspacePage(body: unknown): { items: WorkspaceItem[]; hasMore: boolean; lastId: string | null } | null {
  if (!isObject(body) || !Array.isArray(body.data) || typeof body.has_more !== "boolean") return null;
  const lastId = body.last_id ?? null;
  if (lastId !== null && typeof lastId !== "string") return null;
  if (body.has_more && lastId === null) return null;
  const items: WorkspaceItem[] = [];
  for (const w of body.data) {
    if (!isObject(w) || typeof w.id !== "string" || typeof w.name !== "string") return null;
    items.push({ id: w.id, name: w.name, archived: w.archived_at !== undefined && w.archived_at !== null });
  }
  return { items, hasMore: body.has_more, lastId };
}

/** The one unarchived workspace named `name` (trimmed, ignoring case). Two or more is never a guess. */
export function matchWorkspace(
  items: readonly WorkspaceItem[],
  name: string = WORKSPACE_NAME,
): { ok: true; id: string } | { ok: false; kind: "no_workspace" } | { ok: false; kind: "ambiguous_workspace"; count: number } {
  const want = name.trim().toLowerCase();
  const found = items.filter((w) => !w.archived && w.name.trim().toLowerCase() === want);
  if (found.length === 0) return { ok: false, kind: "no_workspace" };
  if (found.length > 1) return { ok: false, kind: "ambiguous_workspace", count: found.length };
  return { ok: true, id: found[0].id };
}

/**
 * Elsewhere: the workspace's bill less this environment's ledger, floored at 0. The two are read
 * minutes apart and priced differently (the ledger from `prices.ts`), so the ledger running ahead
 * is named only past a tolerance: 1% of the bill, or $0.05, whichever is more.
 */
export function elsewhere(workspaceMicro: number, ledgerMicro: number): { micro: number; ledgerAhead: boolean } {
  const tolerance = Math.max(Math.round(workspaceMicro / 100), LEDGER_AHEAD_FLOOR_MICRO);
  return { micro: Math.max(0, workspaceMicro - ledgerMicro), ledgerAhead: ledgerMicro - workspaceMicro > tolerance };
}
