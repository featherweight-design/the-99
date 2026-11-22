"use client";

// One seat's panel (F03, F04, F10): the commander's art, the life number, a left and right half to tap, the turn ring
// and End turn on the active seat, and the flipped Out face. The panel is laid out in its own upright frame and turned
// to face its seat (`Cell.rot`), so every control lives where that player's hand is.

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { trackerCopy } from "../../lib/copy/tracker";
import { lifeSize, type Cell } from "../../lib/tracker/layouts";
import { commanderArt, commanderOf, TAX_PER_CAST, type PlaySeat } from "../../lib/tracker/seat";
import { COUNTER_KEYS, type CounterKey, type SeatState } from "../../lib/tracker/engine";
import { PersonName, PersonText, personAttrs, type PersonParts } from "../../lib/person-name";
import { FadingImg } from "../ui/hydrated-art";
import { TOUCH_HIT } from "../ui/touch-hit";
import { CounterIcon, EndTurnIcon, InitiativeIcon, MonarchIcon, SheetChevronIcon, TaxUpIcon } from "./icons";
import { TurnRing } from "./turn-ring";

/** Picking who gets the crown or the initiative (F13): the seat's button over its panel, and what it says. */
export type SeatPick = { kind: "monarch" | "initiative"; now: boolean; label: string | PersonParts; onPick: () => void };

export type { PlaySeat } from "../../lib/tracker/seat";

/** Hold a half this long and it repeats by ten; the delta commits once nothing has been pressed for the window. */
const HOLD_MS = 480;
const REPEAT_MS = 380;
export const COMMIT_MS = 2000;
/** The name row length, on the design canvas, below which End turn draws icon-only (addendum R2, decision 4). */
const SHORT_ROW = 240;

const copy = trackerCopy.panel;

/** The pending life change of one panel: taps and holds add to it, and it commits as one entry after COMMIT_MS idle. */
function usePendingLife(commit: (delta: number) => void, disabled: boolean) {
  const [pending, setPending] = useState(0);
  /** The half under a finger now: its 10% wash draws only while pressed and nothing is held through the window (life-press addendum). */
  const [pressedHalf, setPressedHalf] = useState<1 | -1 | null>(null);
  /** Counts every step, taps and each hold repeat alike, with its direction: the number ticks and nudges on each one, and the commit changes neither. */
  const [step, setStep] = useState<{ n: number; dir: 1 | -1 }>({ n: 0, dir: 1 });
  /** The last pending change at its commit, kept so its fade-out can play after the live one unmounts; a new step replaces it at once. */
  const [ghost, setGhost] = useState<{ n: number; sign: 1 | -1; text: string } | null>(null);
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
    if (delta !== 0) {
      setGhost({ n: Date.now(), sign: delta > 0 ? 1 : -1, text: copy.pending(delta) });
      commitRef.current(delta);
    }
  }, []);

  const add = useCallback(
    (delta: number) => {
      total.current += delta;
      setPending(total.current);
      setStep((st) => ({ n: st.n + 1, dir: delta > 0 ? 1 : -1 }));
      setGhost(null);
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
    setPressedHalf(null);
  }, []);

  const down = useCallback(
    (sign: 1 | -1) => {
      if (disabled) return;
      stop();
      pressed.current = sign;
      held.current = false;
      setPressedHalf(sign);
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

  /** Hands over the pending change uncommitted, for a commit that ends the game to land it in the same entry. */
  const take = useCallback(() => {
    stop();
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = null;
    const delta = total.current;
    total.current = 0;
    setPending(0);
    return delta;
  }, [stop]);

  /** A press that ends without a step (the finger slid off) just ends its wash; nothing is handed to the other half. */
  const cancel = stop;

  const clearGhost = useCallback(() => setGhost(null), []);

  return { pending, pressedHalf, step, ghost, clearGhost, down, up, cancel, take };
}

export function Panel({
  cell,
  canvas,
  seat,
  state,
  active,
  round,
  seats,
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
  /** Every seat at the table, by seat number: whose commander dealt the damage this seat has taken. */
  seats: ReadonlyMap<number, PlaySeat>;
  monarch: boolean;
  initiative: boolean;
  disabled: boolean;
  pick?: SeatPick | null;
  /** Open this seat's sheet: on its tab, or on one counter. */
  onSheet: (tab?: "damage" | "tax" | "counters", focus?: CounterKey) => void;
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
  const { pending, pressedHalf, step, ghost, clearGhost, down, up, cancel, take } = usePendingLife(onLife, disabled || out);
  useEffect(() => {
    const map = pendingFrom?.current;
    if (!map) return;
    map.set(seat.seat, take);
    return () => void map.delete(seat.seat);
  }, [pendingFrom, seat.seat, take]);
  const sideways = cell.rot === 90 || cell.rot === -90;
  const label = seat.you ? copy.ariaYou : copy.aria(seat.name);
  const sheetLabel = seat.you ? trackerCopy.sheet.ariaYou : trackerCopy.sheet.aria(seat.name);
  // The badges (F10, F12, F14): commander damage taken (that commander's art and the count), the top tax, each counter
  // set, then the monarch and initiative marks in the accent. Each count opens the sheet where it is changed.
  const hits = Object.entries(state.damage)
    .filter(([, n]) => n > 0)
    .map(([key, n]) => {
      const [from, cmdr] = key.split(":").map(Number);
      return { key, n, cmdr, p: seats.get(from) };
    })
    .filter((h): h is typeof h & { p: PlaySeat } => h.p !== undefined)
    .sort((a, b) => b.n - a.n || a.key.localeCompare(b.key));
  const topTax = Math.max(...state.tax.slice(0, state.commanders)) * TAX_PER_CAST;
  const setCounters = COUNTER_KEYS.filter((k) => state.counters[k] > 0);
  const hasBadges = hits.length > 0 || topTax > 0 || setCounters.length > 0 || monarch || initiative;
  const badges = hasBadges ? (
    <div className={"-my-[10px] flex min-w-0 items-center overflow-hidden py-[10px] " + (foot ? "gap-[6px]" : "shrink gap-[5px]")} data-testid="panel-badges">
      {hits.map((h) => {
        const art = commanderArt(h.p, h.cmdr);
        const text = copy.badge(commanderOf(h.p, h.cmdr) ?? trackerCopy.sheet.commanderFallback, h.n);
        return (
          <Badge key={h.key} foot={foot} text={text} onPress={() => onSheet("damage")} lead={art ? "img" : "none"}>
            {/* eslint-disable-next-line @next/next/no-img-element -- the seat's own art, already loaded by its panel */}
            {art ? <img src={art} alt="" className={"shrink-0 rounded-full object-cover object-top " + (foot ? "size-5" : "size-[18px]")} /> : null}
          </Badge>
        );
      })}
      {topTax > 0 ? (
        <Badge foot={foot} text={copy.badgeTax(topTax)} onPress={() => onSheet("tax")}>
          <TaxUpIcon size={12} />
        </Badge>
      ) : null}
      {setCounters.map((k) => (
        <Badge key={k} foot={foot} text={copy.badge(trackerCopy.counters[k].name, state.counters[k])} onPress={() => onSheet("counters", k)}>
          <CounterIcon kind={k} size={12} />
        </Badge>
      ))}
      {monarch ? <Badge foot={foot} accent text={copy.monarch}><MonarchIcon size={12} /></Badge> : null}
      {initiative ? <Badge foot={foot} accent text={copy.initiative}><InitiativeIcon size={12} /></Badge> : null}
    </div>
  ) : null;
  // End turn and the sheet button (F04, F12): in the name row on a phone and the tablet's ends, in the foot on the tablet's grids.
  // A name row under 240 px long (phone 6 Ends' sides) has no room for the label, so End turn keeps only its arrow in a 44 px
  // circle, named by its aria-label (addendum R2, decision 4).
  const iconOnly = !foot && Math.max(cell.w, cell.h) < SHORT_ROW;
  const endTurn = active && !out ? (
    <button
      type="button"
      onClick={onEndTurn}
      disabled={disabled}
      data-testid="end-turn"
      aria-label={iconOnly ? copy.endTurn : undefined}
      className={
        "flex shrink-0 items-center justify-center rounded-full bg-[color:var(--accent)] font-semibold text-[color:var(--bg)] motion-safe:animate-[end-turn-pop_.3s_cubic-bezier(.3,1.5,.5,1)] motion-safe:transition-transform motion-safe:active:scale-[.94] "
        + (foot ? "h-[48px] gap-2 px-5 text-[16px]" : iconOnly ? "size-11" : "h-10 gap-[6px] px-[14px] text-[14px] " + TOUCH_HIT)
      }
    >
      {iconOnly ? null : copy.endTurn}
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
  const name = (
    <b className={"min-w-0 shrink truncate font-semibold text-[color:var(--fg)] " + (foot ? "max-w-[150px] text-[18px]" : "mr-1 max-w-[110px] text-[16px]")} data-testid="panel-name">
      {seat.you ? <>{seat.name as string}</> : <PersonName n={seat.name} />}
    </b>
  );
  const deck = seat.deck === null ? (
    <i className="shrink-0 font-mono text-[11px] not-italic text-[color:var(--fg-muted)]" data-testid="panel-no-deck">{tablet ? copy.noDeckTablet : copy.noDeck}</i>
  ) : (
    <i className={"min-w-0 truncate font-mono not-italic text-[color:var(--fg-body)] " + (foot ? "text-[12.5px]" : "text-[12px]")} data-testid="panel-deck">
      {typeof seat.deck === "string" ? seat.deck : <PersonName n={seat.deck} />}
    </i>
  );
  const whoRow = "relative z-10 flex shrink-0 whitespace-nowrap " + (foot ? "h-6 items-baseline gap-[10px]" : "h-11 items-center gap-[6px]");
  const pane = "relative flex h-full w-full " + (foot ? "flex-col-reverse px-[18px] py-4" : "flex-col pb-2 pl-[14px] pr-2 pt-[6px]");
  const face = "absolute inset-0 overflow-hidden shadow-[inset_0_0_0_1px_var(--border)] [backface-visibility:hidden] [-webkit-backface-visibility:hidden] " + (foot ? "rounded-[18px] " : "rounded-[16px] ");
  // The commander art (F04), split in two halves with a 2px seam for a partner pair (F14).
  const art = (front: boolean) =>
    seat.art ? (
      <>
        <span
          aria-hidden
          className={"pointer-events-none absolute inset-0 flex " + (!front ? "opacity-[.22] [filter:grayscale(1)]" : foot ? "opacity-60" : active ? "opacity-[.72]" : "opacity-[.55]")}
          data-testid={front ? "panel-art" : "panel-out-art"}
        >
          <FadingImg src={seat.art} alt="" className={"h-full object-cover object-top " + (seat.partnerArt ? "w-1/2" : "w-full")} />
          {seat.partnerArt ? <FadingImg src={seat.partnerArt} alt="" className="h-full w-1/2 object-cover object-top" /> : null}
          {seat.partnerArt ? <span className="absolute inset-y-0 left-1/2 -ml-px w-[2px] bg-[color:var(--bg)] opacity-80" data-testid="panel-seam" /> : null}
        </span>
        <span
          aria-hidden
          className={"pointer-events-none absolute inset-0 " + (front ? "bg-[color:color-mix(in_srgb,var(--bg)_50%,transparent)]" : "bg-[color:color-mix(in_srgb,var(--bg)_78%,transparent)]")}
          data-testid={front ? "panel-wash" : "panel-out-wash"}
        />
      </>
    ) : null;
  // The out face stays mounted once a seat has gone out, so an Undo turns the panel back (the flip reversed).
  const [shownOut, setShownOut] = useState(state.out);
  if (state.out && state.out !== shownOut) setShownOut(state.out);
  const reason = shownOut?.reason;
  const cause = !shownOut || !reason
    ? null
    : reason.kind === "life"
      ? copy.outLife(shownOut.round)
      : reason.kind === "poison"
        ? copy.outPoison(shownOut.round)
        : copy.outCommander(
            (seats.get(reason.from) && commanderOf(seats.get(reason.from)!, reason.cmdr)) ?? trackerCopy.sheet.commanderFallback,
            shownOut.round,
          );
  const ground = seat.art ? "bg-[color:var(--surface)] " : "bg-[radial-gradient(260px_180px_at_50%_45%,var(--elevated),var(--surface))] ";

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
          {...personAttrs({ "aria-label": label }, "relative h-full w-full [perspective:1200px]")}
        >
          {/* The flip (F10): the panel turns over to its out face in 0.45s, and back on Undo; under reduced motion it simply changes. */}
          <div
            className="relative h-full w-full [transform-style:preserve-3d] motion-safe:transition-transform motion-safe:duration-[450ms] motion-safe:ease-[cubic-bezier(.4,.1,.2,1)]"
            style={{ transform: out ? "rotateY(180deg)" : "rotateY(0deg)" }}
            data-testid="panel-flip"
          >
            <div className={face + ground} inert={out} data-testid="panel-front">
              {art(true)}
              {active && !out ? <TurnRing key={round + ":" + seat.seat} radius={foot ? 18 : 16} /> : null}

              <div className={pane}>
                <div className={whoRow} data-testid="panel-who">
                  {name}
                  {deck}
                  {foot ? null : badges}
                  {foot ? null : endTurn}
                  {foot ? null : sheetButton}
                </div>

                <div className="relative min-h-0 flex-1">
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-live="polite" aria-atomic="true" data-testid="panel-life">
                    <span className="sr-only">{copy.lifeLabel}</span>
                    <span
                      className="relative font-display font-bold tabular-nums text-[color:var(--fg)] [line-height:1]"
                      style={{ fontSize: `calc(${lifeSize(tablet ? "tablet" : "phone", cell)} * 100cqw / ${cell.w})`, textShadow: `0 2px ${foot ? 14 : 12}px rgba(0,0,0,.6)` }}
                      data-testid="life-number"
                    >
                      {/* Keyed on the step, not on the life: every tap and hold step ticks and nudges, and the commit replays nothing. */}
                      <span
                        key={step.n}
                        className={"inline-block " + (step.n === 0 ? "" : step.dir === 1 ? "motion-safe:animate-[life-tick_.12s_ease-out,life-nudge-up_.18s_ease-out]" : "motion-safe:animate-[life-tick_.12s_ease-out,life-nudge-down_.18s_ease-out]")}
                      >
                        {state.life + pending}
                      </span>
                      {pending !== 0 ? (
                        // The pending change hangs off the number's right edge (F04), so the number never moves. It sits outside the keyed
                        // number so a later step changes its text in place instead of restarting its fade-in.
                        <span
                          className={"absolute left-full top-2 ml-[6px] font-mono text-[18px] font-medium tabular-nums [text-shadow:none] motion-safe:animate-[life-pending-in_.15s_ease-out] "
                            + (pending > 0 ? "text-[color:var(--success)]" : "text-[color:var(--danger)]")}
                          data-testid="life-pending"
                        >
                          {copy.pending(pending)}
                        </span>
                      ) : null}
                      {ghost && pending === 0 ? (
                        // The committed change fades out over 400 ms; screen readers already heard it, and reduced motion just clears it.
                        <span
                          key={ghost.n}
                          aria-hidden
                          onAnimationEnd={clearGhost}
                          className={"absolute left-full top-2 ml-[6px] hidden font-mono text-[18px] font-medium tabular-nums [text-shadow:none] motion-safe:block motion-safe:animate-[life-pending-out_.4s_ease-out_forwards] "
                            + (ghost.sign > 0 ? "text-[color:var(--success)]" : "text-[color:var(--danger)]")}
                          data-testid="life-pending-fade"
                        >
                          {ghost.text}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  {([-1, 1] as const).map((sign) => {
                    // The press is a 10% accent wash over the half, only while a finger is down (in over 80 ms, out over 200 ms); the
                    // glyph stays muted and nothing is held through the commit window (life-press addendum, Nudge).
                    const pressed = pressedHalf === sign;
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
            + "text-[color:var(--fg-muted)]",
                        )}
                      >
                        <span
                          aria-hidden
                          data-testid="half-fill"
                          className={"pointer-events-none absolute inset-0 bg-[color:color-mix(in_srgb,var(--accent)_10%,transparent)] "
                            + (pressed ? "opacity-100 motion-safe:transition-opacity motion-safe:duration-[80ms]" : "opacity-0 motion-safe:transition-opacity motion-safe:duration-200")}
                        />
                        <span aria-hidden className="relative">{sign === 1 ? "+" : "−"}</span>
                      </button>
                    );
                  })}
                </div>

                {foot ? (
                  <div className="relative z-10 flex h-[52px] shrink-0 items-center gap-2" data-testid="panel-foot">
                    {endTurn}
                    {badges}
                    {sheetButton}
                  </div>
                ) : null}
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

            {shownOut ? (
              <div className={face + ground + "[transform:rotateY(180deg)]"} inert={!out} data-testid="panel-back">
                {art(false)}
                <div className={pane}>
                  <div className={whoRow}>
                    {name}
                    {sheetButton}
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 px-3 text-center" data-testid="panel-out">
                    <strong className="font-display text-[26px] font-bold leading-[1.1] text-[color:var(--fg)]">{copy.out}</strong>
                    <span className="text-[12.5px] leading-tight text-[color:var(--fg-body)]" data-testid="panel-out-cause">{cause}</span>
                    <button
                      type="button"
                      onClick={onUndo}
                      className="mt-1 h-11 shrink-0 rounded-[10px] bg-[color:color-mix(in_srgb,var(--bg)_80%,transparent)] px-5 text-[14px] text-[color:var(--fg)] shadow-[inset_0_0_0_1px_var(--border-strong)]"
                      data-testid="panel-undo"
                    >
                      {copy.undo}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * A panel badge (F10 `.bd`, F12 on the tablet): a pill with its icon or the commander's art, then its words. A count
 * opens the sheet where it is changed, over a hit area 10px taller each way; the monarch and initiative marks only show.
 */
function Badge({ text, foot, accent = false, lead = "icon", onPress, children }: {
  text: string;
  foot: boolean;
  accent?: boolean;
  lead?: "icon" | "img" | "none";
  onPress?: () => void;
  children: React.ReactNode;
}) {
  const cls =
    "relative inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-[color:color-mix(in_srgb,var(--bg)_82%,transparent)] font-mono tabular-nums "
    + (foot ? "h-7 gap-[6px] pr-[11px] text-[12.5px] " : "h-6 gap-[5px] pr-[9px] text-[11.5px] ")
    + (lead === "none" ? (foot ? "pl-[11px] " : "pl-[9px] ") : foot ? "pl-[5px] " : "pl-1 ")
    + (lead === "icon" ? (foot ? "[&>svg]:ml-1 [&>span:first-child]:ml-1 " : "[&>svg]:ml-[3px] [&>span:first-child]:ml-[3px] ") : "")
    + (accent ? "text-[color:var(--accent-text)] shadow-[inset_0_0_0_1px_var(--accent)]" : "text-[color:var(--fg-body)] shadow-[inset_0_0_0_1px_var(--border-strong)]");
  return onPress ? (
    <button type="button" onClick={onPress} aria-label={copy.badgeAria(text)} className={cls + " after:absolute after:inset-[-10px_-3px] after:content-['']"} data-testid="panel-badge">
      {children}
      <span aria-hidden>{text}</span>
    </button>
  ) : (
    <span role="img" aria-label={text} className={cls} data-testid="panel-badge">
      {children}
      <span aria-hidden>{text}</span>
    </span>
  );
}
