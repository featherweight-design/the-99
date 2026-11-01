// The two slots a logged game's row shares wherever it is drawn: the deck's own Games tab (`GameHistoryRow`) and the
// cross-deck Games view (`GameEntry`). One home, so a mark or a note cannot read differently in the two.

import { GAME_AXIS_KEYS, type GameAxisKey } from "../../lib/decks/game-axes";
import { axisCopy, gameLogCopy } from "../../lib/copy/game-log";

/**
 * The marks, in the vocabulary's order rather than grouped by direction: the row reads in the same sequence as the form
 * that produced it. A game with none draws the dash. On the phone they take the row's second line (`order-last` with a
 * full basis; sharing line one they were squeezed into what the meta and stamp left over, Hugh 2026-09-27).
 *
 * The note, for the ear, in the place the table puts it: inside the row's description, immediately after the marks. The
 * line the eye reads is a second line BELOW the row's controls, so it is `aria-hidden` and this is the only copy anything
 * speaks.
 */
export function GameMarks({ worked, hurt, note }: { worked: readonly GameAxisKey[]; hurt: readonly GameAxisKey[]; note: string | null }) {
  type Mark = { key: GameAxisKey; polarity: "worked" | "hurt" };
  const marks = GAME_AXIS_KEYS.flatMap<Mark>((key) =>
    worked.includes(key) ? [{ key, polarity: "worked" }] : hurt.includes(key) ? [{ key, polarity: "hurt" }] : [],
  );
  return (
    <span data-marks className="order-last basis-full md:order-none md:basis-auto flex-1 min-w-0 flex flex-wrap gap-[6px]">
      {marks.length === 0 ? (
        <span className="font-mono text-[10.5px] text-fg-locked">{gameLogCopy.history.noMarks}</span>
      ) : (
        marks.map(({ key, polarity }) => (
          <span
            key={key}
            className="inline-flex items-center gap-[6px] rounded-full pl-[8px] pr-[11px] py-[4px] font-mono text-[10.5px] bg-elevated text-fg-body"
          >
            <span
              aria-hidden
              className={"w-[6px] h-[6px] rounded-full flex-none " + (polarity === "worked" ? "bg-success" : "bg-warning")}
            />
            {axisCopy[key].label}
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
