import { classifySearches, tutorReaches } from "../bracket/tutor-targets";
import { body } from "./cards";
import type { BenchCard, BenchLine } from "./types";

/** The cards seen by turn 8 on the play: an opening seven, then a draw on each of turns 2 to 8. */
export const SEEN_BY_TURN_8 = 14;
export const SHUFFLES = 4000;
/** Fixed, so the same list always gives the same odds (brief lock 8). */
const SEED = 0x99c0ffee;

export type WinLine = BenchLine & { odds: number };

export type WinSpeed = {
  /** The chance at least one line is in hand by turn 8, 0 to 1. */
  odds: number;
  /** Every assembled line, uncapped, best odds first. */
  lines: WinLine[];
  /** The searches that can find at least one piece of a line. */
  tutors: BenchCard[];
};

/**
 * Win speed, for a deck that assembles at least one counted line; null otherwise, which draws
 * "No combo line" and never a grade. A line is in hand when every piece outside the command zone
 * is among the first 14 cards, or can be found by a search seen there: a search stands in for a
 * piece ONLY when it reaches it (`tutorReaches`, the bracket's own rule, read from oracle text so
 * a card with no label still counts), and each search finds one piece. Mana is not counted.
 *
 * DETERMINISTIC: a fixed-seed generator over the list sorted by oracle id, so neither the order
 * the list arrived in nor the run it was read on can move the figure.
 */
export function winSpeed(cards: readonly BenchCard[], lines: readonly BenchLine[]): WinSpeed | null {
  if (lines.length === 0) return null;
  const deck = body(cards).slice().sort((a, b) => (a.oracleId < b.oracleId ? -1 : a.oracleId > b.oracleId ? 1 : 0));
  const byId = new Map(cards.map((c) => [c.oracleId, c]));
  const commanders = new Set(cards.filter((c) => c.commander).map((c) => c.oracleId));
  const { targets } = classifySearches(deck);
  const reaches = (tutorId: string, pieceId: string) => {
    const target = targets.get(tutorId);
    const piece = byId.get(pieceId);
    return !!target && !!piece && tutorId !== pieceId
      && tutorReaches(target, { typeLine: piece.typeLine, colorIdentity: [...piece.colorIdentity], cmc: piece.manaValue });
  };
  const needs = lines.map((l) => l.pieceIds.filter((id) => !commanders.has(id)));
  const useful = deck.filter((c) => needs.some((need) => need.some((id) => reaches(c.oracleId, id))));
  const usefulIds = new Set(useful.map((c) => c.oracleId));
  const library = deck.flatMap((c) => Array.from({ length: c.quantity }, () => c.oracleId));

  const hits = new Array<number>(lines.length).fill(0);
  let any = 0;
  const next = mulberry32(SEED);
  for (let s = 0; s < SHUFFLES; s++) {
    const seen = shuffledPrefix(library, Math.min(SEEN_BY_TURN_8, library.length), next);
    const searches = seen.filter((id) => usefulIds.has(id));
    const inHand = new Set(seen);
    let found = false;
    needs.forEach((need, i) => {
      const missing = need.filter((id) => !inHand.has(id));
      // A search that is itself a piece of this line is already spent as that piece.
      const free = searches.filter((id) => !lines[i].pieceIds.includes(id));
      if (missing.length <= free.length && everyFound(missing, free, reaches)) {
        hits[i]++;
        found = true;
      }
    });
    if (found) any++;
  }
  return {
    odds: any / SHUFFLES,
    lines: lines
      .map((l, i) => ({ ...l, odds: hits[i] / SHUFFLES }))
      .sort((a, b) => b.odds - a.odds || a.variantId.localeCompare(b.variantId)),
    tutors: useful.sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/**
 * Whether each missing piece can be given its own search: a bipartite matching (Kuhn's augmenting
 * paths), so one search never fills two pieces and a narrow search is not spent where a wide one
 * would do.
 */
export function everyFound(missing: readonly string[], searches: readonly string[], reaches: (tutor: string, piece: string) => boolean): boolean {
  const owner = new Array<number>(searches.length).fill(-1);
  const assign = (p: number, visited: boolean[]): boolean => {
    for (let t = 0; t < searches.length; t++) {
      if (visited[t] || !reaches(searches[t], missing[p])) continue;
      visited[t] = true;
      if (owner[t] === -1 || assign(owner[t], visited)) {
        owner[t] = p;
        return true;
      }
    }
    return false;
  };
  return missing.every((_, p) => assign(p, new Array<boolean>(searches.length).fill(false)));
}

/** The first `n` cards of a fresh Fisher-Yates shuffle, shuffled in place. */
function shuffledPrefix(deck: string[], n: number, next: () => number): string[] {
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(next() * (deck.length - i));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, n);
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
