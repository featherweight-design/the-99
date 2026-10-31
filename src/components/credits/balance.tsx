"use client";
// The balance (P1): one total over the cells in the order credits are spent, Free first, then Plan, then Packs.
// A cell is drawn only for a source the reader holds or once held (`buildCreditsModel` decides; this draws what it
// is given). The cells share one strip, split by a hairline with a small chevron at each join, pointing the way
// credits are spent. "Reset at" is the reader's own clock, so it is drawn after hydration only.

import { useRef, useState } from "react";
import { clockTime } from "../../lib/copy/credits";
import { creditsPageCopy } from "../../lib/copy/credits-page";
import { stripDay, welcomeCreditsCopy } from "../../lib/copy/welcome-credits";
import type { BalanceCell } from "../../lib/payments/page-model";
import type { PaidToday } from "../../lib/payments/paid-today-rule";
import type { WelcomeFacts, WelcomeSheet } from "../../lib/payments/welcome-sheet";
import { useHydrated } from "../ui/hydrated-art";
import { TOUCH_HIT } from "../ui/touch-hit";
import { useLocalDay, WhereCreditsWork } from "../welcome/where-credits-work";

/** What the Welcome cell's `Where they work` opens: the lot and the sheet's list (welcome credits R2). */
export type BalanceWelcome = { facts: WelcomeFacts; sheet: WelcomeSheet };

/**
 * The Welcome cell's line (R1 Open 4, R2): `expire Nov 20`, or `expire in 3 days, Nov 20` in `--warning`, in the reader's
 * own day after hydration, then `Where they work` on its own line, opening the same sheet as Home's strip without its
 * teaser (the reader is already on /credits). So closing the strip loses nothing while a credit is held.
 */
function WelcomeSub({ cell, welcome }: { cell: BalanceCell & { expires: NonNullable<BalanceCell["expires"]> }; welcome: BalanceWelcome | null }) {
  const day = useLocalDay(cell.expires.atMs, stripDay);
  const [open, setOpen] = useState(false);
  const where = useRef<HTMLButtonElement>(null);
  const w = welcomeCreditsCopy.cell;
  return (
    <>
      <span
        data-welcome-expires={cell.expires.expiring ? "expiring" : "held"}
        className={`${day.ready ? "" : "invisible"} ${cell.expires.expiring ? "text-[color:var(--warning)]" : ""}`}
      >
        {cell.expires.expiring ? w.expiring(cell.value, cell.expires.days, day.text) : w.expire(cell.value, day.text)}
      </span>
      {welcome ? (
        <>
          <br />
          <button
            ref={where}
            type="button"
            data-welcome-where
            onClick={() => setOpen(true)}
            className={`${TOUCH_HIT} cursor-pointer border-0 bg-transparent p-0 text-left font-[inherit] text-[length:inherit] leading-[inherit] text-[color:var(--fg)] underline decoration-[color-mix(in_srgb,var(--accent)_55%,transparent)] underline-offset-[3px]`}
          >
            {w.where}
          </button>
          {open ? <WhereCreditsWork facts={welcome.facts} sheet={welcome.sheet} teaser={false} onClose={() => setOpen(false)} returnFocusRef={where} /> : null}
        </>
      ) : null}
    </>
  );
}

const c = creditsPageCopy.bal;

const LABEL = { free: c.free, welcome: c.welcome, plan: c.plan, gift: c.gift, pack: c.packs } as const;

// The chevron at a join: a turned square, drawn on its top and right edges only. Each side has its own colour
// (`check:border-collision`: a bare `border-r` is also a theme colour).
const JOIN =
  "before:absolute before:left-[-5px] before:top-1/2 before:-mt-[4px] before:h-[8px] before:w-[8px] before:rotate-45 before:border-t before:border-r before:border-solid before:border-t-[color:var(--border-strong)] before:border-r-[color:var(--border-strong)] before:bg-[color:var(--surface)] before:content-['']";

export function Balance({ total, cells, freeLimit, nextAtMs, added, paidToday = null, welcome = null }: {
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
  /** The Welcome cell's `Where they work` and its sheet, or null (every row off): the date line stands alone. */
  welcome?: BalanceWelcome | null;
}) {
  const hydrated = useHydrated();
  return (
    <section aria-label={c.total(total)} className="flex flex-col gap-[12px]">
      <div className="flex items-baseline gap-[10px]">
        <b className="font-display text-[44px] font-bold leading-[44px] tracking-[-0.01em] text-[color:var(--fg)]" data-testid="credits-total">{total}</b>
        <span className="font-mono text-[12px] text-[color:var(--fg-muted)]">{c.total(total)}</span>
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
                : cell.key === "welcome" && cell.expires ? <WelcomeSub cell={{ ...cell, expires: cell.expires }} welcome={welcome} />
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
