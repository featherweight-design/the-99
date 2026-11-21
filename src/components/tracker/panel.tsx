"use client";

// One seat's panel (F03, F04, F10): the commander's art, the life number, a left and right half to tap, the turn ring
// and End turn on the active seat, and the flipped Out face. The panel is laid out in its own upright frame and turned
// to face its seat (`Cell.rot`), so every control lives where that player's hand is.

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { trackerCopy } from "../../lib/copy/tracker";
import { lifeSize, type Cell } from "../../lib/tracker/layouts";
import type { PlaySeat } from "../../lib/tracker/seat";
import { COUNTER_KEYS, type CounterKey, type SeatState } from "../../lib/tracker/engine";
import { PersonName, PersonText, personAttrs, type PersonParts, type ThirdPartyName } from "../../lib/person-name";
import { FadingImg } from "../ui/hydrated-art";
import { TOUCH_HIT, TOUCH_HIT_INLINE } from "../ui/touch-hit";
import { CounterIcon, EndTurnIcon, InitiativeIcon, MonarchIcon, SheetChevronIcon } from "./icons";
import { TurnRing } from "./turn-ring";

/** Picking who gets the crown or the initiative (F13): the seat's button over its panel, and what it says. */
export type SeatPick = { kind: "monarch" | "initiative"; now: boolean; label: string | PersonParts; onPick: () => void };

export type { PlaySeat } from "../../lib/tracker/seat";

/** Hold a half this long and it repeats by ten; the delta commits once nothing has been pressed for the window. */
const HOLD_MS = 450;
const REPEAT_MS = 280;
export const COMMIT_MS = 2000;

const copy = trackerCopy.panel;

/** The pending life change of one panel: taps and holds add to it, and it commits as one entry after COMMIT_MS idle. */
function usePendingLife(commit: (delta: number) => void, disabled: boolean) {
  const [pending, setPending] = useState(0);
  /** The half lit by the latest press or step, keyed so each one restarts its fade (`k` counts them). */
  const [lit, setLit] = useState<{ k: number; sign: 1 | -1 } | null>(null);
  const light = useCallback((sign: 1 | -1) => setLit((l) => ({ k: (l?.k ?? 0) + 1, sign })), []);
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
    setLit(null);
    if (delta !== 0) commitRef.current(delta);
  }, []);

  const add = useCallback(
    (delta: number) => {
      total.current += delta;
      setPending(total.current);
      light(delta > 0 ? 1 : -1);
      if (commitTimer.current) clearTimeout(commitTimer.current);
      commitTimer.current = setTimeout(flush, COMMIT_MS);
    },
    [flush, light],
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
      light(sign);
      holdTimer.current = setTimeout(() => {
        held.current = true;
        add(sign * 10);
        repeat.current = setInterval(() => add(sign * 10), REPEAT_MS);
      }, HOLD_MS);
    },
    [add, disabled, light, stop],
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

  /** Hands over the pending change uncommitted, for a commit that ends the game to land it in the same entry. */
  const take = useCallback(() => {
    stop();
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = null;
    const delta = total.current;
    total.current = 0;
    setPending(0);
    setLit(null);
    return delta;
  }, [stop]);

  /** A press that ends without a step (the finger slid off) unlights its half, unless a change is still pending. */
  const cancel = useCallback(() => {
    stop();
    if (total.current === 0) setLit(null);
  }, [stop]);

  return { pending, lit, down, up, cancel, take };
}

export function Panel({
  cell,
  canvas,
  seat,
  state,
  active,
  round,
  outFrom,
  monarch,
  initiative,
  disabled,
  pick,
  onSheet,
  onLife,
  onEndTurn,
  onUndo,
  pendingFrom,
  tablet = false,
  foot = false,
}: {
  cell: Cell;
  canvas: { w: number; h: number };
  seat: PlaySeat;
  state: SeatState;
  active: boolean;
  round: number;
  /** The seat whose commander put this one out, with its name, when that is why. */
  outFrom: { you: boolean; name: string | ThirdPartyName } | null;
  monarch: boolean;
  initiative: boolean;
  disabled: boolean;
  pick?: SeatPick | null;
  onSheet: (focus?: CounterKey) => void;
  onLife: (delta: number) => void;
  onEndTurn: () => void;
  onUndo: () => void;
  /** Where the surface reaches every panel's pending change (`take`), keyed by seat. */
  pendingFrom?: RefObject<Map<number, () => number>>;
  /** The tablet's seat with no deck says "no deck picked"; the phone's narrower name row says "no deck" (S2). */
  tablet?: boolean;
  /** The tablet grid boards' anatomy (F12, F18, F19): the name on the outer edge, a 52px foot toward the strip. */
  foot?: boolean;
}) {
  const out = state.out !== null;
  const { pending, lit, down, up, cancel, take } = usePendingLife(onLife, disabled || out);
  useEffect(() => {
    const map = pendingFrom?.current;
    if (!map) return;
    map.set(seat.seat, take);
    return () => void map.delete(seat.seat);
  }, [pendingFrom, seat.seat, take]);
  const sideways = cell.rot === 90 || cell.rot === -90;
  const label = seat.you ? copy.ariaYou : copy.aria(seat.name);
  const sheetLabel = seat.you ? trackerCopy.sheet.ariaYou : trackerCopy.sheet.aria(seat.name);
  const hasBadges = monarch || initiative || COUNTER_KEYS.some((k) => state.counters[k] > 0);
  const badges = hasBadges ? (
    <div className={"flex flex-wrap gap-1 " + (foot ? "min-w-0" : "absolute left-[14px] top-[50px] z-10 max-w-[60%]")} data-testid="panel-badges">
      {monarch ? <Badge label={copy.monarch}><MonarchIcon size={14} /></Badge> : null}
      {initiative ? <Badge label={copy.initiative}><InitiativeIcon size={14} /></Badge> : null}
      {COUNTER_KEYS.filter((k) => state.counters[k] > 0).map((k) => (
        <Badge key={k} label={trackerCopy.counters[k].name} count={state.counters[k]} onPress={() => onSheet(k)}>
          <CounterIcon kind={k} size={14} />
        </Badge>
      ))}
    </div>
  ) : null;
  // End turn and the sheet button (F04, F12): in the name row on a phone and the tablet's ends, in the foot on the tablet's grids.
  const endTurn = active && !out ? (
    <button
      type="button"
      onClick={onEndTurn}
      disabled={disabled}
      data-testid="end-turn"
      className={
        "flex shrink-0 items-center rounded-full bg-[color:var(--accent)] font-semibold text-[color:var(--bg)] motion-safe:animate-[end-turn-pop_.3s_cubic-bezier(.3,1.5,.5,1)] motion-safe:transition-transform motion-safe:active:scale-[.94] "
        + (foot ? "h-[48px] gap-2 px-5 text-[16px]" : "h-10 gap-[6px] px-[14px] text-[14px] " + TOUCH_HIT)
      }
    >
      {copy.endTurn}
      <EndTurnIcon size={foot ? 18 : 16} />
    </button>
  ) : null;
  const sheetButton = (
    <button
      type="button"
      onClick={() => onSheet()}
      data-testid="panel-sheet"
      {...personAttrs(
        { "aria-label": sheetLabel },
        "ml-auto grid shrink-0 place-items-center rounded-full bg-[color:color-mix(in_srgb,var(--bg)_85%,transparent)] text-[color:var(--fg)] shadow-[inset_0_0_0_1px_var(--border-strong)] motion-safe:transition-transform motion-safe:duration-[80ms] motion-safe:active:scale-[.92] "
          + (foot ? "size-[52px]" : "size-11"),
      )}
    >
      <SheetChevronIcon size={foot ? 22 : 20} />
    </button>
  );

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
      {/* The seat's turn sits on this box, which is laid out unturned (a sideways seat's box is the cell's height wide).
          Turned only inside, the box itself spilled across the next seat, and a later seat's box swallowed the press on
          an earlier seat's End turn. */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{ width: sideways ? "100cqh" : "100%", height: sideways ? "100cqw" : "100%", transform: `translate(-50%, -50%) rotate(${cell.rot}deg)` }}
      >
        <div
          role="group"
          data-testid="tracker-panel"
          data-seat={seat.seat}
          data-active={active ? "" : undefined}
          data-out={out ? "" : undefined}
          data-pane={foot ? "foot" : "who"}
          {...personAttrs(
            { "aria-label": label },
            "relative h-full w-full overflow-hidden shadow-[inset_0_0_0_1px_var(--border)] "
              + (foot ? "rounded-[18px] " : "rounded-[16px] ")
              // A seat with no art plays on the plain ground (S2), never the grey of an out seat.
              + (seat.art ? "bg-[color:var(--surface)] " : "bg-[radial-gradient(260px_180px_at_50%_45%,var(--elevated),var(--surface))] ")
              + (out ? "[filter:grayscale(1)] opacity-80" : ""),
          )}
        >
          {seat.art ? (
            <>
              <span aria-hidden className={"pointer-events-none absolute inset-0 flex " + (foot ? "opacity-60" : active ? "opacity-[.72]" : "opacity-[.55]")} data-testid="panel-art">
                <FadingImg src={seat.art} alt="" className={"h-full object-cover " + (seat.partnerArt ? "w-1/2" : "w-full")} />
                {seat.partnerArt ? <FadingImg src={seat.partnerArt} alt="" className="h-full w-1/2 object-cover" /> : null}
              </span>
              <span aria-hidden className="pointer-events-none absolute inset-0 bg-[color:color-mix(in_srgb,var(--bg)_50%,transparent)]" data-testid="panel-wash" />
            </>
          ) : null}
          {active && !out ? <TurnRing key={round + ":" + seat.seat} radius={foot ? 18 : 16} /> : null}

          <div className={"relative flex h-full w-full " + (foot ? "flex-col-reverse px-[18px] py-4" : "flex-col pb-2 pl-[14px] pr-2 pt-[6px]")}>
            <div className={"relative z-10 flex shrink-0 whitespace-nowrap " + (foot ? "h-6 items-baseline gap-[10px]" : "h-11 items-center gap-[6px]")} data-testid="panel-who">
              <b className={"min-w-0 shrink truncate font-semibold text-[color:var(--fg)] " + (foot ? "max-w-[150px] text-[18px]" : "mr-1 max-w-[110px] text-[16px]")} data-testid="panel-name">
                {seat.you ? <>{seat.name as string}</> : <PersonName n={seat.name} />}
              </b>
              {seat.deck === null ? (
                <i className="shrink-0 font-mono text-[11px] not-italic text-[color:var(--fg-muted)]" data-testid="panel-no-deck">{tablet ? copy.noDeckTablet : copy.noDeck}</i>
              ) : (
                <i className={"min-w-0 truncate font-mono not-italic text-[color:var(--fg-body)] " + (foot ? "text-[12.5px]" : "text-[12px]")} data-testid="panel-deck">
                  {typeof seat.deck === "string" ? seat.deck : <PersonName n={seat.deck} />}
                </i>
              )}
              {foot ? null : endTurn}
              {foot ? null : sheetButton}
            </div>

            <div className="relative min-h-0 flex-1">
              {out ? (
                <div className="flex h-full flex-col items-center justify-center gap-1 px-3 text-center" data-testid="panel-out">
                  <span className="text-[max(10px,min(13px,6cqmin))] leading-tight text-[color:var(--fg)]">
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
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-live="polite" aria-atomic="true" data-testid="panel-life">
                    <span className="sr-only">{copy.lifeLabel}</span>
                    <span
                      key={state.life}
                      className="relative font-display font-bold tabular-nums text-[color:var(--fg)] [line-height:1] motion-safe:animate-[life-tick_.12s_ease-out]"
                      style={{ fontSize: `calc(${lifeSize(tablet ? "tablet" : "phone", cell)} * 100cqw / ${cell.w})`, textShadow: `0 2px ${foot ? 14 : 12}px rgba(0,0,0,.6)` }}
                      data-testid="life-number"
                    >
                      {state.life + pending}
                      {pending !== 0 ? (
                        // The pending change hangs off the number's right edge (F04), so the number never moves.
                        <span className="absolute left-full top-2 ml-[6px] font-mono text-[18px] font-medium tabular-nums text-[color:var(--accent-text)] [text-shadow:none]" data-testid="life-pending">
                          {copy.pending(pending)}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  {([-1, 1] as const).map((sign) => {
                    // F04 draws the half that made a pending change pressed until it commits: the glyph in the accent, and an
                    // accent ground lit at once by each press or step that fades steadily to nothing by the commit, so nothing
                    // flashes when the change lands (Hugh ruling 11-22). Reduced motion holds the ground until the commit.
                    const pressed = pending !== 0 && Math.sign(pending) === sign;
                    return (
                      <button
                        key={sign}
                        type="button"
                        data-testid={sign === 1 ? "half-plus" : "half-minus"}
                        data-pressed={pressed ? "" : undefined}
                        disabled={disabled}
                        onPointerDown={() => down(sign)}
                        onPointerUp={() => up(sign)}
                        onPointerLeave={cancel}
                        onPointerCancel={cancel}
                        onContextMenu={(e) => e.preventDefault()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (!e.repeat) {
                              down(sign);
                              up(sign);
                            }
                          }
                        }}
                        {...personAttrs(
                          { "aria-label": seat.you ? (sign === 1 ? copy.gainYou : copy.loseYou) : sign === 1 ? copy.gain(seat.name) : copy.lose(seat.name) },
                          "absolute inset-y-0 flex w-1/2 touch-manipulation select-none items-center font-sans outline-none [-webkit-touch-callout:none] focus-visible:bg-[color:color-mix(in_srgb,var(--accent)_12%,transparent)] "
            + (sign === 1 ? "right-0 justify-end " : "left-0 justify-start ")
            + (foot ? "px-2 text-[36px] " : "px-1 text-[30px] ")
            + (pressed || lit?.sign === sign ? "text-[color:var(--accent-text)]" : "text-[color:var(--fg-muted)]"),
                        )}
                      >
                        {lit?.sign === sign ? (
                          <span
                            key={lit.k}
                            aria-hidden
                            data-testid="half-fill"
                            className="pointer-events-none absolute inset-0 bg-[color:color-mix(in_srgb,var(--accent)_18%,transparent)] motion-safe:animate-[half-fade_var(--fade)_linear_forwards]"
                            style={{ "--fade": `${COMMIT_MS}ms` } as React.CSSProperties}
                          />
                        ) : null}
                        <span aria-hidden className="relative">{sign === 1 ? "+" : "−"}</span>
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            {foot ? (
              <div className="relative z-10 flex h-[52px] shrink-0 items-center gap-2" data-testid="panel-foot">
                {endTurn}
                {badges}
                {sheetButton}
              </div>
            ) : (
              badges
            )}
          </div>
          {pick ? (
            <button
              type="button"
              onClick={pick.onPick}
              data-testid="seat-pick"
              {...personAttrs(
                { "aria-label": pick.label },
                "absolute inset-[50px_8px_8px_14px] z-30 flex items-center justify-center gap-2 rounded-[12px] px-3 text-center text-[16px] font-semibold "
                  + (pick.now
                    ? "bg-[color:var(--accent-dim)] text-[color:var(--fg)] shadow-[inset_0_0_0_2px_var(--accent)]"
                    : "bg-[color:color-mix(in_srgb,var(--bg)_86%,transparent)] text-[color:var(--accent-text)] shadow-[inset_0_0_0_1.5px_var(--accent)]"),
              )}
            >
              {pick.kind === "monarch" ? <MonarchIcon size={20} /> : <InitiativeIcon size={20} />}
              <span aria-hidden><PersonText text={pick.label} /></span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** A counter or holder badge under the name. A counter's opens the sheet on it; the monarch and initiative marks only show. */
function Badge({ label, count, onPress, children }: { label: string; count?: number; onPress?: () => void; children: React.ReactNode }) {
  const body = (
    <>
      {children}
      {count !== undefined ? <span className="font-mono text-[11px] tabular-nums">{count}</span> : null}
    </>
  );
  const cls = "inline-flex h-6 items-center gap-1 rounded-full bg-[color:var(--elevated)] px-2 text-[color:var(--fg)]";
  return onPress ? (
    <button type="button" onClick={onPress} aria-label={copy.badgeAria(label, count ?? 0)} className={cls + " " + TOUCH_HIT_INLINE}>{body}</button>
  ) : (
    <span role="img" aria-label={label} className={cls}>{body}</span>
  );
}
