import { usdToMicro } from "../model/spend-rule";
import { elsewhere as elsewhereOf, type CostUnread, type KeyList, type WorkspaceCost } from "./anthropic-cost-rule";

/**
 * The admin's Costs page as arithmetic (admin STATES C1 to C7). Pure and client-safe: `costs.ts`
 * runs the SQL and hands its rows here. Every month is a UTC calendar month, because that is how
 * the bill and the owner's share count (`spend-rule.ts`).
 */

/** A UTC calendar month; `month` is 0-based, as `Date` has it. */
export type MonthKey = { year: number; month: number };

// The keys the page reads and writes. `org_cap_usd` is the Anthropic org cap, typed in from the
// console as the workspace cap is (Spend Limits cannot be read). `elsewhere_usd` is RETIRED (the
// admin cost-report plan): the workspace figure comes from Anthropic, nothing writes or reads it,
// and it is no key here. Its stored rows are kept, and the check constraint still allows it.
export const SETTING_KEYS = ["account_cap_usd", "system_ceiling_usd", "org_cap_usd"] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];
/** A stored row's key, read back: a retired key (`elsewhere_usd`) is not one. */
export const isSettingKey = (key: string): key is SettingKey => (SETTING_KEYS as readonly string[]).includes(key);
/** A stored setting: its value, the day it holds from, its note, and the Clerk id that entered it. */
export type Setting = { micro: number; asOf: string; note: string | null; by?: string };

export function monthOf(now: Date): MonthKey {
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() };
}

export function shiftMonth(m: MonthKey, delta: number): MonthKey {
  const d = new Date(Date.UTC(m.year, m.month + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

export const sameMonth = (a: MonthKey, b: MonthKey) => a.year === b.year && a.month === b.month;

/** `YYYY-MM`, the `?month=` value. The current month is the bare `/admin`. */
export function monthParam(m: MonthKey): string {
  return `${m.year}-${String(m.month + 1).padStart(2, "0")}`;
}

/** `?month=` read back: a well-formed past or current month, else the current one. */
export function parseMonth(value: string | undefined, now: Date): MonthKey {
  const current = monthOf(now);
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (!match) return current;
  const m = { year: Number(match[1]), month: Number(match[2]) - 1 };
  // `Date.UTC` reads years 0 to 99 as 1900 to 1999, and no model call predates the app anyway.
  if (m.month < 0 || m.month > 11 || m.year < 2000) return current;
  return m.year * 12 + m.month > current.year * 12 + current.month ? current : m;
}

export function monthStart(m: MonthKey): Date {
  return new Date(Date.UTC(m.year, m.month, 1));
}

export function daysIn(m: MonthKey): number {
  return new Date(Date.UTC(m.year, m.month + 1, 0)).getUTCDate();
}

/** One day's runs and dollars for one origin, as the SQL groups them. `day` is the UTC day, 1-based. */
export type DayRow = { day: number; origin: "player" | "system"; runs: number; micro: number };

export type CostRows = {
  days: readonly DayRow[];
  /** Accounts with a player press in the month. */
  playerAccounts: number;
  /** The owner's own player spend in the month, null when no owner is configured. */
  ownerMicro: number | null;
  /** The owner's monthly share as the allowance enforces it (`ownerShareMicro()`). */
  ownerShareMicro: number;
  previous: { runs: number; micro: number };
  settings: Partial<Record<SettingKey, Setting>>;
  /**
   * Spend `model_calls` does not hold, and the part of it that is labels: card label batches, the
   * month's eval ledgers (drawn apart, never in System), and the manual collector's `labels` rows
   * (already in the system day rows). Absent reads as none. `labelsIncomplete`: a label run is unpriced or still
   * collecting, so the labels figure is so far. `evalsUnreadable`: an eval ledger could not be read,
   * so the evals figure leaves it out.
   */
  outside?: { batchMicro: number; evalsMicro: number; labelCallsMicro: number; labelsIncomplete?: boolean; evalsUnreadable?: boolean };
  /** The Anthropic workspace's month, from its cost report (`cachedWorkspaceCost`), or why it was not read. */
  anthropic: WorkspaceCost;
};

/**
 * The Anthropic workspace row. `ledgerMicro` is this environment's own ledger: player plus
 * system, never the evals. Read, `elsewhereMicro` is the bill less that ledger, floored at 0, and
 * `ledgerAhead` says the ledger runs past the bill by more than the tolerance. `otherMicro` and
 * `orgMicro` are the org's other workspaces and the org, for the org cap row; `keys` the keys on
 * The 99, read or not.
 */
export type WorkspaceBlock = {
  ledgerMicro: number;
  read:
    | { ok: true; asOf: string; totalMicro: number; elsewhereMicro: number; ledgerAhead: boolean; otherMicro: number; orgMicro: number; keys: KeyList }
    | { ok: false; kind: CostUnread; count?: number };
};

/** System spend in its two inks: card labels, and the rest (free rewrites and prose). `incomplete`: labels are so far. */
export type SystemSplit = { labels: number; rewrites: number; total: number; labelsPartial: boolean; incomplete: boolean };

/**
 * The month's eval spend, from the committed ledgers. Those files ship to EVERY deployment and the
 * runs they record are made from a laptop, so no environment spent them: they are drawn on their own
 * and never counted into System, the ceiling or the account cap. No ledger entry records an
 * environment. `partial`: a ledger could not be read, so `micro` leaves it out.
 */
export type EvalSpend = { micro: number; partial: boolean };

/** The trend's least scale: a cent, so a month with no player runs still draws one. */
export const TREND_FLOOR_MICRO = 10_000;

export type CostSummary = {
  current: boolean;
  daysInMonth: number;
  /** Days drawn: today's day of the month, or the whole of a past month. */
  elapsed: number;
  calls: { runs: number; micro: number };
  player: { runs: number; micro: number };
  /** System rows in `model_calls` only. */
  system: { runs: number; micro: number };
  /** All of this environment's system spend: `model_calls` and card label batches. Never the evals. */
  systemSplit: SystemSplit;
  /** The eval ledgers' month, apart from every environment figure. */
  evals: EvalSpend;
  perAccountMicro: number | null;
  /** Accounts with a player press in the month. */
  accounts: number;
  /** Cumulative player spend at the end of each elapsed day. */
  playerCumulative: number[];
  playerByDay: number[];
  /** Month-end projections at the month's own daily rate. Current month only. */
  callsPaceMicro: number | null;
  playerPaceMicro: number | null;
  ownerMicro: number | null;
  ownerShareMicro: number;
  previous: { runs: number; micro: number };
  settings: Partial<Record<SettingKey, Setting>>;
  /** The Anthropic workspace's month against this environment's ledger. */
  workspace: WorkspaceBlock;
  /** The trend's top: the series or its pace, whichever is higher, and never under `TREND_FLOOR_MICRO`. */
  trendScaleMicro: number;
};

/**
 * Everything the Costs core draws, from the month's rows. `now` decides whether the month is the
 * current one: only that month has a pace.
 */
export function costSummary(rows: CostRows, month: MonthKey, now: Date): CostSummary {
  const current = sameMonth(month, monthOf(now));
  const n = daysIn(month);
  const elapsed = current ? now.getUTCDate() : n;

  const byDay = Array.from({ length: elapsed }, () => 0);
  const player = { runs: 0, micro: 0 };
  const system = { runs: 0, micro: 0 };
  for (const r of rows.days) {
    const into = r.origin === "player" ? player : system;
    into.runs += r.runs;
    into.micro += r.micro;
    if (r.origin === "player" && r.day >= 1 && r.day <= elapsed) byDay[r.day - 1] += r.micro;
  }
  const calls = { runs: player.runs + system.runs, micro: player.micro + system.micro };
  const cumulative: number[] = [];
  byDay.reduce((sum, v) => (cumulative.push(sum + v), sum + v), 0);

  const pace = (micro: number) => (current ? Math.round((micro / elapsed) * n) : null);
  const playerPaceMicro = pace(player.micro);

  const outside = rows.outside ?? { batchMicro: 0, evalsMicro: 0, labelCallsMicro: 0 };
  const labels = outside.batchMicro + outside.labelCallsMicro;
  const rewrites = system.micro - outside.labelCallsMicro;
  // Evals stay out of System: the ledgers are repo files every deployment reads, not this one's spend.
  const systemSplit = { labels, rewrites, total: labels + rewrites, labelsPartial: !!outside.labelsIncomplete, incomplete: !!outside.labelsIncomplete };
  const evals = { micro: outside.evalsMicro, partial: !!outside.evalsUnreadable };

  // Evals are never in the ledger: no environment spent them (`EvalSpend`).
  const ledgerMicro = player.micro + systemSplit.total;
  const a = rows.anthropic;
  const read: WorkspaceBlock["read"] = a.ok
    ? (() => {
        const e = elsewhereOf(a.workspaceMicro, ledgerMicro);
        return {
          ok: true,
          asOf: a.asOf,
          totalMicro: a.workspaceMicro,
          elsewhereMicro: e.micro,
          ledgerAhead: e.ledgerAhead,
          otherMicro: a.otherMicro,
          orgMicro: a.orgMicro,
          keys: a.keys,
        };
      })()
    : a.count === undefined ? { ok: false, kind: a.kind } : { ok: false, kind: a.kind, count: a.count };

  return {
    current,
    daysInMonth: n,
    elapsed,
    calls,
    player,
    system,
    systemSplit,
    evals,
    perAccountMicro: rows.playerAccounts > 0 ? Math.round(player.micro / rows.playerAccounts) : null,
    accounts: rows.playerAccounts,
    playerCumulative: cumulative,
    playerByDay: byDay,
    callsPaceMicro: pace(calls.micro),
    playerPaceMicro,
    ownerMicro: rows.ownerMicro,
    ownerShareMicro: rows.ownerShareMicro,
    previous: rows.previous,
    settings: rows.settings,
    workspace: { ledgerMicro, read },
    // The series' own height, never a plan's: there is none since 2026-10-17. At least a cent, so
    // an empty month still draws a scale.
    trendScaleMicro: Math.max(player.micro, playerPaceMicro ?? 0, TREND_FLOOR_MICRO),
  };
}

/**
 * Dollars as the admin prints them: `$0`, three places under $2, two from there. The places are
 * chosen AFTER rounding to three, so $1.9997 is `$2.00` rather than `$2.000`.
 */
export function usd(micro: number): string {
  if (micro === 0) return "$0";
  const v = Math.round(micro / 1_000) / 1_000;
  return `$${v.toFixed(v < 2 ? 3 : 2)}`;
}

/** One `admin_settings` row: a key's value for one UTC month (`YYYY-MM`). */
export type SettingRow = Setting & { key: SettingKey; month: string };

/**
 * The settings that apply to `month`. A cap or a ceiling holds from its own month until a later
 * month's row, so the latest row at or before `month` applies. A ceiling with none yet but one set
 * for a later month is given that one, so the page can say when it starts (`startsAfter`).
 * The org cap is held as the workspace cap is. A retired `elsewhere_usd` row is never read: the
 * workspace figure is Anthropic's own.
 */
export function settingsForMonth(rows: readonly SettingRow[], month: MonthKey): Partial<Record<SettingKey, Setting>> {
  const m = monthParam(month);
  const of = (key: SettingKey) => rows.filter((r) => r.key === key).sort((a, b) => a.month.localeCompare(b.month));
  const strip = (r: SettingRow | undefined): Setting | undefined => (r ? { micro: r.micro, asOf: r.asOf, note: r.note, by: r.by } : undefined);
  const heldAt = (key: SettingKey) => of(key).filter((r) => r.month <= m).at(-1);
  const out: Partial<Record<SettingKey, Setting>> = {};
  const cap = strip(heldAt("account_cap_usd"));
  if (cap) out.account_cap_usd = cap;
  const org = strip(heldAt("org_cap_usd"));
  if (org) out.org_cap_usd = org;
  const ceiling = strip(heldAt("system_ceiling_usd") ?? of("system_ceiling_usd").find((r) => r.month > m));
  if (ceiling) out.system_ceiling_usd = ceiling;
  return out;
}

/**
 * The month a setting starts in when that is after `month`, else null. A setting's `asOf` is a
 * `YYYY-MM-DD` day; a ceiling set to start later is stored on its month's first day.
 */
export function startsAfter(setting: Setting | undefined, month: MonthKey): MonthKey | null {
  if (!setting) return null;
  const match = /^(\d{4})-(\d{2})/.exec(setting.asOf);
  if (!match) return null;
  const start = { year: Number(match[1]), month: Number(match[2]) - 1 };
  return start.year * 12 + start.month > month.year * 12 + month.month ? start : null;
}

/** A cap or a line: whole dollars bare (`$10`), anything else to the cent. */
export function capUsd(dollars: number): string {
  if (Number.isInteger(dollars)) return `$${dollars}`;
  // Cents unless that would misstate the cap (an env var can set a sub-cent share).
  return Number.isInteger(Math.round(dollars * 1_000_000) / 10_000) ? `$${dollars.toFixed(2)}` : `$${Number(dollars.toFixed(6))}`;
}

/** A stored cap in micro-dollars, printed as a cap. */
export const capMicro = (micro: number) => capUsd(micro / 1_000_000);

/** A typed dollar amount, to micro-dollars: digits with at most two decimals, a `$` allowed. */
export function parseDollars(text: string): number | null {
  const m = /^\$?\s*(\d{1,7})(?:\.(\d{1,2}))?$/.exec(text.trim());
  if (!m) return null;
  return usdToMicro(Number(`${m[1]}.${m[2] ?? "0"}`));
}
