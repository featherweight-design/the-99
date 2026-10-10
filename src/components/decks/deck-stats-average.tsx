"use client";

import { deckStatsCopy } from "../../lib/copy/deck-stats";
import {
  type AverageComparison,
  type AverageRow,
} from "../../lib/decks/stats-average";
import { Shell } from "./deck-stats-shell";

const copy = deckStatsCopy.average;

const FEWER = "var(--avg-fewer)";
const MORE = "var(--avg-more)";

/** Whole numbers stay whole; a real average reads to one decimal. */
const fig = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const one = (n: number) => n.toFixed(1).replace(/\.0$/, "");
const figFor = (r: AverageRow, n: number) => (r.key === "manaValue" ? one(n) : fig(n));

function diffWords(r: AverageRow): string {
  if (r.diff === 0) return copy.same;
  const n = r.key === "manaValue" ? one(Math.abs(r.diff)) : fig(Math.abs(r.diff));
  if (r.key === "manaValue") return r.diff > 0 ? copy.diffHigher(n) : copy.diffLower(n);
  return r.diff > 0 ? copy.diffMore(n) : copy.diffFewer(n);
}

const COLS = "grid-cols-[92px_minmax(0,1fr)_82px] md:grid-cols-[112px_minmax(0,1fr)_96px]";

function Row({ r }: { r: AverageRow }) {
  const name = copy.rows[r.key];
  const you = figFor(r, r.you);
  const avg = figFor(r, r.avg);
  const words = diffWords(r);
  const pct = `${r.fill * 100}%`;
  return (
    <li data-average-row={r.key} aria-label={copy.row(name, you, avg, words)} className={`grid ${COLS} min-h-[30px] items-center gap-[10px]`}>
      <span aria-hidden="true" className="text-[13px] text-[color:var(--fg-body)]">{name}</span>
      <div aria-hidden="true" className="grid h-[22px] grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] items-center">
        <div className="flex min-w-0 items-center justify-end">
          {r.cut && r.diff < 0 ? <span data-cut="fewer" className="mr-[2px] text-[10px] text-[color:var(--fg)]">‹</span> : null}
          <span data-bar="fewer" className="h-[10px] rounded-l-[2px]" style={{ width: r.diff < 0 ? pct : "0%", background: FEWER }} />
        </div>
        <span className="h-[22px] bg-[color:var(--border-strong)]" />
        <div className="flex min-w-0 items-center">
          <span data-bar="more" className="h-[10px] rounded-r-[2px]" style={{ width: r.diff > 0 ? pct : "0%", background: MORE }} />
          {r.cut && r.diff > 0 ? <span data-cut="more" className="ml-[2px] text-[10px] text-[color:var(--fg)]">›</span> : null}
        </div>
      </div>
      <div aria-hidden="true" className="flex flex-col items-end gap-[1px]">
        <span className="whitespace-nowrap font-mono text-[11.5px] text-[color:var(--fg)]">
          {you} <span className="text-[color:var(--fg-faint)]">· {avg}</span>
        </span>
        <span className="whitespace-nowrap font-mono text-[10px] text-[color:var(--fg-faint)]">{words}</span>
      </div>
    </li>
  );
}

export function AverageCard({ average }: { average: AverageComparison }) {
  const { basis } = average;
  const name = basis.names[0] ?? "";
  const denom =
    basis.of === "commander" || basis.of === "pair"
      ? copy.denomCommander(basis.decks)
      : basis.of === "baseline"
        ? copy.denomBaseline
        : copy.denomColors(basis.label);
  const basisLine =
    basis.of === "pair"
      ? copy.basisPair(basis.names[0] ?? "", basis.names[1] ?? "", basis.decks)
      : basis.of === "commander"
        ? copy.basisCommander(name, basis.decks)
        : basis.of === "baseline"
          ? copy.basisBaseline(name)
          : copy.basisColors(basis.label);
  const title = deckStatsCopy.cards.average;
  const note = average.note === "baseline" ? copy.baselineNote : average.note === "thin" ? copy.thinNote(average.cards, average.body) : null;
  return (
    <Shell title={title} id="average" denom={denom} label={`${title}, ${denom}`}>
      <p className="text-[13px] leading-[1.55] text-[color:var(--fg-body)]" data-average-basis>{basisLine}</p>
      {average.mini ? (
        <div className="flex flex-col gap-[6px]" data-average-curve>
          <span aria-hidden="true" className="font-mono text-[9.5px] tracking-[0.12em] text-[color:var(--fg-faint)]">{copy.curveHeading}</span>
          <ul className="grid grid-cols-8 gap-[4px]">
            {average.mini.map((m) => {
              const label = m.label === 7 ? deckStatsCopy.curve.ceiling : String(m.label);
              return (
                <li key={m.label} aria-label={copy.miniColumn(label, m.diff)} className="flex flex-col items-center gap-[3px]">
                  <div aria-hidden="true" className="flex h-[22px] w-full items-end justify-center">
                    <span data-mini="more" className="w-[14px] rounded-t-[2px]" style={{ height: m.diff > 0 ? m.px : 0, background: MORE }} />
                  </div>
                  <span aria-hidden="true" className="h-px w-full bg-[color:var(--border-strong)]" />
                  <div aria-hidden="true" className="flex h-[22px] w-full items-start justify-center">
                    <span data-mini="fewer" className="w-[14px] rounded-b-[2px]" style={{ height: m.diff < 0 ? m.px : 0, background: FEWER }} />
                  </div>
                  <span aria-hidden="true" className="font-mono text-[10.5px] text-[color:var(--fg-muted)]">{label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {average.groups.length > 0 ? (
        <div className="flex flex-col gap-[16px]">
          <div aria-hidden="true" className={`grid ${COLS} gap-[10px] font-mono text-[9.5px] tracking-[0.08em] text-[color:var(--fg-faint)]`}>
            <span />
            <span className="flex justify-between"><span>{copy.fewer}</span><span>{copy.more}</span></span>
            <span className="text-right">{copy.youAvg}</span>
          </div>
          {average.groups.map((g) => (
            <div key={g.key} className="flex flex-col gap-[2px]" data-average-group={g.key}>
              <span aria-hidden="true" className="pb-[4px] font-mono text-[9.5px] tracking-[0.12em] text-[color:var(--fg-faint)]">{copy.groups[g.key]}</span>
              <ul>{g.rows.map((r) => <Row key={r.key} r={r} />)}</ul>
              {g.key === "jobs" && average.unlabeled > 0 ? (
                <p data-average-unlabeled className="pt-[6px] text-[12.5px] leading-[1.55] text-[color:var(--fg-faint)]">{copy.jobsShort(average.unlabeled)}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {note ? <p data-average-note className="border-t border-dashed border-t-[color:var(--border-dashed)] pt-[10px] text-[12.5px] leading-[1.55] text-[color:var(--fg-faint)]">{note}</p> : null}
      <p className="font-mono text-[10.5px] leading-[1.6] text-[color:var(--fg-faint)]">{copy.counts(average.body)}</p>
    </Shell>
  );
}
