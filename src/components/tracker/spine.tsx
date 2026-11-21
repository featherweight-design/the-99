"use client";

// The centre strip (P1, F13): the round, the monarch, the initiative, day and night, the dice, Undo and the menu, in the
// gap the layout leaves between the seats (`Layout.spine`). A column on a phone, a row on a tablet. Its buttons shrink
// with the gap, so a short phone screen still fits all of them.

import { useLayoutEffect, useRef, useState } from "react";
import { trackerCopy } from "../../lib/copy/tracker";
import { personAttrs, type PersonParts } from "../../lib/person-name";
import type { Rect } from "../../lib/tracker/layouts";
import type { DayNight } from "../../lib/tracker/engine";
import { FadingImg } from "../ui/hydrated-art";
import { type DieKind, warmDice } from "./dice";
import { CoinIcon, D20Icon, D6Icon, InitiativeIcon, MonarchIcon, MoonIcon, SunIcon, UndoIcon } from "./icons";

const copy = trackerCopy.strip;
const diceCopy = trackerCopy.dice;

export type Holder = { label: string | PersonParts; art: string | null; held: boolean };

export function Spine({
  rect,
  canvas,
  round,
  roundLabel,
  monarch,
  initiative,
  day,
  pick,
  canUndo,
  menu,
  onPick,
  onDay,
  onDice,
  onUndo,
  onMenu,
}: {
  rect: Rect;
  canvas: { w: number; h: number };
  round: number;
  roundLabel: string | PersonParts;
  monarch: Holder;
  initiative: Holder;
  day: DayNight | null;
  pick: "monarch" | "initiative" | null;
  canUndo: boolean;
  menu: boolean;
  onPick: (kind: "monarch" | "initiative") => void;
  onDay: () => void;
  onDice: (kind: DieKind) => void;
  onUndo: () => void;
  onMenu: () => void;
}) {
  const column = rect.h > rect.w;
  const [dice, setDice] = useState(false);
  // Each day/night toggle remounts the icon so the turn-in (P1 `dnA`/`dnB`) plays again; 0 is the first draw, unturned.
  const [dayTurns, setDayTurns] = useState(0);
  // How far the dice menu moves sideways to stay 8px inside the viewport (a strip near the screen's edge).
  const diceMenu = useRef<HTMLDivElement>(null);
  const [menuShift, setMenuShift] = useState(0);
  useLayoutEffect(() => {
    const el = diceMenu.current;
    if (!dice || !el) return setMenuShift(0);
    const r = el.getBoundingClientRect();
    const left = r.left - menuShift;
    const right = left + r.width;
    const vw = document.documentElement.clientWidth;
    setMenuShift(right > vw - 8 ? vw - 8 - right : left < 8 ? 8 - left : 0);
    // Measured once per opening: the shift itself moves the box.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dice]);
  // Down a column: the round (1.04 buttons), six buttons and eight gaps of a quarter button make 9.04 buttons, plus two
  // 1px rules and 6px clear at each end. The buttons take what that leaves, up to 48px.
  const size = column ? "min(48px, calc((100cqh - 14px) / 9.04))" : "min(48px, calc(100cqh - 12px))";
  const gap = `calc(${size} / 4)`;

  return (
    <div
      role="group"
      data-testid="tracker-spine"
      className="absolute z-20"
      style={{
        left: `${(rect.x / canvas.w) * 100}%`,
        top: `${(rect.y / canvas.h) * 100}%`,
        width: `${(rect.w / canvas.w) * 100}%`,
        height: `${(rect.h / canvas.h) * 100}%`,
        containerType: "size",
      }}
    >
      <div
        className={"flex h-full w-full items-center justify-center rounded-[16px] bg-[color:var(--surface)] shadow-[inset_0_0_0_1px_var(--border)] " + (column ? "flex-col" : "flex-row")}
        style={{ gap, "--sb": size } as React.CSSProperties}
      >
        <span
          {...personAttrs({ "aria-label": roundLabel }, "grid shrink-0 place-items-center rounded-full font-display tabular-nums text-[color:var(--fg)] shadow-[inset_0_0_0_1.5px_var(--accent)]")}
          role="img"
          style={{ width: `calc(${size} * 1.04)`, height: `calc(${size} * 1.04)`, fontSize: `calc(${size} * .46)` }}
          data-testid="strip-round"
        >
          {round}
        </span>
        <Rule column={column} />
        <HolderButton kind="monarch" holder={monarch} picking={pick === "monarch"} onPress={() => onPick("monarch")}>
          <MonarchIcon size={22} />
        </HolderButton>
        <HolderButton kind="initiative" holder={initiative} picking={pick === "initiative"} onPress={() => onPick("initiative")}>
          <InitiativeIcon size={22} />
        </HolderButton>
        <button
          type="button"
          onClick={() => {
            setDayTurns((n) => n + 1);
            onDay();
          }}
          aria-label={day === null ? copy.dayNightOff : copy.dayNightIs(day)}
          className={sb + (day === null ? " text-[color:var(--fg-faint)]" : " text-[color:var(--accent-text)] shadow-[inset_0_0_0_1.5px_var(--accent)]")}
          data-testid="strip-day"
        >
          <span key={dayTurns} className={"flex" + (dayTurns ? " motion-safe:animate-[day-turn_.45s_cubic-bezier(.3,1.3,.5,1)]" : "")} data-testid="strip-day-icon">
            {day === "night" ? <MoonIcon size={22} /> : <SunIcon size={22} />}
          </span>
        </button>
        <span className="relative shrink-0">
          <button
            type="button"
            onClick={() => {
              warmDice();
              setDice((d) => !d);
            }}
            aria-label={copy.dice}
            aria-expanded={dice}
            className={sb + (dice ? " bg-[color:var(--accent)] text-[color:var(--bg)]" : " text-[color:var(--fg)]")}
            data-testid="strip-dice"
          >
            <D6Icon size={22} />
          </button>
          {dice ? (
            <>
              <button type="button" aria-label={diceCopy.close} tabIndex={-1} onClick={() => setDice(false)} className="fixed inset-0 z-30 cursor-default" />
              <div
                ref={diceMenu}
                role="menu"
                // P1 `.dmenu`: centred over the strip, just above the dice, popping up from its foot.
                className="absolute bottom-[calc(100%+4px)] left-1/2 z-40 flex w-[128px] origin-bottom -translate-x-1/2 flex-col gap-1.5 rounded-[16px] bg-[color:var(--elevated)] p-2 shadow-[0_10px_30px_rgba(0,0,0,.55),inset_0_0_0_1px_var(--border-strong)] motion-safe:animate-[end-turn-pop_.22s_cubic-bezier(.3,1.4,.5,1)]"
                style={{ marginLeft: menuShift }}
                data-testid="dice-menu"
              >
                {(["d6", "d20", "coin"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="menuitem"
                    aria-label={diceCopy[`${k}Aria`]}
                    onClick={() => {
                      setDice(false);
                      onDice(k);
                    }}
                    className="flex h-[52px] items-center gap-2.5 rounded-[10px] bg-[color:var(--surface)] px-3 text-[15px] font-semibold text-[color:var(--fg)] shadow-[inset_0_0_0_1px_var(--border)] motion-safe:transition-transform motion-safe:duration-75 motion-safe:active:scale-[.96]"
                  >
                    {k === "d6" ? <D6Icon size={20} /> : k === "d20" ? <D20Icon size={20} /> : <CoinIcon size={20} />}
                    {diceCopy[k]}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </span>
        <Rule column={column} />
        <button type="button" onClick={onUndo} disabled={!canUndo} aria-label={copy.undoAria} className={sb + " text-[color:var(--fg)] disabled:opacity-35"} data-testid="strip-undo">
          <UndoIcon size={22} />
        </button>
        <button type="button" onClick={onMenu} aria-expanded={menu} className={sb + " text-[11px] font-semibold text-[color:var(--fg-body)]"} data-testid="strip-menu">
          {copy.menu}
        </button>
      </div>
    </div>
  );
}

/**
 * A strip button (`.sb`): a circle sized by the strip, on the elevated surface. Held down it fills with the accent and is
 * pushed in, easing both ways (P1 `.sb:active`, Hugh ruling 11-22); reduced motion keeps the fill and drops the push.
 */
const sb =
  "relative grid size-[var(--sb)] shrink-0 place-items-center rounded-full bg-[color:var(--elevated)] enabled:active:bg-[color:var(--accent)] enabled:active:text-[color:var(--bg)] motion-safe:[transition:transform_.08s,background-color_.2s,color_.2s] motion-safe:enabled:active:[transform:scale(.92)]";

function Rule({ column }: { column: boolean }) {
  return <span aria-hidden className={"shrink-0 bg-[color:var(--border-strong)] " + (column ? "h-px w-[26px]" : "h-[26px] w-px")} />;
}

/** Monarch or initiative: lit while someone holds it, filled while picking who gets it, with the holder's art in the corner. */
function HolderButton({ kind, holder, picking, onPress, children }: { kind: "monarch" | "initiative"; holder: Holder; picking: boolean; onPress: () => void; children: React.ReactNode }) {
  const tone = picking
    ? " bg-[color:var(--accent)] text-[color:var(--bg)]"
    : holder.held
      ? " text-[color:var(--accent-text)] shadow-[inset_0_0_0_1.5px_var(--accent)]"
      : " text-[color:var(--fg-faint)]";
  return (
    <button
      type="button"
      onClick={onPress}
      aria-pressed={picking}
      {...personAttrs({ "aria-label": holder.label }, sb + tone)}
      data-testid={`strip-${kind}`}
    >
      {children}
      {holder.art && !picking ? (
        <FadingImg src={holder.art} alt="" className="absolute -bottom-0.5 -right-0.5 size-[22px] rounded-full object-cover shadow-[0_0_0_2px_var(--surface)]" />
      ) : null}
    </button>
  );
}
