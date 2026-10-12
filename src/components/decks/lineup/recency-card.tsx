"use client";

// "When each deck last played" (handoff R2 RecencyCard, R1 call 4). Each played deck gets a lane on one time
// axis, from the first game in scope to today, with every game a Results bead and a line from the last game
// to the right edge. Never-played decks sit in one dashed group, never hidden under any filter. Results are
// raw, with the pod size each game had (ruling 4).

import { decksStatsCopy } from "../../../lib/copy/decks-stats";
import type { Recency } from "../../../lib/lineup/figures";
import { Bead } from "../deck-stats-results";
import { DeckName } from "./deck-link";

const copy = decksStatsCopy.recency;
const MONTH_YEAR = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

/** `Jul to Oct 2026`, from the axis's own two ends. */
export function spanText(from: string, to: string): string {
  const a = MONTH_YEAR.format(new Date(from));
  const b = MONTH_YEAR.format(new Date(to));
  return copy.span(a, b, a.slice(-4) === b.slice(-4));
}

const pct = (at: number) => `${(at * 100).toFixed(3)}%`;

export function RecencyBody({ r, total }: { r: Recency; total: number }) {
  return (
    <>
      {r.axis ? (
        <>
          <div className="flex flex-wrap items-baseline gap-x-[14px] gap-y-[6px]">
            <span className="font-mono text-[22px] font-semibold leading-none text-[color:var(--fg)]">{copy.won(r.wins, r.games)}</span>
            <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">{copy.games(r.games, r.pods, spanText(r.axis.from, r.axis.to))}</span>
          </div>
          <div className="flex flex-col">
            <div className="grid grid-cols-[minmax(0,1fr)] border-b border-b-[color:var(--border)] pb-[4px] md:min-h-[28px] md:grid-cols-[230px_minmax(0,1fr)_150px] md:items-center md:gap-[14px] md:pb-0">
              <span className="hidden md:block" />
              <div aria-hidden="true" className="relative h-[16px] font-mono text-[9.5px] text-[color:var(--fg-faint)]">
                {r.axis.months.map((m) => (
                  <span key={m.label + m.at} className="absolute top-0 -translate-x-[1px]" style={{ left: pct(m.at) }}>{m.label}</span>
                ))}
              </div>
              <span className="hidden text-right font-mono text-[9.5px] tracking-[0.08em] text-[color:var(--fg-faint)] md:block">{copy.head}</span>
            </div>
            {r.lanes.map((lane) => (
              <div
                key={lane.deck.id}
                data-stats-lane={lane.deck.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-[10px] gap-y-[2px] border-b border-b-[color:var(--border)] py-[6px] [grid-template-areas:'n_f'_'l_l'] md:min-h-[40px] md:grid-cols-[230px_minmax(0,1fr)_150px] md:gap-[14px] md:py-0 md:[grid-template-areas:'n_l_f']"
              >
                <span className="[grid-area:n] min-w-0"><DeckName id={lane.deck.id} name={lane.deck.name} identity={lane.deck.identity} /></span>
                <div aria-hidden="true" className="relative h-[30px] [grid-area:l]">
                  {r.axis!.months.map((m) => (
                    <span key={m.label + m.at} className="absolute top-0 bottom-0 w-[1px] bg-[var(--border)]" style={{ left: pct(m.at) }} />
                  ))}
                  <span className="absolute top-0 right-0 bottom-0 w-[1px] bg-[var(--border-strong)]" />
                  <span className="absolute right-0 left-0 top-[14px] h-[1px] bg-[var(--border-strong)]" />
                  <span className="absolute right-0 top-[13px] h-[3px] rounded-[2px] bg-[color:color-mix(in_oklab,var(--fg-muted)_45%,transparent)]" style={{ left: pct(lane.lastAt) }} />
                  {lane.beads.map((b, i) => (
                    // The bead's own loss fill is transparent; on a lane it sits over the baseline, so it gets the
                    // card's ground under it (`--surface-sunken`, the table's loss fill).
                    <span key={i} className="absolute top-[15px] -translate-x-1/2 -translate-y-1/2 rounded-[4px] bg-[var(--surface-sunken)]" style={{ left: pct(b.at) }}>
                      <Bead result={b.result} className="h-[14px] w-[14px] rounded-[4px] text-[9px] md:h-[16px] md:w-[16px]" />
                    </span>
                  ))}
                </div>
                <div className="flex flex-col items-end gap-[1px] [grid-area:f]">
                  <span className="whitespace-nowrap font-mono text-[11.5px] text-[color:var(--fg)]">{copy.ago(lane.ago)}</span>
                  <span className="whitespace-nowrap font-mono text-[10px] text-[color:var(--fg-faint)]">{copy.deckResult(lane.wins, lane.games, lane.pods)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-[6px]">
          <span className="text-[14px] text-[color:var(--fg-body)]">{copy.noGames}</span>
          <span className="text-[12.5px] leading-[1.55] text-[color:var(--fg-faint)] [text-wrap:pretty]">{copy.noGamesSub}</span>
        </div>
      )}
      {r.never.length > 0 ? (
        <div data-stats-never className="flex flex-col gap-[10px] rounded-[10px] border border-dashed border-[color:var(--border-dashed)] px-[14px] pt-[12px] pb-[14px]">
          <div className="flex flex-wrap items-baseline gap-x-[10px]">
            <span className="text-[13.5px] font-semibold text-[color:var(--fg)]">{copy.never}</span>
            <span className="font-mono text-[11px] text-[color:var(--fg-muted)]">{copy.neverCount(r.never.length, total)}</span>
          </div>
          <div className="flex flex-wrap gap-x-[14px] gap-y-[6px]">
            {r.never.map((d) => (
              <span key={d.id} className="inline-flex min-h-[28px] items-center"><DeckName id={d.id} name={d.name} identity={d.identity} small /></span>
            ))}
          </div>
        </div>
      ) : null}
      {r.axis ? <span className="font-mono text-[10.5px] leading-[1.6] text-[color:var(--fg-faint)]">{copy.caption}</span> : null}
    </>
  );
}
