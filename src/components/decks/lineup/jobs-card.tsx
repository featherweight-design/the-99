"use client";

// "Jobs, deck by deck" (handoff R2 JobsCard; ships, ruling 2, in the standard shell with no badge): a deck ×
// four grid of real counts (Lands, Ramp, Draw, Removal), each the deck's own Jobs figure, shaded min to max
// within its column. A column head sorts by it, most first then by name; Ramp by default. The chosen deck is
// outlined. The word "labels" never appears.

import { useState } from "react";
import { decksStatsCopy } from "../../../lib/copy/decks-stats";
import { JOB_COLUMNS, jobsGrid, type JobColumn } from "../../../lib/lineup/among";
import type { LineupDeck } from "../../../lib/lineup/types";
import { DeckName } from "./deck-link";

const copy = decksStatsCopy.jobs;
const COLS = "grid grid-cols-[minmax(0,1fr)_repeat(4,46px)] gap-[3px] md:grid-cols-[minmax(0,1fr)_repeat(4,84px)]";

export function JobsBody({ decks, chosenId }: { decks: readonly LineupDeck[]; chosenId: string | null }) {
  const [by, setBy] = useState<JobColumn>("ramp");
  const g = jobsGrid(decks, by);
  return (
    <>
      <div role="table" aria-label={copy.title} className="flex flex-col">
        <div role="row" className={`${COLS} mb-[2px] items-end border-b border-b-[color:var(--border)] pb-[6px]`}>
          <span role="columnheader" className="sr-only">{copy.deck}</span>
          {JOB_COLUMNS.map((k) => (
            <span key={k} role="columnheader" aria-sort={by === k ? "descending" : undefined} className="flex justify-center">
              <button
                type="button"
                onClick={() => setBy(k)}
                className={`min-h-[28px] font-mono text-[9.5px] uppercase tracking-[0.06em] ${by === k ? "text-[color:var(--fg)]" : "text-[color:var(--fg-faint)]"}`}
              >
                {copy.cols[k]}{by === k ? ` ${copy.sorted}` : ""}
              </button>
            </span>
          ))}
        </div>
        {g.rows.map((r) => {
          const on = r.deck.id === chosenId;
          return (
            <div key={r.deck.id} role="row" data-stats-job-row={r.deck.id} className={`${COLS} min-h-[32px] items-center py-[1px] md:min-h-[28px] ${on ? "rounded-[4px] shadow-[inset_0_0_0_1px_var(--accent)]" : ""}`}>
              <span role="rowheader" className="min-w-0"><DeckName id={r.deck.id} name={r.deck.name} identity={r.deck.identity} small accent={on} /></span>
              {r.cells.map((c) => (
                <span
                  key={c.key}
                  role="cell"
                  className="flex h-[28px] items-center justify-center rounded-[3px] font-mono text-[11px] md:h-[24px]"
                  style={{ background: `color-mix(in oklab, var(--fg-muted) ${Math.round(6 + c.shade * 52)}%, transparent)`, color: c.shade > 0.6 ? "var(--bg)" : "var(--fg)" }}
                >
                  {c.value}
                </span>
              ))}
            </div>
          );
        })}
      </div>
      <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{copy.foot}</span>
    </>
  );
}
