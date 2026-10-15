/**
 * The seats of the game log's "Across the table" row (Social R3 plan, PR 2), as the form holds them before
 * anything is saved. Pure, so every rule the row draws is one function a test can break:
 *
 * - seats are the pod minus the player (`parseOpponents` refuses more), and a smaller pod is HELD while the
 *   seats it would drop are filled (clear a seat first), so lowering the pod never silently discards one;
 * - `won` is for a loss, on one seat at most, and leaving Lost clears it BEFORE the action is called, because
 *   the server refuses a winner on anything else;
 * - what is sent is `OpponentInput`, the shape `parseOpponents` checks again.
 */
import type { OpponentInput } from "./game-opponents";
import type { OpponentCommanderHit } from "./opponent-commanders";

/** What a seat draws of its commander. The hit's partner reading stays on the search, never in a seat. */
export type SeatCommander = Pick<OpponentCommanderHit, "oracleId" | "name" | "imageUri" | "colorIdentity">;

export type Seat = {
  /** A client key, stable while the seat lives and meaningless after: never sent. */
  key: string;
  commander: SeatCommander;
  /** Who sat there, in the player's words. Empty is none. */
  label: string;
  won: boolean;
};

/** Matches `OPPONENT_LABEL_MAX`; restated here because that module imports the database. */
export const SEAT_LABEL_MAX = 30;

/** Seats at a table of `podSize`: everyone but the player. */
export const seatCount = (podSize: number) => podSize - 1;

/** A pod size the form must refuse to lower to, because filled seats would not fit in it. */
export const podSizeHeld = (podSize: number, filled: number) => seatCount(podSize) < filled;

/** Whether the table has room for another seat. */
export const hasRoom = (podSize: number, filled: number) => filled < seatCount(podSize);

/** The seat a commander press fills: a new one at the end, or the named one changed in place (its label kept). */
export function seatWith(seats: readonly Seat[], at: string | null, commander: SeatCommander, key: string): Seat[] {
  if (at === null) return [...seats, { key, commander, label: "", won: false }];
  return seats.map((s) => (s.key === at ? { ...s, commander } : s));
}

export const seatWithout = (seats: readonly Seat[], key: string): Seat[] => seats.filter((s) => s.key !== key);

export function seatLabelled(seats: readonly Seat[], key: string, label: string): Seat[] {
  return seats.map((s) => (s.key === key ? { ...s, label: Array.from(label).slice(0, SEAT_LABEL_MAX).join("") } : s));
}

/** Pressing a trophy moves the mark to that seat; pressing the winner again clears it. At most one seat holds it. */
export function seatWon(seats: readonly Seat[], key: string): Seat[] {
  const was = seats.find((s) => s.key === key)?.won ?? false;
  return seats.map((s) => ({ ...s, won: s.key === key ? !was : false }));
}

/** A result that is not Lost has no winner among them. */
export function seatsForResult(seats: readonly Seat[], result: string | null): Seat[] {
  return result === "loss" || !seats.some((s) => s.won) ? [...seats] : seats.map((s) => ({ ...s, won: false }));
}

/** The commander's short name, before the comma: `Yuriko` for `Yuriko, the Tiger's Shadow`. */
export const shortName = (name: string) => name.split(",")[0].trim();

/** The seat's own name for a screen reader and a heading: the label when there is one, else the commander. */
export const seatName = (s: Seat) => (s.label.trim() !== "" ? s.label.trim() : shortName(s.commander.name));

/** What `logGame` is sent. A label only when typed, `won` only when set and the game was lost. */
export function opponentsFor(seats: readonly Seat[], result: string | null): OpponentInput[] {
  return seats.map((s) => {
    const label = s.label.trim();
    return {
      commander: s.commander.oracleId,
      ...(label !== "" ? { label } : {}),
      ...(s.won && result === "loss" ? { won: true } : {}),
    };
  });
}
