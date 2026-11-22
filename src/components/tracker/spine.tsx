"use client";

// The centre strip (P1, F13): the round, the monarch, the initiative, day and night, the dice, Undo and the menu, in the
// gap the layout leaves between the seats (`Layout.spine`). A column on a phone, a row on a tablet. Its buttons shrink
// with the gap, so a short phone screen still fits all of them.

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { trackerCopy } from "../../lib/copy/tracker";
import { personAttrs, type PersonParts } from "../../lib/person-name";
import type { Rect } from "../../lib/tracker/layouts";
import type { DayNight } from "../../lib/tracker/engine";
import { FadingImg } from "../ui/hydrated-art";
import { type DieKind, warmDice } from "./dice";
import { CoinIcon, D20Icon, D6Icon, DoorIcon, InitiativeIcon, MonarchIcon, MoonIcon, MoreIcon, SunIcon, UndoIcon } from "./icons";

const copy = trackerCopy.strip;
const diceCopy = trackerCopy.dice;

export type Holder = { label: string | PersonParts; art: string | null; held: boolean };
/** The Menu's one row: where Back to the table goes, its line, and what to do first (land any pending life). */
export type Back = { href: string; line: string; onLeave: () => void };

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
  back,
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
  back: Back;
  onPick: (kind: "monarch" | "initiative") => void;
  onDay: () => void;
  onDice: (kind: DieKind) => void;
  onUndo: () => void;
  onMenu: () => void;
}) {
  const column = rect.h > rect.w;
  const [dice, setDice] = useState(false);
  // Each day/night toggle re-keys the pair: the icon it leaves turns out while the new one turns in (addendum R2, K1). A
  // tap mid-turn starts the next pair from the icon showing. `n` 0 is the first draw, with nothing turning.
  const [dayTurn, setDayTurn] = useState<{ n: number; from: DayNight | null }>({ n: 0, from: null });
  const diceMenu = useRef<HTMLDivElement>(null);
  const diceShift = useClamp(diceMenu, dice);
  const moreMenu = useRef<HTMLDivElement>(null);
  const moreShift = useClamp(moreMenu, menu);
  const moreButton = useRef<HTMLButtonElement>(null);
  const backItem = useRef<HTMLAnchorElement>(null);
  // The Menu takes focus to its row on open, hands it back to Menu on close, and closes on Esc.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (menu) backItem.current?.focus();
    else if (wasOpen.current) moreButton.current?.focus();
    wasOpen.current = menu;
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onMenu();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menu, onMenu]);
  // A strip along the top edge of the table (tablet three along one side) opens its Menu below it, into the table.
  const below = !column && rect.y + rect.h / 2 < canvas.h / 2;
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
            setDayTurn((t) => ({ n: t.n + 1, from: day }));
            onDay();
          }}
          aria-label={day === null ? copy.dayNightOff : copy.dayNightIs(day)}
          className={sb + (day === null ? " text-[color:var(--fg-faint)]" : " text-[color:var(--accent-text)] shadow-[inset_0_0_0_1.5px_var(--accent)]")}
          data-testid="strip-day"
        >
          <span className="relative grid size-[22px]">
            {dayTurn.n ? (
              // The outgoing icon keeps its own ink (the faint sun when the cycle was off). Reduced motion draws only the new one.
              <span
                key={`out-${dayTurn.n}`}
                aria-hidden
                className={"absolute inset-0 motion-safe:animate-[dn-out_320ms_var(--motion-ease-out)_both] motion-reduce:hidden " + (dayTurn.from === null ? "text-[color:var(--fg-faint)]" : "text-[color:var(--accent-text)]")}
                data-testid="strip-day-out"
              >
                <DayIcon day={dayTurn.from} />
              </span>
            ) : null}
            <span key={`in-${dayTurn.n}`} className={"absolute inset-0" + (dayTurn.n ? " motion-safe:animate-[dn-in_320ms_var(--motion-ease-out)_both]" : "")} data-testid="strip-day-icon">
              <DayIcon day={day} />
            </span>
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
            className={sb + " text-[color:var(--fg)]"}
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
                style={{ marginLeft: diceShift }}
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
        <span className="relative shrink-0">
          <button
            ref={moreButton}
            type="button"
            onClick={() => {
              setDice(false);
              onMenu();
            }}
            aria-label={copy.menu}
            aria-haspopup="menu"
            aria-expanded={menu}
            className={sb + " text-[color:var(--fg)]"}
            data-testid="strip-menu"
          >
            <MoreIcon size={22} />
          </button>
          {menu ? (
            <>
              <button type="button" aria-label={copy.menuClose} tabIndex={-1} onClick={onMenu} className="fixed inset-0 z-30 cursor-default" />
              <div
                ref={moreMenu}
                role="menu"
                aria-label={copy.menu}
                // M1: centred on Menu, above it (below a strip on the top edge), popping from the side it opens from.
                className={
                  "absolute left-1/2 z-40 w-[300px] -translate-x-1/2 rounded-[16px] bg-[color:var(--elevated)] p-2 shadow-[0_10px_30px_rgba(0,0,0,.55),inset_0_0_0_1px_var(--border-strong)] motion-safe:animate-[end-turn-pop_.22s_cubic-bezier(.3,1.4,.5,1)] " +
                  (below ? "top-[calc(100%+10px)] origin-top" : "bottom-[calc(100%+10px)] origin-bottom")
                }
                style={{ marginLeft: moreShift }}
                data-testid="strip-menu-pop"
              >
                <Link
                  ref={backItem}
                  href={back.href}
                  role="menuitem"
                  onClick={back.onLeave}
                  className="flex min-h-[64px] items-center gap-3 rounded-[10px] bg-[color:var(--surface)] py-2 pl-2 pr-3.5 text-left outline-offset-2 motion-safe:transition-transform motion-safe:duration-75 motion-safe:active:scale-[.98]"
                  data-testid="strip-menu-back"
                >
                  <span aria-hidden className="grid size-[44px] shrink-0 place-items-center rounded-full bg-[color:var(--elevated)] text-[color:var(--fg-body)] shadow-[inset_0_0_0_1px_var(--border-strong)]">
                    <DoorIcon size={22} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] leading-[1.3] font-semibold text-[color:var(--fg)]">{copy.back}</span>
                    <span className="mt-0.5 block text-[12.5px] leading-[1.4] text-[color:var(--fg-muted)]">{back.line}</span>
                  </span>
                </Link>
              </div>
            </>
          ) : null}
        </span>
      </div>
    </div>
  );
}

/**
 * A strip button (`.sb`): a circle sized by the strip, on the elevated surface. A press only pushes it in, `scale(.92)`
 * over 80 ms, with no change of ground, ink or ring (the P1 demo, addendum press-parity, replacing R2's accent flash
 * that read as a blink). Colour changes between states still ease over `--motion-quick` (200 ms), hence one duration per
 * transitioned property, in order. A disabled Undo does not press; reduced motion draws no press at all. An open popover's button (dice, Menu) and a monarch or
 * initiative pick are lit the same way, from their `aria-expanded` / `aria-pressed`: as variants they outrank the
 * resting fill, where a plain accent class appended after it lost to it in Tailwind's order.
 */
const sb =
  "relative grid size-[var(--sb)] shrink-0 place-items-center rounded-full bg-[color:var(--elevated)] aria-expanded:bg-[color:var(--accent)] aria-expanded:text-[color:var(--bg)] aria-pressed:bg-[color:var(--accent)] aria-pressed:text-[color:var(--bg)] aria-pressed:shadow-none motion-safe:transition-[transform,background-color,color,box-shadow] motion-safe:duration-[80ms,200ms,200ms,200ms] motion-safe:enabled:active:[transform:scale(.92)]";

/**
 * How far a strip popover moves sideways to stay 8px inside the viewport (a strip near the screen's edge). From the
 * layout box, not the drawn one: the pop starts the menu scaled to .4, so its drawn rect is too narrow. It is centred
 * on its anchor (the button's wrapper), which the pop does not transform.
 */
function useClamp(ref: React.RefObject<HTMLDivElement | null>, open: boolean) {
  const [shift, setShift] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    const anchor = el?.offsetParent;
    if (!open || !el || !anchor) return setShift(0);
    const a = anchor.getBoundingClientRect();
    const left = a.left + a.width / 2 - el.offsetWidth / 2;
    const right = left + el.offsetWidth;
    const vw = document.documentElement.clientWidth;
    setShift(right > vw - 8 ? vw - 8 - right : left < 8 ? 8 - left : 0);
  }, [ref, open]);
  return shift;
}

/** The day/night button's icon: the moon at night, else the sun (lit by day, faint with the cycle off). */
function DayIcon({ day }: { day: DayNight | null }) {
  return day === "night" ? <MoonIcon size={22} /> : <SunIcon size={22} />;
}

function Rule({ column }: { column: boolean }) {
  return <span aria-hidden className={"shrink-0 bg-[color:var(--border-strong)] " + (column ? "h-px w-[26px]" : "h-[26px] w-px")} />;
}

/** Monarch or initiative: lit while someone holds it, filled while picking who gets it, with the holder's art in the corner. */
function HolderButton({ kind, holder, picking, onPress, children }: { kind: "monarch" | "initiative"; holder: Holder; picking: boolean; onPress: () => void; children: React.ReactNode }) {
  const tone = picking
    ? ""
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
