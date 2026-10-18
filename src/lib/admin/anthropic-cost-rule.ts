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
export const API_KEYS_URL = "https://api.anthropic.com/v1/organizations/api_keys";
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

/** An API key's status, as the list documents it. */
export type KeyStatus = "active" | "archived" | "expired" | "inactive";
/** One key on The 99 as the page draws it: its name, its redacted hint and its status. Never an id, a creator or a scope. */
export type KeyRow = { name: string; hint: string | null; status: "active" | "other"; statusWord: KeyStatus };
/** The keys on The 99, or why they were not read. A failed key list leaves the figures beside it standing. */
export type KeyList = { ok: true; rows: KeyRow[] } | { ok: false; kind: Exclude<CostUnread, "no_key" | "no_workspace" | "ambiguous_workspace"> };

/**
 * What the page is handed: figures, an ISO instant and the key rows, never an id, a key or
 * upstream text. `otherMicro` is every other workspace, the default workspace's `null` id
 * included; `orgMicro` is the whole org, and the two parts always add up to it.
 */
export type WorkspaceCost =
  | { ok: true; asOf: string; workspaceMicro: number; otherMicro: number; orgMicro: number; keys: KeyList }
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

/**
 * The org's month split at The 99, in micro-dollars. The 99 is its own lines, summed exactly and
 * rounded once (0 when none names it); the org is EVERY line, summed exactly and rounded once;
 * other workspaces are the difference, so the two parts always add up to the org.
 */
export function splitOrg(rows: readonly CostRow[], workspaceId: string): { workspaceMicro: number; otherMicro: number; orgMicro: number } {
  const workspace = sumCents(rows).get(workspaceId) ?? 0;
  const org = rows.length ? toMicro(rows.map((r) => r.cents).reduce(add)) : 0;
  return { workspaceMicro: workspace, otherMicro: org - workspace, orgMicro: org };
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

/** One page of The 99's keys, by its id: every status, a thousand at a time. */
export function apiKeysUrl(workspaceId: string, afterId?: string): string {
  return `${API_KEYS_URL}?workspace_id=${encodeURIComponent(workspaceId)}&limit=1000${afterId ? `&after_id=${encodeURIComponent(afterId)}` : ""}`;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** One cost report page, or null when the body is off the documented shape (a non-USD line included). */
export function parseCostPage(body: unknown): { rows: CostRow[]; days: number; hasMore: boolean; nextPage: string | null } | null {
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
  return { rows, days: body.data.length, hasMore: body.has_more, nextPage };
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

const KEY_STATUSES: readonly KeyStatus[] = ["active", "archived", "expired", "inactive"];
const isKeyStatus = (v: unknown): v is KeyStatus => typeof v === "string" && (KEY_STATUSES as readonly string[]).includes(v);
/** The longest hint kept. The documented hint is 23 characters; a whole key is over 100. */
const HINT_MAX = 40;

/**
 * A key's hint, kept only when it reads as redacted: an ellipsis inside it and no longer than
 * `HINT_MAX`. Anything else could be more of the key than a hint, and is dropped to null.
 */
function hintOf(v: unknown): string | null {
  if (typeof v !== "string" || v.length > HINT_MAX) return null;
  return v.includes("...") || v.includes("\u2026") ? v : null;
}

export type KeyItem = { name: string; hint: string | null; status: KeyStatus };

/**
 * One page of the key list, or null when the body is off the documented shape. Only keys whose
 * `scope` is The 99's workspace survive (the request already asks for that workspace; the scope
 * is checked again, never the deprecated top-level `workspace_id`). Each survivor keeps its name,
 * hint and status; its id, creator, principal, scope and dates are dropped here, at the parse.
 */
export function parseKeyPage(body: unknown, workspaceId: string): { items: KeyItem[]; hasMore: boolean; lastId: string | null } | null {
  if (!isObject(body) || !Array.isArray(body.data) || typeof body.has_more !== "boolean") return null;
  const lastId = body.last_id ?? null;
  if (lastId !== null && typeof lastId !== "string") return null;
  if (body.has_more && lastId === null) return null;
  const items: KeyItem[] = [];
  for (const k of body.data) {
    if (!isObject(k) || typeof k.name !== "string" || !isKeyStatus(k.status) || !isObject(k.scope)) return null;
    const scope = k.scope;
    if (scope.type === "workspace") {
      if (typeof scope.workspace_id !== "string") return null;
      if (scope.workspace_id !== workspaceId) continue;
    } else continue;
    items.push({ name: k.name, hint: hintOf(k.partial_key_hint), status: k.status });
  }
  return { items, hasMore: body.has_more, lastId };
}

/** The keys as the page lists them: active first, then by name, each other status by its word. */
export function keyRows(items: readonly KeyItem[]): KeyRow[] {
  return [...items]
    .sort((a, b) => Number(b.status === "active") - Number(a.status === "active") || a.name.localeCompare(b.name, "en", { sensitivity: "base" }))
    .map((k) => ({ name: k.name, hint: k.hint, status: k.status === "active" ? "active" : "other", statusWord: k.status }));
}
