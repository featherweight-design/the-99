import { unstable_cache } from "next/cache";
import { DEPLOYMENT_ID } from "../cache/deployment";
import {
  costReportUrl,
  MAX_PAGES,
  matchWorkspace,
  parseCostPage,
  parseWorkspacePage,
  reportWindow,
  workspaceMicro,
  workspacesUrl,
  type CostRow,
  type CostUnread,
  type WorkspaceCost,
  type WorkspaceItem,
} from "./anthropic-cost-rule";
import { monthOf, monthParam, type MonthKey } from "./costs-rule";

/**
 * The Costs page's workspace figure, read from Anthropic's Usage and Cost Admin API (the admin
 * cost-report plan, 2026-10-17). SERVER-ONLY: it reads `ANTHROPIC_ADMIN_KEY`, and
 * `src/lib/client-imports.test.ts` fails if any client component reaches this module. Read only.
 *
 * The key never leaves the request: it is read from `process.env` inside the read, sent in one
 * header, and is in no URL, return value, cache key, log line or thrown value. No key is `no_key`,
 * decided before the cache and the memo, so a local server or a preview touches neither the cache
 * nor the network. Every other failure is ONE fixed log line plus its closed kind, carrying nothing
 * from the request or the response, and nothing throws out of either read.
 *
 * Never put `ANTHROPIC_ADMIN_KEY` in `.env`: `scripts/lib/env.mjs` loads it with `override: true`.
 */

/** The one server line a read leaves, found by `vercel logs -q "[costs]"`. Never the key, a body or a URL. */
export const COST_LOG = "[costs] anthropic cost_report";
/** One timeout for the whole read: both lists, every page. */
export const ANTHROPIC_TIMEOUT_MS = 8_000;
/** A failure is answered from memory for this long, so a broken key costs one call a minute. */
export const NEGATIVE_MEMO_MS = 60_000;
/** The current month's cache bucket: the workspace figure is never older than this against the live ledger. */
const BUCKET_MS = 300_000;
/** A past month's bucket. Bucketed rather than one fixed key so an expired figure is a MISS, read in the foreground,
 *  where a failure reaches the negative memo: a fixed key would serve the stale figure while a background refresh
 *  failed unseen, retrying the API on every load. */
const CLOSED_BUCKET_MS = 3_600_000;
const ANTHROPIC_VERSION = "2023-06-01";

export type AnthropicDeps = {
  key: string | undefined;
  fetch: typeof fetch;
  log: (line: string) => void;
  now: () => Date;
};

const defaultDeps = (): AnthropicDeps => ({
  key: process.env.ANTHROPIC_ADMIN_KEY,
  fetch: globalThis.fetch,
  log: (line) => console.warn(line),
  now: () => new Date(),
});

/** A failed request, by its closed kind alone. */
class Unread {
  constructor(
    readonly kind: Exclude<CostUnread, "no_key" | "no_workspace" | "ambiguous_workspace">,
    /** The HTTP status that refused the read, when one did. */
    readonly status?: number,
  ) {}
}

function kindOf(status: number): Unread["kind"] {
  if (status === 401 || status === 403) return "refused";
  if (status === 400 || status === 404 || status === 422) return "rejected";
  return "upstream";
}

/**
 * The month's workspace figure, uncached. The cost report and the workspace list are read in
 * parallel under one shared timeout, each followed to its end up to `MAX_PAGES`.
 */
export async function readWorkspaceCost(month: MonthKey, now: Date, deps: AnthropicDeps = defaultDeps()): Promise<WorkspaceCost> {
  const key = deps.key?.trim();
  if (!key) return { ok: false, kind: "no_key" };
  const signal = AbortSignal.timeout(ANTHROPIC_TIMEOUT_MS);
  const headers = { "x-api-key": key, "anthropic-version": ANTHROPIC_VERSION, "user-agent": "the-99-admin" };

  const get = async (url: string): Promise<unknown> => {
    const res = await deps.fetch(url, { headers, cache: "no-store", signal });
    if (!res.ok) throw new Unread(kindOf(res.status), res.status);
    try {
      return await res.json();
    } catch (error) {
      // Only a body that is not JSON is a shape this page cannot read. The shared timeout firing mid-body, or the
      // stream breaking, is the network: upstream.
      throw new Unread(error instanceof SyntaxError ? "shape" : "upstream");
    }
  };

  const window = reportWindow(month, now);
  let days = 0;
  const costRows = async (): Promise<CostRow[]> => {
    const rows: CostRow[] = [];
    let page: string | undefined;
    for (let n = 1; ; n++) {
      const parsed = parseCostPage(await get(costReportUrl(window, page)));
      if (!parsed) throw new Unread("shape");
      rows.push(...parsed.rows);
      days += parsed.days;
      if (!parsed.hasMore) return rows;
      if (n >= MAX_PAGES) throw new Unread("shape");
      page = parsed.nextPage ?? undefined;
    }
  };
  const workspaces = async (): Promise<WorkspaceItem[]> => {
    const items: WorkspaceItem[] = [];
    let after: string | undefined;
    for (let n = 1; ; n++) {
      const parsed = parseWorkspacePage(await get(workspacesUrl(after)));
      if (!parsed) throw new Unread("shape");
      items.push(...parsed.items);
      if (!parsed.hasMore) return items;
      if (n >= MAX_PAGES) throw new Unread("shape");
      after = parsed.lastId ?? undefined;
    }
  };

  const unread = (kind: CostUnread, count?: number, status?: number): WorkspaceCost => {
    deps.log(`${COST_LOG} unread kind=${kind}${status === undefined ? "" : ` status=${status}`}`);
    return count === undefined ? { ok: false, kind } : { ok: false, kind, count };
  };

  let rows: CostRow[];
  let items: WorkspaceItem[];
  try {
    [rows, items] = await Promise.all([costRows(), workspaces()]);
  } catch (error) {
    // A network error or the timeout's abort is upstream; nothing of the error is kept.
    return error instanceof Unread ? unread(error.kind, undefined, error.status) : unread("upstream");
  }
  const match = matchWorkspace(items);
  if (!match.ok) return match.kind === "ambiguous_workspace" ? unread(match.kind, match.count) : unread(match.kind);
  deps.log(`${COST_LOG} ok days=${days}`);
  return { ok: true, asOf: deps.now().toISOString(), workspaceMicro: workspaceMicro(rows, match.id) };
}

/** Thrown out of the cached function so `unstable_cache` serves a failure without filing it. The kind alone. */
class NotStored {
  constructor(readonly value: Extract<WorkspaceCost, { ok: false }>) {}
}

/** Per month (`YYYY-MM`): the last failure and until when it answers. Never figures, never `no_key`. */
const memo = new Map<string, { kind: CostUnread; count?: number; until: number }>();

/** Tests only: forget every remembered failure. */
export function clearNegativeMemo(): void {
  memo.clear();
  inFlight.clear();
}

/**
 * The month's workspace figure as the page reads it. In order: no key is `no_key`; a failure
 * inside the last minute is answered from memory; otherwise `unstable_cache`, keyed on the
 * deployment, the month and (for the current month) the five-minute bucket. A failure is thrown
 * as `NotStored`, so it is served and never filed. Reads of one month that overlap share one
 * in-flight read, so a cold cache or an outage costs one poll however many loads arrive at once.
 */
export async function cachedWorkspaceCost(month: MonthKey, now: Date, deps: AnthropicDeps = defaultDeps()): Promise<WorkspaceCost> {
  if (!deps.key?.trim()) return { ok: false, kind: "no_key" };
  const m = monthParam(month);
  const pending = inFlight.get(m);
  if (pending) return pending;
  const read = readThrough(month, m, now, deps).finally(() => inFlight.delete(m));
  inFlight.set(m, read);
  return read;
}

/** Per month: the read in progress, shared by every overlapping request in this process. */
const inFlight = new Map<string, Promise<WorkspaceCost>>();

async function readThrough(month: MonthKey, m: string, now: Date, deps: AnthropicDeps): Promise<WorkspaceCost> {
  const held = memo.get(m);
  if (held && held.until > now.getTime()) {
    return held.count === undefined ? { ok: false, kind: held.kind } : { ok: false, kind: held.kind, count: held.count };
  }
  const current = monthParam(monthOf(now)) <= m;
  const run = async (): Promise<WorkspaceCost> => {
    const result = await readWorkspaceCost(month, now, deps);
    if (!result.ok) throw new NotStored(result);
    return result;
  };
  let result: WorkspaceCost;
  try {
    result = await unstable_cache(run, ["anthropic-cost", DEPLOYMENT_ID, m, String(Math.floor(now.getTime() / (current ? BUCKET_MS : CLOSED_BUCKET_MS)))], {
      revalidate: current ? 300 : 3600,
    })();
  } catch (error) {
    if (error instanceof NotStored) result = error.value;
    else {
      // The cache itself failed: no figure, and nothing of the error kept.
      deps.log(`${COST_LOG} unread kind=upstream`);
      result = { ok: false, kind: "upstream" };
    }
  }
  // A success needs no clearing: a live memo answers before any read, so one only runs after it expires.
  if (!result.ok) memo.set(m, { kind: result.kind, ...(result.count === undefined ? {} : { count: result.count }), until: now.getTime() + NEGATIVE_MEMO_MS });
  return result;
}
