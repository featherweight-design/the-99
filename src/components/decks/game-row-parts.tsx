// The two slots a logged game's row shares wherever it is drawn: the deck's own Games tab (`GameHistoryRow`) and the
// cross-deck Games view (`GameEntry`). One home, so a mark or a note cannot read differently in the two.

import { GAME_AXIS_KEYS, type GameAxisKey } from "../../lib/decks/game-axes";
import { axisCopy, gameLogCopy } from "../../lib/copy/game-log";
import { gameHistoryCopy } from "../../lib/copy/game-history";
import type { GameOpponent } from "../../lib/decks/game-opponents";
import { SeatsGrid } from "./seats-grid";

const rowCopy = gameHistoryCopy.row;

/**
 * The marks as two groups (design handoff `design_handoff_the99_games_tabs`): Helped, then Hurt, each a label and its
 * chips in the vocabulary's order. A game with none draws the dash. The note, for the ear, in the place the table puts
 * it: inside the row's description, immediately after the marks. The line the eye reads is below, so it is `aria-hidden`
 * and this is the only copy anything speaks.
 */
export function GameMarks({ worked, hurt, note }: {
  worked: readonly GameAxisKey[];
  hurt: readonly GameAxisKey[];
  note: string | null;
}) {
  const inOrder = (set: readonly GameAxisKey[]) => GAME_AXIS_KEYS.filter((k) => set.includes(k));
  const groups = [
    { label: rowCopy.helped, dot: "bg-success", keys: inOrder(worked) },
    { label: rowCopy.hurt, dot: "bg-warning", keys: inOrder(hurt) },
  ].filter((g) => g.keys.length > 0);
  return (
    <span data-marks className="flex min-w-0 flex-wrap items-center gap-x-[16px] gap-y-[8px]">
      {groups.length === 0 ? (
        <span className="font-mono text-[10.5px] leading-[normal] text-fg-locked">{gameLogCopy.history.noMarks}</span>
      ) : (
        groups.map((g) => (
          <span key={g.label} className="flex flex-wrap items-center gap-[6px]">
            <span className="font-mono text-[10px] uppercase leading-[normal] tracking-[0.12em] text-fg-faint">{g.label}</span>
            {g.keys.map((key) => (
              <span key={key} className="inline-flex items-center gap-[6px] rounded-full bg-elevated py-[4px] pl-[8px] pr-[11px] font-mono text-[10.5px] leading-[normal] text-fg-body">
                <span aria-hidden className={`h-[6px] w-[6px] flex-none rounded-full ${g.dot}`} />
                {axisCopy[key].label}
              </span>
            ))}
          </span>
        ))
      )}
      {note !== null && <span className="sr-only">{`${gameLogCopy.history.noteSpoken}“${note}”`}</span>}
    </span>
  );
}

/**
 * The note line (deck-tuning.md §Note line): only when there is one, nothing reserved when there is not. The rule is its
 * own 2px element because the handoff gives it a radius and a background of its own. Quoted in typographic quotes: it is
 * somebody's sentence, not a field's value. No truncation and no line clamp (the 140-character cap makes that safe);
 * `min-w-0` is what makes `break-words` bite in a flex row on a 390px screen. `inset` is the desktop indent to the marks'
 * column, which differs by the deck column the cross-deck row adds.
 */
export function GameNote({ note, inset }: { note: string; inset: string }) {
  return (
    <div aria-hidden className={`flex gap-[10px] md:gap-[11px] mt-[8px] md:mt-[7px] md:mb-[1px] ${inset}`}>
      <span className="flex-none w-[2px] rounded-full bg-border-strong" />
      <span className="min-w-0 italic text-[12.5px] leading-[1.5] text-fg-muted break-words">{`“${note}”`}</span>
    </div>
  );
}

/** The row's first slot: Won or Lost in words (a loss is a result, never --danger), then `3 players · Nov 19`. */
export function ResultHead({ result, podSize, date }: { result: "win" | "loss" | "draw"; podSize: number; date: string }) {
  return (
    <span className="flex min-w-0 items-center gap-[10px]">
      <span
        className={
          "inline-flex h-[22px] flex-none items-center rounded-full border px-[10px] font-mono text-[11px] font-semibold leading-[normal] " +
          (result === "win" ? "border-success text-success" : "border-border-strong text-fg-body")
        }
      >
        {rowCopy.result[result]}
      </span>
      <span className="font-mono text-[11px] leading-[normal] tabular-nums text-fg-faint">{rowCopy.meta(podSize, date)}</span>
    </span>
  );
}

/** Under the head, in both tabs: the Seats, the Helped and Hurt marks, then the note. No `Marks` or `Note` headings. */
export function GameRowBody({ you, seats, podSize, result, worked, hurt, note }: {
  you: { deckName: string; artUri: string | null; versionNumber: number | null };
  seats: readonly GameOpponent[];
  podSize: number;
  result: "win" | "loss" | "draw";
  worked: readonly GameAxisKey[];
  hurt: readonly GameAxisKey[];
  note: string | null;
}) {
  return (
    <div className="mt-[10px] flex flex-col gap-[10px]">
      <SeatsGrid you={you} seats={seats} podSize={podSize} won={result === "win"} />
      <GameMarks worked={worked} hurt={hurt} note={note} />
      {note !== null && <GameNote note={note} inset="" />}
    </div>
  );
}
