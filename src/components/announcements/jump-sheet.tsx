"use client";
// The month jump (`/announcements`, board `Archive` F2 and F3): years newest first, each a 4-wide grid of its months with
// their counts. Under a kind the counts are that kind's, and a month with none is dashed and inert, so the jump never lands
// on an empty month. The current month is ringed. The newest year and the current month's year are open; older years fold
// to one line until pressed. A sheet at 390 and a modal from `md` (`ModalChrome`).
import { useState } from "react";

import { MONTH_SHORT, yearsUnder, type ArchiveKind, type MonthCounts, type Ym } from "../../lib/announcements/archive-model";
import { feedCopy } from "../../lib/copy/feed";
import { ModalChrome } from "../decks/receipt-modal";

const c = feedCopy.archive;

export function JumpSheet({ counts, kind, current, onPick, onClose }: {
  counts: MonthCounts;
  kind: ArchiveKind;
  current: Ym | null;
  onPick: (ym: Ym) => void;
  onClose: () => void;
}) {
  const years = yearsUnder(counts, kind);
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set([years[0]?.year, current ? Number(current.slice(0, 4)) : undefined].filter((y): y is number => y !== undefined)));
  return (
    <ModalChrome title={c.jump.title} closeLabel={c.jump.close} onClose={onClose} width={480} fit>
      <div data-archive-jump className="flex flex-col pb-[16px]">
        {years.map((y) =>
          open.has(y.year) ? (
            <section key={y.year} aria-label={`${y.year}`}>
              <h3 className="m-0 flex items-baseline gap-[8px] px-[18px] pt-[12px] pb-[2px] font-sans text-[13px] font-semibold text-[color:var(--fg)]">
                {y.year}
                <em className="font-mono text-[10.5px] font-normal text-[color:var(--fg-faint)] not-italic">{c.monthCount(y.n)}</em>
              </h3>
              <div className="grid grid-cols-4 gap-[6px] px-[14px] py-[6px]">
                {y.months.map((m) => {
                  const none = m.n === 0;
                  return (
                    <button
                      key={m.ym}
                      type="button"
                      disabled={none}
                      aria-current={m.ym === current ? "date" : undefined}
                      onClick={() => onPick(m.ym)}
                      className={`flex h-[44px] flex-col items-center justify-center rounded-[9px] font-sans text-[13px] ${
                        none ? "cursor-default [border:1px_dashed_var(--border)] text-[color:var(--fg-locked)]" : "cursor-pointer [border:1px_solid_var(--border)] text-[color:var(--fg)]"
                      } ${m.ym === current ? "ring-1 ring-[color:var(--accent)]" : ""}`}
                    >
                      {MONTH_SHORT[m.month - 1]}
                      <small className="font-mono text-[9.5px] text-[color:var(--fg-faint)]">{m.n}</small>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : (
            <button
              key={y.year}
              type="button"
              aria-expanded={false}
              onClick={() => setOpen((s) => new Set(s).add(y.year))}
              className="flex min-h-[44px] cursor-pointer items-baseline gap-[8px] border-0 bg-transparent px-[18px] pt-[12px] pb-[2px] text-left font-sans text-[13px] font-semibold text-[color:var(--fg)]"
            >
              {y.year}
              <em className="font-mono text-[10.5px] font-normal text-[color:var(--fg-faint)] not-italic">{c.monthCount(y.n)}</em>
              <span aria-hidden className="ml-auto text-[11px] text-[color:var(--fg-faint)]">▸</span>
            </button>
          ),
        )}
      </div>
    </ModalChrome>
  );
}
