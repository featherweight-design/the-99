"use client";

// Every Stats card folds (handoff R2, "Shell + fold head"). The head is the whole row, one `<button
// aria-expanded>` at least 52px tall on a phone and 46 from md, and a folded card shows its one summary line
// under the title, never a bare title. On a first visit only the first card is open (S1); after that, which
// cards are open is remembered per device (G10), in the `useStoredView` shape with a cookie mirror so the
// server draws the same cards the browser will. Instant, as every disclosure here is: no new motion.

import { useCallback, useMemo, type ReactNode } from "react";
import { useStoredView } from "../../ui/use-stored-view";
import { DECKS_STATS_OPEN_COOKIE } from "../../ui/view-cookie";

export const STATS_CARDS = ["recency", "spread"] as const;
export type StatsCardId = (typeof STATS_CARDS)[number];

const KEY = "the99:decks:stats:open";
/** Nothing open is a real choice and stores as this, so it never reads as "no choice on record". */
const NONE = "-";

/** The stored form: open card ids joined by commas, or `-`. Anything else is absence. */
export function parseOpen(raw: string | null | undefined): StatsCardId[] | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (raw === NONE) return [];
  const ids = raw.split(",");
  return ids.every((id) => (STATS_CARDS as readonly string[]).includes(id)) ? (ids as StatsCardId[]) : null;
}
const isOpenValue = (v: string): v is string => parseOpen(v) !== null;
const serialise = (ids: readonly StatsCardId[]) => (ids.length === 0 ? NONE : STATS_CARDS.filter((c) => ids.includes(c)).join(","));

/** First visit: the first card open, every other folded (S1). */
export const FIRST_VISIT: readonly StatsCardId[] = ["recency"];

export function useDecksStatsFold(serverValue: string | null) {
  const [stored, choose] = useStoredView<string>(KEY, isOpenValue, { cookie: DECKS_STATS_OPEN_COOKIE, serverValue });
  const open = useMemo(() => new Set(parseOpen(stored) ?? FIRST_VISIT), [stored]);
  const toggle = useCallback((id: StatsCardId) => {
    const next = new Set(open);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    choose(serialise([...next]));
  }, [open, choose]);
  const allOpen = STATS_CARDS.every((c) => open.has(c));
  const setAll = useCallback((on: boolean) => choose(serialise(on ? STATS_CARDS : [])), [choose]);
  return { open, toggle, allOpen, setAll };
}

export function FoldCard({ id, title, denom, summary, open, onToggle, children }: {
  id: StatsCardId;
  title: string;
  denom: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section
      data-stats-card={id}
      className={`flex min-w-0 flex-col gap-[16px] rounded-[12px] border border-[color:var(--border)] bg-[var(--surface-sunken)] ${open ? "px-[14px] pt-[6px] pb-[16px] md:px-[20px] md:pt-[8px] md:pb-[20px]" : "px-[14px] py-[6px] md:px-[20px] md:py-[8px]"}`}
    >
      <button
        type="button"
        aria-expanded={open}
        // Named by the title, and by the summary while folded (the table's a11y rule): the denominator is
        // read in the card, not as part of the control's name.
        aria-labelledby={open ? `stats-${id}-title` : `stats-${id}-title stats-${id}-summary`}
        onClick={onToggle}
        className={`flex min-h-[52px] w-full items-center gap-[10px] py-[6px] text-left md:min-h-[46px] ${open ? "border-b border-b-[color:var(--border)]" : ""}`}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className="flex flex-wrap items-baseline gap-x-[10px]">
            <span id={`stats-${id}-title`} className="font-display text-[16px] font-normal text-[color:var(--fg)] md:text-[17px]">{title}</span>
            <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{denom}</span>
          </span>
          {open ? null : <span id={`stats-${id}-summary`} data-stats-summary className="font-mono text-[11px] leading-[1.5] text-[color:var(--fg-muted)] [text-wrap:pretty]">{summary}</span>}
        </span>
        <span aria-hidden="true" className="flex h-[44px] w-[44px] flex-none items-center justify-center text-[12px] text-[color:var(--fg-muted)]">{open ? "▴" : "▾"}</span>
      </button>
      {open ? children : null}
    </section>
  );
}
