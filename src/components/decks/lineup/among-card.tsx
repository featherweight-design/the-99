"use client";

// "This deck among yours" (handoff R2 AmongCard): each figure a strip, every other deck a 2×12 line (so ties
// never stack), the median a taller line, the chosen deck an accent dot with its figure printed above, and a
// rank column, most first. A rank is a count: no verdict word, no color on it. Each figure is the deck's own,
// from the functions its Stats tab uses (lock 2).

import { decksStatsCopy } from "../../../lib/copy/decks-stats";
import { strip, type BuildKey } from "../../../lib/lineup/among";
import type { LineupDeck } from "../../../lib/lineup/types";
import { DeckSelect } from "./deck-select";

const copy = decksStatsCopy.among;
const GROUPS: { name: keyof typeof copy.groups; keys: BuildKey[] }[] = [
  { name: "build", keys: ["manaValue", "lands", "ramp"] },
  { name: "jobs", keys: ["draw", "removal"] },
  { name: "value", keys: ["valueCents"] },
];
const GRID = "grid grid-cols-[74px_minmax(0,1fr)_72px] gap-[10px] md:grid-cols-[112px_minmax(0,1fr)_110px] md:gap-[16px]";

/** A figure as the strip prints it: two decimals for mana value, dollars for value, whole counts otherwise. */
export function figure(key: BuildKey, v: number, short = false): string {
  if (key === "valueCents") return short ? copy.moneyShort(v) : copy.money(v);
  if (key === "manaValue") return v.toFixed(2);
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}
const pct = (at: number) => `${(at * 100).toFixed(3)}%`;

export function AmongBody({ decks, chosen, onChoose }: { decks: readonly LineupDeck[]; chosen: LineupDeck; onChoose: (id: string) => void }) {
  return (
    <>
      <DeckSelect decks={decks} value={chosen.id} onChange={onChoose} label={copy.selectAria} />
      <div className="flex flex-col">
        <div className={`${GRID} pb-[4px]`}>
          <span />
          <span />
          <span className="text-right font-mono text-[9.5px] tracking-[0.08em] text-[color:var(--fg-faint)]">{copy.rankHead}</span>
        </div>
        {GROUPS.map((g) => (
          <div key={g.name} className="flex flex-col">
            <span className="pt-[10px] pb-[2px] font-mono text-[9.5px] tracking-[0.12em] text-[color:var(--fg-faint)]">{copy.groups[g.name]}</span>
            {g.keys.map((key) => {
              const s = strip(decks, chosen, key);
              if (!s) return null;
              const edge = s.chosen.at > 0.8 ? { right: pct(1 - s.chosen.at), marginRight: -6 } : s.chosen.at < 0.2 ? { left: pct(s.chosen.at), marginLeft: -6 } : { left: pct(s.chosen.at), transform: "translateX(-50%)" };
              return (
                <div key={key} data-stats-strip={key} className={`${GRID} min-h-[52px] items-center border-b border-b-[color:var(--border)]`}>
                  <span className="text-[13px] text-[color:var(--fg-body)]">{copy.rows[key]}</span>
                  <div aria-hidden="true" className="relative h-[46px]">
                    <span className="absolute right-0 left-0 top-[26px] h-[2px] rounded-[1px] bg-[var(--elevated)]" />
                    <span className="absolute left-0 top-[33px] font-mono text-[9.5px] text-[color:var(--fg-faint)]">{figure(key, s.lo, true)}</span>
                    <span className="absolute right-0 top-[33px] font-mono text-[9.5px] text-[color:var(--fg-faint)]">{figure(key, s.hi, true)}</span>
                    {s.others.map((o) => (
                      <span key={o.id} className="absolute top-[21px] -ml-[1px] h-[12px] w-[2px] rounded-[1px] bg-[var(--fg-faint)] opacity-80" style={{ left: pct(o.at) }} />
                    ))}
                    <span className="absolute top-[17px] -ml-[1px] h-[20px] w-[2px] bg-[var(--fg)]" style={{ left: pct(s.median.at) }} />
                    <span className="absolute top-[21px] -ml-[6px] h-[12px] w-[12px] rounded-full bg-[var(--accent)] shadow-[0_0_0_2px_var(--surface-sunken)]" style={{ left: pct(s.chosen.at) }} />
                    <span className="absolute top-0 whitespace-nowrap font-mono text-[11px] font-semibold text-[color:var(--accent)]" style={edge}>{figure(key, s.chosen.value)}</span>
                  </div>
                  <span className="flex flex-col items-end gap-[1px]">
                    <span className="whitespace-nowrap font-mono text-[12px] text-[color:var(--fg)]">{copy.rank(s.chosen.rank, s.total, s.chosen.tied)}</span>
                    <span className="whitespace-nowrap font-mono text-[10px] text-[color:var(--fg-faint)]">{copy.median(figure(key, s.median.value, true))}</span>
                    {/* The strip is hidden; its one fact a reader needs beside the rank is the deck's own figure. */}
                    <span className="sr-only">{figure(key, s.chosen.value)}</span>
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-[16px] gap-y-[6px] text-[11.5px] text-[color:var(--fg-body)]">
        <span className="inline-flex items-center gap-[6px]"><span aria-hidden="true" className="h-[10px] w-[10px] rounded-full bg-[var(--accent)]" />{chosen.name}</span>
        <span className="inline-flex items-center gap-[6px]"><span aria-hidden="true" className="h-[10px] w-[2px] bg-[var(--fg-faint)]" />{copy.others(decks.length - 1)}</span>
        <span className="inline-flex items-center gap-[6px]"><span aria-hidden="true" className="h-[14px] w-[2px] bg-[var(--fg)]" />{copy.medianLegend}</span>
      </div>
    </>
  );
}
