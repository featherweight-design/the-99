// The life tracker's result (F11, S5): who won or drew, and the rest out last first, from the finished game's state.
// Also the one rule that makes a draw by elimination possible on the tracker: a life change that ends the game lands
// together with every other panel's pending change (the 2 s window), so players going out at once go out in one entry.

import { isOver, placements, reduce, type Action, type Change, type GameState, type OutReason } from "./engine";

export type ResultOut = {
  seat: number;
  place: number;
  /** The round they went out in, or the last round for a player still in when the game was ended by hand. */
  round: number;
  /** Why they went out; null for a player still in when the game was ended by hand. */
  reason: OutReason | null;
};

export type Result = {
  /** First place: one seat is a win, several a draw. */
  winners: number[];
  /** Ended from End game, not by the last players going out. */
  byHand: boolean;
  /** The round the game ended in. */
  round: number;
  /** Everyone else, by place, the last out first; ties keep seating order. */
  out: ResultOut[];
};

export function resultOf(s: GameState): Result {
  const placed = placements(s);
  const place = new Map(placed.map((p) => [p.seat, p.place]));
  const winners = s.seats.filter((x) => place.get(x.seat) === 1).map((x) => x.seat);
  const out = s.seats
    .filter((x) => place.get(x.seat) !== 1)
    .map((x) => ({ seat: x.seat, place: place.get(x.seat)!, round: x.out?.round ?? s.round, reason: x.out?.reason ?? null }))
    .sort((a, b) => a.place - b.place);
  return { winners, byHand: s.winners !== null, round: s.round, out };
}

/**
 * The entry a panel's life change commits as. When it would end the game, every other panel's pending change is taken
 * and lands with it in one batch, so the last players tapped out together within the window go out together: a draw.
 * Otherwise the change commits alone and the other panels keep their pending changes.
 */
export function landLife(s: GameState, seat: number, delta: number, others: () => { seat: number; delta: number }[]): Action {
  const own: Change = { t: "life", seat, delta };
  if (!isOver(reduce(s, own))) return own;
  const rest: Change[] = others()
    .filter((o) => o.seat !== seat && o.delta !== 0)
    .map((o) => ({ t: "life", seat: o.seat, delta: o.delta }));
  return rest.length ? { t: "batch", actions: [own, ...rest] } : own;
}

/** "1 h 14 min", "38 min"; under a minute reads as one. */
export function gameLength(ms: number): string {
  const m = Math.max(1, Math.round(ms / 60000));
  const h = Math.floor(m / 60);
  return h ? (m % 60 ? `${h} h ${m % 60} min` : `${h} h`) : `${m} min`;
}

export const ordinal = (n: number) => {
  const t = n % 100;
  return `${n}${t >= 11 && t <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th")}`;
};
