"use client";

// The setup screen (F02, F02b, F02c): where everyone sits, how the table sits, the starting life and who goes first,
// on one screen, with Start pinned at its foot.

import Link from "next/link";
import { useState } from "react";
import { trackerCopy } from "../../lib/copy/tracker";
import type { Layout } from "../../lib/tracker/layouts";
import { PendingReporter } from "../shell/pending-reporter";
import type { PlaySeat } from "./panel";
import { SeatMap } from "./seat-map";

const copy = trackerCopy.setup;
export const DEFAULT_LIFE = 40;
const LIFE_MIN = 1;
const LIFE_MAX = 999;

/**
 * A layout drawn small (F02 `.mini`): the device's outline, 1.5px, with one block per seat where its panel sits. A phone
 * is a 32x56 portrait; a tablet the same 1.5px outline turned landscape, 56x40. Drawn from the layout's own cells, so a
 * mini always matches the table it starts.
 */
function Mini({ layout, on }: { layout: Layout; on: boolean }) {
  // An ink, not text: the drawing reads --accent like a ring does.
  const ink = on ? "var(--accent)" : "var(--fg-faint)";
  const W = layout.device === "phone" ? 32 : 56;
  const H = layout.device === "phone" ? 56 : 40;
  const pad = 3;
  const sx = (W - pad * 2) / layout.canvas.w;
  const sy = (H - pad * 2) / layout.canvas.h;
  return (
    <svg aria-hidden="true" width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block">
      <rect x={0.75} y={0.75} width={W - 1.5} height={H - 1.5} rx={6} fill="none" stroke={ink} strokeWidth={1.5} />
      {layout.cells.map((c, i) => (
        <rect key={i} x={pad + c.x * sx + 0.5} y={pad + c.y * sy + 0.5} width={Math.max(1, c.w * sx - 1)} height={Math.max(1, c.h * sy - 1)} rx={2} fill={ink} />
      ))}
    </svg>
  );
}

const ROW = "flex min-h-[56px] items-center gap-[12px] border-t border-[color:var(--border)]";
const KEY = "flex-1 text-[14.5px] font-semibold text-[color:var(--fg)]";
const STEP =
  "flex h-[44px] w-[44px] cursor-pointer items-center justify-center rounded-[10px] border-0 bg-[color:var(--elevated)] text-[22px] text-[color:var(--fg)] shadow-[inset_0_0_0_1px_var(--border-strong)]";
const SEG = "h-[38px] cursor-pointer rounded-[8px] border-0 px-[16px] text-[14px] font-semibold";
const SEG_ON = "bg-[color:var(--elevated)] text-[color:var(--fg)] shadow-[inset_0_0_0_1px_var(--accent)]";
const SEG_OFF = "bg-transparent text-[color:var(--fg-muted)]";

export function Setup({
  seats,
  layouts,
  onStart,
  initial,
  backHref,
}: {
  seats: readonly PlaySeat[];
  layouts: readonly Layout[];
  /** A rematch opens on last game's table and life. */
  initial?: { layout: string; life: number };
  /** The ✕: back to the table this game is for. */
  backHref: string;
  /** `order` is the seat numbers by cell: who sits where, which is also the turn order. */
  onStart: (opts: { layout: string; life: number; first: number; order: number[] }) => void;
}) {
  const [layout, setLayout] = useState(initial && layouts.some((l) => l.id === initial.layout) ? initial.layout : layouts[0].id);
  const [life, setLife] = useState(initial?.life ?? DEFAULT_LIFE);
  const [mode, setMode] = useState<"random" | "pick">("random");
  // I'll pick starts on the viewer's own seat, so Start never waits on a choice.
  const [picked, setPicked] = useState<number>(() => (seats.find((s) => s.you) ?? seats[0]).seat);
  // Who sits where, by cell. Seats that change under setup (a join, a leave) reset it to the table's own order.
  const [moved, setMoved] = useState<number[] | null>(null);
  const order = moved && moved.length === seats.length && seats.every((s) => moved.includes(s.seat)) ? moved : seats.map((s) => s.seat);
  const layoutNow = layouts.find((l) => l.id === layout) ?? layouts[0];
  const clamp = (n: number) => Math.min(LIFE_MAX, Math.max(LIFE_MIN, n));

  return (
    <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col px-[16px] pt-[8px]" data-testid="tracker-setup">
      <div className="flex h-[52px] flex-none items-center">
        <h1 className="m-0 font-display text-[22px] font-bold text-[color:var(--fg)]">{copy.title}</h1>
        <Link
          href={backHref}
          aria-label={copy.close}
          className="-mr-[10px] ml-auto flex h-[44px] w-[44px] items-center justify-center rounded-[10px] text-[22px] text-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[color:var(--accent)]"
        >
          {"✕"}
          <PendingReporter href={backHref} />
        </Link>
      </div>
      <p className="mt-[4px] mb-[16px] text-[14px] leading-[1.45] text-[color:var(--fg-body)]">
        {mode === "pick" ? (
          copy.pickLead
        ) : (
          <>
            <span className="md:hidden">{copy.lead}</span>
            <span className="hidden md:inline">{copy.leadDevice}</span>
          </>
        )}
      </p>

      <SeatMap seats={seats} order={order} layout={layoutNow} pick={mode === "pick"} first={picked} onMove={setMoved} onPick={setPicked} />

      <div className="flex min-h-[84px] items-center gap-[12px] border-t border-[color:var(--border)]">
        <span className={KEY}>{copy.table}</span>
        <div role="radiogroup" aria-label={copy.tableAria} className="flex gap-[8px]">
          {layouts.map((l) => {
            const on = layout === l.id;
            return (
              <button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={l.label}
                onClick={() => setLayout(l.id)}
                className={`flex h-[72px] w-[64px] cursor-pointer items-center justify-center rounded-[10px] border-0 p-0 ${
                  on
                    ? "bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] shadow-[inset_0_0_0_2px_var(--accent)]"
                    : "bg-transparent shadow-[inset_0_0_0_1px_var(--border-strong)]"
                }`}
              >
                <Mini layout={l} on={on} />
              </button>
            );
          })}
        </div>
      </div>

      <div className={ROW}>
        <span id="setup-life" className={KEY}>{copy.life}</span>
        <div className="flex items-center gap-[6px]">
          <button type="button" aria-label={copy.lifeLess} onClick={() => setLife((n) => clamp(n - 1))} className={STEP}>−</button>
          <output aria-labelledby="setup-life" className="min-w-[50px] text-center font-display text-[24px] font-bold tabular-nums text-[color:var(--fg)]">{life}</output>
          <button type="button" aria-label={copy.lifeMore} onClick={() => setLife((n) => clamp(n + 1))} className={STEP}>+</button>
        </div>
      </div>

      <div className={ROW}>
        <span className={KEY}>{copy.first}</span>
        <div className="flex rounded-[10px] p-[3px] shadow-[inset_0_0_0_1px_var(--border-strong)]">
          <button type="button" aria-pressed={mode === "random"} onClick={() => setMode("random")} className={`${SEG} ${mode === "random" ? SEG_ON : SEG_OFF}`}>{copy.random}</button>
          <button type="button" aria-pressed={mode === "pick"} onClick={() => setMode("pick")} className={`${SEG} ${mode === "pick" ? SEG_ON : SEG_OFF}`}>{copy.pick}</button>
        </div>
      </div>
      {/* Pinned to the foot: in reach on a short screen, never scrolled away. */}
      <div className="sticky bottom-0 mt-auto bg-[color:var(--bg)] pt-[12px] pb-[22px]">
        <button
          type="button"
          onClick={() => onStart({ layout, life, order, first: mode === "pick" ? picked : seats[Math.floor(Math.random() * seats.length)].seat })}
          className="flex h-[52px] w-full cursor-pointer items-center justify-center rounded-[10px] border-0 bg-[color:var(--accent)] text-[16px] font-semibold text-[color:var(--bg)]"
        >
          {copy.start}
        </button>
      </div>
    </main>
  );
}
