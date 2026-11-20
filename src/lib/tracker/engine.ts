/**
 * The life tracker's game engine: pure, no clock, no storage, no React. A game is its `GameConfig` plus an ordered log
 * of committed `Action`s; the state is derived by replaying the log, so undo is dropping the last entry and the log is
 * the history the Table tab groups by round. One entry is one commit (the 2 s pending window of the panel), and a
 * `batch` entry commits several changes at once, so several players going out in one commit go out together.
 */

export const MAX_SEATS = 6;
export const COMMANDER_DAMAGE_LETHAL = 21;
export const POISON_LETHAL = 10;
export const SPEED_MAX = 4;

export const COUNTER_KEYS = ["poison", "energy", "experience", "rad", "tickets", "speed", "storm", "ring", "blessing", "dungeon"] as const;
export type CounterKey = (typeof COUNTER_KEYS)[number];
export const MANA_COLORS = ["W", "U", "B", "R", "G", "C"] as const;
export type ManaColor = (typeof MANA_COLORS)[number];
export type DayNight = "day" | "night";

export type SeatConfig = { seat: number; commanders: 1 | 2 };
export type GameConfig = {
  tableId: string;
  startingLife: number;
  seats: readonly SeatConfig[]; // turn order: seating order, ascending seat number
  first: number; // seat number that goes first
  layout: string;
};

type Leaf =
  | { t: "life"; seat: number; delta: number }
  | { t: "counter"; seat: number; key: CounterKey; delta: number }
  /** Combat damage `from`'s commander `cmdr` (0 or 1) dealt `seat`. It comes off their life as well. */
  | { t: "damage"; seat: number; from: number; cmdr: number; delta: number }
  | { t: "tax"; seat: number; cmdr: number; delta: number }
  | { t: "mana"; seat: number; color: ManaColor; delta: number }
  | { t: "monarch"; seat: number | null }
  | { t: "initiative"; seat: number | null }
  | { t: "day"; value: DayNight | null }
  | { t: "endTurn" }
  /** Ends the game by hand: `winners` take first place (several is a draw). */
  | { t: "end"; winners: readonly number[] };
/** A batch holds changes only: passing the turn or ending the game is its own entry, so one commit never moves play twice. */
export type Change = Exclude<Leaf, { t: "endTurn" } | { t: "end" }>;
export type Action = Leaf | { t: "batch"; actions: readonly Change[] };

export type OutReason =
  | { kind: "life" }
  | { kind: "commander"; from: number; cmdr: number }
  | { kind: "poison" };

export type SeatState = {
  seat: number;
  commanders: 1 | 2;
  life: number;
  counters: Record<CounterKey, number>;
  tax: [number, number];
  mana: Record<ManaColor, number>;
  /** Damage taken, keyed `${fromSeat}:${cmdr}`. */
  damage: Record<string, number>;
  out: { reason: OutReason; round: number; entry: number } | null;
};

export type GameState = {
  config: GameConfig;
  seats: SeatState[];
  active: number;
  round: number;
  monarch: number | null;
  initiative: number | null;
  day: DayNight | null;
  /** Seats the game was ended on by hand; null while it runs or ended by elimination. */
  winners: readonly number[] | null;
  /** The log entry count, which is the next entry's index. */
  entries: number;
  /** The round each entry was committed in, for the history's grouping by round. */
  rounds: number[];
};

const zero = <K extends string>(keys: readonly K[]) => Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;

export function startGame(config: GameConfig): GameState {
  return {
    config,
    seats: config.seats.map((s) => ({
      seat: s.seat,
      commanders: s.commanders,
      life: config.startingLife,
      counters: zero(COUNTER_KEYS),
      tax: [0, 0],
      mana: zero(MANA_COLORS),
      damage: {},
      out: null,
    })),
    active: config.first,
    round: 1,
    monarch: null,
    initiative: null,
    day: null,
    winners: null,
    entries: 0,
    rounds: [],
  };
}

const seatOf = (s: GameState, seat: number) => s.seats.find((x) => x.seat === seat);
const finite = (n: number) => Number.isFinite(n) && Number.isInteger(n);

export const alive = (s: GameState) => s.seats.filter((x) => x.out === null);
export const isOver = (s: GameState) => s.winners !== null || alive(s).length <= 1;

/** Passes the turn to the next seat still in. The round counts up each time play crosses the first player's seat. */
function advance(s: GameState): void {
  const order = s.config.seats.map((x) => x.seat);
  const firstAt = order.indexOf(s.config.first);
  let at = order.indexOf(s.active);
  for (let i = 0; i < order.length; i++) {
    at = (at + 1) % order.length;
    if (at === firstAt) s.round += 1;
    if (seatOf(s, order[at])?.out === null) {
      s.active = order[at];
      return;
    }
  }
}

function apply(s: GameState, a: Leaf): void {
  switch (a.t) {
    case "endTurn":
      advance(s);
      return;
    case "monarch":
      if (a.seat === null || seatOf(s, a.seat)?.out === null) s.monarch = a.seat;
      return;
    case "initiative":
      if (a.seat === null || seatOf(s, a.seat)?.out === null) s.initiative = a.seat;
      return;
    case "day":
      s.day = a.value;
      return;
    case "end":
      {
        const winners = a.winners.filter((w) => seatOf(s, w) !== undefined);
        if (winners.length > 0) s.winners = winners;
      }
      return;
  }
  const seat = seatOf(s, a.seat);
  if (!seat || seat.out !== null || !finite(a.delta)) return;
  switch (a.t) {
    case "life":
      seat.life += a.delta;
      return;
    case "counter": {
      const max = a.key === "speed" ? SPEED_MAX : Infinity;
      seat.counters[a.key] = Math.min(max, Math.max(0, seat.counters[a.key] + a.delta));
      return;
    }
    case "damage": {
      const from = seatOf(s, a.from);
      if (!from || !Number.isInteger(a.cmdr) || a.cmdr < 0 || a.cmdr >= from.commanders) return;
      const key = `${a.from}:${a.cmdr}`;
      const next = Math.max(0, (seat.damage[key] ?? 0) + a.delta);
      seat.life -= next - (seat.damage[key] ?? 0);
      seat.damage[key] = next;
      return;
    }
    case "tax":
      if (!Number.isInteger(a.cmdr) || a.cmdr < 0 || a.cmdr >= seat.commanders) return;
      seat.tax[a.cmdr] = Math.max(0, seat.tax[a.cmdr] + a.delta);
      return;
    case "mana":
      seat.mana[a.color] = Math.max(0, seat.mana[a.color] + a.delta);
      return;
  }
}

/** Why a seat is out right now, or null. Commander damage names the first commander at 21, in seat order. */
function lethal(seat: SeatState): OutReason | null {
  if (seat.life <= 0) return { kind: "life" };
  const lethalHits = Object.entries(seat.damage)
    .filter(([, n]) => n >= COMMANDER_DAMAGE_LETHAL)
    .map(([key]) => key.split(":").map(Number));
  if (lethalHits.length > 0) {
    const [from, cmdr] = lethalHits.sort((a, b) => a[0] - b[0] || a[1] - b[1])[0];
    return { kind: "commander", from, cmdr };
  }
  if (seat.counters.poison >= POISON_LETHAL) return { kind: "poison" };
  return null;
}

/** Applies one committed entry. A finished game takes no more entries. */
export function reduce(prev: GameState, action: Action): GameState {
  if (isOver(prev)) return prev;
  const s: GameState = structuredClone(prev);
  const entry = s.entries;
  const leaves: readonly Leaf[] = action.t === "batch" ? action.actions.filter((l) => l.t !== "endTurn" && l.t !== "end") : [action];
  for (const leaf of leaves) apply(s, leaf);
  s.rounds.push(s.round);
  s.entries += 1;

  for (const seat of s.seats) {
    if (seat.out !== null) continue;
    const reason = lethal(seat);
    if (reason) seat.out = { reason, round: s.round, entry };
  }
  if (!isOver(s)) {
    if (seatOf(s, s.active)?.out) advance(s);
    for (const key of ["monarch", "initiative"] as const) {
      const holder = s[key];
      if (holder !== null && seatOf(s, holder)?.out) s[key] = s.active;
    }
  }
  return s;
}

export type Game = { config: GameConfig; log: readonly Action[] };

export const replay = (game: Game): GameState => game.log.reduce(reduce, startGame(game.config));

/** Drops the last entry: the state is the replay of what is left. */
export const undo = (game: Game): Game => ({ config: game.config, log: game.log.slice(0, -1) });
export const commit = (game: Game, action: Action): Game => ({ config: game.config, log: [...game.log, action] });

/**
 * Placements for the saved result: whoever is still in (or the hand-picked winners) takes first, and the rest rank by
 * how long they lasted. Seats that went out in the same entry tie, so a commit that takes the last two players out
 * together is a draw at first.
 */
export function placements(s: GameState): { seat: number; place: number }[] {
  const survived = (seat: SeatState) => (s.winners !== null ? (s.winners.includes(seat.seat) ? Infinity : (seat.out?.entry ?? s.entries)) : (seat.out?.entry ?? Infinity));
  const keyed = s.seats.map((seat) => ({ seat: seat.seat, key: survived(seat) }));
  return keyed.map((a) => ({ seat: a.seat, place: 1 + keyed.filter((b) => b.key > a.key).length }));
}
