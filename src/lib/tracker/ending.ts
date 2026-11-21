// The change that ended a game, for Undo a mistaken ending (addendum U1 to U5). A finished game's last log entry is by
// definition the one that ended it: the one whose landing left one player or none, an End game, or a Concede. Its line
// ("You −3 life, to 0 · round 4") is drawn from the replay before that entry and the replay after it.

import { trackerCopy } from "../copy/tracker";
import { type PersonParts, type ThirdPartyName } from "../person-name";
import { isOver, replay, type Game, type SeatState } from "./engine";
import type { PlaySeat } from "./seat";

const copy = trackerCopy.undo;
type Who = string | ThirdPartyName;

/** "Colin and you", "Max, Peter and you", "Colin −4 and you −3": the viewer last, as the Result's lists draw it. */
function list(items: readonly PersonParts[]): PersonParts {
  if (items.length < 2) return items[0] ?? [];
  return [...items.slice(0, -1).flatMap((c, i) => (i ? [", ", ...c] : c)), " and ", ...items[items.length - 1]];
}

/** The line naming the change that ended `game`, or null while the game runs or has nothing to undo. */
export function endingLine(game: Game, seats: readonly PlaySeat[]): PersonParts | null {
  if (game.log.length === 0) return null;
  const after = replay(game);
  if (!isOver(after)) return null;
  const before = replay({ config: game.config, log: game.log.slice(0, -1) });
  const last = game.log[game.log.length - 1];
  const round = after.rounds[after.rounds.length - 1] ?? after.round;
  const bySeat = new Map(seats.map((s) => [s.seat, s]));
  // The device owner is "You" when the line opens with them, "you" inside a list.
  const name = (seat: number, opens: boolean): Who => (bySeat.get(seat)?.you ? (opens ? "You" : "you") : (bySeat.get(seat)?.name ?? ""));

  if (last.t === "end") {
    if (last.winners.length === 1) return copy.round(copy.byHandWon(name(last.winners[0], false)), round);
    return copy.round([copy.byHandDraw], round);
  }
  if (last.t === "life" && last.concede) return copy.round(copy.conceded(name(last.seat, true)), round);

  // Everyone the entry knocked out, the viewer last.
  const entry = game.log.length - 1;
  const outs = after.seats
    .filter((s) => s.out?.entry === entry)
    .sort((a, b) => Number(bySeat.get(a.seat)?.you ?? false) - Number(bySeat.get(b.seat)?.you ?? false));
  if (outs.length === 0) return null;
  const was = (s: SeatState) => before.seats.find((b) => b.seat === s.seat)!;

  if (outs.length > 1 && outs.every((s) => s.out!.reason.kind === "life")) {
    const amounts = outs.map((s) => was(s).life - s.life);
    if (amounts.every((n) => n === amounts[0])) return copy.round(copy.lifeTogether(list(outs.map((s, i) => [name(s.seat, i === 0)])), amounts[0]), round);
    const each = outs.map((s, i) => copy.lifeAmount(name(s.seat, i === 0), amounts[i]));
    return copy.round(copy.lifeEach(list(each)), round);
  }

  // One seat out, or several out in different ways: each named with its own change, joined as a list.
  const clause = (s: SeatState, opens: boolean): PersonParts => {
    const reason = s.out!.reason;
    const who = name(s.seat, opens);
    if (reason.kind === "poison") return copy.poison(who, s.counters.poison - was(s).counters.poison, s.counters.poison);
    if (reason.kind === "commander") {
      const key = `${reason.from}:${reason.cmdr}`;
      const from = bySeat.get(reason.from);
      const commander = (reason.cmdr === 1 ? from?.partner : from?.commander) || trackerCopy.sheet.commanderFallback;
      return copy.commander(who, (s.damage[key] ?? 0) - (was(s).damage[key] ?? 0), commander, s.damage[key] ?? 0);
    }
    return copy.life(who, was(s).life - s.life, s.life);
  };
  return copy.round(list(outs.map((s, i) => clause(s, i === 0))), round);
}
