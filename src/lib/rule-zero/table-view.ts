/**
 * The table page's view model (plan `2026-10-16-rule-zero.md`, PR 3): what one table looks like to the page, and
 * the one pure step from it to what the components draw. The rules themselves are `rules.ts`'s; nothing here
 * restates them.
 *
 * MAPPING STILL TO DO, when PR 2b's `loadTable(viewerId, tableId)` lands in `src/lib/social/rule-zero.ts`: its
 * result is PROVISIONAL, so `TableView` follows its announced shape as closely as `rules.ts` allows, and the page
 * (`src/app/friends/table/[id]/page.tsx`, not written yet) maps one onto the other. Three fields here are not in the
 * announced shape and the loader owes them, or the page derives them: `setBy` (the page meta's `set by Colin`, and
 * whether the viewer sees `Seats`), `viewerDeckId` (the viewer's own seated deck, the one deck id decision 5 lets
 * reach a client: `Log this game`'s URL) and each seat's `podOwner` (the `owner` tag). The loader's "verdict
 * sub-line" arrives here as its inputs (`violations`, `lean`), since `driversFor` derives the sub-line itself.
 */
import { declarationAsk } from "../bracket/declaration-ask";
import type { FindingId } from "../bracket/findings";
import type { Bracket } from "../bracket/types";
import {
  driversFor,
  inRead,
  seatState,
  seatValue,
  tableRead,
  type DriverVerdict,
  type Drivers,
  type ReadSeat,
  type SeatDeck,
  type SeatState,
  type TableRead,
} from "./rules";

/** A seat's stored reading, as the seat grant reads it under the deck owner's id (readiness gap 2). */
export type SeatReading = DriverVerdict & {
  /** `decks.declared_bracket`. */
  declared: Bracket | null;
  /** The five findings' counts, in `FINDING_ORDER` when drawn. */
  counts: Record<FindingId, number>;
};

export type TableSeatDeck = SeatDeck & {
  deckName: string;
  commanderName: string;
  artCropUri: string | null;
  /** Null when there is no reading to use: `reading` is `none` or `unreadable`. */
  verdict: SeatReading | null;
};

/** One seat, keyed by its seat number. No other player's deck id is ever in it (decision 5). */
export type TableSeatView = {
  seat: number;
  displayName: string;
  /** Only when the viewer and this player are friends; null otherwise, and for the viewer's own seat. */
  publicId: string | null;
  you: boolean;
  /** The pod's owner: the seat's `owner` tag, as the pod card draws it. */
  podOwner: boolean;
  changedAt: Date;
  /** Null while the seat waits for its player to pick (G3), or after its deck was deleted (decision 2). */
  deck: TableSeatDeck | null;
};

export type TableView = {
  tableId: string;
  podName: string;
  /** The setter's display name, or null when the viewer set it. */
  setBy: string | null;
  closesAt: Date;
  /** The latest `changed_at` among the seats: what `markSeen` sends (PR 4). */
  revision: Date;
  /** The viewer's own seated deck, or null while their seat waits. */
  viewerDeckId: string | null;
  seats: TableSeatView[];
};

/** The line under a range's chip (T6, T7). Never drawn for a single bracket that nobody declared. */
export type RangeLine =
  | { kind: "undeclared"; from: Bracket }
  | { kind: "declared"; answer: Bracket; permits: readonly Bracket[] }
  | { kind: "drifted"; declared: Bracket; from: Bracket };

export type SeatDraw = {
  /** The seat's id in the read: its seat number, never a deck or a user id. */
  key: string;
  seat: TableSeatView;
  state: SeatState;
  /** The shipped chip's inputs, for a seat in the read; null otherwise. */
  chip: { permits: readonly Bracket[]; answered: Bracket | null } | null;
  rangeLine: RangeLine | null;
  /** Its place in the read: face and flag. Null for a seat left out of it. */
  read: ReadSeat | null;
  drivers: Drivers;
  /** The counts the drivers name, lifted in the seat's strip. */
  driving: FindingId[];
};

export type Headline =
  | { kind: "nothing" }
  | { kind: "split" }
  /** No flag: `reads` are the read seats' distinct faces, lowest first. */
  | { kind: "balanced"; reads: Bracket[] }
  | { kind: "one"; seat: SeatDraw; dir: "high" | "low" }
  /** Two flagged, one each way. */
  | { kind: "two" }
  | { kind: "many"; n: number }
  /** No flag yet, and a seat is being read on the spot (T9). */
  | { kind: "reading"; seat: SeatDraw }
  /** No flag, and seats are left out (T8). */
  | { kind: "leftOut"; n: number };

export type TableDraw = {
  read: TableRead<string>;
  seats: SeatDraw[];
  headline: Headline;
  /** Seats not in the read, for the sentence that says so. */
  leftOut: number;
};

const keyOf = (s: TableSeatView) => `seat-${s.seat}`;

export function drawTable(view: TableView): TableDraw {
  const seats = [...view.seats].sort((a, b) => a.seat - b.seat);
  const states = seats.map((s) => seatState(s.deck));
  const values = seats.map((s, i) =>
    inRead(states[i]) && s.deck?.verdict ? seatValue(s.deck.verdict.permits, s.deck.verdict.declared) : null,
  );
  const read = tableRead(seats.map((s, i) => ({ id: keyOf(s), value: values[i] })));
  const placed = new Map(read.kind === "read" ? read.seats.map((r) => [r.id, r]) : []);

  const draws: SeatDraw[] = seats.map((seat, i) => {
    const verdict = values[i] ? seat.deck!.verdict! : null;
    const r = placed.get(keyOf(seat)) ?? null;
    // A split's lower seat names no reason (T5, D5): neither seat is called the problem, and the upper one's
    // reason is what the two differ by.
    const drivers: Drivers =
      verdict && r?.flag && !(r.flag.split && r.flag.dir === "low") ? driversFor(verdict, r.flag, r.face) : { kind: "none" };
    return {
      key: keyOf(seat),
      seat,
      state: states[i],
      chip: verdict ? { permits: verdict.permits, answered: answeredOf(verdict) } : null,
      rangeLine: verdict ? rangeLineOf(verdict, r?.face ?? null) : null,
      read: r,
      drivers,
      driving: drivingOf(drivers),
    };
  });

  const leftOut = draws.filter((d) => d.read === null).length;
  return { read, seats: draws, headline: headlineOf(read, draws, leftOut), leftOut };
}

function answeredOf(v: SeatReading): Bracket | null {
  const ask = declarationAsk(v.permits, v.declared);
  return ask.kind === "answered" ? ask.declared : null;
}

function rangeLineOf(v: SeatReading, face: Bracket | null): RangeLine | null {
  const ask = declarationAsk(v.permits, v.declared);
  if (ask.kind === "answered") return { kind: "declared", answer: ask.declared, permits: v.permits };
  // "measured from" names the end the read placed the seat at, so it needs a read.
  if (face === null) return null;
  if (ask.kind === "drifted") return { kind: "drifted", declared: ask.declared, from: face };
  if (ask.kind === "ask") return { kind: "undeclared", from: face };
  return null;
}

function drivingOf(d: Drivers): FindingId[] {
  if (d.kind === "ruledOut") return d.reasons.map((r) => r.rule);
  if (d.kind === "assembled") return ["twoCardCombos", "tutors"];
  return [];
}

function headlineOf(read: TableRead<string>, seats: SeatDraw[], leftOut: number): Headline {
  if (read.kind === "notEnough") return { kind: "nothing" };
  const flagged = seats.filter((s) => s.read?.flag);
  if (flagged.some((s) => s.read!.flag!.split)) return { kind: "split" };
  if (flagged.length === 1) return { kind: "one", seat: flagged[0], dir: flagged[0].read!.flag!.dir };
  if (flagged.length === 2 && flagged[0].read!.flag!.dir !== flagged[1].read!.flag!.dir) return { kind: "two" };
  if (flagged.length > 1) return { kind: "many", n: flagged.length };
  const reading = seats.find((s) => s.state.kind === "unread" && !s.seat.you);
  if (reading) return { kind: "reading", seat: reading };
  if (leftOut > 0) return { kind: "leftOut", n: leftOut };
  const reads = [...new Set(read.seats.map((s) => s.face))].sort((a, b) => a - b);
  return { kind: "balanced", reads };
}

/** The middle as the read's sentences name it: a bracket, or the two it sits between. */
export function middleBrackets(middle: number): Bracket[] {
  const lo = Math.floor(middle) as Bracket;
  const hi = Math.ceil(middle) as Bracket;
  return lo === hi ? [lo] : [lo, hi];
}

/** `/decks/<seated deck>?tab=games&table=<id>` (plan §PR 8), or null while the viewer's seat waits. */
export function logGameHref(view: Pick<TableView, "tableId" | "viewerDeckId">): string | null {
  if (!view.viewerDeckId) return null;
  return `/decks/${encodeURIComponent(view.viewerDeckId)}?tab=games&table=${encodeURIComponent(view.tableId)}`;
}
