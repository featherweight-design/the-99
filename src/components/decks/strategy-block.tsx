"use client";

// The deck's strategy on Analysis (handoff `design_handoff_the99_strategy_focus`, R2g): a ring of up to five strategies,
// the legend that counts them and is the press for a free FOCUS pick, and one line under it. Last in the reading, above
// Tuning. No model call: the read is `loadDeckStrategy`, the pick is `setStrategyFocus`, held by the shell.
import { useRef } from "react";

import { strategyFocusCopy as copy, strategyName } from "@/lib/copy/strategy-focus";
import type { StrategyRead } from "@/lib/strategy/load";
import { MIN_NONLAND, type StrategyKey } from "@/lib/strategy/score";
import { TOUCH_HIT_INLINE } from "../ui/touch-hit";
import { StrategyIcon } from "./strategy-icon";
import { RING, arcPath, legendCount, ringArcs, type RingRow, type RingSize } from "./strategy-ring";

/**
 * The neutral arcs by rank: the muted ink thinned toward the box, so every theme derives its own ramp. The shares are fitted
 * in oklab to the boards' Low Sun hex (#6E6352 to #332E28; each within 6 of 255 per channel).
 */
const RANK_MIX = [61, 48, 37, 28, 21];
const rankInk = (rank: number) => `color-mix(in oklab, var(--fg-muted) ${RANK_MIX[Math.min(rank, RANK_MIX.length - 1)]}%, var(--surface-rail))`;
/** The pending growth: the boards' #F0C08E in Low Sun, fitted from the hover accent lifted toward white (#EBBB92). */
const GROWTH_INK = "color-mix(in oklab, var(--accent-hover) 66%, white)";

type Row = { key: StrategyKey; copies: number; outside: boolean };

const HEAD = "m-0 font-mono font-medium uppercase text-[10.5px] tracking-[0.16em] text-[color:var(--fg-faint)]";

export function StrategyBlock({
  read,
  focus,
  refused,
  onPick,
}: {
  read: StrategyRead;
  /** The shell's held focus (`useStrategyFocus`): drawn at once on a press. */
  focus: StrategyKey | null;
  refused: boolean;
  onPick: (key: StrategyKey | null) => void;
}) {
  const { strategy, pending } = read;
  return (
    <section data-strategy-block className="flex flex-col gap-[12px]">
      <div className="flex flex-wrap items-baseline gap-[12px]">
        <h3 className={HEAD}>{copy.heading}</h3>
      </div>
      {strategy.state === "ok" ? (
        <p className="m-0 font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)] [text-wrap:pretty]">{copy.sub}</p>
      ) : null}
      {strategy.state === "ok" ? (
        <Reading read={read} focus={focus} refused={refused} onPick={onPick} pending={pending} />
      ) : (
        <p data-strategy-empty={strategy.state} className="m-0 rounded-[10px] border border-dashed border-[color:var(--border-dashed)] px-[16px] py-[14px] text-[13px] leading-[1.6] text-[color:var(--fg-body)]">
          <b className="font-semibold text-[color:var(--fg)]">{strategy.state === "none" ? copy.none.lead : copy.tooSmall.lead}</b>{" "}
          {strategy.state === "none" ? copy.none.body : copy.tooSmall.body(strategy.nonland, MIN_NONLAND)}
        </p>
      )}
    </section>
  );
}

function Reading({
  read,
  focus,
  refused,
  onPick,
  pending,
}: {
  read: StrategyRead;
  focus: StrategyKey | null;
  refused: boolean;
  onPick: (key: StrategyKey | null) => void;
  pending: StrategyRead["pending"];
}) {
  if (read.strategy.state !== "ok") return null;
  const top: Row[] = read.strategy.axes.map((a) => ({ key: a.key, copies: a.copies, outside: false }));
  // A focus the top five no longer hold stays the player's pick, drawn as a sixth row, marked. Only the stored focus can
  // be outside: a press picks a row that is drawn.
  const sixth = read.focus && !read.focus.inTop && read.focus.key === focus ? read.focus : null;
  const rows: Row[] = sixth ? [...top, { key: sixth.key, copies: sixth.axis.copies, outside: true }] : top;
  const ring: RingRow[] = top.map((r) => ({ key: r.key, copies: r.copies, added: pending?.[r.key]?.added ?? 0 }));

  return (
    <>
      <div className="grid grid-cols-1 justify-items-center gap-[14px] rounded-[11px] border border-[color:var(--border-strong)] bg-[color:var(--surface-rail)] px-[12px] py-[14px] md:grid-cols-[auto_minmax(0,380px)] md:items-center md:justify-center md:gap-[40px] md:rounded-[12px] md:px-[20px] md:py-[18px]">
        <figure className="m-0" aria-label={copy.ringLabel(top.map((r) => strategyName(r.key)))}>
          <div className="md:hidden"><Ring size={RING.phone} rows={ring} focus={focus} /></div>
          <div className="hidden md:block"><Ring size={RING.desktop} rows={ring} focus={focus} /></div>
        </figure>
        <Legend rows={rows} focus={focus} pending={pending} onPick={onPick} />
      </div>
      <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)] md:text-center">
        {focus ? (
          <>
            {copy.focusLine.lead} <b className="font-semibold text-[color:var(--fg)]">{strategyName(focus)}</b>
            {copy.focusLine.tail}
            <button
              type="button"
              onClick={() => onPick(null)}
              className={`${TOUCH_HIT_INLINE} ml-[6px] font-mono text-[11px] text-[color:var(--accent-text)] underline decoration-[color:var(--accent-shadow)] underline-offset-4`}
            >
              {copy.keepBalanced}
            </button>
          </>
        ) : (
          copy.noFocus
        )}
      </p>
      {refused ? <p role="status" className="m-0 text-[12px] text-[color:var(--fg-muted)] md:text-center">{copy.refused}</p> : null}
    </>
  );
}

function Ring({ size, rows, focus }: { size: RingSize; rows: readonly RingRow[]; focus: StrategyKey | null }) {
  const arcs = ringArcs(rows, focus);
  const inset = (size.box - size.centre) / 2;
  return (
    <div className="relative" style={{ width: size.box, height: size.box }}>
      {/* The pulled-out focus arc reaches 2px past the box (radius + half its stroke), which the boards clip flat; let
          it draw. */}
      <svg width={size.box} height={size.box} viewBox={`0 0 ${size.box} ${size.box}`} aria-hidden fill="none" overflow="visible">
        {arcs.map((a) => {
          const pulled = a.kind !== "rank";
          return (
            <path
              key={`${a.key}-${a.kind}`}
              data-arc={a.kind}
              d={arcPath(size.box, pulled ? size.focusRadius : size.radius, a.from, a.to)}
              stroke={a.kind === "rank" ? rankInk(a.rank) : a.kind === "focus" ? "var(--accent)" : GROWTH_INK}
              strokeWidth={pulled ? size.focusStroke : size.stroke}
              strokeLinecap="butt"
            />
          );
        })}
      </svg>
      <div className="absolute flex items-center justify-center" style={{ inset }}>
        {focus ? <Medallion size={size} focus={focus} /> : (
          <span data-centre="empty" className="block rounded-full border-[1.5px] border-dashed border-[color:var(--border-strong)]" style={{ width: size.centre * 0.52, height: size.centre * 0.52 }} />
        )}
      </div>
    </div>
  );
}

function Medallion({ size, focus }: { size: RingSize; focus: StrategyKey }) {
  const icon = Math.round(size.centre * 0.56);
  return (
    <span
      data-centre="medallion"
      className="relative flex items-center justify-center rounded-full text-[color:var(--accent-text)]"
      style={{
        width: size.medallion,
        height: size.medallion,
        background: "radial-gradient(circle, color-mix(in oklab, var(--accent) 22%, transparent) 0%, color-mix(in oklab, var(--accent) 6%, transparent) 62%, transparent 72%)",
        border: "1.5px solid color-mix(in oklab, var(--accent) 55%, transparent)",
        boxShadow: "inset 0 0 0 5px var(--surface), inset 0 0 0 6px color-mix(in oklab, var(--accent) 30%, transparent)",
      }}
    >
      {[0, 1, 2, 3].map((k) => (
        <span
          key={k}
          aria-hidden
          className="absolute left-1/2 top-1/2 block h-[7px] w-[7px] bg-[color:var(--accent)]"
          style={{ transform: `translate(-50%, -50%) rotate(${k * 90}deg) translateY(${-size.medallion / 2}px) rotate(45deg)` }}
        />
      ))}
      <StrategyIcon
        strategy={focus}
        size={icon}
        className="[filter:drop-shadow(0_0_6px_color-mix(in_oklab,var(--accent)_45%,transparent))]"
      />
    </span>
  );
}

function Legend({
  rows,
  focus,
  pending,
  onPick,
}: {
  rows: readonly Row[];
  focus: StrategyKey | null;
  pending: StrategyRead["pending"];
  onPick: (key: StrategyKey | null) => void;
}) {
  const group = useRef<HTMLDivElement>(null);
  // Roving tabindex, the theme picker's rule: arrows move focus and pick in one step. With no focus the first row takes
  // the tab stop, so the group is reachable.
  const tabbed = rows.some((r) => r.key === focus) ? focus : rows[0]?.key;
  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const delta = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + rows.length) % rows.length;
    group.current?.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
    onPick(rows[next].key);
  };
  return (
    <div className="flex w-full max-w-[440px] flex-col gap-[6px]">
      <span id="strategy-kicker" className="px-[6px] font-mono text-[9.5px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">
        {copy.kicker}
      </span>
      <div ref={group} role="radiogroup" aria-labelledby="strategy-kicker" className="flex flex-col">
        {rows.map((r, i) => {
          const picked = r.key === focus;
          const after = i > 0 && rows[i - 1].key === focus;
          const n = legendCount(r.copies, pending?.[r.key]);
          return (
            <button
              key={r.key}
              type="button"
              role="radio"
              aria-checked={picked}
              tabIndex={r.key === tabbed ? 0 : -1}
              data-strategy={r.key}
              onClick={() => onPick(r.key)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`flex min-h-[44px] items-center gap-[10px] px-[6px] text-left text-[13px] md:min-h-[40px] ${
                i === 0 ? "" : !picked && !after ? "border-t border-[color:var(--border)]" : "border-t border-transparent"
              } ${picked ? "rounded-[7px] bg-[color:color-mix(in_oklab,var(--accent)_9%,transparent)] font-semibold text-[color:var(--accent-text)]" : "text-[color:var(--fg)]"}`}
            >
              <StrategyIcon strategy={r.key} size={16} className={picked ? "shrink-0 text-[color:var(--accent-text)]" : "shrink-0 text-[color:var(--fg-muted)]"} />
              <span className="min-w-0 truncate">
                {strategyName(r.key)}
                {r.outside ? <span className="ml-[6px] font-mono text-[10px] text-[color:var(--fg-faint)]">{copy.outsideTop}</span> : null}
              </span>
              <span className="ml-auto shrink-0 font-mono text-[11px] font-normal text-[color:var(--fg-muted)]">
                {n.base}
                {n.added ? <em className="not-italic text-[color:var(--accent-text)]"> +{n.added}</em> : null}
                {n.removed ? <em className="not-italic text-[color:var(--accent-text)]"> −{n.removed}</em> : null} {copy.cards(n.base)}
              </span>
              <span
                aria-hidden
                className={`ml-[12px] flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full border-[1.5px] ${
                  picked ? "border-[color:var(--accent)]" : "border-[color:var(--border-strong)]"
                }`}
              >
                {picked ? <span className="block h-[8px] w-[8px] rounded-full bg-[color:var(--accent)]" /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
