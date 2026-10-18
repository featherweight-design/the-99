"use client";
// The balance (P1): one total over the cells in the order credits are spent, Free first, then Plan, then Packs.
// A cell is drawn only for a source the reader holds or once held (`buildCreditsModel` decides; this draws what it
// is given). The cells share one strip, split by a hairline with a small chevron at each join, pointing the way
// credits are spent. "Reset at" is the reader's own clock, so it is drawn after hydration only.

import { clockTime } from "../../lib/copy/credits";
import { creditsPageCopy } from "../../lib/copy/credits-page";
import type { BalanceCell } from "../../lib/payments/page-model";
import type { PaidToday } from "../../lib/payments/paid-today-rule";
import { useHydrated } from "../ui/hydrated-art";

const c = creditsPageCopy.bal;

const LABEL = { free: c.free, welcome: c.welcome, plan: c.plan, pack: c.packs } as const;

// The chevron at a join: a turned square, drawn on its top and right edges only. Each side has its own colour
// (`check:border-collision`: a bare `border-r` is also a theme colour).
const JOIN =
  "before:absolute before:left-[-5px] before:top-1/2 before:-mt-[4px] before:h-[8px] before:w-[8px] before:rotate-45 before:border-t before:border-r before:border-solid before:border-t-[color:var(--border-strong)] before:border-r-[color:var(--border-strong)] before:bg-[color:var(--surface)] before:content-['']";

export function Balance({ total, cells, freeLimit, nextAtMs, added, paidToday = null }: {
  total: number;
  cells: readonly BalanceCell[];
  freeLimit: number;
  nextAtMs: number | null;
  /** Credits the return just added to the Packs cell, drawn as `+40` in `--success` (R2) only while
   *  the cell holds more than that: when the delta is the whole balance (a first purchase) the band already says it
   *  (Hugh, 2026-10-17). */
  added?: number | null;
  /** P5 / P5b: the daily paid line and its meter, or null. */
  paidToday?: PaidToday | null;
}) {
  const hydrated = useHydrated();
  return (
    <section aria-label={c.total} className="flex flex-col gap-[12px]">
      <div className="flex items-baseline gap-[10px]">
        <b className="font-display text-[44px] font-bold leading-[44px] tracking-[-0.01em] text-[color:var(--fg)]" data-testid="credits-total">{total}</b>
        <span className="font-mono text-[12px] text-[color:var(--fg-muted)]">{c.total}</span>
      </div>
      {cells.length > 1 ? (
        <div className="flex items-center gap-[8px] font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">
          <span>{c.order}</span>
          <span aria-hidden="true">→</span>
        </div>
      ) : null}
      <ul className="m-0 flex list-none items-stretch rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] p-0">
        {cells.map((cell, i) => (
          <li
            key={cell.key}
            data-cell={cell.key}
            className={`relative flex min-w-0 flex-1 flex-col gap-[4px] px-[12px] pb-[13px] pt-[12px] md:px-[18px] md:py-[16px] ${i > 0 ? `border-l border-solid border-[color:var(--border)] ${JOIN}` : ""}`}
          >
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{LABEL[cell.key]}</span>
            <span className="flex items-baseline gap-[4px] font-mono text-[24px] font-semibold leading-[1.05] text-[color:var(--fg)] md:text-[30px]">
              {cell.value}
              {cell.key === "free" ? <small className="text-[12px] font-normal leading-[normal] text-[color:var(--fg-faint)]">{c.freeOf(freeLimit)}</small> : null}
              {cell.key === "pack" && added && cell.value > added ? <small className="text-[11px] font-semibold leading-[normal] text-[color:var(--success)]">{c.added(added)}</small> : null}
            </span>
            <span className="min-h-[14.7px] font-mono text-[10.5px] leading-[14.7px] text-[color:var(--fg-muted)]">
              {cell.key === "free"
                ? nextAtMs === null ? c.freeFull(freeLimit) : hydrated ? c.freeNext(clockTime(new Date(nextAtMs))) : null
                : cell.key === "plan" ? c.planSub : cell.key === "pack" ? c.packsSub : null}
            </span>
          </li>
        ))}
      </ul>
      {paidToday ? (
        // The line is mono 11px in `--fg-muted` with a 64 x 5 meter beside it; at the limit the fill is `--warning`, never `--danger`.
        <p data-testid="paid-today" data-at-limit={paidToday.atLimit} className="m-0 flex items-start gap-[8px] font-mono text-[11px] leading-[1.55] text-[color:var(--fg-muted)]">
          <span aria-hidden className="mt-[6px] h-[5px] w-[64px] flex-none overflow-hidden rounded-[3px] bg-[color:var(--elevated)]">
            <i data-testid="paid-today-fill" className="block h-full" style={{ width: `${paidToday.percent}%`, background: paidToday.atLimit ? "var(--warning)" : "var(--fg-muted)" }} />
          </span>
          <span>
            {(paidToday.atLimit ? c.atLimit : c.near)(
              paidToday.used,
              paidToday.limit,
              hydrated && paidToday.backAtMs !== null ? clockTime(new Date(paidToday.backAtMs)) : null,
            )}
          </span>
        </p>
      ) : null}
    </section>
  );
}
