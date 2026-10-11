import { cutChips, type ChipContext } from "./cuts-count";
import type { CutCite } from "./cuts-schema";
// The Tuning hub's History (tuning hub handoff R2, canvas C, H1 to H4): every run of every tool on
// one deck, newest first. Pure and client-safe: the row shapes, the outcome a stored status reads
// as, the summary facts per tool, and the opaque keyset cursor. `history-read.ts` reads the rows.

import { reapCutoff } from "./reaper";

/** A FREE tool pass, recorded once per tool per version of the list (`deck_tool_counts`). */
export type CountTool = "proposed_cuts" | "mana_balance";
export const COUNT_TOOLS: readonly CountTool[] = ["proposed_cuts", "mana_balance"];

/** Proposed cuts' free count as stored: how far over, and the roles that run long. */
export type CutsCountSummary = {
  over: number;
  roles: { role: string; label: string; over: number }[];
};

/** What `deck_tool_counts.summary` holds. Mana Balance's shape joins in PR 3. */
export type ToolCountSummary = CutsCountSummary | Record<string, unknown>;

/** The filter chips' tools, and a row's tool. */
export type HistoryTool = "suggested" | "mana" | "cuts";
export type HistoryTier = "free" | "credit" | "deeper";
export type HistoryOutcome = "ok" | "refused" | "failed" | "stopped" | "running";

/** Each tool's per-row facts, rendered into a summary line by the panel. */
export type HistorySummary =
  | { kind: "suggestedOk"; in: number; out: number; added: number; cut: number; rejected: number }
  | { kind: "cutsDeeperOk"; named: number; asked: number; cut: number; kept: number }
  | { kind: "cutsFree"; over: number; roles: { label: string; over: number }[] }
  | { kind: "none" };

export type HistoryRow = {
  /** `run:<uuid>` for a paid run, `count:<uuid>` for a free count: the id a past run opens by. */
  id: string;
  tool: HistoryTool;
  tier: HistoryTier;
  outcome: HistoryOutcome;
  /** ISO; the panel formats it in the reader's own time zone. */
  at: string;
  summary: HistorySummary;
};

export type HistoryPage = { rows: HistoryRow[]; nextCursor: string | null };

export const HISTORY_PAGE = 20;

/** The DB tool names behind each chip. */
export const RUN_TOOL_OF: Record<HistoryTool, { run: string | null; count: CountTool | null }> = {
  suggested: { run: "suggested_changes", count: null },
  cuts: { run: "proposed_cuts", count: "proposed_cuts" },
  mana: { run: null, count: "mana_balance" },
};

export type RunStatus = "pending" | "ok" | "failed" | "cancelled";

/**
 * A stored status as the History reads it. A pending run past the reaper's cutoff was abandoned:
 * History's own read reaps it first (`reapReaderRuns`), and a row read in the instant it crosses
 * the cutoff says failed rather than drawing it running for ever.
 */
export function runOutcome(status: RunStatus, createdAt: Date, now: Date, errorClass: string | null = null): HistoryOutcome {
  if (status === "pending") return createdAt.getTime() >= reapCutoff(now).getTime() ? "running" : "failed";
  if (status === "ok") return "ok";
  if (status === "cancelled") return "stopped";
  // `ungrounded` is stored as a failure but is a neutral refusal: nothing it could check, so it
  // showed nothing and gave the credit back. Both tools' panels draw it that way.
  if (errorClass === "ungrounded") return "refused";
  return "failed";
}

/** A paid run as the read returns it, with its items tallied. */
export type RunRecord = {
  id: string;
  tool: "suggested_changes" | "proposed_cuts";
  status: RunStatus;
  errorClass: string | null;
  createdAt: Date;
  /** `validation_report.over` on a Proposed cuts run: how many cuts it was asked for. */
  askedOver: number | null;
  items: { total: number; adds: number; cuts: number; acceptedAdds: number; acceptedCuts: number; accepted: number; dismissed: number };
};

export type CountRecord = {
  id: string;
  tool: CountTool;
  createdAt: Date;
  summary: ToolCountSummary;
};

export function isCutsCountSummary(s: unknown): s is CutsCountSummary {
  if (!s || typeof s !== "object") return false;
  const o = s as Record<string, unknown>;
  return typeof o.over === "number" && Array.isArray(o.roles);
}

export function shapeRun(r: RunRecord, now: Date): HistoryRow {
  const outcome = runOutcome(r.status, r.createdAt, now, r.errorClass);
  const suggested = r.tool === "suggested_changes";
  let summary: HistorySummary = { kind: "none" };
  if (outcome === "ok" && suggested) {
    summary = {
      kind: "suggestedOk",
      in: r.items.adds,
      out: r.items.cuts,
      added: r.items.acceptedAdds,
      cut: r.items.acceptedCuts,
      rejected: r.items.dismissed,
    };
  } else if (outcome === "ok") {
    summary = { kind: "cutsDeeperOk", named: r.items.total, asked: r.askedOver ?? r.items.total, cut: r.items.accepted, kept: r.items.dismissed };
  }
  return {
    id: `run:${r.id}`,
    tool: suggested ? "suggested" : "cuts",
    tier: suggested ? "credit" : "deeper",
    outcome,
    at: r.createdAt.toISOString(),
    summary,
  };
}

export function shapeCount(c: CountRecord): HistoryRow {
  const s = c.summary;
  const summary: HistorySummary = c.tool === "proposed_cuts" && isCutsCountSummary(s)
    ? { kind: "cutsFree", over: s.over, roles: s.roles.map((r) => ({ label: r.label, over: r.over })) }
    : { kind: "none" };
  return {
    id: `count:${c.id}`,
    tool: c.tool === "proposed_cuts" ? "cuts" : "mana",
    tier: "free",
    outcome: "ok",
    at: c.createdAt.toISOString(),
    summary,
  };
}

/**
 * The keyset: newest first on `created_at` to the MILLISECOND, ties broken on the row's own uuid,
 * descending. Milliseconds because a JS Date holds no finer, and the read orders and filters on
 * `date_trunc('milliseconds', created_at)` so the key a page ends on is exact. The uuid, not the
 * prefixed id, so the order is the one Postgres gives over both tables (a uuid compares bytewise,
 * which for lowercase hex is the string order).
 */
export type HistoryKey = { at: string; id: string };

const uuidOf = (id: string) => id.slice(id.indexOf(":") + 1).toLowerCase();

/** Opaque to the reader: `<epoch ms>.<prefixed id>`. */
export function encodeCursor(key: HistoryKey): string {
  return `${Date.parse(key.at)}.${key.id}`;
}

/** Null for anything that is not a cursor this module wrote: a reader can send any string. */
export function decodeCursor(cursor: string | null | undefined): HistoryKey | null {
  if (!cursor || cursor.length > 120) return null;
  const m = /^(\d{1,15})\.((?:run|count):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(cursor);
  if (!m) return null;
  return { at: new Date(Number(m[1])).toISOString(), id: m[2] };
}

/** The key's uuid, for the read's row comparison. */
export function keyUuid(key: HistoryKey): string {
  return uuidOf(key.id);
}

/** Newest first; a tie on the millisecond falls to the uuid, descending, the order the read pages on. */
export function compareRows(a: { at: string; id: string }, b: { at: string; id: string }): number {
  const t = Date.parse(b.at) - Date.parse(a.at);
  if (t !== 0) return t;
  const x = uuidOf(a.id), y = uuidOf(b.id);
  return x < y ? 1 : x > y ? -1 : 0;
}

/** Whether a row sorts strictly after the cursor's key, i.e. belongs on a later page. */
export function afterKey(row: { at: string; id: string }, key: HistoryKey | null): boolean {
  return key === null || compareRows(key, row) < 0;
}

/**
 * One page from the two sources, each read `limit + 1` past the key and newest first: merged,
 * cut to `limit`, and a cursor when a further row exists in either.
 */
export function mergePage(runs: HistoryRow[], counts: HistoryRow[], key: HistoryKey | null, limit: number): HistoryPage {
  const all = [...runs, ...counts].filter((r) => afterKey(r, key)).sort(compareRows);
  const rows = all.slice(0, limit);
  const last = rows[rows.length - 1];
  return { rows, nextCursor: all.length > limit && last ? encodeCursor({ at: last.at, id: last.id }) : null };
}


// --- A past run, opened read-only -----------------------------------------------------------

export type PastVerdict = "applied" | "rejected" | "open";

export type PastRun =
  | {
      kind: "suggested";
      at: string;
      outcome: HistoryOutcome;
      readVersion: number | null;
      /** How many cards the list has moved since the run read it; null when that cannot be said. */
      moved: number | null;
      lines: { cut: string | null; add: string | null; verdict: PastVerdict; reason: string; cites: string[] }[];
    }
  | {
      kind: "cutsDeeper";
      at: string;
      outcome: HistoryOutcome;
      readVersion: number | null;
      moved: number | null;
      lines: { cut: string; reason: string; verdict: PastVerdict; cites: string[] }[];
    }
  | {
      kind: "count";
      tool: HistoryTool;
      at: string;
      readVersion: number | null;
      moved: number | null;
      summary: HistorySummary;
    };

export function pastVerdict(v: string): PastVerdict {
  return v === "accepted" ? "applied" : v === "dismissed" ? "rejected" : "open";
}


/** Parse a past-run id the History wrote (`run:<uuid>` / `count:<uuid>`). */
/** The tool a past run belongs to. */
export function pastRunTool(run: PastRun): HistoryTool {
  return run.kind === "count" ? run.tool : run.kind === "cutsDeeper" ? "cuts" : "suggested";
}

export function parseHistoryId(id: string): { kind: "run" | "count"; uuid: string } | null {
  const m = /^(run|count):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(id);
  return m ? { kind: m[1] as "run" | "count", uuid: m[2] } : null;
}

/** A past Proposed cuts line's chips, as `SOURCE text`, quoted from the figures its run stored. A
 *  run from before the figures were stored quotes none of the context and still shows each cite. */
export function pastCutChips(evidence: readonly CutCite[] | null, reason: string, ctx: ChipContext | null): string[] {
  const context: ChipContext = ctx ?? { medianPct: null, flagCounts: {}, declared: null };
  return cutChips(evidence ?? [], reason, context).map((c) => `${c.kind} ${c.text}`);
}
