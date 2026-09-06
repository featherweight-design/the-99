"use client";
// GameLogForm — STATES-log-form.md, all fourteen states.
//
// The state is four values and a transition: no form library and no reducer,
// because the only rule the form enforces is that the two mark columns stay
// disjoint, and that rule is one function.

import { useEffect, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { logGame } from "../../app/decks/actions";
import { GAME_AXIS_KEYS, type GameAxisKey } from "../../lib/decks/game-axes";
import { axisCopy, gameLogCopy } from "../../lib/copy/game-log";
import { MutationError } from "./mutation-error";

export type GameResult = "win" | "loss" | "draw";

export interface GameLogFormProps {
  deckId: string;
  /** Called after a successful save so the panel can announce it. The result
   *  travels with it because the announcement names the new record, and the
   *  summary the panel holds is still the pre-save one until the route
   *  revalidates. */
  onSaved: (isFirst: boolean, result: GameResult) => void;
  /** Called when an axis moves columns, for the live region. */
  onAnnounce: (message: string) => void;
  isFirstGame: boolean;
  /** Overrides the collapsed button's label. Defaults to `gameLogCopy.form.open`. */
  ctaLabel?: string;
  /** Brass-solid collapsed button. True only in the empty state, where the CTA
   *  is the tab and there is nothing else on the screen to outrank it. */
  ctaSolid?: boolean;
}

const POD_SIZES = [2, 3, 4, 5, 6, 7, 8];
// `<input type="date">` speaks in the player's own calendar day, so this is
// built from the local fields. `toISOString()` would name yesterday or tomorrow
// for anyone whose offset has rolled past UTC.
const today = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const RESULTS: { value: GameResult; label: string }[] = [
  { value: "win", label: gameLogCopy.form.won },
  { value: "loss", label: gameLogCopy.form.lost },
  { value: "draw", label: gameLogCopy.form.draw },
];
const RESULT_VALUES = RESULTS.map((r) => r.value);

// `played tonight` / `played 2026-08-12` — the date word is the input's own
// value, which is why it is unformatted. The prefix takes faint ink and the date
// word body ink. Split on the first space rather than on a duplicated literal,
// so the wording of both strings stays in the copy module.
function dateParts(text: string): [string, string] {
  const at = text.indexOf(" ");
  return at < 0 ? [text, ""] : [text.slice(0, at + 1), text.slice(at + 1)];
}

/**
 * A radiogroup is one tab stop with arrows moving inside it, and selection
 * follows focus — the same pattern `ScopeControl` ships, so every radiogroup in
 * the app answers the keyboard the same way.
 */
function useRoving<T>(values: readonly T[], onChange: (next: T) => void) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (from: number) => (event: KeyboardEvent) => {
    const dir =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (dir === 0) return;
    event.preventDefault();
    const next = (from + dir + values.length) % values.length;
    refs.current[next]?.focus();
    onChange(values[next]);
  };
  return { refs, onKeyDown };
}

const FIELD_LABEL =
  "block font-mono uppercase text-[9.5px] md:text-[10px] tracking-[0.14em] text-fg-faint mb-[8px] md:mb-[9px]";

export function GameLogForm({
  deckId,
  onSaved,
  onAnnounce,
  isFirstGame,
  ctaLabel,
  ctaSolid = false,
}: GameLogFormProps) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);
  const [podSize, setPodSize] = useState(4);
  const [playedAt, setPlayedAt] = useState(today);
  const [dateOpen, setDateOpen] = useState(false);
  const [worked, setWorked] = useState<GameAxisKey[]>([]);
  const [hurt, setHurt] = useState<GameAxisKey[]>([]);
  const [moved, setMoved] = useState<{ key: GameAxisKey; to: "worked" | "hurt" } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const openButton = useRef<HTMLButtonElement>(null);
  const movedTimer = useRef<number | null>(null);
  const resultRoving = useRoving(RESULT_VALUES, setResult);
  const podRoving = useRoving(POD_SIZES, setPodSize);
  // The collapsed button is unmounted while the form is open, so a `.focus()`
  // inside `collapse()` would land on nothing. The intent is recorded here and
  // spent once the button is back on the page.
  const wantsOpenFocus = useRef(false);

  useEffect(() => () => {
    if (movedTimer.current !== null) window.clearTimeout(movedTimer.current);
  }, []);

  // State 2 opens with focus on the Result group; states 11 and 13 hand it back
  // to the row the player came from.
  useEffect(() => {
    if (open) {
      // Nothing is chosen when the form opens, so the group's single tab stop
      // is its first option.
      resultRoving.refs.current[0]?.focus();
      return;
    }
    if (wantsOpenFocus.current) {
      wantsOpenFocus.current = false;
      openButton.current?.focus();
    }
    // The ref object is stable across renders, so naming it costs no extra run.
  }, [open, resultRoving.refs]);

  // State 14: reopening starts from nothing. The reset lives here rather than
  // on close so a refusal (state 12) cannot reach it — the form stays mounted
  // and populated through a refusal, and only a successful save or a cancel
  // brings it back through this path.
  function collapse() {
    wantsOpenFocus.current = true;
    setOpen(false);
    setResult(null);
    setPodSize(4);
    setPlayedAt(today());
    setDateOpen(false);
    setWorked([]);
    setHurt([]);
    setMoved(null);
    setError(null);
  }

  // State 6. Ticking an axis in one column removes it from the other, so the
  // two lists are disjoint by construction and the server never has to
  // reconcile a contradiction it cannot store anyway.
  function toggle(key: GameAxisKey, column: "worked" | "hurt") {
    const [mine, setMine, theirs, setTheirs] =
      column === "worked"
        ? ([worked, setWorked, hurt, setHurt] as const)
        : ([hurt, setHurt, worked, setWorked] as const);

    if (mine.includes(key)) {
      setMine(mine.filter((k) => k !== key));
      return;
    }
    setMine([...mine, key]);
    if (theirs.includes(key)) {
      setTheirs(theirs.filter((k) => k !== key));
      setMoved({ key, to: column });
      onAnnounce(
        gameLogCopy.announce.moved(
          axisCopy[key].label,
          column === "worked" ? gameLogCopy.form.workedLabel : gameLogCopy.form.hurtLabel,
        ),
      );
      // One beat, then the vacated row returns to rest. A permanent marker
      // would accumulate as the player revises.
      if (movedTimer.current !== null) window.clearTimeout(movedTimer.current);
      movedTimer.current = window.setTimeout(
        () => setMoved((m) => (m && m.key === key ? null : m)),
        1200,
      );
    }
  }

  // State 9. `max` stops the picker, not a typed or pasted value, so the same
  // rule is enforced here as well as in the action. An emptied field is caught
  // by the same gate: clearing the input is not a request to log today's game,
  // and sending it would build an Invalid Date for the action to refuse.
  // Read once per render: across a midnight rollover, separate calls would let
  // the gate, the label and the submitted instant disagree about which day it is.
  const todayKey = today();
  const dateUnusable = playedAt === "" || playedAt > todayKey;

  const dateLabel =
    playedAt === todayKey ? gameLogCopy.form.playedToday : gameLogCopy.form.played(playedAt);
  const [prefix, dateWord] = dateParts(dateLabel);

  function submit() {
    if (!result || isPending || dateUnusable) return;
    startTransition(async () => {
      setError(null);
      const outcome = await logGame(deckId, {
        result,
        podSize,
        // A past day is pinned to local noon, which no timezone can drag into
        // tomorrow. Today is sent as the current instant instead: noon today is
        // still in the future for anyone logging a game before lunch, and the
        // action refuses future instants.
        playedAt: playedAt === todayKey ? new Date() : new Date(`${playedAt}T12:00:00`),
        worked,
        hurt,
      });
      if (!outcome.ok) {
        // State 12: nothing is cleared. There is no edit action, so a wiped
        // form means retyping a game the player has already described.
        setError(outcome.message);
        return;
      }
      onSaved(isFirstGame, result);
      collapse();
    });
  }

  if (!open) {
    // State 1. Brass OUTLINE, never solid — `Build this deck` owns solid brass
    // and logging a game is not the app's goal. The one exception is the empty
    // state, where the CTA is the whole tab and has nothing to outrank.
    return (
      <button
        ref={openButton}
        type="button"
        onClick={() => setOpen(true)}
        className={
          "w-full md:w-auto min-h-[44px] rounded-[8px] px-[18px] py-[10px] text-[13.5px] font-semibold border border-accent cursor-pointer " +
          (ctaSolid
            ? "bg-accent text-bg hover:bg-accent-hover"
            : "bg-transparent text-accent hover:text-accent-hover hover:border-accent-hover")
        }
      >
        {ctaLabel ?? gameLogCopy.form.open}
      </button>
    );
  }

  return (
    <div className="rounded-[12px] p-[16px] md:p-[20px] bg-surface border border-border-strong">
      <div className="flex items-baseline justify-between gap-[12px] pb-[14px] md:pb-[18px] border-b border-border md:border-b-0">
        <h3 className="font-display font-bold md:font-semibold text-[17px] md:text-[19px] text-fg">
          {gameLogCopy.form.heading}
        </h3>
        {/* The date is `tonight` until the player says otherwise; the field is
            only drawn once they ask for it. */}
        {dateOpen ? (
          <input
            type="date"
            autoFocus
            value={playedAt}
            max={todayKey}
            disabled={isPending}
            // The same sentence the button shows, so the field's name follows
            // the value rather than claiming every date is today's.
            aria-label={dateLabel}
            onChange={(e) => setPlayedAt(e.target.value)}
            className="min-h-[44px] md:min-h-0 rounded-[8px] px-[10px] font-mono text-[11px] bg-transparent border border-border text-fg-body"
          />
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={() => setDateOpen(true)}
            className="font-mono text-[10px] md:text-[11px] text-fg-faint border-b border-dashed border-border-dashed cursor-pointer"
          >
            {/* The prefix is a bare text node: wrapping it too would strip the
                space between the two from the accessible name. */}
            {prefix}
            <span className="text-fg-body">{dateWord}</span>
          </button>
        )}
      </div>

      <div className="md:flex md:flex-wrap md:items-start md:gap-[34px] mt-[16px] md:mt-[18px] md:mb-[20px]">
        {/* Result — no default. State 2 opens with nothing chosen. */}
        <div className="mb-[16px] md:mb-0">
          <span id="game-result-label" className={FIELD_LABEL}>
            {gameLogCopy.form.resultLabel}
          </span>
          <div role="radiogroup" aria-labelledby="game-result-label" className="flex gap-[7px] md:gap-[8px]">
            {RESULTS.map((r, i) => {
              const on = result === r.value;
              const won = on && r.value === "win";
              return (
                <button
                  key={r.value}
                  ref={(node) => {
                    resultRoving.refs.current[i] = node;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  // Until something is chosen the first option carries the tab
                  // stop, because a group where every option is skipped would
                  // have none.
                  tabIndex={on || (result === null && i === 0) ? 0 : -1}
                  disabled={isPending}
                  onKeyDown={resultRoving.onKeyDown(i)}
                  onClick={() => setResult(r.value)}
                  className={
                    "flex-1 md:flex-none h-[44px] md:h-[40px] md:px-[20px] rounded-[8px] text-[13.5px] cursor-pointer " +
                    (on ? "font-semibold " : "font-medium ") +
                    (won
                      ? "bg-success text-bg"
                      : on
                        ? "border border-accent bg-transparent text-fg"
                        : "border border-border bg-transparent text-fg-body")
                  }
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pod size — defaults to 4, the commander table. */}
        <div className="mb-[18px] md:mb-0">
          <span className={FIELD_LABEL}>
            <span id="game-pod-label">{gameLogCopy.form.podLabel}</span>
            <span className="hidden md:inline ml-[8px] normal-case tracking-normal text-[10px] text-fg-locked">
              {gameLogCopy.form.podHint}
            </span>
          </span>
          <div role="radiogroup" aria-labelledby="game-pod-label" className="flex gap-[5px] md:gap-[6px]">
            {POD_SIZES.map((n, i) => {
              const on = podSize === n;
              return (
                <button
                  key={n}
                  ref={(node) => {
                    podRoving.refs.current[i] = node;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  tabIndex={on ? 0 : -1}
                  disabled={isPending}
                  onKeyDown={podRoving.onKeyDown(i)}
                  onClick={() => setPodSize(n)}
                  className={
                    "flex-1 md:flex-none md:w-[40px] h-[44px] md:h-[40px] rounded-[8px] font-mono " +
                    "font-semibold text-[14px] cursor-pointer border " +
                    (on
                      ? "border-accent bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-accent"
                      : "border-border-strong bg-transparent text-fg-body")
                  }
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="md:grid md:grid-cols-2 md:gap-[16px]">
        <AxisColumn
          legend={gameLogCopy.form.workedLabel}
          ink="text-success"
          column="worked"
          selected={worked}
          moved={moved}
          disabled={isPending}
          onToggle={toggle}
        />
        <AxisColumn
          legend={gameLogCopy.form.hurtLabel}
          ink="text-warning"
          column="hurt"
          selected={hurt}
          moved={moved}
          disabled={isPending}
          onToggle={toggle}
        />
      </div>

      <div className="flex flex-col md:flex-row md:flex-wrap md:items-center items-stretch gap-[9px] md:gap-[16px] mt-[18px] md:mt-[20px] pt-[16px] md:pt-[18px] border-t border-border">
        <button
          type="button"
          onClick={submit}
          disabled={!result || isPending || dateUnusable}
          className="w-full md:w-auto h-[48px] md:h-auto md:px-[20px] md:py-[11px] rounded-[8px] text-[14.5px] md:text-[14px] font-semibold cursor-pointer bg-accent text-bg hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? gameLogCopy.form.saving : gameLogCopy.form.save}
        </button>
        <button
          type="button"
          onClick={collapse}
          disabled={isPending}
          className="w-full md:w-auto h-[44px] md:h-auto md:px-[18px] md:py-[11px] rounded-[8px] text-[13.5px] font-medium bg-transparent border border-border-strong text-fg-muted cursor-pointer"
        >
          {gameLogCopy.form.cancel}
        </button>
        <p className="hidden md:block font-mono text-[11px] text-fg-faint">
          {gameLogCopy.form.optionalNote}
        </p>
      </div>

      {error && <MutationError message={error} />}
    </div>
  );
}

function AxisColumn({
  legend,
  ink,
  column,
  selected,
  moved,
  disabled,
  onToggle,
}: {
  legend: string;
  /** Tailwind ink class for the legend and the tick glyph — the column's colour. */
  ink: string;
  column: "worked" | "hurt";
  selected: GameAxisKey[];
  moved: { key: GameAxisKey; to: "worked" | "hurt" } | null;
  disabled: boolean;
  onToggle: (key: GameAxisKey, column: "worked" | "hurt") => void;
}) {
  return (
    <fieldset className="min-w-0 border-0 p-0 mb-[16px] md:mb-0">
      <legend
        className={
          "md:flex md:items-baseline md:gap-[8px] mb-[8px] md:mb-[9px] font-mono uppercase text-[10px] tracking-[0.14em] " +
          ink
        }
      >
        {legend}
        {/* Absent at zero — a counter reading '0 marked' is a column complaining. */}
        {selected.length > 0 && (
          <span className="ml-[8px] md:ml-0 text-fg-locked normal-case tracking-normal">
            {gameLogCopy.form.marked(String(selected.length))}
          </span>
        )}
      </legend>
      <div className="flex flex-col gap-[5px]">
        {GAME_AXIS_KEYS.map((key) => {
          const on = selected.includes(key);
          // The vacated row wears the marker, so it says where the axis went
          // rather than that something happened here.
          const vacated = moved !== null && moved.key === key && moved.to !== column;
          const glossId = `axis-${column}-${key}-gloss`;
          const labelId = `axis-${column}-${key}-label`;
          return (
            <label
              key={key}
              className={
                "flex items-center gap-[11px] min-h-[48px] md:min-h-[46px] rounded-[8px] px-[12px] py-[5px] cursor-pointer border " +
                // The checkbox itself is visually hidden, so the ring the
                // browser would draw on it is drawn on the row instead.
                "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent has-[:focus-visible]:outline-offset-2 " +
                (vacated
                  ? "border-dashed border-border-strong bg-surface"
                  : on
                    ? "border-accent-shadow bg-elevated-hover"
                    : "border-border bg-surface")
              }
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={on}
                disabled={disabled}
                // The wrapping label is the hit area, so without this the
                // gloss would land inside the accessible name as well as in
                // the description.
                aria-labelledby={labelId}
                aria-describedby={glossId}
                onChange={() => onToggle(key, column)}
              />
              <span
                aria-hidden
                className={
                  "shrink-0 flex items-center justify-center w-[20px] h-[20px] md:w-[18px] md:h-[18px] rounded-[5px] border font-mono text-[12px] md:text-[11px] " +
                  ink +
                  " " +
                  (on
                    ? "border-accent bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]"
                    : "border-border-strong bg-transparent")
                }
              >
                {on ? "✓" : ""}
              </span>
              <span className="flex-1 min-w-0 flex flex-col gap-[2px]">
                <span
                  id={labelId}
                  className={"text-[13.5px] " + (vacated ? "text-fg-faint" : "text-fg")}
                >
                  {axisCopy[key].label}
                </span>
                <span
                  id={glossId}
                  className={
                    "font-mono text-[10px] " +
                    (vacated ? "text-fg-faint" : on ? "text-fg-muted" : "text-fg-faint")
                  }
                >
                  {vacated ? (
                    column === "worked" ? (
                      gameLogCopy.form.movedToHurt
                    ) : (
                      gameLogCopy.form.movedToWorked
                    )
                  ) : (
                    axisCopy[key][column]
                  )}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
