/**
 * The Rule 0 table check's rules (plan `2026-10-16-rule-zero.md`, PR 1). Pure: no database, no copy.
 *
 * A table compares the decks seated at it by the bracket the app already reads (`slotDeck`), never by a
 * power number and never by a model. Each seat is one bracket, a declared answer to a range, or a range
 * left open; the table measures every read seat from one middle and flags a seat a bracket or more from
 * it. Two read seats are the exception: they are judged on the gap BETWEEN them, and a bracket or more apart
 * flags both as `split`, though each then sits half that gap from the middle. The strings that speak these
 * results live in the copy module, not here.
 */
import { declarationAsk } from "../bracket/declaration-ask";
import type { Bracket, BracketLean, ComboRef, RuleId } from "../bracket/types";
import { verdictSubLine, type RuledOutReason } from "../bracket/verdict-head";

/** What one seat contributes to the comparison: a bracket, or a range nobody answered. */
export type SeatValue = { kind: "one"; bracket: Bracket } | { kind: "range"; lo: Bracket; hi: Bracket };

/**
 * A single bracket is itself; a range answered by a declaration inside it is that declaration; an
 * undeclared range, or one whose retained declaration has DRIFTED outside a newer reading, stays a range.
 * A drifted declaration answers nothing and is never compared (brief, engineering notes).
 */
export function seatValue(permits: readonly Bracket[], declared: Bracket | null): SeatValue {
  if (permits.length === 1) return { kind: "one", bracket: permits[0] };
  const ask = declarationAsk(permits, declared);
  if (ask.kind === "answered") return { kind: "one", bracket: ask.declared };
  return { kind: "range", lo: permits[0], hi: permits[permits.length - 1] };
}

/** The value a range contributes to the middle: its midpoint, so the middle never depends on itself. */
const midpoint = (v: SeatValue): number => (v.kind === "one" ? v.bracket : (v.lo + v.hi) / 2);

/** How far a seat sits from the middle: 0 for a range the middle lies inside, else the gap to its nearer end. */
export function distanceFrom(v: SeatValue, middle: number): number {
  if (v.kind === "one") return Math.abs(v.bracket - middle);
  if (middle < v.lo) return v.lo - middle;
  if (middle > v.hi) return middle - v.hi;
  return 0;
}

/** The gap between two seats: 0 where either covers the other. */
const gapBetween = (a: SeatValue, b: SeatValue): number => {
  const [a1, a2] = a.kind === "one" ? [a.bracket, a.bracket] : [a.lo, a.hi];
  const [b1, b2] = b.kind === "one" ? [b.bracket, b.bracket] : [b.lo, b.hi];
  return Math.max(0, b1 - a2, a1 - b2);
};

/** Where the rail draws a seat's face: its bracket, or a range's end nearer the middle (the lower on a tie). */
export function faceAt(v: SeatValue, middle: number): Bracket {
  if (v.kind === "one") return v.bracket;
  return Math.abs(v.hi - middle) < Math.abs(v.lo - middle) ? v.hi : v.lo;
}

/** A seat is flagged a bracket or more from the middle (brief lock 2); at a two-seat table, the gap between the two. */
export const FLAG_DISTANCE = 1;

export type SeatFlag = { dir: "high" | "low"; split: boolean };

export type ReadSeat<Id extends string = string> = { id: Id; face: Bracket; distance: number; flag: SeatFlag | null };

export type TableRead<Id extends string = string> =
  /** Fewer than two seats can be compared: no middle, no rail. */
  | { kind: "notEnough"; read: number }
  /**
   * `band` is false on a split: two seats a bracket or more apart have no "rest" to measure from, so
   * the rail draws no `TABLE` band and both are flagged (brief, engineering notes).
   */
  | { kind: "read"; middle: number; band: boolean; seats: ReadSeat<Id>[] };

/**
 * The table's read. A seat whose `value` is null is not in the read (no reading, not legal now, waiting
 * for its player) and is left out of it, never compared as if it were a bracket.
 *
 * The middle is the median of the read seats' values, a range counting at its midpoint; an even count
 * takes the mean of the middle two. So `2,3,3,4` reads from 3 and flags both ends, and `2,2,4` reads from
 * 2 and flags the 4.
 */
export function tableRead<Id extends string>(seats: readonly { id: Id; value: SeatValue | null }[]): TableRead<Id> {
  const read = seats.filter((s): s is { id: Id; value: SeatValue } => s.value !== null);
  if (read.length < 2) return { kind: "notEnough", read: read.length };

  const sorted = read.map((s) => midpoint(s.value)).sort((a, b) => a - b);
  const half = sorted.length / 2;
  const middle = sorted.length % 2 === 1 ? sorted[Math.floor(half)] : (sorted[half - 1] + sorted[half]) / 2;

  if (read.length === 2) {
    const [a, b] = read;
    const split = gapBetween(a.value, b.value) >= FLAG_DISTANCE;
    const high = midpoint(a.value) > midpoint(b.value) ? a.id : b.id;
    return {
      kind: "read",
      middle,
      band: !split,
      seats: read.map((s) => ({
        id: s.id,
        face: faceAt(s.value, middle),
        distance: distanceFrom(s.value, middle),
        flag: split ? { dir: s.id === high ? "high" : "low", split: true } : null,
      })),
    };
  }

  return {
    kind: "read",
    middle,
    band: true,
    seats: read.map((s) => {
      const distance = distanceFrom(s.value, middle);
      const flag: SeatFlag | null = distance >= FLAG_DISTANCE
        ? { dir: midpoint(s.value) > middle ? "high" : "low", split: false }
        : null;
      return { id: s.id, face: faceAt(s.value, middle), distance, flag };
    }),
  };
}

/** Where a seat stands before it can be compared (readiness gap 9), from one snapshot of the deck. */
export type SeatState =
  /** No deck chosen yet: the seat's player picks their own. */
  | { kind: "waiting" }
  /** Not 100 cards now. Never compared, even with a stored reading: `cards` is the whole deck, commanders in. */
  | { kind: "illegal"; cards: number }
  /** Legal, and no usable reading: no row, or an older-version row over the same list (rebuilt, not re-analyzed). The one state read on the spot. */
  | { kind: "unread" }
  /** Legal, and a row exists that this deployment cannot read: its player analyzes it; nobody else computes it. */
  | { kind: "needsAnalysis" }
  /** Legal, with a reading of the list as it is. */
  | { kind: "fresh" }
  /** Legal, with a reading from before its last change: kept, and marked so. */
  | { kind: "stale" };

export type SeatDeck = {
  /** `deckLegality(head).built`: the body's cards, commanders excluded. */
  built: number;
  /** `deckLegality(head).size`: 99, or 98 with a partner. */
  size: number;
  /** `none`: no `deck_profiles` row, or one `readStoredReading` would quietly rebuild (`seatReadingIn`'s `rebuildable`). `unreadable`: a row it returns null for. */
  reading: "none" | "unreadable" | { fresh: boolean };
};

/** The commander zone holds what the body does not, so the whole deck is the body plus `100 - size`. */
export const DECK_SIZE = 100;

export function seatState(deck: SeatDeck | null): SeatState {
  if (!deck) return { kind: "waiting" };
  if (deck.built !== deck.size) return { kind: "illegal", cards: deck.built + (DECK_SIZE - deck.size) };
  if (deck.reading === "none") return { kind: "unread" };
  if (deck.reading === "unreadable") return { kind: "needsAnalysis" };
  return deck.reading.fresh ? { kind: "fresh" } : { kind: "stale" };
}

/** True for the states the read compares; every other seat keeps its place and says why it is left out. */
export const inRead = (s: SeatState): boolean => s.kind === "fresh" || s.kind === "stale";

/**
 * What puts a flagged seat where it is (readiness gap 10), as data the copy module speaks.
 *
 * - `ruledOut`: the rules passed at the bracket below, with each count against its limit (`whyLimit`).
 * - `assembled`: the bracket below is out because the deck assembles a combo (`whyCombo`), named by
 *   `lean.decidedBy`, with how many tutors reach it.
 * - `low`: nothing counted passes the seat's bracket, and counts can miss cards (`whyLow`; brief lock 3).
 * - `none`: nothing to name.
 */
export type Drivers =
  | { kind: "ruledOut"; below: Bracket; reasons: RuledOutReason[] }
  | { kind: "assembled"; below: Bracket; combo: ComboRef | null; tutors: number }
  | { kind: "low"; bracket: Bracket }
  | { kind: "none" };

export type DriverVerdict = {
  permits: readonly Bracket[];
  violations: readonly { rule: RuleId; bracket: number; have: number; limit: number }[];
  lean: BracketLean | null;
};

export function driversFor(verdict: DriverVerdict, flag: SeatFlag, face: Bracket): Drivers {
  if (flag.dir === "low") return { kind: "low", bracket: face };
  // A range's sub-line is `intent` whatever ruled out the bracket below it, so a high range takes its
  // reasons from the violations at its lower end's bracket below: `[4,5]` names what passed bracket 3.
  if (verdict.permits.length > 1) {
    const below = (verdict.permits[0] - 1) as Bracket;
    const reasons = dedupeByRule(verdict.violations.filter((v) => v.bracket === below));
    return reasons.length > 0 ? { kind: "ruledOut", below, reasons } : { kind: "none" };
  }
  const sub = verdictSubLine(verdict);
  if (sub.kind === "ruledOut") return sub;
  if (sub.kind === "assembled") {
    const combo = verdict.lean?.decidedBy ?? null;
    return { kind: "assembled", below: sub.below, combo, tutors: tutorsReaching(verdict.lean, combo) };
  }
  return { kind: "none" };
}

const dedupeByRule = (vs: readonly { rule: RuleId; have: number; limit: number }[]): RuledOutReason[] =>
  vs.filter((v, i, all) => all.findIndex((o) => o.rule === v.rule) === i).map((v) => ({ rule: v.rule, have: v.have, limit: v.limit }));

/** The distinct tutors that find any piece of the deciding combo. */
export function tutorsReaching(lean: BracketLean | null, combo: ComboRef | null): number {
  if (!lean || !combo) return 0;
  const receipt = lean.receipts.find((r) => r.combo.variantId === combo.variantId);
  if (!receipt) return 0;
  return new Set(receipt.pieces.flatMap((p) => p.tutors.map((t) => t.oracleId))).size;
}

export type OwnDeck<Id extends string = string> = {
  deckId: Id;
  /** Null when the deck cannot be suggested: not legal now, or no reading. */
  value: SeatValue | null;
  lastPlayedAt: Date | null;
};

/** At most this many closer decks are offered (G6). */
export const MAX_SUGGESTIONS = 3;

/**
 * The player's own decks that sit strictly nearer the middle than the seated one (G6): legal now, with a
 * reading, nearest first, then most recently played (a never-played deck last). Empty when none is
 * nearer, and the block is then absent while the flag stays.
 */
export function suggestionsFor<Id extends string>(
  seatedDeckId: Id,
  seatedDistance: number,
  own: readonly OwnDeck<Id>[],
  middle: number,
): OwnDeck<Id>[] {
  return own
    .filter((d): d is OwnDeck<Id> & { value: SeatValue } => d.deckId !== seatedDeckId && d.value !== null)
    .map((d) => ({ d, distance: distanceFrom(d.value, middle) }))
    .filter((x) => x.distance < seatedDistance)
    .sort((a, b) => a.distance - b.distance || playedDesc(a.d.lastPlayedAt, b.d.lastPlayedAt))
    .slice(0, MAX_SUGGESTIONS)
    .map((x) => x.d);
}

const playedDesc = (a: Date | null, b: Date | null): number =>
  (b?.getTime() ?? -Infinity) - (a?.getTime() ?? -Infinity) || 0;

/** Setup's starting deck for a seat (G8): the most recently played, else the most recently edited. */
export function startingDeck<Id extends string>(
  decks: readonly { deckId: Id; lastPlayedAt: Date | null; lastEditedAt: Date }[],
): Id | null {
  if (decks.length === 0) return null;
  const played = decks.filter((d) => d.lastPlayedAt !== null);
  const pool = played.length > 0 ? played : decks;
  const at = (d: (typeof decks)[number]) => (played.length > 0 ? d.lastPlayedAt!.getTime() : d.lastEditedAt.getTime());
  return pool.reduce((best, d) => (at(d) > at(best) ? d : best)).deckId;
}
