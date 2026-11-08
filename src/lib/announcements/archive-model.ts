/**
 * The Announcements archive's pure half (`/announcements`, small items 11 item 3): the kind filter, the month counts and
 * what is drawn from them, the keyset cursor, and the grouping of rows under month heads. No database and no React, so the
 * client view, the server read and the tests share it.
 *
 * Months are UTC calendar months everywhere (the grouping, the heads, the jump, the date on a row), so a post never
 * sits under one month and carries another month's date.
 */
import type { FeedView } from "../feed/home";
import { ANNOUNCEMENT_KINDS, isAnnouncementKind, type AnnouncementFeedKind } from "../feed/kinds";

/** Posts a page holds (Hugh's brief: thirty). */
export const ARCHIVE_PAGE = 30;

/** The kind filter: every kind, or one Announcements kind. */
export type ArchiveKind = "all" | AnnouncementFeedKind;

/** `?kind=`: a kind's own key, anything else (or absent) is All. */
export function parseArchiveKind(v: unknown): ArchiveKind {
  return isAnnouncementKind(v) ? v : "all";
}

/** A month as `YYYY-MM`. */
export type Ym = string;

const YM = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** `?m=`: a `YYYY-MM` month, or null. */
export function parseYm(v: unknown): Ym | null {
  return typeof v === "string" && YM.test(v) ? v : null;
}

/** The month a UTC instant falls in. */
export const ymOf = (at: string | Date): Ym => new Date(at).toISOString().slice(0, 7);

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;
export const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

const parts = (ym: Ym): { year: number; month: number } => ({ year: Number(ym.slice(0, 4)), month: Number(ym.slice(5, 7)) });
const ymFrom = (year: number, month: number): Ym => `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;

/** `November 2026`. */
export const monthLabel = (ym: Ym): string => `${MONTH_NAMES[parts(ym).month - 1]} ${parts(ym).year}`;
/** `Nov 2026`, the jump control's face. */
export const monthShort = (ym: Ym): string => `${MONTH_SHORT[parts(ym).month - 1]} ${parts(ym).year}`;
/** A row's date, `Oct 28` (the month head above it names the year). */
export const dayLabel = (at: string): string => `${MONTH_SHORT[new Date(at).getUTCMonth()]} ${new Date(at).getUTCDate()}`;

/** Posts per month, per kind, as the one counts read returns them. */
export type MonthCounts = Record<Ym, Partial<Record<AnnouncementFeedKind, number>>>;

/** One row of the counts read. */
export type CountRow = { ym: string; kind: string; n: number | string };

/** The counts read's rows folded to `MonthCounts`; a row of a kind the app does not know is dropped. */
export function toMonthCounts(rows: readonly CountRow[]): MonthCounts {
  const out: MonthCounts = {};
  for (const r of rows) {
    if (!isAnnouncementKind(r.kind) || parseYm(r.ym) === null) continue;
    (out[r.ym] ??= {})[r.kind] = (out[r.ym][r.kind] ?? 0) + Number(r.n);
  }
  return out;
}

/** Posts in a month under a kind. */
export function countIn(counts: MonthCounts, ym: Ym, kind: ArchiveKind): number {
  const m = counts[ym];
  if (!m) return 0;
  return kind === "all" ? ANNOUNCEMENT_KINDS.reduce((s, k) => s + (m[k] ?? 0), 0) : (m[kind] ?? 0);
}

/** Every month that holds a post under the kind, newest first. */
export function monthsUnder(counts: MonthCounts, kind: ArchiveKind): { ym: Ym; n: number }[] {
  return Object.keys(counts)
    .map((ym) => ({ ym, n: countIn(counts, ym, kind) }))
    .filter((m) => m.n > 0)
    .sort((a, b) => (a.ym < b.ym ? 1 : -1));
}

/**
 * Posts at or before a month's end under the kind: what the list can show from that month down, the foot's total.
 * No month: every post.
 */
export function totalFrom(counts: MonthCounts, kind: ArchiveKind, from: Ym | null): number {
  return monthsUnder(counts, kind).reduce((s, m) => (from === null || m.ym <= from ? s + m.n : s), 0);
}

/** The year of the oldest stored post (the sub line's "since"), or null with none. */
export function firstYear(counts: MonthCounts): number | null {
  const oldest = monthsUnder(counts, "all").at(-1);
  return oldest ? parts(oldest.ym).year : null;
}

/** The newest month holding a post, or null. The jump's top year and the list's first head. */
export function newestMonth(counts: MonthCounts, kind: ArchiveKind): Ym | null {
  return monthsUnder(counts, kind)[0]?.ym ?? null;
}

/** The jump sheet: years newest first from the newest post's year to the oldest, each with its count and all twelve months. */
export function yearsUnder(counts: MonthCounts, kind: ArchiveKind): { year: number; n: number; months: { ym: Ym; month: number; n: number }[] }[] {
  const held = monthsUnder(counts, "all");
  if (held.length === 0) return [];
  const top = parts(held[0].ym).year;
  const bottom = parts(held.at(-1)!.ym).year;
  const years = [];
  for (let year = top; year >= bottom; year--) {
    const months = Array.from({ length: 12 }, (_, i) => ({ ym: ymFrom(year, i + 1), month: i + 1, n: countIn(counts, ymFrom(year, i + 1), kind) }));
    years.push({ year, n: months.reduce((s, m) => s + m.n, 0), months });
  }
  return years;
}

/** The distance in months between two months. */
const gap = (a: Ym, b: Ym): number => Math.abs((parts(a).year - parts(b).year) * 12 + parts(a).month - parts(b).month);

/** The month nearest `ym` that holds a post under the kind (a tie goes to the older), or null when the kind has none at all. */
export function nearestMonth(counts: MonthCounts, kind: ArchiveKind, ym: Ym): Ym | null {
  let best: Ym | null = null;
  for (const m of monthsUnder(counts, kind)) {
    // Newest first: `<=` lets the older month win a tie.
    if (best === null || gap(m.ym, ym) <= gap(best, ym)) best = m.ym;
  }
  return best;
}

/**
 * The keyset cursor: the last row's `published_at` (as the database printed it, so no precision is lost) and its id, the
 * list's sort key `(published_at desc, id desc)`. A post inserted at the top while the reader pages never shifts it, as an
 * offset would. The cursor is a reader-supplied string, so the server read checks its shape (`parseCursor`) and binds it.
 */
export type Cursor = { at: string; id: string };

const AT = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?[+-]\d{2}(:\d{2})?$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const encodeCursor = (c: Cursor): string => `${c.at}|${c.id}`;

export function parseCursor(v: unknown): Cursor | null {
  if (typeof v !== "string") return null;
  const [at, id, ...rest] = v.split("|");
  return rest.length === 0 && at !== undefined && id !== undefined && AT.test(at) && UUID.test(id) ? { at, id } : null;
}

/** The cursor that starts a page at a month's newest post: everything strictly before the next month's first instant. */
export function anchorCursor(ym: Ym): string {
  const { year, month } = parts(ym);
  const next = month === 12 ? ymFrom(year + 1, 1) : ymFrom(year, month + 1);
  return encodeCursor({ at: `${next}-01 00:00:00+00`, id: "00000000-0000-0000-0000-000000000000" });
}

/** One page as the read returns it and the action carries it: the rows as the Home feed draws them, and the cursor of the next page. */
export type ArchivePage = { items: FeedView[]; next: string | null };

/** Rows grouped under their month, in the order given. */
export function groupByMonth(items: readonly FeedView[]): { ym: Ym; items: FeedView[] }[] {
  const out: { ym: Ym; items: FeedView[] }[] = [];
  for (const item of items) {
    const ym = ymOf(item.at);
    const last = out.at(-1);
    if (last && last.ym === ym) last.items.push(item);
    else out.push({ ym, items: [item] });
  }
  return out;
}

/** The address bar for a view: defaults as absences (`All`, no month). */
export function archiveQuery(kind: ArchiveKind, anchor: Ym | null): string {
  const q = new URLSearchParams();
  if (kind !== "all") q.set("kind", kind);
  if (anchor) q.set("m", anchor);
  const s = q.toString();
  return s ? `?${s}` : "";
}
