/**
 * The table page's view model (plan `2026-10-16-rule-zero.md`, PR 3): the one pure step from what `loadTable` returns
 * to what the components draw. The loader has already placed every seat (`state`, `read`, `drivers`, all from
 * `rules.ts`); nothing here measures the table again. What this adds is how the boards SAY it: the headline, the
 * chip's inputs, the line under a range, the counts in `findings` order and the ones the drivers lift.
 */
import type { DeclarationAsk } from "../bracket/declaration-ask";
import type { FindingId } from "../bracket/findings";
import type { ThirdPartyName } from "../person-name/brand";
import type { Bracket } from "../bracket/types";
import type { TableSeat, TableView } from "../social/rule-zero-table";
import { ownChanged, seatChanged, sinceYouLooked } from "./live";
import type { Drivers, SeatState } from "./rules";

export type { TableSeat, TableView };

/** The line under a range's chip (T6, T7). Never drawn for a single bracket that nobody declared. */
export type RangeLine =
  | { kind: "undeclared"; from: Bracket }
  | { kind: "declared"; answer: Bracket; permits: readonly Bracket[] }
  | { kind: "drifted"; declared: Bracket; from: Bracket };

export type SeatDraw = {
  /** The seat's id in the read: its seat number, never a deck or a user id. */
  key: string;
  seat: TableSeat;
  state: SeatState;
  /** The shipped chip's inputs, for a seat in the read; null otherwise. */
  chip: { permits: readonly Bracket[]; answered: Bracket | null } | null;
  rangeLine: RangeLine | null;
  /** Its place in the read: face and flag. Null for a seat left out of it. */
  read: TableSeat["read"];
  drivers: Drivers;
  /** The counts the drivers name, lifted in the seat's strip. */
  driving: FindingId[];
  /** The five findings' counts, for a seat in the read. */
  counts: Record<FindingId, number> | null;
  /** When the seat changed, while that is after the viewer's `seenAt` (the changed dot, S5); else null. */
  changed: Date | null;
};

export type Headline =
  | { kind: "nothing" }
  | { kind: "split" }
  /**
   * No flag. `reads` is what every read seat reads when they all read the same (one bracket, an answer, or one
   * range); null when they differ, since a range's face is where the rail draws it, not what it reads.
   */
  | { kind: "balanced"; reads: readonly Bracket[] | null }
  | { kind: "one"; seat: SeatDraw; dir: "high" | "low" }
  /** Two flagged, one each way. */
  | { kind: "two" }
  | { kind: "many"; n: number }
  /** No flag yet, and a seat is being read on the spot (T9). */
  | { kind: "reading"; seat: SeatDraw }
  /** No flag, and seats are left out (T8). */
  | { kind: "leftOut"; n: number };

export type TableDraw = {
  read: TableView["read"];
  seats: SeatDraw[];
  headline: Headline;
  /** Seats not in the read, for the sentence that says so. */
  leftOut: number;
  /** `Since you looked`: each changed seat holding a deck, and the deck it holds now. Empty: no line. */
  since: { name: string | ThirdPartyName; deck: string | ThirdPartyName }[];
  /** The deck the viewer swapped to this visit (S2): the read says so in place of its sentence. Null: none. */
  youSwapped: string | ThirdPartyName | null;
  /** How many decks `Closer to the table` offers on the viewer's own flagged seat (the read's own sentence, S1, S6). */
  closer: number;
};

const keyOf = (s: TableSeat) => `seat-${s.seat}`;

/** `swappedTo`: the deck the viewer seated with this visit's own swap, held by the page (`TableLive`). */
export function drawTable(view: TableView, swappedTo: string | null = null): TableDraw {
  const draws: SeatDraw[] = [...view.seats].sort((a, b) => a.seat - b.seat).map((seat) => {
    // The loader reads a seat whenever its state is in the read, placed or not: T10's lone read seat keeps its chip
    // and counts with nothing to compare it to.
    const reading = seat.deck?.reading ?? null;
    const r = seat.read;
    // A split's lower seat names no reason (T5, D5): neither seat is called the problem, and the upper one's
    // reason is what the two differ by.
    const drivers: Drivers =
      r?.flag && seat.drivers && !(r.flag.split && r.flag.dir === "low") ? seat.drivers : { kind: "none" };
    return {
      key: keyOf(seat),
      seat,
      state: seat.state,
      chip: reading ? { permits: reading.permits, answered: reading.ask.kind === "answered" ? reading.ask.declared : null } : null,
      rangeLine: reading ? rangeLineOf(reading.ask, reading.permits, r?.face ?? null) : null,
      read: r,
      drivers,
      driving: drivingOf(drivers),
      counts: reading ? countsOf(reading.findings) : null,
      changed: seatChanged(seat, view.seenAt) || ownChanged(seat, swappedTo) ? seat.changedAt : null,
    };
  });

  const leftOut = draws.filter((d) => d.read === null).length;
  const mine = view.seats.find((s) => s.you);
  return {
    read: view.read,
    seats: draws,
    headline: headlineOf(view.read, draws, leftOut),
    leftOut,
    since: sinceYouLooked(view),
    youSwapped: mine?.deck && ownChanged(mine, swappedTo) ? mine.deck.name : null,
    closer: view.offer.length,
  };
}

function countsOf(findings: readonly { id: FindingId; count: number }[]): Record<FindingId, number> {
  return Object.fromEntries(findings.map((f) => [f.id, f.count])) as Record<FindingId, number>;
}

function rangeLineOf(ask: DeclarationAsk, permits: readonly Bracket[], face: Bracket | null): RangeLine | null {
  if (ask.kind === "answered") return { kind: "declared", answer: ask.declared, permits };
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

function headlineOf(read: TableView["read"], seats: SeatDraw[], leftOut: number): Headline {
  if (read.kind === "notEnough") return { kind: "nothing" };
  const flagged = seats.filter((s) => s.read?.flag);
  if (flagged.some((s) => s.read!.flag!.split)) return { kind: "split" };
  if (flagged.length === 1) return { kind: "one", seat: flagged[0], dir: flagged[0].read!.flag!.dir };
  if (flagged.length === 2 && flagged[0].read!.flag!.dir !== flagged[1].read!.flag!.dir) return { kind: "two" };
  if (flagged.length > 1) return { kind: "many", n: flagged.length };
  const reading = seats.find((s) => s.state.kind === "unread" && !s.seat.you);
  if (reading) return { kind: "reading", seat: reading };
  if (leftOut > 0) return { kind: "leftOut", n: leftOut };
  return { kind: "balanced", reads: sharedReading(seats.filter((s) => s.read)) };
}

/** What a seat reads, spoken: its answer, its one bracket, or its whole range. */
export const seatReading = (s: SeatDraw): readonly Bracket[] =>
  s.chip ? (s.chip.answered !== null ? [s.chip.answered] : s.chip.permits) : [];

/** The reading every one of `seats` shares, or null when any two differ. */
export function sharedReading(seats: readonly SeatDraw[]): readonly Bracket[] | null {
  const [first, ...rest] = seats.map(seatReading);
  if (!first) return null;
  return rest.every((r) => r.length === first.length && r.every((b, i) => b === first[i])) ? first : null;
}

/** The middle as the read's sentences name it: a bracket, or the two it sits between. */
export function middleBrackets(middle: number): Bracket[] {
  const lo = Math.floor(middle) as Bracket;
  const hi = Math.ceil(middle) as Bracket;
  return lo === hi ? [lo] : [lo, hi];
}

/**
 * The table a deck page's Games tab opens prefilled from (plan §PR 8): the `table` parameter `logGameHref` writes, read
 * only while the URL lands on Games and friends are on (`socialFriendsEnabled`: opponents follow friends). Anything else
 * reads nothing; whether the viewer may log from that table is the server's read, `tablePrefill`.
 */
export function logPrefillTable(query: Record<string, string | string[] | undefined>, on: boolean): string | null {
  if (!on || query.tab !== "games") return null;
  return typeof query.table === "string" ? query.table : null;
}

/** `/decks/<seated deck>?tab=games&table=<id>` (plan §PR 8), or null while the viewer's seat waits. */
export function logGameHref(view: Pick<TableView, "tableId" | "viewerDeckId">): string | null {
  if (!view.viewerDeckId) return null;
  return `/decks/${encodeURIComponent(view.viewerDeckId)}?tab=games&table=${encodeURIComponent(view.tableId)}`;
}
