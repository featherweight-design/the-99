"use client";

// A player's sheet (F05 to F09, F14 to F16): five tabs opened from a panel's name or one of its badges. It is drawn in
// the frame of the seat that opened it, turned to face them like the panel itself, and covers the table while it is open.

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { trackerCopy } from "../../lib/copy/tracker";
import { PersonName, PersonText, type ThirdPartyName } from "../../lib/person-name";
import { noteAppScroll } from "../../lib/ui/reveal";
import { COUNTER_KEYS, MANA_COLORS, alive, type Action, type CounterKey, type DayNight, type Game, type GameState, type SeatState } from "../../lib/tracker/engine";
import type { Cell } from "../../lib/tracker/layouts";
import { ManaPip } from "../cards/mana-pips";
import { FadingImg } from "../ui/hydrated-art";
import { CounterIcon } from "./icons";
import type { PlaySeat } from "./panel";

const copy = trackerCopy;

export const SHEET_TABS = ["damage", "counters", "tax", "mana", "table"] as const;
export type SheetTab = (typeof SHEET_TABS)[number];
export type SheetView = { seat: number; tab: SheetTab; focus?: CounterKey };

/** The two counters F05 draws as toggles above the rest: you have the City's blessing, or you are in a dungeon. */
const TOGGLES: readonly CounterKey[] = ["blessing", "dungeon"];
/** The counters F05 draws as steppers, in its order. */
const STEPPED: readonly CounterKey[] = ["poison", "energy", "experience", "rad", "ring", "speed", "storm", "tickets"];
/** Each cast from the command zone adds this much to the next cast. */
const TAX_PER_CAST = 2;

/** The three stepper sizes the boards draw: counters (44px), mana (48px), damage and tax (44 to 52px, Cinzel count). */
const STEPPER_SIZE = {
  counter: { btn: "size-[44px] rounded-[9px] text-[20px]", count: "min-w-[30px] text-[22px]" },
  mana: { btn: "size-[48px] rounded-[10px] text-[22px]", count: "min-w-[40px] text-[28px]" },
  damage: { btn: "size-[44px] rounded-[10px] text-[22px]", count: "min-w-[40px] text-[30px]" },
  damageOne: { btn: "size-[44px] rounded-[10px] text-[22px]", count: "min-w-[52px] text-[40px]" },
  tax: { btn: "size-[52px] rounded-[12px] text-[26px]", count: "min-w-[48px] text-[40px]" },
} as const;

const BTN = "touch-manipulation bg-[color:var(--elevated)] leading-none text-[color:var(--fg)] shadow-[inset_0_0_0_1px_var(--border-strong)] disabled:opacity-40";

function Stepper({ count, what, onStep, max, size = "counter", tone }: { count: number; what: string; onStep: (d: 1 | -1) => void; max?: number; size?: keyof typeof STEPPER_SIZE; tone?: "set" }) {
  const z = STEPPER_SIZE[size];
  return (
    <span className="flex items-center justify-center gap-1.5">
      <button type="button" className={BTN + " " + z.btn} aria-label={copy.sheet.fewer(what)} disabled={count <= 0} onClick={() => onStep(-1)}>−</button>
      <span className={"text-center font-display font-bold leading-none tabular-nums " + z.count + (tone === "set" ? " text-[color:var(--accent-text)]" : " text-[color:var(--fg)]")} aria-live="polite">{count}</span>
      <button type="button" className={BTN + " " + z.btn} aria-label={copy.sheet.more(what)} disabled={max !== undefined && count >= max} onClick={() => onStep(1)}>+</button>
    </span>
  );
}

const CARD = "rounded-[10px] bg-[color:var(--surface)] px-3 py-2 shadow-[inset_0_0_0_1px_var(--border-strong)]";
/** A card that fills its grid cell edge to edge (the damage cards carry art to the border). */
const CARD_BOX = "relative flex flex-col overflow-hidden rounded-[12px] bg-[color:var(--surface)] shadow-[inset_0_0_0_1px_var(--border)]";

/** One or two commander images, side by side with a rule between a partner pair; a seat with no art draws the card's own surface. */
function ArtStrip({ arts, className }: { arts: readonly (string | null)[]; className: string }) {
  const shown = arts.filter((a): a is string => a !== null);
  return (
    <span className={"flex flex-none bg-[color:var(--elevated)] " + className} aria-hidden="true">
      {shown.map((src, i) => (
        <FadingImg key={i} src={src} alt="" className={"h-full min-w-0 flex-1 object-cover opacity-80" + (i > 0 ? " border-l-2 border-[color:var(--bg)]" : "")} />
      ))}
    </span>
  );
}

/** A seat's commander images, one per commander it plays. */
const artsOf = (p: PlaySeat, commanders: number): (string | null)[] => (commanders > 1 ? [p.art, p.partnerArt] : [p.art]);

export function Sheet({
  view,
  seats,
  state,
  game,
  rot,
  onView,
  onClose,
  onCommit,
  onUndo,
}: {
  view: SheetView;
  seats: readonly PlaySeat[];
  state: GameState;
  game: Game;
  rot: Cell["rot"];
  onView: (view: SheetView) => void;
  onClose: () => void;
  onCommit: (action: Action) => void;
  onUndo: () => void;
}) {
  const seat = seats.find((s) => s.seat === view.seat)!;
  const mine = state.seats.find((s) => s.seat === view.seat)!;
  const sideways = rot === 90 || rot === -90;
  const closeRef = useRef<HTMLButtonElement>(null);
  const [ending, setEnding] = useState(false);
  useEffect(() => closeRef.current?.focus(), []);

  const nameOf = (n: number): string | ThirdPartyName => {
    const s = seats.find((x) => x.seat === n)!;
    return s.you ? copy.history.you : s.name;
  };
  const tabLabel = (t: SheetTab) => copy.sheet.tabs[t];
  const topDamage = Math.max(0, ...Object.values(mine.damage));
  const topTax = Math.max(...mine.tax.slice(0, mine.commanders)) * TAX_PER_CAST;
  const counting = COUNTER_KEYS.filter((k) => mine.counters[k] > 0).length;
  const em = (t: SheetTab) => (t === "damage" && topDamage > 0 ? String(topDamage) : t === "counters" && counting > 0 ? String(counting) : t === "tax" && topTax > 0 ? `+${topTax}` : null);

  const body: Record<SheetTab, ReactNode> = {
    damage: <DamageTab seat={mine} seats={seats} state={state} onCommit={onCommit} />,
    counters: <CountersTab seat={mine} focus={view.focus} onCommit={onCommit} />,
    tax: <TaxTab seat={mine} player={seat} onCommit={onCommit} />,
    mana: <ManaTab seat={mine} onCommit={onCommit} />,
    table: ending ? (
      <EndTab state={state} seats={seats} onCommit={(a) => { onCommit(a); onClose(); }} onBack={() => setEnding(false)} />
    ) : (
      <TableTab seat={mine} state={state} game={game} nameOf={nameOf} seats={seats} onCommit={onCommit} onUndo={onUndo} onConcede={() => { onCommit({ t: "life", seat: mine.seat, delta: -mine.life, concede: true }); onClose(); }} onEnd={() => setEnding(true)} />
    ),
  };

  return (
    <div className="absolute inset-0 z-30" style={{ containerType: "size" }}>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: sideways ? "100cqh" : "100%", height: sideways ? "100cqw" : "100%" }}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sheet-title"
          onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
          className="flex h-full w-full flex-col gap-2 bg-[color:var(--surface-raised)] px-4 pb-3 pt-2 text-[color:var(--fg)] motion-safe:animate-[sheet-in_.26s_cubic-bezier(.2,.8,.2,1)]"
          style={rot === 0 ? undefined : { transform: `rotate(${rot}deg)` }}
          data-testid="tracker-sheet"
        >
          <div className="flex h-[44px] items-center gap-3">
            {seat.art ? <FadingImg src={seat.art} alt="" className="h-10 w-10 rounded-full object-cover" /> : null}
            <span id="sheet-title" className="sr-only">{seat.you ? copy.sheet.ariaYou : <PersonText text={copy.sheet.aria(seat.name)} />}</span>
            <b className="truncate font-display text-[21px] font-bold">{seat.you ? copy.history.you : <PersonName n={seat.name} />}</b>
            <i className="min-w-0 truncate font-mono text-[12px] not-italic text-[color:var(--fg-muted)]">
              {seat.deck === null ? null : <><PersonName n={seat.deck} />{" · "}</>}
              {copy.sheet.life(mine.life)}
            </i>
            <button ref={closeRef} type="button" onClick={onClose} aria-label={copy.sheet.close} className="ml-auto min-h-[44px] min-w-[44px] text-[22px]">×</button>
          </div>
          <div
            role="tablist"
            aria-label={copy.sheet.tabsAria}
            className="flex gap-0.5 overflow-x-auto border-b-[1px] border-[color:var(--border)]"
            onKeyDown={(e) => {
              const at = SHEET_TABS.indexOf(view.tab);
              const next = e.key === "ArrowRight" ? at + 1 : e.key === "ArrowLeft" ? at - 1 : null;
              if (next === null) return;
              e.preventDefault();
              onView({ seat: view.seat, tab: SHEET_TABS[(next + SHEET_TABS.length) % SHEET_TABS.length] });
              setEnding(false);
            }}
          >
            {SHEET_TABS.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                id={`sheet-tab-${t}`}
                aria-selected={view.tab === t}
                aria-controls="sheet-panel"
                tabIndex={view.tab === t ? 0 : -1}
                onClick={() => { onView({ seat: view.seat, tab: t }); setEnding(false); }}
                className={"-mb-px min-h-[44px] shrink-0 whitespace-nowrap border-b-2 px-4 text-[14px] font-semibold " + (t === "table" ? "ml-auto " : "") + (view.tab === t ? "border-[color:var(--accent)] text-[color:var(--fg)]" : "border-transparent text-[color:var(--fg-muted)]")}
              >
                {tabLabel(t)}
                {em(t) ? <em className="ml-1.5 font-mono text-[11.5px] not-italic text-[color:var(--accent-text)]">{em(t)}</em> : null}
              </button>
            ))}
          </div>
          <div role="tabpanel" id="sheet-panel" aria-labelledby={`sheet-tab-${view.tab}`} className="@container min-h-0 flex-1 overflow-y-auto">
            {body[view.tab]}
          </div>
        </div>
      </div>
    </div>
  );
}

const cmdrName = (p: PlaySeat, cmdr: number) => (cmdr === 1 && p.partner ? p.partner : p.commander || copy.sheet.commanderFallback);

function DamageTab({ seat, seats, state, onCommit }: { seat: SeatState; seats: readonly PlaySeat[]; state: GameState; onCommit: (a: Action) => void }) {
  const foes = state.seats.filter((s) => s.seat !== seat.seat);
  return (
    <div className="flex flex-col gap-2">
      {foes.length === 0 ? <p className="text-[13px] text-[color:var(--fg-muted)]">{copy.sheet.noOpponents}</p> : null}
      {/* One card per opponent, as many across as there are opponents once the sheet is wide (F16, F17), two across before. */}
      <div className="grid grid-cols-2 gap-2.5 @[560px]:[grid-template-columns:repeat(var(--n),minmax(0,1fr))]" style={{ "--n": Math.max(1, foes.length) } as CSSProperties}>
        {foes.map((foe) => {
          const p = seats.find((x) => x.seat === foe.seat)!;
          return (
            <div key={foe.seat} className={CARD_BOX}>
              <div className="relative flex h-[56px] flex-none">
                <ArtStrip arts={artsOf(p, foe.commanders)} className="absolute inset-0" />
                <b className="absolute bottom-1.5 left-2.5 text-[13.5px] font-semibold [text-shadow:0_1px_6px_rgba(0,0,0,.9)]">{p.you ? copy.history.you : <PersonName n={p.name} />}</b>
              </div>
              <div className="flex flex-1 flex-col justify-evenly px-2 pb-2 pt-1">
                {Array.from({ length: foe.commanders }, (_, cmdr) => {
                  const n = seat.damage[`${foe.seat}:${cmdr}`] ?? 0;
                  return (
                    <div key={cmdr} className={"flex flex-col items-center gap-1" + (cmdr > 0 ? " border-t border-[color:var(--border)] pt-2" : "")}>
                      <span className="max-w-full truncate text-[12px] text-[color:var(--fg-body)]">{cmdrName(p, cmdr)}</span>
                      <Stepper size={foe.commanders === 1 ? "damageOne" : "damage"} count={n} what={cmdrName(p, cmdr)} onStep={(d) => onCommit({ t: "damage", seat: seat.seat, from: foe.seat, cmdr, delta: d })} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[12px] text-[color:var(--fg-muted)]">{copy.sheet.damageHint}</p>
    </div>
  );
}

function CountersTab({ seat, focus, onCommit }: { seat: SeatState; focus?: CounterKey; onCommit: (a: Action) => void }) {
  const focused = useRef<HTMLElement>(null);
  useEffect(() => {
    noteAppScroll();
    focused.current?.scrollIntoView({ block: "nearest" });
  }, []);
  const hintOf = (key: CounterKey) => (key === "ring" ? copy.counters.ring.hint(seat.counters.ring) : (copy.counters[key] as { hint: string }).hint);
  const ring = (key: CounterKey) => (focus === key ? " ring-2 ring-[color:var(--accent)]" : "");
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-2 @[560px]:grid-cols-2">
        {TOGGLES.map((key) => {
          const on = seat.counters[key] > 0;
          return (
            <button
              key={key}
              ref={focus === key ? (focused as React.RefObject<HTMLButtonElement>) : undefined}
              type="button"
              aria-pressed={on}
              data-focused={focus === key ? "" : undefined}
              onClick={() => onCommit({ t: "counter", seat: seat.seat, key, delta: on ? -seat.counters[key] : 1 })}
              className={"flex min-h-[50px] touch-manipulation items-center gap-2.5 rounded-[10px] bg-[color:var(--surface)] px-3 text-left " + (on ? "text-[color:var(--accent-text)] shadow-[inset_0_0_0_2px_var(--accent)]" : "text-[color:var(--fg-body)] shadow-[inset_0_0_0_1px_var(--border-strong)]") + ring(key)}
            >
              <CounterIcon kind={key} size={22} />
              <span className="min-w-0">
                <b className={"block truncate text-[13.5px] font-semibold " + (on ? "" : "text-[color:var(--fg)]")}>{copy.counters[key].name}</b>
                <small className="block truncate text-[12px] text-[color:var(--fg-muted)]">{hintOf(key)}</small>
              </span>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-1 gap-2 @[560px]:grid-cols-3">
        {STEPPED.map((key) => {
          const meta = copy.counters[key];
          const n = seat.counters[key];
          return (
            <div key={key} ref={focus === key ? (focused as React.RefObject<HTMLDivElement>) : undefined} data-focused={focus === key ? "" : undefined} className={"flex min-h-[54px] items-center justify-between gap-2 rounded-[10px] bg-[color:var(--surface)] py-1 pl-3 pr-1.5 " + (n > 0 ? "shadow-[inset_0_0_0_1px_var(--accent)]" : "shadow-[inset_0_0_0_1px_var(--border)]") + ring(key)}>
              <span className="flex min-w-0 items-center gap-2">
                <CounterIcon kind={key} size={22} />
                <span className="min-w-0">
                  <b className="block truncate text-[13.5px] font-semibold">{meta.name}</b>
                  <small className="block truncate text-[12px] text-[color:var(--fg-muted)]">{hintOf(key)}</small>
                </span>
              </span>
              <Stepper count={n} tone={n > 0 ? "set" : undefined} what={meta.name} max={key === "speed" ? 4 : undefined} onStep={(d) => onCommit({ t: "counter", seat: seat.seat, key, delta: d })} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaxTab({ seat, player, onCommit }: { seat: SeatState; player: PlaySeat; onCommit: (a: Action) => void }) {
  const arts = artsOf(player, seat.commanders);
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: seat.commanders }, (_, cmdr) => {
        const n = seat.tax[cmdr];
        const art = arts[cmdr] ?? null;
        return (
          <div key={cmdr} className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[12px] bg-[color:var(--surface)] px-[18px] py-3.5 shadow-[inset_0_0_0_1px_var(--border)]">
            <ArtStrip arts={[art]} className="h-[100px] w-[150px] overflow-hidden rounded-[10px]" />
            <span className="min-w-[10ch] flex-1">
              <b className="block text-[16px] font-semibold">{cmdrName(player, cmdr)}</b>
              <small className="mt-1 block text-[12.5px] text-[color:var(--fg-muted)]">{copy.sheet.taxCast}</small>
            </span>
            <Stepper size="tax" count={n} what={copy.sheet.taxAria(cmdrName(player, cmdr))} onStep={(d) => onCommit({ t: "tax", seat: seat.seat, cmdr, delta: d })} />
            <span className="w-[150px] text-center">
              <span className="block font-mono text-[11px] uppercase tracking-[.06em] text-[color:var(--fg-muted)]">{copy.sheet.taxNext}</span>
              <strong className="block font-display text-[44px] font-bold leading-[1.1] text-[color:var(--accent-text)]">+{n * TAX_PER_CAST}</strong>
            </span>
          </div>
        );
      })}
      <p className="text-[12px] text-[color:var(--fg-muted)]">{copy.sheet.taxHint}</p>
    </div>
  );
}

function ManaTab({ seat, onCommit }: { seat: SeatState; onCommit: (a: Action) => void }) {
  const any = MANA_COLORS.some((c) => seat.mana[c] > 0);
  return (
    <div className="flex flex-col gap-2">
      {/* Three across at every width: the board draws two rows of three, and a sideways seat is as wide as a landscape one. */}
      <div className="grid grid-cols-3 gap-2.5">
        {MANA_COLORS.map((color) => (
          <div key={color} className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-[12px] bg-[color:var(--surface)] px-2 py-2 shadow-[inset_0_0_0_1px_var(--border)] @[600px]:flex-row @[600px]:justify-between @[600px]:px-3">
            <ManaPip symbol={color} />
            <Stepper size="mana" count={seat.mana[color]} what={copy.mana[color]} onStep={(d) => onCommit({ t: "mana", seat: seat.seat, color, delta: d })} />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-[color:var(--fg-body)]">{copy.sheet.manaHint}</p>
        <button
          type="button"
          disabled={!any}
          onClick={() => onCommit({ t: "batch", actions: MANA_COLORS.filter((c) => seat.mana[c] > 0).map((color) => ({ t: "mana", seat: seat.seat, color, delta: -seat.mana[color] })) })}
          className={"min-h-[44px] rounded-[9px] px-4 text-[13.5px] font-semibold " + BTN}
        >
          {copy.sheet.manaClear}
        </button>
      </div>
    </div>
  );
}

type Row = { entry: number; round: number; text: ReturnType<typeof copy.history.life> | string };

/** One line per change in the log, in order. A batch is several lines of one entry. */
function historyRows(game: Game, state: GameState, seats: readonly PlaySeat[], nameOf: (n: number) => string | ThirdPartyName): Row[] {
  const rows: Row[] = [];
  const cmdr = (n: number, c: number) => cmdrName(seats.find((s) => s.seat === n)!, c);
  game.log.forEach((a, entry) => {
    const round = state.rounds[entry] ?? 1;
    const leaves = a.t === "batch" ? a.actions : [a];
    for (const l of leaves) {
      switch (l.t) {
        case "life": rows.push({ entry, round, text: copy.history.life(nameOf(l.seat), l.delta) }); break;
        case "counter": rows.push({ entry, round, text: copy.history.counter(nameOf(l.seat), copy.counters[l.key].name, l.delta) }); break;
        case "damage": rows.push({ entry, round, text: copy.history.damage(nameOf(l.seat), nameOf(l.from), l.delta) }); break;
        case "tax": rows.push({ entry, round, text: copy.history.tax(nameOf(l.seat), cmdr(l.seat, l.cmdr), l.delta) }); break;
        case "mana": rows.push({ entry, round, text: copy.history.mana(nameOf(l.seat), copy.mana[l.color], l.delta) }); break;
        case "monarch": rows.push({ entry, round, text: copy.history.monarch(l.seat === null ? null : nameOf(l.seat)) }); break;
        case "initiative": rows.push({ entry, round, text: copy.history.initiative(l.seat === null ? null : nameOf(l.seat)) }); break;
        case "day": rows.push({ entry, round, text: copy.history.day(l.value) }); break;
        case "endTurn": rows.push({ entry, round, text: copy.history.endTurn }); break;
        case "end": rows.push({ entry, round, text: copy.history.end }); break;
      }
    }
  });
  return rows;
}

function TableTab({ seat, state, game, seats, nameOf, onCommit, onUndo, onConcede, onEnd }: {
  seat: SeatState;
  state: GameState;
  game: Game;
  seats: readonly PlaySeat[];
  nameOf: (n: number) => string | ThirdPartyName;
  onCommit: (a: Action) => void;
  onUndo: () => void;
  onConcede: () => void;
  onEnd: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rows = historyRows(game, state, seats, nameOf);
  const rounds = [...new Set(rows.map((r) => r.round))].reverse();
  const setDay = (value: DayNight | null) => onCommit({ t: "day", value });
  const seg = (on: boolean) => "min-h-[44px] flex-1 rounded-[8px] px-3 text-[14px] " + (on ? "bg-[color:var(--elevated)] text-[color:var(--fg)]" : "text-[color:var(--fg-muted)]");
  return (
    <div className="flex flex-col gap-2">
      <div className={CARD + " flex items-center justify-between gap-3"}>
        <b className="text-[13.5px] font-semibold">{copy.sheet.dayNight}</b>
        <span className="flex w-[60%] gap-1" role="group" aria-label={copy.sheet.dayNight}>
          {([["day", copy.sheet.day], ["night", copy.sheet.night], [null, copy.sheet.noDayNight]] as const).map(([v, label]) => (
            <button key={String(v)} type="button" aria-pressed={state.day === v} className={seg(state.day === v)} onClick={() => state.day !== v && setDay(v)}>{label}</button>
          ))}
        </span>
      </div>
      <div className={CARD}>
        <div className="flex items-center justify-between gap-3">
          <span>
            <b className="block text-[13.5px] font-semibold">{copy.sheet.historyTitle}</b>
            <small className="block text-[12px] text-[color:var(--fg-muted)]">{copy.sheet.historyHint}</small>
          </span>
          <span className="flex gap-1">
            <button type="button" disabled={state.entries === 0} onClick={onUndo} className="min-h-[44px] px-3 text-[14px] text-[color:var(--fg)] disabled:opacity-40">{copy.sheet.undoLast}</button>
            <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="min-h-[44px] px-3 text-[14px] text-[color:var(--accent-text)]">{open ? copy.sheet.historyHide : copy.sheet.historyOpen}</button>
          </span>
        </div>
        {open ? (
          rows.length === 0 ? <p className="py-2 text-[13px] text-[color:var(--fg-muted)]">{copy.sheet.historyEmpty}</p> : (
            <div className="mt-1 flex flex-col gap-2">
              {rounds.map((round) => (
                <section key={round} aria-label={copy.sheet.historyRound(round)}>
                  <h3 className="font-mono text-[11.5px] uppercase text-[color:var(--fg-muted)]">{copy.sheet.historyRound(round)}</h3>
                  <ol className="text-[13px] text-[color:var(--fg-body)]">
                    {rows.filter((r) => r.round === round).map((r, i) => (
                      <li key={r.entry + ":" + i}>{typeof r.text === "string" ? r.text : <PersonText text={r.text} />}</li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          )
        ) : null}
      </div>
      <div className={CARD + " flex items-center justify-between gap-3"}>
        <span>
          <b className="block text-[13.5px] font-semibold">{copy.sheet.leaveTitle}</b>
          <small className="block text-[12px] text-[color:var(--fg-muted)]">{copy.sheet.leaveHint}</small>
        </span>
        <span className="flex gap-1">
          <button type="button" disabled={seat.out !== null} onClick={onConcede} className="min-h-[44px] rounded-[10px] border border-[color:var(--danger)] px-4 text-[14px] text-[color:var(--critical-fg)] disabled:opacity-40">{copy.sheet.concede}</button>
          <button type="button" onClick={onEnd} className="min-h-[44px] rounded-[10px] border border-[color:var(--danger)] px-4 text-[14px] text-[color:var(--critical-fg)]">{copy.sheet.endGame}</button>
        </span>
      </div>
    </div>
  );
}

/** "How did it end?" (S5): one tile per player still in, and a draw. One tap ends the game. */
function EndTab({ state, seats, onCommit, onBack }: { state: GameState; seats: readonly PlaySeat[]; onCommit: (a: Action) => void; onBack: () => void }) {
  const standing = alive(state);
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-[16px] font-semibold">{copy.sheet.endTitle}</h2>
      <div className="grid grid-cols-1 gap-2 @[560px]:grid-cols-2 @[900px]:grid-cols-4">
        {standing.map((s) => {
          const p = seats.find((x) => x.seat === s.seat)!;
          return (
            <button key={s.seat} type="button" onClick={() => onCommit({ t: "end", winners: [s.seat] })} className={CARD + " relative flex min-h-[64px] items-center overflow-hidden text-left text-[14px]"}>
              {p.art ? <FadingImg src={p.art} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" /> : null}
              <span className="relative">{p.you ? copy.sheet.endWonYou : <PersonText text={copy.sheet.endWon(p.name)} />}</span>
            </button>
          );
        })}
        <button type="button" onClick={() => onCommit({ t: "end", winners: standing.map((s) => s.seat) })} className={CARD + " min-h-[64px] text-left text-[14px]"}>{copy.sheet.endDraw}</button>
      </div>
      <button type="button" onClick={onBack} className="min-h-[44px] self-start px-3 text-[14px] text-[color:var(--fg-body)]">{copy.sheet.endBack}</button>
    </div>
  );
}
