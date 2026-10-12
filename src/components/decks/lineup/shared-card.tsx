"use client";

// "Cards your decks share" (handoff R1 call 6, R2 SharedCard): one row per card two or more decks play, each
// deck a square, filled where the claim model gives that deck a copy you own and dashed where it has none left
// (lock 3: never re-derived). `20 decks · you own 17` states a gap as a count. A row with a deck short opens to
// name those decks and link to Shopping for all decks: the one `--warning` ink, as on Money.

import Link from "next/link";
import { useState } from "react";
import { decksStatsCopy } from "../../../lib/copy/decks-stats";
import { sharedView, type SharedMode } from "../../../lib/lineup/shared";
import type { LineupDeck, LineupShared } from "../../../lib/lineup/types";
import { CardDetailTrigger } from "../../cards/card-detail-provider";
import { CHIP_OFF, CHIP_ON } from "./worth-card";

const copy = decksStatsCopy.shared;
const SQUARE = "h-[11px] w-[11px] rounded-[2px] md:h-[13px] md:w-[13px]";

export function SharedBody({ shared, decks, cartEnabled }: { shared: readonly LineupShared[]; decks: readonly LineupDeck[]; cartEnabled: boolean }) {
  const [mode, setMode] = useState<SharedMode>("most");
  const [open, setOpen] = useState<string | null>(null);
  const names = new Map(decks.map((d) => [d.id, d.name]));
  const v = sharedView(shared, new Set(decks.map((d) => d.id)), mode);
  if (decks.length < 2) return <span className="text-[13px] leading-[1.55] text-[color:var(--fg-body)]">{copy.one}</span>;
  const chip = (m: SharedMode, label: string) => (
    <button type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={mode === m ? CHIP_ON : CHIP_OFF}>{label}</button>
  );
  return (
    <>
      <div role="group" aria-label={copy.chipsAria} className="flex flex-wrap gap-[6px]">
        {chip("most", copy.chipMost)}
        {chip("wanted", copy.chipWanted(v.wantedMore))}
      </div>
      <div className="flex flex-col">
        {v.rows.map((r) => {
          const short = r.decks.filter((d) => !d.held);
          const isOpen = open === r.oracleId && short.length > 0;
          const squares = (
            <span aria-hidden="true" className="flex flex-wrap gap-[3px] [grid-area:q]">
              {r.decks.map((d) => (
                <span key={d.id} data-held={d.held || undefined} className={`${SQUARE} ${d.held ? "bg-[var(--fg-muted)]" : "box-border border border-dashed border-[color:var(--fg-muted)]"}`} />
              ))}
            </span>
          );
          const fig = (
            <span className="flex flex-col items-end gap-[1px] [grid-area:f]">
              <span className="whitespace-nowrap font-mono text-[11.5px] text-[color:var(--fg)]">{copy.want(r.decks.length)}</span>
              <span className="whitespace-nowrap font-mono text-[10px] text-[color:var(--fg-faint)]">{copy.own(r.owned)}</span>
            </span>
          );
          return (
            <div key={r.oracleId} data-stats-shared={r.oracleId} className="flex flex-col gap-[8px] border-b border-b-[color:var(--border)] py-[9px]">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-[10px] gap-y-[6px] [grid-template-areas:'n_f'_'q_q'] md:min-h-[28px] md:grid-cols-[190px_minmax(0,1fr)_96px] md:gap-[12px] md:[grid-template-areas:'n_q_f']">
                <span className="min-w-0 [grid-area:n]">
                  <CardDetailTrigger oracleId={r.oracleId} name={r.name} className="cursor-pointer p-0 text-left text-[13.5px] text-[color:var(--fg)] underline decoration-dotted decoration-[color:var(--fg-faint)] underline-offset-[3px]">{r.name}</CardDetailTrigger>
                </span>
                {squares}
                {/* The figure is the row's press when a deck is short: it opens the decks with no copy. */}
                {short.length > 0 ? (
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-label={`${copy.open(r.name)}: ${copy.want(r.decks.length)}, ${copy.own(r.owned)}`}
                    onClick={() => setOpen(isOpen ? null : r.oracleId)}
                    className="cursor-pointer justify-self-end [grid-area:f]"
                  >
                    {fig}
                  </button>
                ) : fig}
              </div>
              {isOpen ? (
                <div className="flex flex-col gap-[4px] pt-[2px] text-[12.5px] leading-[1.55] text-[color:var(--fg-body)] [text-wrap:pretty] md:pl-[202px]">
                  <span>{copy.noCopy(short.map((d) => names.get(d.id) ?? ""))}</span>
                  {cartEnabled ? (
                    <Link href="/decks/shopping" className="self-start font-mono text-[11px] text-[color:var(--warning)] underline decoration-[color:color-mix(in_oklab,var(--warning)_45%,transparent)]">
                      {copy.toCart(r.short)}
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-[16px] gap-y-[6px] text-[11.5px] text-[color:var(--fg-body)]">
        <span className="inline-flex items-center gap-[6px]"><span aria-hidden="true" className={`${SQUARE} bg-[var(--fg-muted)]`} />{copy.legendHeld}</span>
        <span className="inline-flex items-center gap-[6px]"><span aria-hidden="true" className={`${SQUARE} box-border border border-dashed border-[color:var(--fg-muted)]`} />{copy.legendWanted}</span>
      </div>
      <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{copy.caption(v.twoPlus, v.fivePlus)}</span>
    </>
  );
}
