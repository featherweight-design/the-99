"use client";

// One seat's panel (F03, F04, F10): the commander's art, the life number, a left and right half to tap, the turn ring
// and End turn on the active seat, and the flipped Out face. The panel is laid out in its own upright frame and turned
// to face its seat (`Cell.rot`), so every control lives where that player's hand is.

import { useCallback, useEffect, useRef, useState } from "react";
import { trackerCopy } from "../../lib/copy/tracker";
import type { Cell } from "../../lib/tracker/layouts";
import type { SeatState } from "../../lib/tracker/engine";
import { PersonName, PersonText, personAttrs, type ThirdPartyName } from "../../lib/person-name";
import { FadingImg } from "../ui/hydrated-art";
import { TurnRing } from "./turn-ring";

export type PlaySeat = {
  seat: number;
  you: boolean;
  name: string | ThirdPartyName;
  art: string | null;
  partnerArt: string | null;
};

/** Hold a half this long and it repeats by ten; the delta commits once nothing has been pressed for the window. */
const HOLD_MS = 450;
const REPEAT_MS = 280;
export const COMMIT_MS = 2000;

const copy = trackerCopy.panel;

/** The pending life change of one panel: taps and holds add to it, and it commits as one entry after COMMIT_MS idle. */
function usePendingLife(commit: (delta: number) => void, disabled: boolean) {
  const [pending, setPending] = useState(0);
  const total = useRef(0);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeat = useRef<ReturnType<typeof setInterval> | null>(null);
  const held = useRef(false);
  /** The half currently pressed: a release only counts for the press that began it, and a second press replaces the first. */
  const pressed = useRef<1 | -1 | null>(null);
  const commitRef = useRef(commit);
  useEffect(() => {
    commitRef.current = commit;
  });

  const flush = useCallback(() => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = null;
    const delta = total.current;
    total.current = 0;
    setPending(0);
    if (delta !== 0) commitRef.current(delta);
  }, []);

  const add = useCallback(
    (delta: number) => {
      total.current += delta;
      setPending(total.current);
      if (commitTimer.current) clearTimeout(commitTimer.current);
      commitTimer.current = setTimeout(flush, COMMIT_MS);
    },
    [flush],
  );

  const stop = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (repeat.current) clearInterval(repeat.current);
    holdTimer.current = null;
    repeat.current = null;
    pressed.current = null;
  }, []);

  const down = useCallback(
    (sign: 1 | -1) => {
      if (disabled) return;
      stop();
      pressed.current = sign;
      held.current = false;
      holdTimer.current = setTimeout(() => {
        held.current = true;
        add(sign * 10);
        repeat.current = setInterval(() => add(sign * 10), REPEAT_MS);
      }, HOLD_MS);
    },
    [add, disabled, stop],
  );

  const up = useCallback(
    (sign: 1 | -1) => {
      if (disabled || pressed.current !== sign) return;
      const wasHold = held.current;
      stop();
      held.current = false;
      if (!wasHold) add(sign);
    },
    [add, disabled, stop],
  );

  // A pending change is lost with the panel only on unmount: leaving the screen commits it first.
  useEffect(() => () => {
    stop();
    if (commitTimer.current) {
      clearTimeout(commitTimer.current);
      if (total.current !== 0) commitRef.current(total.current);
    }
  }, [stop]);

  return { pending, down, up, cancel: stop };
}

export function Panel({
  cell,
  canvas,
  seat,
  state,
  active,
  round,
  outFrom,
  disabled,
  onLife,
  onEndTurn,
  onUndo,
}: {
  cell: Cell;
  canvas: { w: number; h: number };
  seat: PlaySeat;
  state: SeatState;
  active: boolean;
  round: number;
  /** The seat whose commander put this one out, with its name, when that is why. */
  outFrom: { you: boolean; name: string | ThirdPartyName } | null;
  disabled: boolean;
  onLife: (delta: number) => void;
  onEndTurn: () => void;
  onUndo: () => void;
}) {
  const out = state.out !== null;
  const { pending, down, up, cancel } = usePendingLife(onLife, disabled || out);
  const sideways = cell.rot === 90 || cell.rot === -90;
  const label = seat.you ? copy.ariaYou : copy.aria(seat.name);

  return (
    <div
      style={{
        position: "absolute",
        left: `${(cell.x / canvas.w) * 100}%`,
        top: `${(cell.y / canvas.h) * 100}%`,
        width: `${(cell.w / canvas.w) * 100}%`,
        height: `${(cell.h / canvas.h) * 100}%`,
        containerType: "size",
      }}
    >
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: sideways ? "100cqh" : "100%", height: sideways ? "100cqw" : "100%" }}
      >
        <div
          role="group"
          data-testid="tracker-panel"
          data-seat={seat.seat}
          data-active={active ? "" : undefined}
          data-out={out ? "" : undefined}
          {...personAttrs(
            { "aria-label": label },
            "relative h-full w-full overflow-hidden rounded-[14px] border bg-[color:var(--surface-rail)] "
              + (active ? "border-[color:var(--accent)] " : "border-[color:var(--border-strong)] ")
              + (out ? "[filter:grayscale(1)] opacity-80" : ""),
          )}
          style={cell.rot === 0 ? undefined : { transform: `rotate(${cell.rot}deg)` }}
        >
          {seat.art ? (
            <span aria-hidden className="pointer-events-none absolute inset-0 flex">
              <FadingImg src={seat.art} alt="" className={"h-full object-cover opacity-45 " + (seat.partnerArt ? "w-1/2" : "w-full")} />
              {seat.partnerArt ? <FadingImg src={seat.partnerArt} alt="" className="h-full w-1/2 object-cover opacity-45" /> : null}
            </span>
          ) : null}
          {active && !out ? <TurnRing key={round + ":" + seat.seat} /> : null}

          <div className="relative flex h-full w-full flex-col items-center justify-center">
            <span className="absolute left-3 top-2 max-w-[70%] truncate text-[13px] text-[color:var(--fg-body)]" data-testid="panel-name">
              {seat.you ? <>{seat.name as string}</> : <PersonName n={seat.name} />}
            </span>

            {out ? (
              <div className="flex flex-col items-center gap-2 px-3 text-center" data-testid="panel-out">
                <span className="text-[13px] text-[color:var(--fg)]">
                  {state.out!.reason.kind === "life" ? copy.outLife(state.out!.round) : null}
                  {state.out!.reason.kind === "poison" ? copy.outPoison(state.out!.round) : null}
                  {state.out!.reason.kind === "commander" ? (
                    outFrom?.you === false ? <PersonText text={copy.outCommander(outFrom.name, state.out!.round)} /> : copy.outCommanderYou(state.out!.round)
                  ) : null}
                </span>
                <button type="button" onClick={onUndo} className="min-h-[44px] rounded-[10px] border border-[color:var(--border-strong)] px-4 text-[14px] text-[color:var(--fg)]">
                  {copy.undo}
                </button>
              </div>
            ) : (
              <>
                <div className="relative flex items-baseline gap-2" aria-live="polite" aria-atomic="true" data-testid="panel-life">
                  <span className="sr-only">{copy.lifeLabel}</span>
                  <span className="font-semibold tabular-nums text-[color:var(--fg)] [font-size:min(30cqmin,72px)] [line-height:1]" data-testid="life-number">
                    {state.life + pending}
                  </span>
                  {pending !== 0 ? (
                    <span className="text-[min(9cqmin,22px)] tabular-nums text-[color:var(--accent-text)]" data-testid="life-pending">
                      {copy.pending(pending)}
                    </span>
                  ) : null}
                </div>
                <div className="absolute inset-0 flex">
                  {([-1, 1] as const).map((sign) => (
                    <button
                      key={sign}
                      type="button"
                      aria-label={sign === 1 ? copy.gain : copy.lose}
                      disabled={disabled}
                      onPointerDown={() => down(sign)}
                      onPointerUp={() => up(sign)}
                      onPointerLeave={cancel}
                      onPointerCancel={cancel}
                      onContextMenu={(e) => e.preventDefault()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          if (!e.repeat) up(sign);
                        }
                      }}
                      className="h-full w-1/2 touch-manipulation select-none outline-none [-webkit-touch-callout:none] focus-visible:bg-[color:color-mix(in_srgb,var(--accent)_12%,transparent)]"
                    />
                  ))}
                </div>
                {active ? (
                  <button
                    type="button"
                    onClick={onEndTurn}
                    disabled={disabled}
                    className="absolute bottom-2 left-1/2 min-h-[44px] -translate-x-1/2 rounded-full bg-[color:var(--accent)] px-5 text-[14px] font-medium text-[color:var(--bg)]"
                  >
                    {copy.endTurn}
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
