"use client";

// The setup sheet (F02, F02b, F02c): the table layout, the starting life and who goes first, on one screen.

import { useState } from "react";
import { trackerCopy } from "../../lib/copy/tracker";
import type { Layout } from "../../lib/tracker/layouts";
import { PersonName } from "../../lib/person-name";
import type { PlaySeat } from "./panel";

const copy = trackerCopy.setup;
export const DEFAULT_LIFE = 40;
const LIFE_MIN = 1;
const LIFE_MAX = 999;

/** A layout drawn small: one block per seat, numbered in turn order, turned the way its panel is. */
function Mini({ layout, first }: { layout: Layout; first: number | null }) {
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${layout.canvas.w} ${layout.canvas.h}`} className="block h-[64px] w-auto">
      {layout.cells.map((c, i) => (
        <g key={i} transform={`rotate(${c.rot} ${c.x + c.w / 2} ${c.y + c.h / 2})`}>
          <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={14} fill="currentColor" opacity={first === i ? 0.5 : 0.18} />
        </g>
      ))}
    </svg>
  );
}

export function Setup({
  seats,
  layouts,
  onStart,
  initial,
}: {
  seats: readonly PlaySeat[];
  layouts: readonly Layout[];
  /** A rematch opens on last game's table and life. */
  initial?: { layout: string; life: number };
  onStart: (opts: { layout: string; life: number; first: number }) => void;
}) {
  const [layout, setLayout] = useState(initial && layouts.some((l) => l.id === initial.layout) ? initial.layout : layouts[0].id);
  const [life, setLife] = useState(initial?.life ?? DEFAULT_LIFE);
  const [mode, setMode] = useState<"random" | "pick">("random");
  const [picked, setPicked] = useState<number | null>(null);
  const clamp = (n: number) => Math.min(LIFE_MAX, Math.max(LIFE_MIN, n));
  const ready = mode === "random" || picked !== null;
  const chip = "min-h-[44px] rounded-[10px] border px-4 text-[14px] ";
  const on = "border-[color:var(--accent)] text-[color:var(--accent-text)]";
  const off = "border-[color:var(--border-strong)] text-[color:var(--fg-body)]";

  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-col gap-6 px-4 py-6" data-testid="tracker-setup">
      <h1 className="text-[22px] font-semibold text-[color:var(--fg)]">{copy.title}</h1>

      <section aria-labelledby="setup-table" className="flex flex-col gap-2">
        <h2 id="setup-table" className="text-[13px] text-[color:var(--fg-muted)]">{copy.table}</h2>
        <div role="radiogroup" aria-labelledby="setup-table" className="flex flex-wrap gap-2">
          {layouts.map((l) => (
            <button key={l.id} type="button" role="radio" aria-checked={layout === l.id} aria-label={copy.layoutAria(l.label)} onClick={() => setLayout(l.id)} className={chip + "flex flex-col items-center gap-1 py-2 " + (layout === l.id ? on : off)}>
              <Mini layout={l} first={null} />
              <span className="text-[12px]">{l.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="setup-life" className="flex flex-col gap-2">
        <h2 id="setup-life" className="text-[13px] text-[color:var(--fg-muted)]">{copy.life}</h2>
        <div className="flex items-center gap-3">
          <button type="button" aria-label={copy.lifeLess} onClick={() => setLife((n) => clamp(n - 1))} className={chip + off}>−</button>
          <output aria-labelledby="setup-life" className="min-w-[3ch] text-center text-[22px] tabular-nums text-[color:var(--fg)]">{life}</output>
          <button type="button" aria-label={copy.lifeMore} onClick={() => setLife((n) => clamp(n + 1))} className={chip + off}>+</button>
        </div>
      </section>

      <section aria-labelledby="setup-first" className="flex flex-col gap-2">
        <h2 id="setup-first" className="text-[13px] text-[color:var(--fg-muted)]">{copy.first}</h2>
        <div role="radiogroup" aria-labelledby="setup-first" className="flex gap-2">
          <button type="button" role="radio" aria-checked={mode === "random"} onClick={() => setMode("random")} className={chip + (mode === "random" ? on : off)}>{copy.random}</button>
          <button type="button" role="radio" aria-checked={mode === "pick"} onClick={() => setMode("pick")} className={chip + (mode === "pick" ? on : off)}>{copy.pick}</button>
        </div>
        {mode === "pick" ? (
          <ul className="flex flex-wrap gap-2" aria-label={copy.pickHint}>
            {seats.map((s) => (
              <li key={s.seat}>
                <button type="button" aria-pressed={picked === s.seat} onClick={() => setPicked(s.seat)} className={chip + (picked === s.seat ? on : off)}>
                  {s.you ? (s.name as string) : <PersonName n={s.name} />}
                  {picked === s.seat ? <span className="ml-2 text-[12px]">{copy.goesFirst}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <button
        type="button"
        disabled={!ready}
        onClick={() => onStart({ layout, life, first: mode === "pick" ? picked! : seats[Math.floor(Math.random() * seats.length)].seat })}
        className="min-h-[48px] rounded-full bg-[color:var(--accent)] px-6 text-[15px] font-medium text-[color:var(--bg)] disabled:opacity-40"
      >
        {copy.start}
      </button>
    </main>
  );
}
