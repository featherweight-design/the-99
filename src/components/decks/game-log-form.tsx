"use client";
// GameLogForm — STATES-log-form.md, all fourteen states.
//
// The state is four values and a transition: no form library and no reducer,
// because the only rule the form enforces is that the two mark columns stay
// disjoint, and that rule is one function.

import { useEffect, useRef, useState, useTransition } from "react";
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
}

const POD_SIZES = [2, 3, 4, 5, 6, 7, 8];
const today = () => new Date().toISOString().slice(0, 10);

const RESULTS: { value: GameResult; label: string }[] = [
  { value: "win", label: gameLogCopy.form.won },
  { value: "loss", label: gameLogCopy.form.lost },
  { value: "draw", label: gameLogCopy.form.draw },
];

export function GameLogForm({ deckId, onSaved, onAnnounce, isFirstGame }: GameLogFormProps) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);
  const [podSize, setPodSize] = useState(4);
  const [playedAt, setPlayedAt] = useState(today);
  const [worked, setWorked] = useState<GameAxisKey[]>([]);
  const [hurt, setHurt] = useState<GameAxisKey[]>([]);
  const [moved, setMoved] = useState<{ key: GameAxisKey; to: "worked" | "hurt" } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const openButton = useRef<HTMLButtonElement>(null);
  const movedTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (movedTimer.current !== null) window.clearTimeout(movedTimer.current);
  }, []);

  // State 14: reopening starts from nothing. The reset lives here rather than
  // on close so a refusal (state 12) cannot reach it — the form stays mounted
  // and populated through a refusal, and only a successful save or a cancel
  // brings it back through this path.
  function collapse() {
    setOpen(false);
    setResult(null);
    setPodSize(4);
    setPlayedAt(today());
    setWorked([]);
    setHurt([]);
    setMoved(null);
    setError(null);
    openButton.current?.focus();
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

  function submit() {
    if (!result || isPending) return;
    startTransition(async () => {
      setError(null);
      const outcome = await logGame(deckId, {
        result,
        podSize,
        playedAt: new Date(`${playedAt}T12:00:00`),
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
    // and logging a game is not the app's goal.
    return (
      <button
        ref={openButton}
        type="button"
        onClick={() => setOpen(true)}
        className="w-full md:w-auto min-h-[44px] rounded-[8px] px-[18px] py-[10px] text-[13.5px] font-semibold border border-[color:var(--accent)] text-[color:var(--accent)] bg-transparent cursor-pointer"
      >
        {gameLogCopy.form.open}
      </button>
    );
  }

  return (
    <div className="rounded-[12px] p-[16px] md:p-[20px] bg-[color:var(--surface)] border border-[color:var(--border-strong)]">
      <h3 className="font-mono uppercase text-[10px] tracking-[0.14em] text-[color:var(--fg-faint)]">
        {gameLogCopy.form.heading}
      </h3>

      {/* Result — no default. State 2 opens with nothing chosen. */}
      <div
        role="radiogroup"
        aria-label={gameLogCopy.form.resultLabel}
        className="flex gap-[8px] mt-[14px]"
      >
        {RESULTS.map((r) => {
          const on = result === r.value;
          const won = on && r.value === "win";
          return (
            <button
              key={r.value}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={isPending}
              onClick={() => setResult(r.value)}
              className={
                "flex-1 md:flex-none md:w-[92px] min-h-[44px] md:min-h-[40px] rounded-[8px] " +
                "text-[13.5px] font-semibold cursor-pointer border " +
                (won
                  ? "border-success bg-success text-bg"
                  : on
                    ? "border-accent bg-transparent text-fg"
                    : "border-border bg-transparent text-fg-body")
              }
            >
              {r.label}
            </button>
          );
        })}
      </div>

      {/* Pod size — defaults to 4, the commander table. */}
      <div className="flex items-baseline gap-[8px] mt-[16px]">
        <span className="font-mono uppercase text-[10px] tracking-[0.14em] text-[color:var(--fg-faint)]">
          {gameLogCopy.form.podLabel}
        </span>
        <span className="font-mono text-[10px] text-[color:var(--fg-locked)]">
          {gameLogCopy.form.podHint}
        </span>
      </div>
      <div
        role="radiogroup"
        aria-label={gameLogCopy.form.podLabel}
        className="flex flex-wrap gap-[6px] mt-[8px]"
      >
        {POD_SIZES.map((n) => {
          const on = podSize === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={isPending}
              onClick={() => setPodSize(n)}
              className={
                "w-[44px] h-[44px] md:w-[40px] md:h-[40px] rounded-[8px] font-mono " +
                "font-semibold text-[14px] cursor-pointer border " +
                (on
                  ? "border-accent bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-accent"
                  : "border-border bg-transparent text-fg-body")
              }
            >
              {n}
            </button>
          );
        })}
      </div>

      {/* Date — today by default, and the browser refuses the future before the
          action has to (state 9). */}
      <label className="block mt-[16px]">
        <span className="font-mono uppercase text-[10px] tracking-[0.14em] text-[color:var(--fg-faint)]">
          {playedAt === today() ? gameLogCopy.form.playedToday : gameLogCopy.form.played(playedAt)}
        </span>
        <input
          type="date"
          value={playedAt}
          max={today()}
          disabled={isPending}
          onChange={(e) => setPlayedAt(e.target.value)}
          className="block mt-[6px] min-h-[44px] rounded-[8px] px-[12px] text-[13.5px] bg-transparent border border-[color:var(--border)] text-[color:var(--fg)]"
        />
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px] md:gap-[16px] mt-[18px]">
        <AxisColumn
          legend={gameLogCopy.form.workedLabel}
          colour="var(--success)"
          column="worked"
          selected={worked}
          moved={moved}
          disabled={isPending}
          onToggle={toggle}
        />
        <AxisColumn
          legend={gameLogCopy.form.hurtLabel}
          colour="var(--warning)"
          column="hurt"
          selected={hurt}
          moved={moved}
          disabled={isPending}
          onToggle={toggle}
        />
      </div>

      <p className="font-mono text-[10px] text-[color:var(--fg-locked)] mt-[10px]">
        {gameLogCopy.form.optionalNote}
      </p>

      <div className="flex flex-col md:flex-row gap-[8px] mt-[14px]">
        <button
          type="button"
          onClick={submit}
          disabled={!result || isPending}
          className="min-h-[44px] md:min-h-[48px] rounded-[8px] px-[20px] text-[13.5px] font-semibold cursor-pointer border border-accent bg-accent text-bg hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? gameLogCopy.form.saving : gameLogCopy.form.save}
        </button>
        <button
          type="button"
          onClick={collapse}
          disabled={isPending}
          className="min-h-[44px] md:min-h-[48px] rounded-[8px] px-[20px] text-[13.5px] bg-transparent border border-[color:var(--border)] text-[color:var(--fg-body)] cursor-pointer"
        >
          {gameLogCopy.form.cancel}
        </button>
      </div>

      {error && <MutationError message={error} />}
    </div>
  );
}

function AxisColumn({
  legend,
  colour,
  column,
  selected,
  moved,
  disabled,
  onToggle,
}: {
  legend: string;
  colour: string;
  column: "worked" | "hurt";
  selected: GameAxisKey[];
  moved: { key: GameAxisKey; to: "worked" | "hurt" } | null;
  disabled: boolean;
  onToggle: (key: GameAxisKey, column: "worked" | "hurt") => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="font-mono uppercase text-[10px] tracking-[0.14em]" style={{ color: colour }}>
        {legend}
        {/* Absent at zero — a counter reading '0 marked' is a column complaining. */}
        {selected.length > 0 && (
          <span className="ml-[8px] text-[color:var(--fg-locked)] normal-case tracking-normal">
            {gameLogCopy.form.marked(String(selected.length))}
          </span>
        )}
      </legend>
      <div className="flex flex-col gap-[6px] mt-[8px]">
        {GAME_AXIS_KEYS.map((key) => {
          const on = selected.includes(key);
          // The vacated row wears the marker, so it says where the axis went
          // rather than that something happened here.
          const vacated = moved !== null && moved.key === key && moved.to !== column;
          return (
            <label
              key={key}
              className="flex items-center gap-[11px] min-h-[48px] md:min-h-[46px] rounded-[8px] px-[12px] py-[5px] cursor-pointer"
              style={{
                background: on ? "var(--elevated-hover)" : "var(--surface)",
                border: vacated
                  ? "1px dashed var(--border-strong)"
                  : on
                    ? "1px solid var(--accent-shadow)"
                    : "1px solid var(--border)",
              }}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={on}
                disabled={disabled}
                onChange={() => onToggle(key, column)}
              />
              <span
                aria-hidden
                className="shrink-0 grid place-items-center w-[20px] h-[20px] md:w-[18px] md:h-[18px] rounded-[5px] text-[11px]"
                style={{
                  border: on ? "1px solid var(--accent)" : "1px solid var(--border-strong)",
                  background: on ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "transparent",
                  color: colour,
                }}
              >
                {on ? "✓" : ""}
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] text-[color:var(--fg)]">
                  {axisCopy[key].label}
                </span>
                <span
                  className="block font-mono text-[10px]"
                  style={{
                    color: vacated ? "var(--fg-locked)" : on ? "var(--fg-muted)" : "var(--fg-faint)",
                  }}
                >
                  {vacated
                    ? column === "worked"
                      ? gameLogCopy.form.movedToHurt
                      : gameLogCopy.form.movedToWorked
                    : axisCopy[key][column]}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
