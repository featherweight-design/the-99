"use client";

// "Your collection, put to work" (handoff R1 call 7, R2 CollectionCard): every copy you own, in a deck or not,
// per copy (a card several decks play counts once per copy, ruling 3), as copies and as value, one square per
// 10 copies or $10. Then the owned copies no deck in scope needs that your commanders' decks run: a deck
// select (All decks by default) and two cuts that recount with it and the filter.

import { decksStatsCopy } from "../../../lib/copy/decks-stats";
import { collectionScope, CUTS, wantedRows, WANTED_ROWS } from "../../../lib/lineup/collection";
import type { LineupCollection, LineupDeck, LineupFilter } from "../../../lib/lineup/types";
import { CardDetailTrigger } from "../../cards/card-detail-provider";
import { HoverPreviewProvider } from "../hover-preview";
import { DeckName } from "./deck-link";
import { DeckSelect } from "./deck-select";
import { CHIP_OFF, CHIP_ON } from "./worth-card";

const copy = decksStatsCopy.collection;
const UNIT = "h-[7px] w-[7px] rounded-[1.5px] md:h-[8px] md:w-[8px]";

function Field({ k1, v1, k2, v2, on, all, unit }: { k1: string; v1: string; k2: string; v2: string; on: number; all: number; unit: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-[8px]">
      <div className="flex flex-wrap gap-x-[24px] gap-y-[6px]">
        <span className="flex flex-col gap-[2px]"><span className="font-mono text-[9.5px] tracking-[0.12em] text-[color:var(--fg-faint)]">{k1}</span><span className="whitespace-nowrap font-mono text-[17px] font-semibold text-[color:var(--fg)] md:text-[20px]">{v1}</span></span>
        <span className="flex flex-col gap-[2px]"><span className="font-mono text-[9.5px] tracking-[0.12em] text-[color:var(--fg-faint)]">{k2}</span><span className="whitespace-nowrap font-mono text-[17px] font-semibold text-[color:var(--fg-muted)] md:text-[20px]">{v2}</span></span>
      </div>
      <div aria-hidden="true" className="flex flex-wrap gap-[2px]">
        {Array.from({ length: all }, (_, j) => (
          <span key={j} data-unit-in={j < on || undefined} className={`${UNIT} ${j < on ? "bg-[var(--fg-muted)]" : "box-border border border-[color:var(--border-strong)]"}`} />
        ))}
      </div>
      <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{unit}</span>
    </div>
  );
}

/** The wanted list's deck select and cut, held by the view so the folded summary counts what they show. */
export type WantedPick = { deckId: string | null; cut: (typeof CUTS)[number] };

export function CollectionBody({ c, decks, filter, age, pick, onPick }: {
  c: LineupCollection;
  decks: readonly LineupDeck[];
  filter: LineupFilter;
  /** The price age (`2h ago`), or null without a price. */
  age: string | null;
  pick: WantedPick;
  onPick: (pick: WantedPick) => void;
}) {
  const { deckId, cut } = pick;
  const s = collectionScope(c, filter);
  const inScope = new Set(decks.map((d) => d.id));
  const chosen = deckId && inScope.has(deckId) ? deckId : null;
  const rows = wantedRows(c, inScope, chosen);
  const at = (pct: number) => rows.filter((r) => r.pct >= pct);
  const shown = at(cut);
  const byId = new Map(decks.map((d) => [d.id, d]));
  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-[18px] md:grid-cols-2 md:gap-[28px]">
        <Field k1={copy.inDeck} v1={s.inDeckCopies.toLocaleString("en-US")} k2={copy.notInDeck} v2={(c.copies - s.inDeckCopies).toLocaleString("en-US")} on={Math.round(s.inDeckCopies / 10)} all={Math.round(c.copies / 10)} unit={copy.unitCopies} />
        <Field k1={copy.valueIn} v1={copy.dollars(s.inDeckCents)} k2={copy.notInDeck} v2={copy.dollars(c.valueCents - s.inDeckCents)} on={Math.round(s.inDeckCents / 1000)} all={Math.round(c.valueCents / 1000)} unit={copy.unitValue} />
      </div>
      <span className="text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">{copy.fact(s.pctCopies, s.pctValue)}</span>
      <div className="flex flex-col gap-[8px] border-t border-t-[color:var(--border)] pt-[12px]">
        <span className="text-[14px] font-semibold text-[color:var(--fg)]">{copy.wantsHead}</span>
        <DeckSelect decks={decks} value={chosen ?? ""} onChange={(id) => onPick({ ...pick, deckId: id || null })} label={copy.selectAria} allLabel={copy.allDecks} />
        <div role="group" aria-label={copy.cutsAria} className="flex flex-wrap gap-[6px]">
          {CUTS.map((p) => (
            <button key={p} type="button" aria-pressed={cut === p} onClick={() => onPick({ ...pick, cut: p })} className={cut === p ? CHIP_ON : CHIP_OFF}>{copy.cut(p, at(p).length)}</button>
          ))}
        </div>
        <HoverPreviewProvider className="flex flex-col">
          {shown.length === 0 ? <span className="py-[9px] text-[12.5px] text-[color:var(--fg-body)]">{copy.none}</span> : null}
          {shown.slice(0, chosen ? shown.length : WANTED_ROWS).map((r) => {
            const d = byId.get(r.deckId)!;
            return (
              <div key={r.oracleId} data-stats-wanted={r.oracleId} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-[12px] gap-y-[3px] border-b border-b-[color:var(--border)] py-[9px]">
                <CardDetailTrigger oracleId={r.oracleId} name={r.name} imageUri={r.imageUri} preview className="cursor-pointer p-0 text-left text-[13.5px] text-[color:var(--fg)] underline decoration-dotted decoration-[color:var(--fg-faint)] underline-offset-[3px]">{r.name}</CardDetailTrigger>
                <span className="text-right font-mono text-[11px] text-[color:var(--fg)]">{copy.wantShare(r.pct)} <span className="text-[color:var(--fg-faint)]">{copy.wantBasis(d.basis)}</span></span>
                <span className="col-span-2 flex flex-wrap items-center gap-x-[6px] font-mono text-[10.5px] text-[color:var(--fg-faint)]">
                  {copy.wantCopies(r.idle)} ·<DeckName id={d.id} name={d.name} identity={d.identity} small />
                </span>
              </div>
            );
          })}
        </HoverPreviewProvider>
        {!chosen && shown.length > WANTED_ROWS ? <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{copy.more(shown.length - WANTED_ROWS)}</span> : null}
      </div>
      <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{copy.caption(age)}</span>
    </>
  );
}
