"use client";

// The centre strip (P1, F13): the round, the monarch, the initiative, day and night, the dice, Undo and the menu, in the
// gap the layout leaves between the seats (`Layout.spine`). A column on a phone, a row on a tablet. Its buttons shrink
// with the gap, so a short phone screen still fits all of them.

import { useState } from "react";
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
  // Ten stops along the strip (the round counts a little over one); the buttons take what the gap allows, up to 48px.
  const size = column ? "min(48px, calc((100cqh - 12px) / 9.4))" : "min(48px, calc(100cqh - 12px))";
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
          onClick={onDay}
          aria-label={day === null ? copy.dayNightOff : copy.dayNightIs(day)}
          className={sb + (day === null ? " text-[color:var(--fg-faint)]" : " text-[color:var(--accent-text)] shadow-[inset_0_0_0_1.5px_var(--accent)]")}
          data-testid="strip-day"
        >
          {day === "night" ? <MoonIcon size={22} /> : <SunIcon size={22} />}
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
                role="menu"
                className={"absolute z-40 flex w-[128px] flex-col gap-1.5 rounded-[16px] bg-[color:var(--elevated)] p-2 shadow-[0_12px_32px_rgba(0,0,0,.45)] " + (column ? "right-[calc(100%+10px)] top-1/2 -translate-y-1/2" : "bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2")}
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
                    className="flex h-[52px] items-center gap-2.5 rounded-[10px] bg-[color:var(--surface)] px-3 text-[15px] font-semibold text-[color:var(--fg)]"
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

/** A strip button (`.sb`): a circle sized by the strip, on the elevated surface. */
const sb = "relative grid size-[var(--sb)] shrink-0 place-items-center rounded-full bg-[color:var(--elevated)]";

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
