// A game's Seats (design handoff `design_handoff_the99_games_tabs`, PR 1): one tile per seat, five across on desktop and
// two on the phone, 74px tall, the commander's art barely dimmed. Your tile leads with the deck and its version stamp; an
// opponent's shows the name and the commander as logged (a snapshot, never a friend's live rows); the winner's tile gets
// an accent ring and a Won tag; each seat the pod had and the log did not name is a dashed `Someone` tile. A draw, or a
// loss with no winner flagged, rings nothing. New component: `game-seats.tsx` is the log form's seat row, not this.

import { gameHistoryCopy } from "../../lib/copy/game-history";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import type { GameOpponent } from "../../lib/decks/game-opponents";
import { PersonName, PersonText, personText } from "../../lib/person-name";
import { ArtLayer } from "../ui/art-layer";
import { OpponentInitials } from "./opponent-initials";
import { TrophyIcon } from "./trophy-icon";
import { vsParts } from "./game-vs-line";

const copy = gameHistoryCopy.row;

const TILE = "relative flex h-[74px] min-w-0 flex-col justify-end overflow-hidden rounded-[9px] px-[10px] py-[8px] ";

function WonTag() {
  return (
    <span className="absolute right-[6px] top-[6px] inline-flex items-center gap-[4px] rounded-full bg-[color:var(--surface)] px-[7px] py-[2px] font-mono text-[10px] font-semibold leading-[normal] text-[color:var(--accent-text)]">
      <TrophyIcon size={11} />
      {copy.won}
    </span>
  );
}

function Art({ src }: { src: string }) {
  return (
    <>
      <ArtLayer src={src} style={{ backgroundPosition: "50% 20%" }} />
      <span aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,color-mix(in_srgb,var(--surface)_78%,transparent),transparent_70%)]" />
    </>
  );
}

export function SeatsGrid({ you, seats, podSize, won }: {
  you: { deckName: string; artUri: string | null; versionNumber: number | null };
  seats: readonly GameOpponent[];
  podSize: number;
  /** You won this game. */
  won: boolean;
}) {
  const missing = Math.max(0, podSize - 1 - seats.length);
  return (
    <ul aria-label={copy.seats} className="m-0 grid list-none grid-cols-2 gap-[8px] p-0 md:grid-cols-5">
      <li className={`${TILE} bg-[color:var(--elevated)] ${won ? "outline outline-2 outline-[color:var(--accent)]" : "[border:1px_solid_var(--border)]"}`}>
        {you.artUri ? <Art src={you.artUri} /> : null}
        {won ? <WonTag /> : null}
        <span className="relative min-w-0 truncate text-[12.5px] font-medium leading-[1.3] text-[color:var(--fg)]">{you.deckName}</span>
        <span className="relative font-mono text-[10px] leading-[normal] text-fg-faint">
          {you.versionNumber === null ? deckVersioningCopy.stamp.absent : deckVersioningCopy.stamp.value(you.versionNumber)}
        </span>
      </li>
      {seats.map((s) => {
        const { name, sub } = vsParts(s);
        const art = s.commander?.imageUri ?? null;
        return (
          <li key={s.seat} className={`${TILE} bg-[color:var(--elevated)] ${s.won ? "outline outline-2 outline-[color:var(--accent)]" : "[border:1px_solid_var(--border)]"}`}>
            {art ? <Art src={art} /> : (
              <span aria-hidden className="absolute left-[10px] top-[8px] flex h-[22px] w-[22px] items-center justify-center rounded-[5px] bg-[color:var(--surface)] font-mono text-[8.5px] text-fg-muted">
                <OpponentInitials n={name} />
              </span>
            )}
            {s.won ? <WonTag /> : null}
            <span className="relative min-w-0 truncate text-[12.5px] font-medium leading-[1.3] text-[color:var(--fg)]"><PersonName n={name} /></span>
            <span className="relative min-w-0 truncate font-mono text-[10px] leading-[normal] text-fg-faint">
              {sub ? <PersonText text={personText`${sub}`} /> : s.commander ? null : copy.noCommander}
            </span>
          </li>
        );
      })}
      {Array.from({ length: missing }, (_, i) => (
        <li key={`m${i}`} className={`${TILE} bg-[color:var(--elevated)] [border:1px_solid_var(--border-dashed)]`}>
          <span className="relative text-[12.5px] leading-[1.3] text-fg-muted">{copy.someone}</span>
          <span className="relative font-mono text-[10px] leading-[normal] text-fg-faint">{copy.notLogged}</span>
        </li>
      ))}
    </ul>
  );
}
