// This deck among yours, What each deck is worth, and Jobs, deck by deck (handoff R2). Pure. A rank is a count
// ("11th of 21", most first), never a verdict: no "best", no "worst", no color on it.

import type { LineupBuild, LineupDeck } from "./types";
import { byName } from "./figures";

export type BuildKey = keyof LineupBuild;

/** The middle value, or the mean of the two middle values. */
export function median(values: readonly number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const valueOf = (d: LineupDeck, key: BuildKey): number | null => (d.build ? d.build[key] : null);

export type Strip = {
  key: BuildKey;
  /** Each other deck's position on the strip, 0 to 1. */
  others: { id: string; at: number }[];
  chosen: { value: number; at: number; rank: number; tied: boolean };
  median: { value: number; at: number };
  lo: number;
  hi: number;
  /** Decks with a figure: the rank's denominator. */
  total: number;
};

/** One strip for `key`, or null when the chosen deck has no figure (an all-land list's mana value). */
export function strip(decks: readonly LineupDeck[], chosen: LineupDeck, key: BuildKey): Strip | null {
  const mine = valueOf(chosen, key);
  if (mine === null) return null;
  const rows = decks.flatMap((d) => {
    const v = valueOf(d, key);
    return v === null ? [] : [{ id: d.id, v }];
  });
  const vs = rows.map((r) => r.v);
  const lo = Math.min(...vs);
  const hi = Math.max(...vs);
  const at = (v: number) => (hi === lo ? 0.5 : (v - lo) / (hi - lo));
  const m = median(vs);
  return {
    key,
    others: rows.filter((r) => r.id !== chosen.id).map((r) => ({ id: r.id, at: at(r.v) })),
    chosen: { value: mine, at: at(mine), rank: rows.filter((r) => r.v > mine).length + 1, tied: rows.filter((r) => r.v === mine).length > 1 },
    median: { value: m, at: at(m) },
    lo,
    hi,
    total: rows.length,
  };
}

/** The default chosen deck: the one played most recently, else the first by name. */
export function defaultChosen(decks: readonly LineupDeck[]): LineupDeck | null {
  const newest = (d: LineupDeck) => (d.games.length === 0 ? -Infinity : Math.max(...d.games.map((g) => Date.parse(g.playedAt))));
  const played = decks.filter((d) => d.games.length > 0).sort((a, b) => newest(b) - newest(a) || byName(a.name, b.name));
  return played[0] ?? [...decks].sort((a, b) => byName(a.name, b.name))[0] ?? null;
}

export type WorthSort = "most" | "name";

export type Worth = { rows: { deck: LineupDeck; cents: number; share: number }[]; sumCents: number; maxCents: number; medianCents: number };

/** Each deck's own value (Money's figure), one bar per deck. A deck without a value is left out. */
export function worth(decks: readonly LineupDeck[], sort: WorthSort): Worth {
  const valued = decks.flatMap((d) => (d.build ? [{ deck: d, cents: d.build.valueCents }] : []));
  const max = Math.max(0, ...valued.map((r) => r.cents));
  const rows = valued
    .map((r) => ({ ...r, share: max > 0 ? r.cents / max : 0 }))
    .sort((a, b) => (sort === "most" ? b.cents - a.cents || byName(a.deck.name, b.deck.name) : byName(a.deck.name, b.deck.name)));
  return { rows, sumCents: valued.reduce((n, r) => n + r.cents, 0), maxCents: max, medianCents: valued.length ? median(valued.map((r) => r.cents)) : 0 };
}

export const JOB_COLUMNS = ["lands", "ramp", "draw", "removal"] as const;
export type JobColumn = (typeof JOB_COLUMNS)[number];

export type JobsGrid = {
  rows: { deck: LineupDeck; cells: { key: JobColumn; value: number; shade: number }[] }[];
  range: Record<JobColumn, [number, number]>;
};

/** The 4-column grid: real counts, shaded min to max within each column, sorted by `by` most first, then name. */
export function jobsGrid(decks: readonly LineupDeck[], by: JobColumn): JobsGrid {
  const built = decks.filter((d) => d.build);
  const range = Object.fromEntries(JOB_COLUMNS.map((k) => {
    const vs = built.map((d) => d.build![k]);
    return [k, [Math.min(...vs), Math.max(...vs)]];
  })) as Record<JobColumn, [number, number]>;
  const rows = built
    .slice()
    .sort((a, b) => b.build![by] - a.build![by] || byName(a.name, b.name))
    .map((deck) => ({
      deck,
      cells: JOB_COLUMNS.map((key) => {
        const [lo, hi] = range[key];
        return { key, value: deck.build![key], shade: hi === lo ? 0 : (deck.build![key] - lo) / (hi - lo) };
      }),
    }));
  return { rows, range };
}
