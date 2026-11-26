// The games tabs' boxes (design handoff `design_handoff_the99_games_tabs`, PR 1): the summary box and one box per month,
// drawn the same on Decks > Games and on a deck's Games tab. Each is a SectionPanel PANEL whose band carries Home's heading
// type (a diamond, the display face, a mono count) and, at its end, the record: a win-share bar and counted W and L
// squares, the zero side dimmed. Draws keep a dimmed D square only when there are some (Eng clarification 1).

import type { ReactNode } from "react";
import { gameHistoryCopy as copy } from "../../lib/copy/game-history";
import { wall } from "../../lib/time/zoned";
import { PANEL } from "../social/section-panel";

const MONTH = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

/** `2026-10`, the way the read groups: the reader's month of `played_at` (a UTC timestamp), in the zone both sides read. */
export const monthKey = (d: Date, zone: string | null = null) => {
  const w = wall(d, zone ?? "UTC");
  return `${w.y}-${String(w.mo).padStart(2, "0")}`;
};
export const monthLabel = (key: string) => MONTH.format(new Date(`${key}-01T00:00:00Z`));

export type Record3 = { wins: number; losses: number; draws: number };

/** The rows in order, cut at each change of month. */
export function groupByMonth<G extends { playedAt: Date }>(games: readonly G[], zone: string | null = null): { key: string; games: G[] }[] {
  const out: { key: string; games: G[] }[] = [];
  for (const g of games) {
    const key = monthKey(g.playedAt, zone);
    const last = out[out.length - 1];
    if (last?.key === key) last.games.push(g);
    else out.push({ key, games: [g] });
  }
  return out;
}

/** The record of a set of games, counted from their results. */
export function recordOf(games: readonly { result: "win" | "loss" | "draw" }[]): Record3 {
  return {
    wins: games.filter((g) => g.result === "win").length,
    losses: games.filter((g) => g.result === "loss").length,
    draws: games.filter((g) => g.result === "draw").length,
  };
}

const SQUARE = "flex h-[22px] min-w-[22px] items-center justify-center gap-[4px] rounded-[6px] border px-[5px] font-mono text-[11px] font-semibold leading-[normal] tabular-nums";

/** The record as a win-share bar and counted squares. Never --danger: a loss is a result. */
export function RecordMark({ record }: { record: Record3 }) {
  const { wins, losses, draws } = record;
  const share = wins + losses + draws > 0 ? (wins / (wins + losses + draws)) * 100 : 0;
  return (
    <span role="img" aria-label={copy.boxes.record(wins, losses, draws)} className="flex flex-none items-center gap-[8px]">
      <span aria-hidden className="relative hidden h-[6px] w-[64px] overflow-hidden rounded-full bg-[color:var(--border-strong)] sm:block">
        <span className="absolute inset-y-0 left-0 bg-[color:var(--success)]" style={{ width: `${share}%` }} />
      </span>
      <span aria-hidden className={`${SQUARE} ${wins > 0 ? "border-success text-success" : "border-border text-fg-locked"}`}>W {wins}</span>
      <span aria-hidden className={`${SQUARE} ${losses > 0 ? "border-border-strong text-fg-body" : "border-border text-fg-locked"}`}>L {losses}</span>
      {draws > 0 ? <span aria-hidden className={`${SQUARE} border-border text-fg-locked`}>D {draws}</span> : null}
    </span>
  );
}

/** A box: Home's heading type in the band (a diamond, then the title), the record at the end. */
export function GameBox({ title, record, children, className = "" }: { title: string; record?: Record3; children: ReactNode; className?: string }) {
  return (
    <section className={`${PANEL} ${className}`}>
      <h2 className="m-0 flex min-h-[48px] items-center justify-between gap-[12px] bg-[color:var(--surface-rail)] py-[8px] pl-[14px] pr-[10px] font-display text-[15px] font-semibold leading-[1.3] text-[color:var(--fg)] [border-bottom:1px_solid_var(--border)] md:min-h-[44px] md:pl-[16px] md:pr-[14px] md:text-[17px]">
        <span className="min-w-0">
          <span aria-hidden className="mr-[8px] text-[color:var(--accent-text)]">◆</span>
          {title}
        </span>
        {record ? <RecordMark record={record} /> : null}
      </h2>
      {children}
    </section>
  );
}

export function MonthBox({ monthKey: key, count, record, children }: { monthKey: string; count: number; record: Record3; children: ReactNode }) {
  return (
    <div data-games-month={key}>
      <GameBox title={copy.boxes.month(monthLabel(key), count)} record={record}>
        {children}
      </GameBox>
    </div>
  );
}

export type SummaryCell = { key: string; label: string; value: ReactNode; sub?: ReactNode; art?: ReactNode };

/** The games summary: a band with the headline count and the record, then the cells (two across on the phone, one row from md). */
export function SummaryBox({ title, record, cells, action, foot }: {
  title: string;
  record: Record3;
  cells: readonly SummaryCell[];
  /** The deck tab's fourth cell: the Log a game button, spanning the phone's full width and the whole row while its form is open. */
  action?: ReactNode;
  /** Lines under the cells: the scoped line, the beat-me line, the low-N line. */
  foot?: ReactNode;
}) {
  const wide = cells.length + (action ? 1 : 0) >= 4;
  return (
    <div data-games-summary>
      <GameBox title={title} record={record}>
        <div className={`grid grid-cols-2 gap-[1px] bg-[color:var(--border)] [&>:last-child:nth-child(odd)]:col-span-2 md:[&>:last-child:nth-child(odd)]:col-span-1 ${wide ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
          {cells.map((c) => (
            <div key={c.key} className="flex min-w-0 flex-col gap-[4px] bg-[color:var(--surface-inset)] px-[14px] py-[12px] md:px-[16px]">
              <span className="font-mono text-[10px] uppercase leading-[normal] tracking-[0.14em] text-fg-faint">{c.label}</span>
              <span className="flex min-w-0 items-center gap-[8px] text-[13px] leading-[1.35] text-fg">
                {c.art}
                <span className="min-w-0 truncate">{c.value}</span>
              </span>
              {c.sub ? <span className="font-mono text-[11px] leading-[normal] text-fg-faint">{c.sub}</span> : null}
            </div>
          ))}
          {action ? (
            <div className="col-span-2 flex items-center bg-[color:var(--surface-inset)] px-[14px] py-[12px] md:col-span-1 md:px-[16px] has-[[data-game-log-form]]:col-span-full">
              <div className="w-full">{action}</div>
            </div>
          ) : null}
        </div>
        {foot ? <div className="flex flex-col gap-[7px] px-[14px] py-[12px] md:px-[16px] [border-top:1px_solid_var(--border)]">{foot}</div> : null}
      </GameBox>
    </div>
  );
}
