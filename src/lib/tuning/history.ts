import { cutChips, type ChipContext } from "./cuts-count";
import type { CutCite } from "./cuts-schema";
// The Tuning hub's History (tuning hub handoff R2, canvas C, H1 to H4): every run of every tool on
// one deck, newest first. Pure and client-safe: the row shapes, the outcome a stored status reads
// as, the summary facts per tool, and the opaque keyset cursor. `history-read.ts` reads the rows.

import type { ManaHelp } from "./mana-help";
import { isManaCountSummary, type ManaCountSummary } from "./mana-view";
import { reapCutoff } from "./reaper";

/** A FREE tool pass, recorded once per tool per version of the list (`deck_tool_counts`).
 *  `mana_help` is one Improve-my-mana help read: a color's trades and staples, once per list and color. */
export type CountTool = "proposed_cuts" | "mana_balance" | "mana_help";
export const COUNT_TOOLS: readonly CountTool[] = ["proposed_cuts", "mana_balance", "mana_help"];

/** Improve my mana's help as History stores it: the help the reader was shown, whole, so it can be
 *  drawn again; every trade in it is re-checked against today's help before it applies. */
export type ManaHelpSummary = { color: string; help: ManaHelp };

/** Proposed cuts' free count as stored: how far over, and the roles that run long. */
export type CutsCountSummary = {
  over: number;
  roles: { role: string; label: string; over: number }[];
};

/** What `deck_tool_counts.summary` holds. */
export type ToolCountSummary = CutsCountSummary | ManaCountSummary | ManaHelpSummary | Record<string, unknown>;

/** The filter chips' tools, and a row's tool. */
export type HistoryTool = "suggested" | "mana" | "cuts";
export type HistoryTier = "free" | "credit" | "deeper";
export type HistoryOutcome = "ok" | "refused" | "failed" | "stopped" | "running";

/** Each tool's per-row facts, rendered into a summary line by the panel. */
export type HistorySummary =
  | { kind: "suggestedOk"; in: number; out: number; added: number; cut: number; rejected: number }
  | { kind: "cutsDeeperOk"; named: number; asked: number; cut: number; kept: number }
  | { kind: "cutsFree"; over: number; roles: { label: string; over: number }[] }
  /** Mana Balance's free count: the Colors card's totals, never a verdict on a color. */
  | { kind: "manaFree"; pips: number; sources: number }
  /** An Improve-my-mana help read: the color it was for and how many trades it offered. */
  | { kind: "manaHelp"; color: string; trades: number }
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
export const RUN_TOOL_OF: Record<HistoryTool, { run: string | null; counts: readonly CountTool[] }> = {
  suggested: { run: "suggested_changes", counts: [] },
  cuts: { run: "proposed_cuts", counts: ["proposed_cuts"] },
  mana: { run: null, counts: ["mana_balance", "mana_help"] },
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

export function isManaHelpSummary(s: unknown): s is ManaHelpSummary {
  if (!s || typeof s !== "object") return false;
  const o = s as Record<string, unknown>;
  const help = o.help as Record<string, unknown> | null | undefined;
  return typeof o.color === "string" && !!help && typeof help === "object" && Array.isArray(help.trades);
}

export function shapeCount(c: CountRecord): HistoryRow {
  const s = c.summary;
  const summary: HistorySummary = c.tool === "proposed_cuts" && isCutsCountSummary(s)
    ? { kind: "cutsFree", over: s.over, roles: s.roles.map((r) => ({ label: r.label, over: r.over })) }
    : c.tool === "mana_balance" && isManaCountSummary(s)
      ? { kind: "manaFree", pips: s.pips, sources: s.sources }
      : c.tool === "mana_help" && isManaHelpSummary(s)
        ? { kind: "manaHelp", color: s.color, trades: s.help.trades.length }
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

/**
 * Where a History row's press goes (Hugh, 2026-10-12: a past run re-opens in its own tool).
 *
 * - `review`: a paid run that named something reopens in its tool with that run's lines, each
 *   re-checked against the list as it stands.
 * - `live`: the tool on today's list. A free count named no card (its rows are counts), so today's
 *   tool IS what it showed; `counted` asks for the note that keeps the past figure. A run still in
 *   flight is the tool's own newest run, which the tool draws running.
 * - `past`: the read-only past-run view, for a run with nothing to load (failed, refused, stopped,
 *   or ok with no lines).
 */
export type HistoryPress =
  | { kind: "review"; runId: string }
  /** An Improve-my-mana help read: Mana Balance reopens that color's help with the trades it showed. */
  | { kind: "manaHelp"; countId: string; color: string }
  | { kind: "live"; counted: boolean }
  | { kind: "past" };

export function historyPress(row: Pick<HistoryRow, "id" | "outcome" | "summary">): HistoryPress {
  const ref = parseHistoryId(row.id);
  if (!ref) return { kind: "past" };
  if (ref.kind === "count") {
    return row.summary.kind === "manaHelp" ? { kind: "manaHelp", countId: ref.uuid, color: row.summary.color } : { kind: "live", counted: true };
  }
  if (row.outcome === "running") return { kind: "live", counted: false };
  if (row.outcome !== "ok") return { kind: "past" };
  const s = row.summary;
  const named = s.kind === "cutsDeeperOk" ? s.named : s.kind === "suggestedOk" ? s.in + s.out : 0;
  return named > 0 ? { kind: "review", runId: ref.uuid } : { kind: "past" };
}
