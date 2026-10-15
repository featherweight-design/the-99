// The History row's `vs` line (Social R3 plan, PR 4): who sat across the table, from the SNAPSHOT the game was
// logged with. A 22px face (the commander's art, or initials), the name, `· deck` or `· commander` (the short
// name, before the comma), and a trophy before the winner. Nothing here reads a friend's live rows: a removed
// friend and a renamed deck read exactly as they were logged, and the face is the commander played, never
// the friend's own picture. Absent (and nothing reserved) for a game with no seat.

import { gameMatchupsCopy } from "../../lib/copy/game-matchups";
import type { GameOpponent } from "../../lib/decks/game-opponents";
import { initialsOf } from "../../lib/decks/matchup-rows";
import { ArtLayer } from "../ui/art-layer";
import { TrophyIcon } from "./trophy-icon";

const shortName = (name: string) => name.split(",")[0].trim();

/** The name and the `· sub` a seat reads as: a friend by name with their deck or commander, anyone by their name or commander. */
export function vsParts(seat: GameOpponent): { name: string; sub: string | null } {
  // A pair keeps both names, as the Matchups rows do.
  const commander = seat.commander ? (seat.partner ? `${shortName(seat.commander.name)} + ${shortName(seat.partner.name)}` : shortName(seat.commander.name)) : null;
  if (seat.friend) return { name: seat.friend.name, sub: seat.deckName ?? commander };
  const label = seat.label?.trim() || null;
  if (label) return { name: label, sub: commander };
  return { name: commander ?? "?", sub: null };
}

export function GameVsLine({ seats }: { seats: readonly GameOpponent[] }) {
  if (seats.length === 0) return null;
  return (
    <div className="mt-[6px] mb-[2px] flex flex-wrap items-center gap-x-[12px] gap-y-[6px] border-0 border-t border-solid border-t-[color:var(--border)] pt-[6px] md:ml-[244px] md:gap-x-[16px] md:border-t-0 md:pt-0">
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-locked">{gameMatchupsCopy.history.vs}</span>
      {seats.map((s) => {
        const { name, sub } = vsParts(s);
        return (
          <span key={s.seat} className="inline-flex max-w-full min-w-0 items-center gap-[6px] text-[12.5px] text-[color:var(--fg)] md:gap-[7px]">
            {s.won && (
              <span role="img" aria-label={gameMatchupsCopy.history.wonAria} className="inline-flex"><TrophyIcon size={13} /></span>
            )}
            <span
              aria-hidden
              className="relative flex h-[20px] w-[20px] shrink-0 items-center justify-center overflow-hidden rounded-[5px] bg-[color:var(--elevated)] font-mono text-[8px] font-medium text-[color:var(--fg-muted)] md:h-[22px] md:w-[22px] md:text-[8.5px]"
            >
              {s.commander?.imageUri ? <ArtLayer src={s.commander.imageUri} style={{ backgroundPosition: "50% 20%" }} /> : initialsOf(name)}
            </span>
            <span className="min-w-0 [overflow-wrap:anywhere]">{name}</span>
            {sub && <span className="min-w-0 text-fg-faint [overflow-wrap:anywhere]">{`· ${sub}`}</span>}
          </span>
        );
      })}
    </div>
  );
}
