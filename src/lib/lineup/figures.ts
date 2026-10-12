// The Stats view's figures (handoff `design_handoff_the99_lineup`, R2). Pure, so the rules are provable
// without a database. Every per-deck figure is the deck's own (brief, lock 2): a record comes from
// `resultsStats`, a bracket from the tile's `tileBracket`, an identity from `deckIdentity`. Nothing here
// re-derives one, and nothing judges: a gap or a crowd is a count.

import type { Bracket } from "../profile/types";
import { resultsStats } from "../decks/stats-results";
import type { LineupDeck, LineupFilter, LineupGame } from "./types";

/** The decks a filter keeps. `Finished only` leaves brews out; nothing else narrows. */
export function scoped(decks: readonly LineupDeck[], filter: LineupFilter): LineupDeck[] {
  return filter === "finished" ? decks.filter((d) => !d.brew) : [...decks];
}

const DAY = 86_400_000;
const utcDay = (iso: string | Date) => {
  const d = new Date(iso);
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / DAY);
};

/** Whole calendar days (UTC) from `then` to `now`. */
export function daysAgo(then: string, now: string): number {
  return Math.max(0, utcDay(now) - utcDay(then));
}

/** Each game's pod size, distinct and ascending: what `pod of 4` / `pods of 3–5` is read from. */
export function podSizes(games: readonly LineupGame[]): number[] {
  return [...new Set(games.map((g) => g.podSize))].sort((a, b) => a - b);
}

const record = (games: readonly LineupGame[]) =>
  resultsStats(games.map((g) => ({ result: g.result, playedAt: new Date(g.playedAt), versionNumber: null })), []).record;

export type RecencyLane = {
  deck: LineupDeck;
  wins: number;
  games: number;
  pods: number[];
  /** Days from the deck's last game to today. */
  ago: number;
  /** Each game's position on the axis, 0 (the first game in scope) to 1 (today), oldest first. */
  beads: { result: LineupGame["result"]; at: number }[];
  /** Where the line from the last game to today starts. */
  lastAt: number;
};

export type Recency = {
  lanes: RecencyLane[];
  /** Never played, by name. Never hidden under any filter. */
  never: LineupDeck[];
  wins: number;
  games: number;
  pods: number[];
  /** The axis: from the first game in scope to today, with a mark at each month's first day. */
  axis: { from: string; to: string; months: { label: string; at: number }[] } | null;
  /** Days since the newest game in scope, or null with none. */
  lastAgo: number | null;
};

const MONTH = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });

export function recency(decks: readonly LineupDeck[], now: string): Recency {
  const played = decks.filter((d) => d.games.length > 0);
  const never = decks.filter((d) => d.games.length === 0).sort((a, b) => byName(a.name, b.name));
  const all = played.flatMap((d) => d.games);
  if (all.length === 0) return { lanes: [], never, wins: 0, games: 0, pods: [], axis: null, lastAgo: null };

  const start = Math.min(...all.map((g) => utcDay(g.playedAt)));
  const end = utcDay(now);
  const span = Math.max(1, end - start);
  const at = (iso: string) => Math.min(1, Math.max(0, (utcDay(iso) - start) / span));
  const months: { label: string; at: number }[] = [];
  for (let d = new Date(start * DAY); ; ) {
    d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
    const day = utcDay(d);
    if (day >= end) break;
    months.push({ label: MONTH.format(d), at: (day - start) / span });
  }
  const newest = (d: LineupDeck) => Math.max(...d.games.map((g) => utcDay(g.playedAt)));
  const lanes = played
    .slice()
    .sort((a, b) => newest(b) - newest(a) || byName(a.name, b.name))
    .map((deck): RecencyLane => {
      const r = record(deck.games);
      const oldestFirst = [...deck.games].reverse();
      const last = deck.games.reduce((m, g) => (utcDay(g.playedAt) > utcDay(m) ? g.playedAt : m), deck.games[0].playedAt);
      return {
        deck,
        wins: r.wins,
        games: r.played,
        pods: podSizes(deck.games),
        ago: daysAgo(last, now),
        beads: oldestFirst.map((g) => ({ result: g.result, at: at(g.playedAt) })),
        lastAt: at(last),
      };
    });
  const r = record(all);
  return {
    lanes,
    never,
    wins: r.wins,
    games: r.played,
    pods: podSizes(all),
    axis: { from: new Date(start * DAY).toISOString(), to: now, months },
    lastAgo: Math.min(...lanes.map((l) => l.ago)),
  };
}

/** The nine bracket rows, in order: `1 · 1–2 · 2 · 2–3 · 3 · 3–4 · 4 · 4–5 · 5`. */
export type BracketSlot = { brackets: [Bracket] | [Bracket, Bracket]; label: string; decks: LineupDeck[] };

export const SLOT_LABELS = ["1", "1–2", "2", "2–3", "3", "3–4", "4", "4–5", "5"] as const;

/** Which row a deck's stored range sits on: a single bracket, or the boundary between two. */
export function slotOf(permits: readonly number[]): number | null {
  const sorted = [...permits].sort((a, b) => a - b);
  if (sorted.length === 1) return (sorted[0] - 1) * 2;
  if (sorted.length === 2 && sorted[1] === sorted[0] + 1) return (sorted[0] - 1) * 2 + 1;
  return null;
}

export type Spread = {
  slots: BracketSlot[];
  notAnalyzed: LineupDeck[];
  analyzed: number;
  /** Per color, W U B R G then colorless, the decks playing it (colorless: no color at all). */
  colors: { color: "W" | "U" | "B" | "R" | "G" | "C"; decks: LineupDeck[] }[];
  /** How many decks have 0..5 colors. */
  sizes: number[];
};

export function spread(decks: readonly LineupDeck[]): Spread {
  const slots: BracketSlot[] = SLOT_LABELS.map((label, i) => ({
    label,
    brackets: (i % 2 === 0 ? [i / 2 + 1] : [(i + 1) / 2, (i + 3) / 2]) as BracketSlot["brackets"],
    decks: [],
  }));
  const notAnalyzed: LineupDeck[] = [];
  for (const deck of decks) {
    const slot = deck.bracket ? slotOf(deck.bracket.permits) : null;
    if (slot === null) notAnalyzed.push(deck);
    else slots[slot].decks.push(deck);
  }
  const colors = (["W", "U", "B", "R", "G", "C"] as const).map((color) => ({
    color,
    decks: decks.filter((d) => (color === "C" ? d.identity.length === 0 : d.identity.includes(color))),
  }));
  const sizes = [0, 1, 2, 3, 4, 5].map((k) => decks.filter((d) => d.identity.length === k).length);
  return { slots, notAnalyzed, analyzed: decks.length - notAnalyzed.length, colors, sizes };
}

/** The slot holding the most decks, first on a tie: the folded card's summary. */
export function fullestSlot(s: Spread): BracketSlot | null {
  return s.slots.reduce<BracketSlot | null>((best, slot) => (slot.decks.length > (best?.decks.length ?? 0) ? slot : best), null);
}

/** By code point, never `localeCompare`: this renders on the server and again in the browser. */
export function byName(a: string, b: string): number {
  const l = a.toLowerCase();
  const r = b.toLowerCase();
  return l < r ? -1 : l > r ? 1 : 0;
}
