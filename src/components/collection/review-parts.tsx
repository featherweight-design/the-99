"use client";
// The review's shared pieces: a figure tile and a card list with its Show all and its 500 cap. Drawn by the
// Replace review (collection edit A2) and the Sync review (collection sync PR 3).

import { useEffect, useRef, useState } from "react";
import type { PreviewList, PreviewListRow } from "../../lib/collection/upload-preview";
import { collectionEditCopy } from "../../lib/copy/collection-edit";

/** Rows a list shows before its Show all. */
export const SHOWN = 8;
const c = collectionEditCopy.upload;

/** One figure. `border` colours the edge (Sync's `to decide` while it is above 0); absent, the shipped hairline. */
export function Tile({ n, label, ink, border }: { n: number; label: string; ink: string; border?: string }) {
  return (
    <div
      className="rounded-[12px] border border-[color:var(--border)] bg-[color:var(--surface)] p-[12px_14px] md:p-[16px_18px]"
      style={border ? { borderColor: border } : undefined}
    >
      <div className="font-mono text-[22px] font-semibold leading-none md:text-[26px]" style={{ color: ink }}>
        {n.toLocaleString("en-US")}
      </div>
      <div className="mt-[6px] text-[12px] text-[color:var(--fg-muted)]">{label}</div>
    </div>
  );
}

/** A list's delta ink: `up` the shipped green, `other` muted, `body` Sync's Kept list (`--fg-body`). */
const TONE_INK = { up: "var(--success)", other: "var(--fg-muted)", body: "var(--fg-body)" } as const;

export function Rows({ heading, list, tone }: { heading: string; list: PreviewList; tone: keyof typeof TONE_INK }) {
  const [all, setAll] = useState(false);
  const firstRevealed = useRef<HTMLLIElement>(null);
  // The button that revealed the rest is gone: the first row it revealed takes focus.
  useEffect(() => {
    if (all) firstRevealed.current?.focus();
  }, [all]);
  if (list.total === 0) return null;
  const shown = all ? list.rows : list.rows.slice(0, SHOWN);
  return (
    <div className="min-w-0">
      <h2 className="m-0 mb-[8px] font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-[color:var(--fg-muted)]">
        {heading}
      </h2>
      <ul className="m-0 flex list-none flex-col gap-[6px] p-0">
        {shown.map((r: PreviewListRow, i) => (
          <li
            ref={all && i === SHOWN ? firstRevealed : undefined}
            tabIndex={all && i === SHOWN ? -1 : undefined}
            key={`${r.oracleId}|${r.setCode}|${r.collectorNumber}|${r.finish}`}
            className="flex min-h-[40px] items-center gap-[10px] rounded-[8px] border border-[color:var(--border)] bg-[color:var(--surface)] p-[8px_12px] outline-none"
          >
            <span className="min-w-0 flex-1 truncate text-[13px] text-[color:var(--fg)] md:text-[14px]">{r.name}</span>
            {r.edited ? (
              <span className="flex-none rounded-[4px] border border-[color:var(--warning)] px-[5px] font-mono text-[10px] uppercase tracking-[0.08em] text-[color:var(--warning)]">
                {c.edited}
              </span>
            ) : null}
            <span
              className="flex-none font-mono text-[12px]"
              style={{ color: TONE_INK[tone] }}
            >
              {r.before === 0 ? c.newBadge : `×${r.before}`} → ×{r.after}
            </span>
          </li>
        ))}
      </ul>
      {all && list.total > list.rows.length ? (
        <p className="m-0 mt-[8px] text-[12.5px] text-[color:var(--fg-muted)]">{c.capNote(list.rows.length, list.total)}</p>
      ) : null}
      {!all && list.rows.length > SHOWN ? (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="mt-[8px] min-h-[44px] text-[13px] text-[color:var(--accent)] underline underline-offset-2"
        >
          {c.showAll(list.rows.length)}
        </button>
      ) : null}
    </div>
  );
}
