import { plainText } from "../decks/notes-body";
import { parseChooseParams } from "./params";
import { pastRunHref } from "./submit";
import type { TheReadResult } from "./the-read";

/**
 * Help me choose History: the shape of one listed run and the keyset the list pages on. Pure and
 * client-safe; the reads are in `history-read.ts`.
 *
 * A run is listed only with the ask it was made from (`intake_reads.ask`), which is what names it
 * and what reopens it. The words are drawn back, never sent anywhere.
 */

/** Runs a page holds, and what `Show 20 more` asks for. */
export const CHOOSE_HISTORY_PAGE = 20;

/** How many pick thumbs a row draws. */
export const HISTORY_THUMBS = 3;

export type ChooseHistoryRow = {
  id: string;
  /** ISO time the run started (a pending run) or was made. */
  at: string;
  /** `reading` is the player's one run in flight; `nothing` found no pick and used no credit. */
  state: "ok" | "nothing" | "reading";
  /** The words the player wrote, tagged cards as their names, line breaks collapsed. */
  words: string;
  /** The first picks' oracle ids, in the run's order. */
  thumbs: string[];
  /** Each thumb's art crop (or the card's image), by position; null where the catalog has none. Filled by the read. */
  thumbArt: (string | null)[];
  picks: number;
  /** The commanders the player's pool held when it ran (a run that found nothing says it). */
  pool: number | null;
  /** The results page for this run: its ask, its id, and the past-run mark. */
  href: string;
};

export type ChooseHistoryPage = {
  rows: ChooseHistoryRow[];
  nextCursor: string | null;
};

/** What the list reads from a row, before it is shaped. */
export type RawRun = {
  id: string;
  createdAt: Date;
  status: string;
  errorClass: string | null;
  ask: string;
  result: unknown;
};

export function shapeRun(raw: RawRun): ChooseHistoryRow | null {
  const state = raw.status === "pending" ? "reading" : raw.status === "ok" ? "ok" : raw.errorClass === "nothing_valid" ? "nothing" : null;
  if (state === null) return null;
  const p = parseChooseParams(new URLSearchParams(raw.ask));
  const words = plainText(p.words).replace(/\s+/g, " ").trim();
  // A run is made from words (an empty box starts no read), so an ask without any is not one of ours.
  if (!words) return null;
  const result = (raw.result ?? null) as Partial<TheReadResult> | null;
  const picks = Array.isArray(result?.picks) ? result.picks : [];
  return {
    id: raw.id,
    at: raw.createdAt.toISOString(),
    state,
    words,
    thumbs: state === "ok" ? picks.slice(0, HISTORY_THUMBS).map((x) => x.oracleId) : [],
    thumbArt: [],
    picks: state === "ok" ? picks.length : 0,
    pool: typeof result?.pool === "number" ? result.pool : null,
    href: pastRunHref(raw.ask, raw.id),
  };
}

/** The keyset: newest first on `created_at` to the millisecond, ties on the row's uuid, descending. */
export type HistoryKey = { at: string; id: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Opaque to the reader: `<epoch ms>.<uuid>`. */
export function encodeKey(key: HistoryKey): string {
  return `${Date.parse(key.at)}.${key.id}`;
}

/** Null for anything this module did not write: a reader can send any string. */
export function decodeKey(cursor: string | null | undefined): HistoryKey | null {
  if (!cursor || cursor.length > 80) return null;
  const i = cursor.indexOf(".");
  if (i < 1) return null;
  const ms = cursor.slice(0, i);
  const id = cursor.slice(i + 1);
  if (!/^\d{1,15}$/.test(ms) || !UUID.test(id)) return null;
  return { at: new Date(Number(ms)).toISOString(), id: id.toLowerCase() };
}

/**
 * Folds a freshly read first page into the rows already drawn (the poll while a run is in flight).
 * A row the page returns replaces its drawn twin, an unseen one joins in order, and a drawn
 * `reading` row the page no longer returns is gone (it settled into a failure the list does not
 * keep, or was reaped). Settled rows older than the page are left as they are.
 */
export function mergeFirstPage(drawn: readonly ChooseHistoryRow[], fresh: readonly ChooseHistoryRow[]): ChooseHistoryRow[] {
  const freshIds = new Set(fresh.map((r) => r.id));
  const kept = drawn.filter((r) => !freshIds.has(r.id) && r.state !== "reading");
  return [...fresh, ...kept].sort(compareRows);
}

/** Newest first; a tie on the millisecond falls to the uuid, descending, the order the read pages on. */
export function compareRows(a: Pick<ChooseHistoryRow, "at" | "id">, b: Pick<ChooseHistoryRow, "at" | "id">): number {
  const t = Date.parse(b.at) - Date.parse(a.at);
  if (t !== 0) return t;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}
