"use client";

// "What each deck is worth" (handoff R2 WorthCard; ships, ruling 2, in the standard shell with no badge): one
// bar per deck from Money's own value, most first or by name, the chosen deck in accent and a dashed median
// line through every row.

import { useState } from "react";
import { decksStatsCopy } from "../../../lib/copy/decks-stats";
import { worth, type WorthSort } from "../../../lib/lineup/among";
import type { LineupDeck } from "../../../lib/lineup/types";
import { DeckName } from "./deck-link";

const copy = decksStatsCopy.worth;
const CHIP = "inline-flex min-h-[44px] items-center rounded-full px-[12px] text-[12.5px] md:min-h-[30px]";
export const CHIP_ON = `${CHIP} bg-[var(--accent)] font-semibold text-[color:var(--bg)]`;
export const CHIP_OFF = `${CHIP} border border-[color:var(--border-strong)] bg-[var(--elevated)] text-[color:var(--fg)]`;
const pct = (x: number) => `${(x * 100).toFixed(3)}%`;

export function WorthBody({ decks, chosenId, pricesAsOf, now }: { decks: readonly LineupDeck[]; chosenId: string | null; pricesAsOf: string | null; now: string }) {
  const [sort, setSort] = useState<WorthSort>("most");
  const w = worth(decks, sort);
  const med = w.maxCents > 0 ? w.medianCents / w.maxCents : 0;
  const chip = (s: WorthSort, label: string) => (
    <button type="button" aria-pressed={sort === s} onClick={() => setSort(s)} className={sort === s ? CHIP_ON : CHIP_OFF}>{label}</button>
  );
  return (
    <>
      <span className="font-mono text-[22px] font-semibold leading-none text-[color:var(--fg)]">{copy.money(w.sumCents)}</span>
      <div role="group" aria-label={copy.sortAria} className="flex flex-wrap gap-[6px]">
        {chip("most", copy.sortMost)}
        {chip("name", copy.sortName)}
      </div>
      <div className="flex flex-col">
        {w.rows.map((r) => {
          const on = r.deck.id === chosenId;
          return (
            <div
              key={r.deck.id}
              data-stats-worth={r.deck.id}
              className="grid grid-cols-[minmax(0,1fr)_70px] items-center gap-x-[10px] gap-y-[3px] border-b border-b-[color:var(--border)] py-[5px] [grid-template-areas:'n_f'_'t_t'] md:min-h-[28px] md:grid-cols-[250px_minmax(0,1fr)_76px] md:gap-[12px] md:py-0 md:[grid-template-areas:'n_t_f']"
            >
              <span className="min-w-0 [grid-area:n]"><DeckName id={r.deck.id} name={r.deck.name} identity={r.deck.identity} small accent={on} /></span>
              <div aria-hidden="true" className="relative h-[16px] [grid-area:t] md:h-[22px]">
                <span className={`anim-grow-x origin-left absolute top-[5px] bottom-[5px] left-0 rounded-r-[3px] ${on ? "bg-[var(--accent)]" : "bg-[var(--fg-muted)] opacity-75"}`} style={{ width: pct(r.share) }} />
                <span className="absolute -top-[2px] -bottom-[2px] border-l border-dashed border-l-[color:var(--fg-body)]" style={{ left: pct(med) }} />
              </div>
              <span className={`whitespace-nowrap text-right font-mono text-[11.5px] [grid-area:f] ${on ? "font-semibold text-[color:var(--accent)]" : "text-[color:var(--fg)]"}`}>{copy.money(r.cents)}</span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-[16px] gap-y-[6px] text-[11.5px] text-[color:var(--fg-body)]">
        {chosenId ? (
          <span className="inline-flex items-center gap-[6px]"><span aria-hidden="true" className="h-[8px] w-[14px] rounded-[2px] bg-[var(--accent)]" />{decks.find((d) => d.id === chosenId)?.name}</span>
        ) : null}
        <span className="inline-flex items-center gap-[6px]"><span aria-hidden="true" className="h-[12px] border-l border-dashed border-l-[color:var(--fg-body)]" />{copy.median(w.medianCents)}</span>
      </div>
      {pricesAsOf ? (
        <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{copy.caption(copy.age((Date.parse(now) - Date.parse(pricesAsOf)) / 60_000))}</span>
      ) : null}
    </>
  );
}
